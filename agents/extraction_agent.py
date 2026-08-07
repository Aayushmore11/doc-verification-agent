import os
from fastapi import UploadFile, HTTPException
from utils.logger import get_logger
from services.ocr import extract_text
from services.verifier import verify_user
from services.validators import validate_pan, validate_aadhaar, validate_voter_id, validate_passport
from services.document_parse import (
    parse_document,
    extract_aadhaar_fields,
    extract_pan_fields,
    extract_voter_id_fields,
    extract_passport_fields,
)
from services.image_checks import analyze_image
from services.trust_score import calculate_trust_score
from services.qr_extractor import extract_qr_data
from services.secure_qr_decoder import decode_secure_qr
from services.comparator import compare_ocr_qr
from services.identity_comparator import compare_identity
from services.llm_extractor import extract_person_details
from services.loan_requirements import get_required_docs, get_cross_checks
from utils.change_logger import log_change

logger = get_logger(__name__)


# ==================================================
# NEW: Dispatcher (Step 4) — used by the new
# generalized orchestrator we build in Step 5.
# Does NOT affect orchestrate_extraction() below.
# ==================================================

def parse_and_extract(doc_type: str, text: str) -> dict:
    """
    Runs parse_document() (auto-detect), and if the detected type
    doesn't match what we EXPECTED for this upload slot, forces the
    correct extractor + LLM fallback — same pattern already used
    below for Aadhaar/PAN individually.
    """
    result = parse_document(text)

    expected_type_map = {
        "aadhaar": "aadhaar",
        "pan": "pan card",
        "voter_id": "voter_id",
        "passport": "passport",
    }

    expected_document_type = expected_type_map.get(doc_type, doc_type)

    if result.get("document_type") != expected_document_type:
        match doc_type:
            case "aadhaar":
                regex_data = extract_aadhaar_fields(text)
            case "pan":
                regex_data = extract_pan_fields(text)
            case "voter_id":
                regex_data = extract_voter_id_fields(text)
            case "passport":
                regex_data = extract_passport_fields(text)
            case _:
                regex_data = {}

        llm_data = extract_person_details(text)

        result = {
            "document_type": expected_document_type,
            **regex_data,
            **llm_data
        }

    return result


# ==================================================
# EXISTING — unchanged, still working as-is
# ==================================================

