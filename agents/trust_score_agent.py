from services.trust_score import calculate_trust_score

def orchestrate_trust_score(ocr_confidence, image_report):
    return calculate_trust_score(ocr_confidence, image_report)
