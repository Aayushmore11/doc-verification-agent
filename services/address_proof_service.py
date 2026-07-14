from services.ocr import extract_text
from services.llm_extractor import extract_address_proof


def parse_address_proof(file_path):

    ocr_result = extract_text(file_path)

    text = ocr_result["text"]

    parsed_data = extract_address_proof(text)

    return {
        "raw_text": text,
        "ocr_confidence": ocr_result["ocr_confidence"],
        "parsed_data": parsed_data
    }