async def orchestrate_extraction(aadhaar: UploadFile, pan: UploadFile):
    os.makedirs("input", exist_ok=True)
    aadhaar_path = os.path.join("input", f"temp_{os.path.basename(aadhaar.filename)}")
    pan_path = os.path.join("input", f"temp_{os.path.basename(pan.filename)}")

    with open(aadhaar_path, "wb") as f:
        f.write(await aadhaar.read())

    with open(pan_path, "wb") as f:
        f.write(await pan.read())

    # ---------------- OCR ----------------

    aadhaar_ocr = extract_text(aadhaar_path)
    pan_ocr = extract_text(pan_path)

    aadhaar_text = aadhaar_ocr["text"]
    pan_text = pan_ocr["text"]
    text = "\n".join(filter(None, [aadhaar_text, pan_text]))
    ocr_confidence = (aadhaar_ocr["ocr_confidence"] + pan_ocr["ocr_confidence"]) / 2

    logger.info("Extracted OCR text length=%d", len(text) if text else 0)

    # ---------------- Parse Document ----------------

    aadhaar_result = parse_document(aadhaar_ocr["text"])
    if aadhaar_result.get("document_type") != "aadhaar":
        regex_data = extract_aadhaar_fields(aadhaar_ocr["text"])
        llm_data = extract_person_details(aadhaar_ocr["text"])
        aadhaar_result = {
            "document_type": "aadhaar",
            **regex_data,
            **llm_data
        }

    pan_result = parse_document(pan_ocr["text"])
    if pan_result.get("document_type") not in ["pan", "pan card"]:
        regex_data = extract_pan_fields(pan_ocr["text"])
        llm_data = extract_person_details(pan_ocr["text"])
        if not regex_data.get("date_of_birth"):
            regex_data["date_of_birth"] = llm_data.get("date_of_birth")
        pan_result = {
            "document_type": "pan card",
            **regex_data,
            **llm_data
        }

    identity_result = compare_identity(
        aadhaar_result.get("full_name"),
        pan_result.get("full_name"),
        aadhaar_result.get("date_of_birth"),
        pan_result.get("date_of_birth")
    )

    logger.info("Parsed Aadhaar: %s", aadhaar_result)
    logger.info("Parsed PAN: %s", pan_result)

    # ---------------- Image Quality ----------------

    aadhaar_image_report = analyze_image(aadhaar_path, aadhaar_text, "aadhaar")
    pan_image_report = analyze_image(pan_path, pan_text, "pan")

    # ---------------- QR Extraction ----------------

    qr_result = extract_qr_data(aadhaar_path)

    qr_payload = None
    qr_payload_length = None
    qr_payload_preview = None
    qr_debug = None

    if isinstance(qr_result, dict):
        qr_payload = qr_result.get("payload")
        qr_payload_length = qr_result.get("payload_length")
        qr_debug = qr_result.get("debug")
    else:
        qr_payload = qr_result

    if isinstance(qr_payload, (bytes, bytearray)):
        qr_payload_preview = qr_payload[:40].hex()
    elif isinstance(qr_payload, str):
        qr_payload_preview = qr_payload[:40]

    logger.info("QR extraction returned: %s", qr_payload)
    logger.info("QR debug info: %s", qr_debug)

    # ---------------- Secure QR Decode ----------------

    qr_data = None
    if qr_payload:
        qr_data = decode_secure_qr(qr_payload)

    if qr_data is None:
        aadhaar_result["pan_card_number"] = pan_result.get("pan_card_number")
        return {
            "status": "NEED_ADDRESS_PROOF",
            "message": "Secure QR could not be decoded. Please upload an Electricity Bill.",
            "aadhaar_data": aadhaar_result,
            "pan_data": pan_result,
            "identity_comparison": identity_result,
            "aadhaar_ocr_confidence": aadhaar_ocr["ocr_confidence"],
            "pan_ocr_confidence": pan_ocr["ocr_confidence"],
            "aadhaar_image_quality": aadhaar_image_report,
            "pan_image_quality": pan_image_report,
            "ocr_confidence": ocr_confidence,
            "image_quality": aadhaar_image_report,
            "parsed_data": aadhaar_result
        }

    # ---------------- OCR vs QR ----------------

    comparison_result = compare_ocr_qr(aadhaar_result, qr_data)

    # ---------------- Validate Aadhaar ----------------

    if aadhaar_result.get("aadhaar_number"):
        if not validate_aadhaar(aadhaar_result["aadhaar_number"]):
            raise HTTPException(status_code=400, detail="Extracted Aadhaar number has invalid format")

    # ---------------- Validate PAN ----------------

    if pan_result.get("pan_card_number"):
        if not validate_pan(pan_result["pan_card_number"]):
            raise HTTPException(status_code=400, detail="Extracted PAN number has invalid format")

    # ---------------- Database Verification ----------------

    aadhaar_result["pan_card_number"] = pan_result.get("pan_card_number")

    combined_data = {
        "full_name": aadhaar_result.get("full_name"),
        "date_of_birth": aadhaar_result.get("date_of_birth"),
        "aadhaar_number": aadhaar_result.get("aadhaar_number"),
        "pan_card_number": pan_result.get("pan_card_number")
    }

    verification_result = verify_user(combined_data)

    # ---------------- Trust Score ----------------

    trust_score = calculate_trust_score(ocr_confidence, aadhaar_image_report)

    # ---------------- Risk Flags ----------------

    risk_flags = []

    if aadhaar_image_report.get("is_blurry"):
        risk_flags.append("Blurry document")
    if pan_image_report.get("is_blurry"):
        risk_flags.append("Blurry PAN document")
    if ocr_confidence < 70:
        risk_flags.append("Low OCR confidence")
    if not aadhaar_image_report.get("good_resolution"):
        risk_flags.append("Low resolution image")
    if not pan_image_report.get("good_resolution"):
        risk_flags.append("Low PAN resolution image")

    # ---------------- Final Response ----------------

    return {
        "raw_text": text,
        "ocr_confidence": ocr_confidence,
        "image_quality": aadhaar_image_report,
        "aadhaar_ocr_confidence": aadhaar_ocr["ocr_confidence"],
        "pan_ocr_confidence": pan_ocr["ocr_confidence"],
        "aadhaar_image_quality": aadhaar_image_report,
        "pan_image_quality": pan_image_report,
        "trust_score": trust_score,
        "qr_data": qr_data,
        "comparison": comparison_result,
        "identity_comparison": identity_result,
        "risk_flags": risk_flags,
        "parsed_data": aadhaar_result,
        "pan_data": pan_result,
        "payload_length": qr_payload_length,
        "payload_preview": qr_payload_preview,
        "verification_result": verification_result
    }



