def get_required_docs(loan_type: str) -> list[str]:
    match loan_type:
        case "personal_loan":
            return ["aadhaar", "pan", "passport"]
        case "car_loan":
            return ["aadhaar", "pan", "voter_id"]
        case "tractor_loan":
            return ["aadhaar", "pan", "voter_id"]
        case "cv_loan":
            return ["aadhaar", "pan", "voter_id"]
        case "msme_loan":
            return ["aadhaar", "pan"]
        case _:
            raise ValueError(f"Unknown loan type: {loan_type}")


def get_cross_checks(loan_type: str) -> dict:
    match loan_type:
        case "personal_loan" | "car_loan" | "tractor_loan" | "cv_loan":
            return {
                "qr_verification": ["aadhaar"],
                "identity_comparison": ["aadhaar", "pan"],
            }
        case "msme_loan":
            return {
                "qr_verification": ["aadhaar"],
                "identity_comparison": ["aadhaar", "pan"],
            }
        case _:
            return {}