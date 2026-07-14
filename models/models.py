from pydantic import BaseModel

class UserInput(BaseModel):
    aadhaar_number: str
    full_name: str
    phone_number: str
    pan_card_number: str
    date_of_birth: str
