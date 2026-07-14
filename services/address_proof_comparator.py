from difflib import SequenceMatcher
import re


def normalize_text(text):

    if not text:
        return ""

    text = text.lower()

    text = re.sub(r"[.,:/-]", " ", text)

    text = " ".join(text.split())

    return text


def compare_name(aadhaar_name, bill_name):

    aadhaar = normalize_text(aadhaar_name)
    bill = normalize_text(bill_name)

    similarity = SequenceMatcher(
        None,
        aadhaar,
        bill
    ).ratio()

    return similarity >= 0.90, round(similarity * 100, 2)


def compare_address(aadhaar_address, bill_address):

    aadhaar = normalize_text(aadhaar_address)
    bill = normalize_text(bill_address)

    similarity = SequenceMatcher(
        None,
        aadhaar,
        bill
    ).ratio()

    return similarity >= 0.75, round(similarity * 100, 2)


def compare_address_proof(aadhaar_data, bill_data):

    comparison = {}

    matched = 0
    total = 2

    # --------------------
    # Name
    # --------------------

    name_match, name_similarity = compare_name(
        aadhaar_data.get("full_name", ""),
        bill_data.get("consumer_name", "")
    )

    comparison["full_name"] = {

        "aadhaar": aadhaar_data.get("full_name"),

        "electricity_bill": bill_data.get("consumer_name"),

        "match": name_match,

        "similarity": name_similarity
    }

    if name_match:
        matched += 1

    # --------------------
    # Address
    # --------------------

    address_match, address_similarity = compare_address(

        aadhaar_data.get("address", ""),

        bill_data.get("address", "")

    )

    comparison["address"] = {

        "aadhaar": aadhaar_data.get("address"),

        "electricity_bill": bill_data.get("address"),

        "match": address_match,

        "similarity": address_similarity
    }

    if address_match:
        matched += 1

    score = round((matched / total) * 100)

    return {

        "comparison": comparison,

        "matched_fields": matched,

        "total_fields": total,

        "match_score": score
    }

if __name__ == "__main__":

    aadhaar = {

        "full_name": "Aayush Shailesh More",

        "address": "R.M.M.S Compound Room No 14 Parel Mumbai Maharashtra 400012"

    }

    bill = {

        "consumer_name": "Aayush Shailesh More",

        "address": "R.M.M.S Compound Room No 14 Parel Mumbai Maharashtra 400012"

    }

    from pprint import pprint

    pprint(compare_address_proof(aadhaar, bill))
