import os

from fastapi import FastAPI, UploadFile, File
from dotenv import load_dotenv
from supabase import create_client

from backend.pdf_processor import extract_text
from backend.text_chunker import chunk_text
from backend.embedding import create_embedding

# / Load environment variables
load_dotenv()

app = FastAPI(title="PDF RAG System")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase = create_client(url, key)


@app.get("/")
def root():
    return {"message": "PDF RAG System API is running"}


@app.post("/upload")
def upload(file: UploadFile = File(...)):
    file_content = file.file.read()

    text = extract_text(file_content)

    chunks = chunk_text(text)

    embeddings = [create_embedding(chunk) for chunk in chunks]
    # / Create an embedding for each chunk

    records = []

    for chunk, embedding in zip(chunks, embeddings):
        records.append({
            "document_name": file.filename,
            "chunk_text": chunk,
            "embedding": embedding
        })
    # / Prepare chunks + embeddings for the database

    supabase.table("document_chunks").insert(records).execute()
    # / Store them in Supabase

    supabase.storage.from_("documents").upload(
        file.filename,
        file_content,
        {"content-type": file.content_type}
    )

    return {
        "message": "PDF processed and embeddings stored successfully",
        "filename": file.filename,
        "number_of_chunks": len(chunks),
        "embedding_dimension": len(embeddings[0])
    }