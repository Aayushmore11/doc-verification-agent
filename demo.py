import requests

BASE_URL = "http://127.0.0.1:8000"

def check_status():
    try:
        response = requests.get(f"{BASE_URL}/")
        print("Status Check Response:")
        print(response.json())
    except Exception as e:
        print("Could not connect to the API. Is it running?")
        print(e)

if __name__ == "__main__":
    check_status()
