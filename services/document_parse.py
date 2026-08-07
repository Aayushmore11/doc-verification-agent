import re
from datetime import datetime
from services.llm_extractor import extract_person_details

def extract_aadhaar_fields(text):

    aadhaar_match = re.search(
        r"\b\d{4}\s?\d{4}\s?\d{4}\b",
        text
    )

    dob_match = re.search(
        r"(\d{2}/\d{2}/\d{4})",
        text
    )

    return {
        "aadhaar_number":
            aadhaar_match.group().replace(" ", "")
            if aadhaar_match else None,

        "date_of_birth":
            datetime.strptime(
                dob_match.group(),
                "%d/%m/%Y"
            ).strftime("%Y-%m-%d")
            if dob_match else None
    }

def extract_pan_fields(text):

    pan_match = re.search(
        r"[A-Z]{5}[0-9]{4}[A-Z]",
        text
    )

    return {
        "pan_card_number":
            pan_match.group()
            if pan_match else None
    }


def extract_voter_id_fields(text):

    voter_id_match = re.search(
        r"\b[A-Z]{3}[0-9]{7}\b",
        text
    )

    return {
        "voter_id_number":
            voter_id_match.group()
            if voter_id_match else None
    }


def extract_passport_fields(text):

    passport_match = re.search(
        r"\b[A-Z][0-9]{4}\s?[0-9]{3}\b",
        text
    )

    return {
        "passport_number":
            passport_match.group().replace(" ", "")
            if passport_match else None
    }


def parse_document(text):

    # ---------------- PAN ----------------

    if re.search(r"[A-Z]{5}[0-9]{4}[A-Z]", text):

        regex_data = extract_pan_fields(text)

        llm_data = extract_person_details(text)

        print("REGEX DATA:", regex_data)
        print("LLM DATA:", llm_data)
        print("========== PAN OCR ==========")
        print(text)

        print("========== REGEX ==========")
        print(regex_data)

        print("========== LLM ==========")
        print(llm_data)
            
        return {
            "document_type": "pan card",
            **regex_data,
            **llm_data
        }

    # ---------------- Aadhaar ----------------

    if re.search(r"\b\d{4}\s?\d{4}\s?\d{4}\b", text):

        regex_data = extract_aadhaar_fields(text)

        llm_data = extract_person_details(text)

        return {
            "document_type": "aadhaar",
            **regex_data,
            **llm_data
        }

    # ---------------- Voter ID ----------------

    if re.search(r"\b[A-Z]{3}[0-9]{7}\b", text):

        regex_data = extract_voter_id_fields(text)

        llm_data = extract_person_details(text)

        return {
            "document_type": "voter_id",
            **regex_data,
            **llm_data
        }

    # ---------------- Passport ----------------

    if re.search(r"\b[A-Z][0-9]{4}\s?[0-9]{3}\b", text):

        regex_data = extract_passport_fields(text)

        llm_data = extract_person_details(text)

        return {
            "document_type": "passport",
            **regex_data,
            **llm_data
        }

    # ---------------- Unknown ----------------

    return {
        "document_type": "unknown",
        "raw_text": text
    }