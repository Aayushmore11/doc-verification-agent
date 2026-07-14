def calculate_trust_score(
    ocr_confidence,
    image_report
):

    score = 50

    if ocr_confidence > 90:
        score += 20

    elif ocr_confidence > 75:
        score += 10

    if image_report["good_resolution"]:
        score += 10

    if not image_report["is_blurry"]:
        score += 10

    if image_report["metadata_present"]:
        score += 10

    return min(score, 100)
