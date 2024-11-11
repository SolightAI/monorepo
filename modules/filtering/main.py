import faiss
import numpy as np

from database.models import Ad
from sentence_transformers import SentenceTransformer


model = SentenceTransformer('all-MiniLM-L6-v2')


def _generate_index(candidates: list[Ad]) -> faiss.IndexFlatIP:
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



def select_top_k_ads(query: str, output: str, candidates: list[Ad], k: int, context: str = None) -> list[dict]:

    index = _generate_index(candidates)

    text = f"Context: {context}\nQuery: {query}\nOutput: {output}"
    query_embedding =  model.encode(text).astype('float32').reshape(1, -1)

    distances, indices = index.search(query_embedding, k)

    # Retrieve the top ads based on the indices
    top_ads = [candidates[i] for i in indices[0]]
    similarity_scores = distances[0]

    return [{'ad': ad, 'similarity': similarity} for ad, similarity in zip(top_ads, similarity_scores)]
