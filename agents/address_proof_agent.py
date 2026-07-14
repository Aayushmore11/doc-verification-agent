import os
import json
from fastapi import UploadFile
from utils.logger import get_logger
from services.address_proof_service import parse_address_proof
from services.address_proof_comparator import compare_address_proof
from services.image_checks import analyze_image
from services.verifier import verify_user
from services.trust_score import calculate_trust_score

logger = get_logger(__name__)

async def orchestrate_address_proof(file: UploadFile, aadhaar_data: str):
    # ---------------- Save Uploaded Bill ----------------

    os.makedirs("input", exist_ok=True)
    safe_filename = os.path.basename(file.filename)
    file_path = os.path.join("input", f"temp_{safe_filename}")

    with open(file_path, "wb") as f:
        f.write(await file.read())

    # ---------------- Convert Aadhaar JSON ----------------

    aadhaar_data = json.loads(aadhaar_data)

    # ---------------- OCR + Parse Electricity Bill ----------------

    bill_result = parse_address_proof(file_path)

    bill_data = bill_result["parsed_data"]
    raw_text = bill_result["raw_text"]
    ocr_confidence = bill_result["ocr_confidence"]

    # ---------------- Compare Aadhaar vs Bill ----------------

    comparison_result = compare_address_proof(
        aadhaar_data,
        bill_data
    )

    # ---------------- Analyze Bill Image ----------------

    image_report = analyze_image(
        file_path,
        raw_text,
        "electricity_bill"
    )

    # ---------------- Database Verification ----------------

    verification_result = verify_user(aadhaar_data)

    # ---------------- Trust Score ----------------

    trust_score = calculate_trust_score(
        ocr_confidence,
        image_report
    )

    # ---------------- Risk Flags ----------------

    risk_flags = []

    if image_report["is_blurry"]:
        risk_flags.append("Blurry Electricity Bill")

    if ocr_confidence < 70:
        risk_flags.append("Low OCR Confidence")

    if not image_report["good_resolution"]:
        risk_flags.append("Low Resolution")

    # ---------------- Final Response ----------------  

    return {
        "status": "VERIFIED_WITH_ADDRESS_PROOF",
        "raw_text": raw_text,
        "ocr_confidence": ocr_confidence,
        "image_quality": image_report,
        "trust_score": trust_score,
        "comparison": comparison_result,
        "risk_flags": risk_flags,
        "bill_data": bill_data,
        "verification_result": verification_result
    }
