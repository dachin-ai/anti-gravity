import os
import time
import hmac
import hashlib
import base64
import urllib.parse
import threading
import requests
from dotenv import load_dotenv

load_dotenv()

DINGTALK_WEBHOOK_URL = os.environ.get("DINGTALK_WEBHOOK_URL", "")
DINGTALK_SECRET = os.environ.get("DINGTALK_SECRET", "")

def _send_sync(webhook_url: str, secret: str, username: str, tool_name: str, time_str: str):
    try:
        url = webhook_url
        if secret:
            timestamp = str(round(time.time() * 1000))
            secret_enc = secret.encode('utf-8')
            string_to_sign = f'{timestamp}\n{secret}'.encode('utf-8')
            hmac_code = hmac.new(secret_enc, string_to_sign, digestmod=hashlib.sha256).digest()
            sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
            url = f"{webhook_url}&timestamp={timestamp}&sign={sign}"
            
        payload = {
            "msgtype": "markdown",
            "markdown": {
                "title": "Aktivitas Pengguna",
                "text": f"### 🟢 Notifikasi Aktivitas\n\n**Pengguna:** `{username}`\n**Aktivitas:** Mengakses `{tool_name}`\n**Waktu:** {time_str}"
            }
        }
        
        response = requests.post(url, json=payload, timeout=5)
        response.raise_for_status()
    except Exception as e:
        print(f"[DingTalk Error] Failed to send activity log: {e}")

def send_activity_log(username: str, tool_name: str, time_str: str):
    """
    Kirim log aktivitas ke DingTalk melalui background thread
    agar tidak memblokir respon API.
    """
    if not DINGTALK_WEBHOOK_URL:
        return # Skip jika webhoook tidak di-set
    
    t = threading.Thread(target=_send_sync, args=(DINGTALK_WEBHOOK_URL, DINGTALK_SECRET, username, tool_name, time_str))
    t.daemon = True
    t.start()
