from services.comparator import normalize_name, normalize_date
from rapidfuzz import fuzz

def compare_identity(aadhaar_name, pan_name, aadhaar_dob, pan_dob):
    """
    Compares the identity details from Aadhaar and PAN documents.
    Returns name_match, dob_match, and an identity_score (0-100).
    """
    # Normalize names
    norm_aadhaar_name = normalize_name(aadhaar_name)
    norm_pan_name = normalize_name(pan_name)

    # Normalize DOBs
    norm_aadhaar_dob = normalize_date(aadhaar_dob)
    norm_pan_dob = normalize_date(pan_dob)

    # Fuzzy match for names
    name_score = 0
    if norm_aadhaar_name and norm_pan_name:
        name_score = fuzz.token_sort_ratio(norm_aadhaar_name, norm_pan_name)
    
    name_match = name_score >= 80

    # DOB match
    dob_match = False
    if norm_aadhaar_dob and norm_pan_dob:
        dob_match = norm_aadhaar_dob == norm_pan_dob

    # Combined identity score (average of name similarity and DOB match score)
    dob_score = 100 if dob_match else 0
    identity_score = round((name_score + dob_score) / 2)

    return {
        "name_match": name_match,
        "dob_match": dob_match,
        "identity_score": identity_score
    }
