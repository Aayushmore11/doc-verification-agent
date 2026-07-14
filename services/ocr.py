import os
import pytesseract
from PIL import Image
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Tesseract path
tesseract_cmd = os.getenv("TESSERACT_CMD")
if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
elif os.name == 'nt':
    # Default path on Windows systems
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
# On Linux/macOS, pytesseract will automatically find 'tesseract' in the system PATH if not overridden.

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
