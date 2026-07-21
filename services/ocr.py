
from PIL import Image
import platform
import pytesseract

if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
elif platform.system() == "Darwin":  # macOS
    pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"

    # Add these two lines here
print("OS:", platform.system())
print("Tesseract Path:", pytesseract.pytesseract.tesseract_cmd)


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
