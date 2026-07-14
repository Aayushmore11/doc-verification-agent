from difflib import SequenceMatcher
from datetime import datetime
import re
def normalize_date(date_string):

    if not date_string:
        return ""

    formats = [

        "%d/%m/%Y",

        "%d-%m-%Y",

        "%Y-%m-%d"

    ]

    for fmt in formats:

        try:

            return datetime.strptime(
                date_string,
                fmt
            ).strftime("%Y-%m-%d")

        except ValueError:

            pass

    return date_string

def normalize_name(name):

    if not name:
        return ""

    return " ".join(name.lower().split())
def normalize_gender(gender):

    if not gender:
        return ""

    gender = gender.upper()

    mapping = {
        "M": "MALE",
        "F": "FEMALE",
        "MALE": "MALE",
        "FEMALE": "FEMALE",
        "O": "OTHER",
        "OTHER": "OTHER"
    }

    return mapping.get(gender, gender)
def normalize_address(address):

    if not address:
        return ""

    address = address.lower()

    address = re.sub(r"[.,:-]", " ", address)

    # Remove common address labels
    address = re.sub(r"\bs/o\b", " ", address)
    address = re.sub(r"\bc/o\b", " ", address)
    address = re.sub(r"\bpo\b", " ", address)
    address = re.sub(r"\bdist\b", " ", address)
    address = re.sub(r"\bdistrict\b", " ", address)

    # Remove extra spaces
    address = " ".join(address.split())

    address = " ".join(address.split())

    return address

def compare_address(ocr_address, qr_address):

    ocr = normalize_address(ocr_address)
    qr = normalize_address(qr_address)

    similarity = SequenceMatcher(
        None,
        ocr,
        qr
    ).ratio()

    return similarity >= 0.80, round(similarity * 100, 2)


def compare_ocr_qr(ocr_data, qr_data):

    comparison = {}

    total_fields = 0
    matched_fields = 0

    field_mapping = {
        "full_name": normalize_name,
        "date_of_birth": normalize_date,
        "gender": normalize_gender,
        "address": normalize_address
    }


    for field, normalizer in field_mapping.items():

        ocr_value = ocr_data.get(field, "")
        qr_value = qr_data.get(field, "")

        ocr_normalized = normalizer(ocr_value)
        qr_normalized = normalizer(qr_value)

        if field == "address":

            match, similarity = compare_address(
                ocr_value,
                qr_value
            )

            comparison[field] = {
                "ocr": ocr_value,
                "qr": qr_value,
                "match": match,
                "similarity": similarity
            }

        else:

            match = ocr_normalized == qr_normalized

            comparison[field] = {
                "ocr": ocr_value,
                "qr": qr_value,
                "match": match
            }

                
        total_fields += 1

        if match:
            matched_fields += 1

    match_score = round((matched_fields / total_fields) * 100)

    return {
        "comparison": comparison,
        "matched_fields": matched_fields,
        "total_fields": total_fields,
        "match_score": match_score
    }

if __name__ == "__main__":

    ocr_data = {
        "full_name": "Aayush Shailesh More",
        "date_of_birth": "11/03/2006",
        "gender": "MALE",
        "address": "S/O: Shailesh More, R.M.M.S Compound, Room No 14, G.D Ambekar Marg, Parel, Bhoiwada, Mumbai, PO: Parel, DIST: Mumbai, Maharashtra - 400012"
    }

    qr_data = {
        "full_name": "Aayush Shailesh More",
        "date_of_birth": "11-03-2006",
        "gender": "M",
        "address": "R.M.M.S Compound, Room No 14, Parel, Bhoiwada, G.D Ambekar Marg, Mumbai, Parel, Maharashtra, 400012"
    }

    result = compare_ocr_qr(ocr_data, qr_data)

    from pprint import pprint
    pprint(result)
