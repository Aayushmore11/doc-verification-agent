from fastapi import APIRouter, File, UploadFile, Form
from agents.address_proof_agent import orchestrate_address_proof

router = APIRouter()

@router.post("/verify-address-proof")
async def verify_address_proof(
    file: UploadFile = File(...),
    aadhaar_data: str = Form(...)
):
    return await orchestrate_address_proof(file, aadhaar_data)
