import logging
import numpy as np
from pyzbar.pyzbar import decode
from PIL import Image
import cv2

logger = logging.getLogger(__name__)

#added qr info

def extract_qr_data(image_path):
    logger.info("Extracting QR data from %s", image_path)
    try:
        image = Image.open(image_path)
        logger.info(
            "Opened image %s size=%s mode=%s",
            image_path,
            image.size,
            image.mode,
        )

        qr_codes = decode(image)
        logger.info("Pyzbar decode returned %d QR code(s)", len(qr_codes))

        if qr_codes:
            
            raw_bytes = qr_codes[0].data
            return {
                "payload": raw_bytes.decode("ascii"),   # <-- Changed
                "payload_length": len(raw_bytes),
                "raw_bytes": raw_bytes.hex(),
                "debug": "pyzbar"
            }
                    
        
        logger.info("Pyzbar did not find a QR code, trying OpenCV fallback")
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        detector = cv2.QRCodeDetector()
        data, points, _ = detector.detectAndDecode(image_cv)

        if data:
            logger.info("Decoded QR data via OpenCV: %s", data)
            return {
                "payload": data,
                "payload_length": len(data),
                "raw_bytes": None,
                "debug": "opencv"
            }

        logger.info("No QR code found in %s", image_path)
        return {
            "payload": None,
            "payload_length": 0,
            "raw_bytes": None,
            "debug": "no_qr"
        }
    except Exception as exc:
        logger.exception("Failed to extract QR data from %s", image_path)
        # return None
        return {
            "payload": None,
            "payload_length": 0,
            "raw_bytes": None,
            "debug": str(exc)
        }
