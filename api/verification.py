from fastapi import APIRouter
from models.models import UserInput
from agents.verification_agent import orchestrate_user_details, orchestrate_verification

router = APIRouter()

@router.get("/user/{aadhaar}")
def user_details(aadhaar: str):
    return orchestrate_user_details(aadhaar)

@router.post("/verify")
def verify(user: UserInput):
    return orchestrate_verification(user)
