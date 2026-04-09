import gspread
import os
import hashlib
import jwt
import datetime
from typing import Optional, Dict, Tuple

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


def get_sheet_client():
    gc = gspread.service_account(filename=CREDENTIALS_FILE)
    return gc.open_by_url(SPREADSHEET_URL)


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
    """Append an activity row to 'Activity Log' sheet.
    Column order: Time | Username | Tools
    """
    try:
        sh = get_sheet_client()
        ws = sh.worksheet("Activity Log")
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ws.append_row([now, username, tool_name])
    except Exception as e:
        print(f"[Activity Log Error] {e}")
        pass  # Don't fail the main request if logging fails
