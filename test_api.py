import requests
import json

APP_KEY = "d3aba8d467ffabd2"
SIGN = "NzBhN2U0NDU5MGE1NzVlMjQxZjhiMDFjMGFkZjU4ODNmYTYyODBiOWNjN2VkZWE1YjkyNTZhOGE3MjE2NjY4ZQ=="
WS_ID = "697b7620ba088c775961b7b0"
ROW_ID = "9d4e0d2d-e579-4c6f-ba42-2da60376ac4a"

URL_ROWS = f"https://api.mingdao.com/v3/app/worksheets/{WS_ID}/rows"
URL_ROW_ID = f"https://api.mingdao.com/v3/app/worksheets/{WS_ID}/rows/{ROW_ID}"

PAYLOAD_UPDATE = {
    "rowId": ROW_ID, # For Overloaded Add
    "triggerWorkflow": True,
    "fields": [{"id": "697b7667821b53911b7727ac", "value": "TestOverload"}]
}

def probe(name, url, headers):
    print(f"\n--- {name} {url} ---")
    try:
        resp = requests.post(url, headers=headers, json=PAYLOAD_UPDATE)
        print(f"Status: {resp.status_code}")
        print(f"Resp: {resp.text[:300]}")
    except Exception as e:
        print(f"Err: {e}")

# 1. Overloaded Add (Old AppKey Case)
headers_old = {
    "Content-Type": "application/json",
    "HAP-AppKey": APP_KEY, # Old
    "HAP-Sign": SIGN
}
probe("Overloaded Add", URL_ROWS, headers_old)

# 2. Strict Row ID Path (Lower-case Appkey)
headers_strict = {
    "Content-Type": "application/json",
    "HAP-Appkey": APP_KEY, # Strict
    "HAP-Sign": SIGN
}
probe("Strict Path + Lower Header", URL_ROW_ID, headers_strict)
