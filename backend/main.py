
import os
import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException
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
    try:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Please upload a PDF file."
            )

        file_content = file.file.read()

        if not file_content:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty."
            )

        # / Extract and split PDF text
        text = extract_text(file_content)

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="No extractable text found in this PDF."
            )

        chunks = chunk_text(text)
        embeddings = [create_embedding(chunk) for chunk in chunks]

        # / Prepare database records
        records = []

        for chunk, embedding in zip(chunks, embeddings):
            records.append({
                "document_name": file.filename,
                "chunk_text": chunk,
                "embedding": embedding
            })

        # / Upload PDF using a unique Storage path
        storage_path = f"{uuid.uuid4()}_{file.filename}"

        supabase.storage.from_("documents").upload(
            storage_path,
            file_content,
            {"content-type": "application/pdf"}
        )

        # / Store chunks and embeddings
        supabase.table("document_chunks").insert(records).execute()

        return {
            "message": "PDF processed and embeddings stored successfully",
            "filename": file.filename,
            "storage_path": storage_path,
            "number_of_chunks": len(chunks),
            "embedding_dimension": len(embeddings[0])
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        file.file.close()


@app.get("/search")
def search_documents(question: str, match_count: int = 5):
    try:
        if not question.strip():
            raise HTTPException(
                status_code=400,
                detail="Please enter a question."
            )

        if not 1 <= match_count <= 20:
            raise HTTPException(
                status_code=400,
                detail="match_count must be between 1 and 20."
            )

        # / Embed the user's question
        query_embedding = create_embedding(question)

        # / Retrieve the most similar PDF chunks
        result = supabase.rpc(
            "match_document_chunks",
            {
                "query_embedding": query_embedding,
                "match_count": match_count
            }
        ).execute()

        return {
            "question": question,
            "results": result.data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
