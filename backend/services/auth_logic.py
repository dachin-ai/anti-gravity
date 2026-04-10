import gspread
import os
import hashlib
import jwt
import datetime
import traceback
from typing import Optional, Dict, Tuple
from sqlalchemy.orm import Session
from database import SessionLocal
from models import ActivityLog

# Same spreadsheet as price checker
SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1GoIpse2K5piWfw5J1urkoZj6KWY3zBo8UX0TAmvUZ1M"

if os.path.exists("/etc/secrets/credentials.json"):
    CREDENTIALS_FILE = "/etc/secrets/credentials.json"
else:
    CREDENTIALS_FILE = "credentials.json"

# Secret key for JWT tokens (in prod should come from env var)
JWT_SECRET = os.environ.get("JWT_SECRET", "freemir_tools_2026_secret_key_change_in_prod")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def hash_password(password: str) -> str:
    """Simple SHA-256 hash for password storage."""
    return hashlib.sha256(password.encode()).hexdigest()


_cached_client = None
_cached_sh = None

def get_sheet_client():
    global _cached_client, _cached_sh
    if _cached_sh is None:
        if _cached_client is None:
            _cached_client = gspread.service_account(filename=CREDENTIALS_FILE)
        _cached_sh = _cached_client.open_by_url(SPREADSHEET_URL)
    return _cached_sh


def get_users() -> list:
    """Fetch all users from Account sheet."""
    try:
        sh = get_sheet_client()
        ws = sh.worksheet("Account")
        rows = ws.get_all_records()
        return rows
    except Exception as e:
        raise RuntimeError(f"Failed to access Account sheet: {e}")


def find_user_by_username(username: str) -> Optional[Dict]:
    """Find a user by username (case-insensitive)."""
    users = get_users()
    for user in users:
        if str(user.get("Username", "")).strip().lower() == username.strip().lower():
            return user
    return None


def find_user_by_email(email: str) -> Optional[Dict]:
    """Find a user by email (case-insensitive)."""
    users = get_users()
    for user in users:
        if str(user.get("Email", "")).strip().lower() == email.strip().lower():
            return user
    return None


def signup_user(email: str, username: str, password: str) -> Tuple[bool, str]:
    """Register a new user with Waiting status."""
    try:
        # Check duplicates
        if find_user_by_email(email):
            return False, "Email already registered."
        if find_user_by_username(username):
            return False, "Username already taken."

        sh = get_sheet_client()
        ws = sh.worksheet("Account")

        hashed = hash_password(password)
        ws.append_row([email, username, hashed, "Waiting"])
        return True, "Registration successful. Please wait for admin approval."

    except Exception as e:
        return False, f"Registration failed: {str(e)}"


def login_user(username: str, password: str) -> Tuple[bool, str, Optional[str]]:
    """
    Validate login.
    Returns (success, message, jwt_token)
    """
    try:
        user = find_user_by_username(username)
        if not user:
            return False, "Username not found.", None

        # Check password
        hashed = hash_password(password)
        stored_hash = str(user.get("Password", "")).strip()
        if hashed != stored_hash:
            return False, "Incorrect password.", None

        # Check approval status
        approval = str(user.get("Approval", "")).strip().lower()
        if approval == "waiting":
            return False, "Your account is pending admin approval.", None
        if approval != "approve":
            return False, "Your account has been rejected or is inactive.", None

        # Generate JWT
        payload = {
            "username": user["Username"],
            "email": user.get("Email", ""),
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRE_HOURS),
            "iat": datetime.datetime.utcnow(),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return True, "Login successful.", token

    except Exception as e:
        return False, f"Login error: {str(e)}", None


def verify_token(token: str) -> Optional[Dict]:
    """Verify JWT and return payload if valid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def log_activity(username: str, tool_name: str, ip_address: str = ""):
    """Menyimpan riwayat pengguna (Activity Log) ke PostgreSQL (Neon)."""
    try:
        db = SessionLocal()
        
        jakarta_tz = datetime.timezone(datetime.timedelta(hours=7))
        now_dt = datetime.datetime.now(jakarta_tz)
        
        new_log = ActivityLog(
            time=now_dt,
            username=username,
            tools=tool_name
        )
        db.add(new_log)
        db.commit()
        db.close()
        print(f"[Activity Log] ✓ Logged to DB: {username} used {tool_name} at {now_dt.strftime('%Y-%m-%d %H:%M:%S')}")

    except Exception as e:
        print(f"[Activity Log DB Error] {e}")
        traceback.print_exc()

