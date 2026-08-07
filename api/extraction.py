from fastapi import APIRouter, File, Form, UploadFile
from typing import List
from agents.extraction_agent import orchestrate_extraction, orchestrate_extraction_v2
from services.loan_requirements import get_required_docs

router = APIRouter()


@router.post("/extract-document")
async def extract_document(
    aadhaar: UploadFile = File(...),
    pan: UploadFile = File(...)
):
    return await orchestrate_extraction(aadhaar, pan)


@router.get("/loan-types/{loan_type}/required-docs")
async def required_docs(loan_type: str):
    docs = get_required_docs(loan_type)
    return {"loan_type": loan_type, "required_docs": docs}


@router.post("/extract-documents")
async def extract_documents(
    loan_type: str = Form(...),
    doc_types: List[str] = Form(...),
    files: List[UploadFile] = File(...)
):
    documents = dict(zip(doc_types, files))
    return await orchestrate_extraction_v2(loan_type, documents)