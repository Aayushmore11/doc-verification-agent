import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def clean_json(content: str):
    content = content.strip()

    if content.startswith("```"):
        content = content.replace("```json", "")
        content = content.replace("```", "")
        content = content.strip()

    return json.loads(content)


# ===========================
# Aadhaar / PAN Extractor
# ===========================

def extract_person_details(text):

    prompt = f"""
Extract the following information from the OCR text.

Return ONLY valid JSON.

{{
    "full_name": "",
    "date_of_birth": "",
    "gender": "",
    "address": ""
}}

OCR TEXT:
{text}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": "You are a KYC document parser. Return only JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return clean_json(response.choices[0].message.content)


# ===========================
# Electricity Bill Extractor
# ===========================

def extract_address_proof(text):

    prompt = f"""
You are an expert KYC document parser.

The OCR text belongs to an Indian Electricity Bill.

Extract ONLY the following fields.

Return ONLY valid JSON.

{{
    "consumer_name": "",
    "address": "",
    "city": "",
    "state": "",
    "pincode": "",
    "consumer_number": "",
    "bill_date": "",
    "provider": ""
}}

If any field is missing, return "".

OCR TEXT:

{text}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": "You are an expert electricity bill parser. Return only JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return clean_json(response.choices[0].message.content)
