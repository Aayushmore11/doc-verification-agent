import pytesseract
from PIL import Image

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def extract_text(image_path):

    image = Image.open(image_path)

    # Extract text
    text = pytesseract.image_to_string(image)

    # Extract OCR confidence
    data = pytesseract.image_to_data(
        image,
        output_type=pytesseract.Output.DICT
    )

    confidences = []

    for conf in data["conf"]:

        try:
            conf = float(conf)

            if conf >= 0:
                confidences.append(conf)

        except ValueError:
            pass

    ocr_confidence = (
        sum(confidences) / len(confidences)
        if confidences
        else 0
    )

    return {
        "text": text,
        "ocr_confidence": round(ocr_confidence, 2)
    }
