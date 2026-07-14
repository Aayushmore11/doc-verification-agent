from models.data_loader import get_user, find_user_by_fields
from rapidfuzz import fuzz
from datetime import datetime


def normalize_date(date_str):

    if not date_str:
        return None

    date_str = str(date_str).strip()

    formats = [
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%Y/%m/%d"
    ]

    for fmt in formats:
        try:
            return datetime.strptime(
                date_str,
                fmt
            ).strftime("%Y-%m-%d")
        except ValueError:
            pass

    return date_str


def fuzzy_match(value1, value2, threshold=85):
    """
    Returns:
        (is_match, similarity_score)
    """

    if not value1 or not value2:
        return False, 0

    score = fuzz.ratio(
        str(value1).lower().strip(),
        str(value2).lower().strip()
    )

    return score >= threshold, score


def verify_user(user):
    aadhaar_number = user.get("aadhaar_number")

    # <-- ADD THE DEBUG PRINTS HERE

    print("=" * 60)
    print("USER DATA:")
    print(user)

    print("AADHAAR NUMBER:")
    print(aadhaar_number)

    record = None

    if aadhaar_number:
        record = get_user(aadhaar_number)

    print("GET USER RESULT:")
    print(record)

    if record is None:
        record = find_user_by_fields(user)

    print("FIND USER RESULT:")
    print(record)
    print("=" * 60)

    # Existing code continues...



    aadhaar_number = user.get("aadhaar_number")

    record = None

    if aadhaar_number:
        record = get_user(aadhaar_number)

    if record is None:
        record = find_user_by_fields(user)

    if record is None:
        return {
            "status": "REVIEW",
            "verification_score": 0,
            "matched_fields": [],
            "mismatched_fields": [],
            "missing_fields": [],
            "similarity_scores": {}
        }

    score = 0
    compared_fields = 0

    matched_fields = []
    mismatched_fields = []
    missing_fields = []

    similarity_scores = {}

    field_mapping = {
        "full_name": "full_name",
        "date_of_birth": "date_of_birth",
        "gender": "gender",
        "address": "address",
        "phone_number": "phone_number",
        "pan_card_number": "pan_card_number"
    }

    fuzzy_fields = {
        "full_name",
        "address"
    }
    

    for user_field, db_field in field_mapping.items():

        user_value = user.get(user_field)
        db_value = record.get(db_field)

        if user_value in [None, ""]:
            missing_fields.append(user_field)
            continue

        if db_value is None:
            continue

        compared_fields += 1

        # ----------------------------
        # Fuzzy Matching
        # ----------------------------
        if user_field in fuzzy_fields:

            is_match, similarity = fuzzy_match(
                user_value,
                db_value,
                threshold=80
            )

        else:

            if user_field == "date_of_birth":
                user_value = normalize_date(user_value)
                db_value = normalize_date(db_value)

            is_match = (
                str(user_value).strip().lower()
                ==
                str(db_value).strip().lower()
            )

            similarity = 100 if is_match else 0

        similarity_scores[user_field] = similarity

        if is_match:

            score += 1

            matched_fields.append({
                "field": user_field,
                "user_value": user_value,
                "database_value": db_value,
                "similarity": similarity
            })

        else:

            mismatched_fields.append({
                "field": user_field,
                "user_value": user_value,
                "database_value": db_value,
                "similarity": similarity
            })

    trust_score = (
        score / compared_fields
        if compared_fields > 0
        else 0
    )

    if compared_fields == 0:
        status = "REVIEW"

    elif trust_score >= 0.85:
        status = "VERIFIED"

    elif trust_score >= 0.60:
        status = "REVIEW"

    else:
        status = "REJECTED"

    return {
        "status": status,
        "verification_score": round(trust_score * 100, 2),

        "matched_fields": matched_fields,
        "mismatched_fields": mismatched_fields,
        "missing_fields": missing_fields,

        "similarity_scores": similarity_scores
    }
