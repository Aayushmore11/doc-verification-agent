import re

# Multiplication table
d = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,2,3,4,0,6,7,8,9,5],
    [2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],
    [4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],
    [7,6,5,9,8,2,1,0,4,3],
    [8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0]
]

# Permutation table
p = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,5,7,6,2,8,3,0,9,4],
    [5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],
    [4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],
    [7,0,4,6,9,1,3,2,5,8]
]


def verhoeff_validate(number):

    c = 0

    reversed_digits = map(
        int,
        reversed(number)
    )

    for i, digit in enumerate(
        reversed_digits
    ):
        c = d[c][p[i % 8][digit]]

    return c == 0

def validate_pan(pan: str) -> bool:
    pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]$'
    return bool(re.match(pattern, pan))


def validate_aadhaar(aadhaar):

    if not aadhaar:
        return False

    if not aadhaar.isdigit():
        return False

    if len(aadhaar) != 12:
        return False

    if aadhaar[0] in ["0", "1"]:
        return False

    # Verhoeff checksum
    if not verhoeff_validate(aadhaar):
        return False

    return True
