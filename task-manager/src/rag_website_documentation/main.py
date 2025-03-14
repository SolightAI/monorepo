import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from prefect import task, flow
from logging import getLogger
from haystack import Pipeline
from haystack.dataclasses.document import Document
from apify_haystack import ApifyDatasetFromActorCall
from haystack.components.builders import PromptBuilder
from haystack.components.generators import OpenAIGenerator
from haystack.components.embedders import OpenAITextEmbedder, OpenAIDocumentEmbedder
from haystack_integrations.components.retrievers.weaviate import WeaviateEmbeddingRetriever
from haystack_integrations.document_stores.weaviate.document_store import WeaviateDocumentStore


if (WEAVIATE_URL := os.environ.get("WEAVIATE_URL")) is None:
    raise ValueError("WEAVIATE_URL is not set")

if (APIFY_API_TOKEN := os.environ.get("APIFY_API_TOKEN")) is None:
    raise ValueError("APIFY_API_TOKEN is not set")


logger = getLogger(__name__)


def dataset_mapping_function(dataset_item: dict) -> Document:
    return Document(content=dataset_item.get("text"), meta={"url": dataset_item.get("url")})


@task(name="Crawl website")
async def crawl_website(website_url: str, max_crawl_pages: int = 500) -> list[Document]:
    """Get website documentation.

    Args:
        website_url: URL of the website to crawl
        max_crawl_pages: Maximum number of pages to crawl

    Returns:
        List of Document objects from the crawled website
    """
    actor_id = "apify/website-content-crawler"
    run_input = {
        "maxCrawlPages": max_crawl_pages,
        "startUrls": [{"url": website_url}],
    }

    apify_dataset_loader = ApifyDatasetFromActorCall(
        actor_id=actor_id,
        run_input=run_input,
        dataset_mapping_function=dataset_mapping_function,
        apify_api_token=APIFY_API_TOKEN,
    )

    docs = apify_dataset_loader.run()

    return docs.get("documents")


@asynccontextmanager
async def get_document_store(collection_name: str) -> AsyncGenerator[WeaviateDocumentStore, None]:
    """Get a document store instance with proper cleanup.

    Args:
        collection_name: Name of the Weaviate collection to use

    Yields:
        A configured WeaviateDocumentStore instance
    """
    document_store = WeaviateDocumentStore(
        url=WEAVIATE_URL,
    )

    try:
        yield document_store
    finally:
        # Close the document store properly
        if hasattr(document_store, "client") and document_store.client is not None:
            document_store.client.close()


@flow(name="Generate RAG from website documentation")
async def generate_rag_from_website_documentation(
    website_url: str,
    max_crawl_pages: int = 500,
    overwrite: bool = True
) -> None:
    """Generate RAG from website documentation.

    Args:
        website_url: URL of the website to crawl
        collection_name: Name of the collection in Weaviate
        max_crawl_pages: Maximum number of pages to crawl
        overwrite: Whether to overwrite existing documents in the collection
    """
    # Get document store with proper cleanup
    async with get_document_store(website_url) as document_store:

        if overwrite:
            # FIXME: this deletes nothing, delete_documents expects a list of ids
            ids = [d.id for d in document_store.filter_documents()]
            document_store.delete_documents(document_ids=ids)

        # Crawl and embed documents
        logger.info(f"Crawling website: {website_url}")
        docs = await crawl_website(website_url, max_crawl_pages)

        docs_embedder = OpenAIDocumentEmbedder()

        logger.info("Generating embeddings for documents")
        embeddings = docs_embedder.run(docs)

        logger.info(f"Writing {len(embeddings['documents'])} documents to Weaviate")
        document_store.write_documents(embeddings["documents"])

        document_store.client.close()


@flow(name="Query RAG")
async def query_rag(
    query: str,
    website_url: str,
    top_k: int = 5,
) -> dict:
    """Query RAG system to get an answer based on the stored documents.

    Args:
        query: The query to search for
        website_url: URL to use as collection name and to crawl if no documents exist
        top_k: Number of documents to retrieve from the retriever

    Returns:
        Dictionary containing the answer and other information
    """
    result = {}

    async with get_document_store(website_url) as document_store:

        # If no documents exist, crawl the website
        if document_store.count_documents() == 0:
            raise ValueError("No documents found in collection. Please first crawl the website.")

        # Create RAG pipeline components
        text_embedder = OpenAITextEmbedder()
        retriever = WeaviateEmbeddingRetriever(document_store=document_store, top_k=top_k)
        generator = OpenAIGenerator(model="gpt-4o-mini")

        template = """
        Given the following information, answer the question.

        Context:
        <context>
        {% for document in documents %}
            <document>
            {{ document.content }}
            </document>
        {% endfor %}
        </context>

        Question: {{question}}
        Answer:
        """.strip()

        prompt_builder = PromptBuilder(template=template)

        # Add components to your pipeline
        logger.info("Initializing pipeline...")
        pipe = Pipeline()
        pipe.add_component("embedder", text_embedder)
        pipe.add_component("retriever", retriever)
        pipe.add_component("prompt_builder", prompt_builder)
        pipe.add_component("llm", generator)

        # Now, connect the components to each other
        pipe.connect("embedder.embedding", "retriever.query_embedding")
        pipe.connect("retriever", "prompt_builder.documents")
        pipe.connect("prompt_builder", "llm")

        # Run the pipeline
        logger.info(f"Querying with: {query}")
        result = pipe.run({"embedder": {"text": query}, "prompt_builder": {"question": query}})

    return {
        "query": query,
        "answer": result["llm"]["replies"][0],
    }


async def test_query_rag() -> None:
    """Test function for the query_rag flow."""

    query = "If you had to split the product into different Epics, what would they be? If you do not have enough information, just say so."

    # Generate RAG from website documentation
    await generate_rag_from_website_documentation(
        website_url="https://docs.predictiveindex.com/",
        max_crawl_pages=10,
        overwrite=False,
    )

    result = await query_rag(
        query=query,
        website_url="https://docs.predictiveindex.com/",
        top_k=10,
    )

    print(f"Query: {result['query']}")
    print(f"Answer: {result['answer']}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(test_query_rag())