# ==================================================
# NEW: Generalized orchestrator (Step 5)
# ==================================================

async def save_upload(file: UploadFile, doc_type: str) -> str:
    os.makedirs("input", exist_ok=True)
    path = os.path.join("input", f"temp_{doc_type}_{os.path.basename(file.filename)}")
    with open(path, "wb") as f:
        f.write(await file.read())
    return path


def run_cross_checks(loan_type: str, doc_results: dict) -> dict:
    cross_checks = get_cross_checks(loan_type)
    output = {}

    for check_name, needed_docs in cross_checks.items():
        if not all(doc in doc_results for doc in needed_docs):
            continue

        match check_name:
            case "qr_verification":
                aadhaar_path = doc_results["aadhaar"]["path"]
                qr_result = extract_qr_data(aadhaar_path)

                qr_payload = None
                if isinstance(qr_result, dict):
                    qr_payload = qr_result.get("payload")
                else:
                    qr_payload = qr_result

                qr_data = decode_secure_qr(qr_payload) if qr_payload else None

                output["qr_verification"] = {
                    "qr_data": qr_data,
                    "comparison": compare_ocr_qr(doc_results["aadhaar"]["parsed"], qr_data) if qr_data else None,
                    "status": "NEED_ADDRESS_PROOF" if qr_data is None else "OK"
                }

            case "identity_comparison":
                # Compare every pair of identity documents present,
                # not just aadhaar vs pan. This catches mismatched
                # identities across ANY combination of uploaded ID docs.
                id_doc_types = ["aadhaar", "pan", "voter_id", "passport"]
                present_ids = [d for d in id_doc_types if d in doc_results]

                comparisons = {}
                overall_mismatch = False

                for i in range(len(present_ids)):
                    for j in range(i + 1, len(present_ids)):
                        doc_a = present_ids[i]
                        doc_b = present_ids[j]

                        parsed_a = doc_results[doc_a]["parsed"]
                        parsed_b = doc_results[doc_b]["parsed"]

                        pair_result = compare_identity(
                            parsed_a.get("full_name"),
                            parsed_b.get("full_name"),
                            parsed_a.get("date_of_birth"),
                            parsed_b.get("date_of_birth"),
                        )

                        comparisons[f"{doc_a}_vs_{doc_b}"] = pair_result

                        if not pair_result.get("name_match") or not pair_result.get("dob_match"):
                            overall_mismatch = True

                            
                output["identity_comparison"] = {
                    "pairwise": comparisons,
                    "overall_mismatch_detected": overall_mismatch
                }
    return output


