def decimal_to_bytes(payload: str):
    number = int(payload)
    length = (number.bit_length() + 7) // 8
    return number.to_bytes(length, "big")

import gzip

def decompress_payload(byte_data: bytes):
    return gzip.decompress(byte_data)

def parse_secure_qr(decompressed):

    fields = [
        f.decode("utf-8", errors="ignore")
        for f in decompressed.split(b"\xff")[:18]
    ]

    address = ", ".join(
        filter(
            None,
            [
                fields[9],
                fields[10],
                fields[14],
                fields[15],
                fields[12],
                fields[13],
                fields[11]
            ]
        )
    )

    return {
        "version": fields[0],
        "qr_version": fields[1],
        "reference_id": fields[2],
        "full_name": fields[3],
        "date_of_birth": fields[4],
        "gender": fields[5],
        "care_of": fields[6],
        "city": fields[7],
        "address": address,
        "masked_mobile": fields[17]
    }
def decode_secure_qr(payload: str):

    bytes_data = decimal_to_bytes(payload)

    decompressed = decompress_payload(bytes_data)

    return parse_secure_qr(decompressed)
