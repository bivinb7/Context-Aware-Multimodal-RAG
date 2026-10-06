import os
import uuid
from fastapi import FastAPI, UploadFile, File
from dotenv import load_dotenv
from supabase import create_client
from backend.pdf_processor import extract_text
from backend.text_chunker import chunk_text


app = FastAPI(title="PDF RAG System")

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase = create_client(url,key)

@app.post("/upload")

async def upload(file: UploadFile = File(...)):
    file_content = file.file.read()

    text = extract_text(file_content)
    chunks = chunk_text(text)

    file_id = str(uuid.uuid4())

    file_path = f"{file_id}/{file.filename}"

    supabase.storage.from_("documents").upload(
    file_path,
    file_content,
    {"content-type": file.content_type}
    )
    
    return {
        "message" : "pdf uploaded and processed succesfully" ,
        "file" : file.filename,
        "character extracted" : len(text),
        "no. of chunks : " : len(chunks),
        "first chunk " : chunks[0]
    }