async def orchestrate_extraction_v2(loan_type: str, documents: dict[str, UploadFile]):
    required_docs = get_required_docs(loan_type)

    missing = [doc for doc in required_docs if doc not in documents]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing documents: {missing}")

    doc_results = {}

    for doc_type, file in documents.items():
        path = await save_upload(file, doc_type)
        ocr_result = extract_text(path)
        parsed = parse_and_extract(doc_type, ocr_result["text"])
        image_report = analyze_image(path, ocr_result["text"], doc_type)

        if doc_type == "aadhaar" and parsed.get("aadhaar_number"):
            if not validate_aadhaar(parsed["aadhaar_number"]):
                raise HTTPException(status_code=400, detail="Extracted Aadhaar number has invalid format")

        if doc_type == "pan" and parsed.get("pan_card_number"):
            if not validate_pan(parsed["pan_card_number"]):
                raise HTTPException(status_code=400, detail="Extracted PAN number has invalid format")

        if doc_type == "voter_id" and parsed.get("voter_id_number"):
            if not validate_voter_id(parsed["voter_id_number"]):
                raise HTTPException(status_code=400, detail="Extracted Voter ID has invalid format")

        if doc_type == "passport" and parsed.get("passport_number"):
            if not validate_passport(parsed["passport_number"]):
                raise HTTPException(status_code=400, detail="Extracted Passport number has invalid format")

        doc_results[doc_type] = {
            "path": path,
            "ocr": ocr_result,
            "parsed": parsed,
            "image_quality": image_report,
        }

        logger.info("Parsed %s: %s", doc_type, parsed)

    cross_check_results = run_cross_checks(loan_type, doc_results)

    # ---------------- Combined identity data (for DB verification) ----------------
    # Priority: aadhaar fields are the "primary" identity, filled in by
    # whatever other docs are present if aadhaar is missing a field.

    combined_data = {}
    priority_order = ["aadhaar", "pan", "voter_id", "passport"]

    for doc_type in priority_order:
        if doc_type not in doc_results:
            continue
        parsed = doc_results[doc_type]["parsed"]
        for field in ["full_name", "date_of_birth"]:
            if not combined_data.get(field) and parsed.get(field):
                combined_data[field] = parsed[field]

    if "aadhaar" in doc_results:
        combined_data["aadhaar_number"] = doc_results["aadhaar"]["parsed"].get("aadhaar_number")
    if "pan" in doc_results:
        combined_data["pan_card_number"] = doc_results["pan"]["parsed"].get("pan_card_number")
    if "voter_id" in doc_results:
        combined_data["voter_id_number"] = doc_results["voter_id"]["parsed"].get("voter_id_number")
    if "passport" in doc_results:
        combined_data["passport_number"] = doc_results["passport"]["parsed"].get("passport_number")

    verification_result = verify_user(combined_data)

    # ---------------- Trust Score ----------------
    # Average OCR confidence across all uploaded docs.
    # Use the "primary" doc's image report (aadhaar if present, else first doc).

    all_confidences = [r["ocr"]["ocr_confidence"] for r in doc_results.values()]
    overall_ocr_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0

    primary_doc_type = "aadhaar" if "aadhaar" in doc_results else next(iter(doc_results))
    primary_image_report = doc_results[primary_doc_type]["image_quality"]

    trust_score = calculate_trust_score(overall_ocr_confidence, primary_image_report)

    # ---------------- Risk Flags ----------------
    risk_flags = []
    for doc_type, result in doc_results.items():
        if result["image_quality"].get("is_blurry"):
            risk_flags.append(f"Blurry {doc_type} document")
        if not result["image_quality"].get("good_resolution"):
            risk_flags.append(f"Low resolution {doc_type} image")
        if result["ocr"]["ocr_confidence"] < 70:
            risk_flags.append(f"Low OCR confidence on {doc_type}")

    # ---------------- Change Log ----------------
            

    log_change(
        change_type="verification_run",
        description=f"Processed {loan_type} verification",
        metadata={
            "loan_type": loan_type,
            "doc_types": list(documents.keys()),
            "verification_status": verification_result.get("status"),
            "trust_score": trust_score,
            "identity_mismatch": cross_check_results.get("identity_comparison", {}).get("overall_mismatch_detected")
        }
    )

    return {
        "loan_type": loan_type,
        "documents": doc_results,
        "cross_checks": cross_check_results,
        "combined_identity": combined_data,
        "verification_result": verification_result,
        "trust_score": trust_score,
        "ocr_confidence": overall_ocr_confidence,
        "risk_flags": risk_flags,
    }