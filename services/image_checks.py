import cv2
from PIL import Image
import pytesseract

def check_resolution(image_path):

    image = cv2.imread(image_path)

    h, w = image.shape[:2]

    return {
        "width": int(w),
        "height": int(h),
        "good_resolution": bool(
            w >= 800 and h >= 500
        )
    }

def check_blur(image_path):

    image = cv2.imread(image_path)

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    blur_score = cv2.Laplacian(
        gray,
        cv2.CV_64F
    ).var()

    return {
        "blur_score": float(
            round(blur_score, 2)
        ),
        "is_blurry": bool(
            blur_score < 50
        )
    }

def check_metadata(image_path):

    img = Image.open(image_path)

    exif = img.getexif()

    return {
        "metadata_present": bool(
            len(exif) > 0
        )
    }

def check_government_text(text):

    return bool(
        "government of india" in text.lower()
        or "भारत सरकार" in text
    )

def check_uidai(text):

    keywords = [
        "uidai",
        "aadhaar"
    ]

    return bool(
        any(
            k.lower() in text.lower()
            for k in keywords
        )
    )

def check_pan_header(text):

    keywords = [
        "income tax department",
        "government of india"
    ]

    return bool(
        any(
            k.lower() in text.lower()
            for k in keywords
        )
    )

def logo_present(
    image_path,
    template_path
):

    image = cv2.imread(
        image_path,
        0
    )

    template = cv2.imread(
        template_path,
        0
    )

    if image is None or template is None:
        return False

    result = cv2.matchTemplate(
        image,
        template,
        cv2.TM_CCOEFF_NORMED
    )

    _, max_val, _, _ = cv2.minMaxLoc(
        result
    )

    return bool(max_val > 0.6)

def analyze_image(
    image_path,
    text,
    document_type
):

    resolution = check_resolution(
        image_path
    )

    blur = check_blur(
        image_path
    )

    metadata = check_metadata(
        image_path
    )

    result = {
        **resolution,
        **blur,
        **metadata
    }

    if document_type == "aadhaar":

        result["government_text_present"] = (
            check_government_text(text)
        )

        result["uidai_present"] = (
            check_uidai(text)
        )

    if document_type == "pan":

        result["pan_header_present"] = (
            check_pan_header(text)
        )
        
    if document_type == "electricity_bill":

        keywords = [
            "consumer",
            "bill",
            "account",
            "customer",
            "electricity"
        ]

        result["bill_text_present"] = any(
            k.lower() in text.lower()
            for k in keywords
    )

    return result
