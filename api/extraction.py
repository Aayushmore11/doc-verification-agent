from fastapi import APIRouter, File, UploadFile
from agents.extraction_agent import orchestrate_extraction

router = APIRouter()

@router.post("/extract-document")
async def extract_document(
    aadhaar: UploadFile = File(...),
    pan: UploadFile = File(...)
):
    return await orchestrate_extraction(aadhaar, pan)
