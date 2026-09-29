import os
from fastapi import FastAPI, UploadFile, File
from dotenv import load_dotenv
from supabase import create_client

app = FastAPI(title="PDF RAG System")

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase = create_client(url,key)

@app.post("/upload")

async def upload(file: UploadFile = File(...)):
    file_content = file.file.read()

    supabase.storage.from_("documents").upload(
        file.filename,
        file_content,
        {"content-type" : file.content_type}
    )
    return {
        "message" : "pdf uploaded succesfully" ,
        "file" : file.filename
    }