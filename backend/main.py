from fastapi import FastAPI
app = FastAPI(title="PDF RAG System")
@app.get("/")

def root():
    return {"message":"PDF RAG System API is running"}