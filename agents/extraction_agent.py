import os
from fastapi import UploadFile, HTTPException
from utils.logger import get_logger
from services.ocr import extract_text
from services.verifier import verify_user
from services.validators import validate_pan, validate_aadhaar
from services.document_parse import parse_document, extract_aadhaar_fields, extract_pan_fields
from services.image_checks import analyze_image
from services.trust_score import calculate_trust_score
from services.qr_extractor import extract_qr_data
from services.secure_qr_decoder import decode_secure_qr
from services.comparator import compare_ocr_qr
from services.identity_comparator import compare_identity

logger = get_logger(__name__)

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

    # Use the OCR results from both documents
    aadhaar_text = aadhaar_ocr["text"]
    pan_text = pan_ocr["text"]
    text = "\n".join(filter(None, [aadhaar_text, pan_text]))
    ocr_confidence = (aadhaar_ocr["ocr_confidence"] + pan_ocr["ocr_confidence"]) / 2

    logger.info("Extracted OCR text length=%d", len(text) if text else 0)

    # ---------------- Parse Document ----------------

    aadhaar_result = parse_document(aadhaar_ocr["text"])
    if aadhaar_result.get("document_type") != "aadhaar":
        regex_data = extract_aadhaar_fields(aadhaar_ocr["text"])
        from services.llm_extractor import extract_person_details
        llm_data = extract_person_details(aadhaar_ocr["text"])
        aadhaar_result = {
            "document_type": "aadhaar",
            **regex_data,
            **llm_data
        }

    pan_result = parse_document(pan_ocr["text"])
    if pan_result.get("document_type") not in ["pan", "pan card"]:
        regex_data = extract_pan_fields(pan_ocr["text"])
        from services.llm_extractor import extract_person_details
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

    aadhaar_image_report = analyze_image(
        aadhaar_path,
        aadhaar_text,
        "aadhaar"
    )

    pan_image_report = analyze_image(
        pan_path,
        pan_text,
        "pan"
    )

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

    # QR couldn't be decoded
    # Ask frontend for Electricity Bill

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

    comparison_result = compare_ocr_qr(
        aadhaar_result,
        qr_data
    )

    # ---------------- Validate Aadhaar ----------------

    if aadhaar_result.get("aadhaar_number"):
        if not validate_aadhaar(aadhaar_result["aadhaar_number"]):
            raise HTTPException(
                status_code=400,
                detail="Extracted Aadhaar number has invalid format"
            )

    # ---------------- Validate PAN ----------------

    if pan_result.get("pan_card_number"):
        if not validate_pan(pan_result["pan_card_number"]):
            raise HTTPException(
                status_code=400,
                detail="Extracted PAN number has invalid format"
            )

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

    trust_score = calculate_trust_score(
        ocr_confidence,
        aadhaar_image_report
    )

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
