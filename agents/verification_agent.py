from fastapi import HTTPException
from models.data_loader import get_user
from services.validators import validate_aadhaar, validate_pan
from services.verifier import verify_user

def orchestrate_user_details(aadhaar: str):
    user = get_user(aadhaar)
    if user is None:
        return {
            "status": "User not found"
        }
    return user

def orchestrate_verification(user_input):
    # Aadhaar Validation
    if not validate_aadhaar(user_input.aadhaar_number):
        raise HTTPException(
            status_code=400,
            detail="Invalid Aadhaar format. Aadhaar must be a 12-digit number."
        )

    # PAN Validation
    if not validate_pan(user_input.pan_card_number):
        raise HTTPException(
            status_code=400,
            detail="Invalid PAN format. Example: ABCDE1234F"
        )

    # Only if formats are valid
    return verify_user(user_input.model_dump())
