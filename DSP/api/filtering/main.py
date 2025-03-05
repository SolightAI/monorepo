import faiss
import numpy as np

from fastapi import APIRouter
from database.models import AdModel
from sentence_transformers import SentenceTransformer


router = APIRouter()
# model = SentenceTransformer('all-MiniLM-L12-v1') # TODO: try using APEX embedding 7b
model = SentenceTransformer('all-MiniLM-L6-v2') # TODO: try using APEX embedding 7b


def _generate_index(candidates: list[AdModel]) -> faiss.IndexFlatIP:
    # Generate embeddings for each ad
    embeddings = [model.encode(c.description) for c in candidates]  # Using list comprehension instead of DataFrame operations

    # Prepare embeddings in a suitable format
    embeddings_matrix = np.vstack(embeddings).astype('float32')  # Stack into a 2D array

    # Initialize FAISS index
    d = embeddings_matrix.shape[1]  # Dimension of embedding
    index = faiss.IndexFlatIP(d)  # Use IndexFlatIP for cosine similarity

    # Add embeddings to the index
    index.add(embeddings_matrix)

    return index



@router.post("/")
def select_top_k_ads(query: str, output: str, candidates: list[AdModel], k: int, context: str = None) -> list[dict]:

    index = _generate_index(candidates)

    text = f"Context: {context}\nQuery: {query}\nOutput: {output}"
    query_embedding =  model.encode(text).astype('float32').reshape(1, -1)

    distances, indices = index.search(query_embedding, k)

    # Retrieve the top ads based on the indices
    top_ads = [candidates[i] for i in indices[0]]
    similarity_scores = distances[0]

    print([{'ad': ad, 'similarity': similarity.item()} for ad, similarity in zip(top_ads, similarity_scores)])

    return [{'ad': ad, 'similarity': similarity.item()} for ad, similarity in zip(top_ads, similarity_scores)]
