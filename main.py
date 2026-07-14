import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import extraction, verification, address, history

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="DOC Verification Agent")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:4173",   # Vite preview
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(extraction.router)
app.include_router(verification.router)
app.include_router(address.router)
app.include_router(history.router)

@app.get("/")
def home():
    return {
        "status": "running",
        "message": "Document Verification API"
    }
