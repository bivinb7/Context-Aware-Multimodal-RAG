from sentence_transformers import SentenceTransformer
model = SentenceTransformer("all-MiniLM-L6-v2")

def create_embedding(text):
    embedding = model.encode(text)
    return embedding.tolist()

if __name__ == "__main__":
    text = "Python is widely used for machine learning."

    embedding = create_embedding(text)

    print("Embedding length:", len(embedding))
    print("First 10 values:", embedding[:10])