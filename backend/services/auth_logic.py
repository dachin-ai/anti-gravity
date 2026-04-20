import gspread
import os
import hashlib
import jwt
import datetime
import traceback
import time
import threading
from typing import Optional, Dict, Tuple, List
from sqlalchemy.orm import Session
from database import SessionLocal
from models import ActivityLog, AccountUser

# Same spreadsheet as price checker
SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1aS1wpEJ5jIYFYYsZT1U4-gabyb5XwGn4u1-OpRhiucc"

if os.path.exists("/etc/secrets/credentials.json"):
    CREDENTIALS_FILE = "/etc/secrets/credentials.json"
else:
    CREDENTIALS_FILE = "credentials.json"

# Secret key for JWT tokens (in prod should come from env var)
JWT_SECRET = os.environ.get("JWT_SECRET", "freemir_tools_2026_secret_key_change_in_prod")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

# Tool keys matching Google Sheets column names for per-user access control
TOOL_KEYS = [
    "price_checker", "order_planner", "order_review",
    "affiliate_performance", "pre_sales", "affiliate_analyzer", "ads_analyzer"
]

# TIMEOUT PROTECTION for Google Sheets API
SHEETS_API_TIMEOUT = 10  # 10 seconds timeout for Google Sheets calls

def call_with_timeout(func, timeout_sec=SHEETS_API_TIMEOUT):
    """
    Execute a function with a timeout. Returns (success, result).
    If timeout, returns (False, "Google Sheets API timeout").
    """
    result = [None]
    error = [None]
    
    def wrapper():
        try:
            result[0] = func()
        except Exception as e:
            error[0] = e
    
    thread = threading.Thread(target=wrapper, daemon=True)
    thread.start()
    thread.join(timeout=timeout_sec)
    
    if thread.is_alive():
        # Thread still running = timeout
        return False, f"Google Sheets API timeout (>{timeout_sec}s). Using cached data or minimal default."
    
    if error[0]:
        return False, f"Google Sheets API error: {str(error[0])}"
    
    return True, result[0]

# === CACHING LAYER ===
_cached_client = None
_cached_sh = None
_cached_users_timestamp = 0
_cached_users = []
CACHE_DURATION = 300  # Cache Google Sheets data for 5 minutes

def get_sheet_client():
    global _cached_client, _cached_sh
    if _cached_sh is None:
        if _cached_client is None:
            _cached_client = gspread.service_account(filename=CREDENTIALS_FILE)
        _cached_sh = _cached_client.open_by_url(SPREADSHEET_URL)
    return _cached_sh


def hash_password(password: str) -> str:
    """Simple SHA-256 hash for password storage."""
    return hashlib.sha256(password.encode()).hexdigest()


def get_users() -> List[Dict]:
    """
    Fetch all users from Account sheet with caching and TIMEOUT protection.
    Cache expires after CACHE_DURATION seconds.
    Returns cached data if API times out.
    """
    global _cached_users, _cached_users_timestamp
    
    now = time.time()
    # Return cached data if still valid
    if _cached_users and (now - _cached_users_timestamp) < CACHE_DURATION:
        return _cached_users
    
    # Attempt to fetch fresh data with timeout
    def fetch_from_sheet():
        sh = get_sheet_client()
        ws = sh.worksheet("Account")
        return ws.get_all_records()
    
    success, result = call_with_timeout(fetch_from_sheet, timeout_sec=SHEETS_API_TIMEOUT)
    
    if success:
        # Update cache
        _cached_users = result
        _cached_users_timestamp = now
        print(f"[Auth] ✓ Updated user cache from Google Sheets ({len(result)} users)")
        return result
    else:
        # Timeout or error
        print(f"[Auth] {result}")
        if _cached_users:
            print(f"[Auth] ⚠ Using stale cache ({len(_cached_users)} users)")
            return _cached_users
        # No cache available
        raise RuntimeError(f"Cannot fetch users: {result}")


def sync_users_from_sheet() -> Tuple[bool, str]:
    """
    Sync users from Google Sheet to PostgreSQL dengan incremental update (lebih cepat).
    - Hanya update/insert yang berubah
    - Hanya delete users yang sudah tidak ada di sheet
    - WITH TIMEOUT PROTECTION (max 15 seconds)
    """
    def do_sync():
        users = get_users()
        db = SessionLocal()
        try:
            # Get usernames dari sheet
            sheet_usernames = set(user.get("Username", "").strip() for user in users if user.get("Username", "").strip())
            
            # Get existing usernames dari DB
            existing_users = db.query(AccountUser.username).all()
            existing_usernames = set(u.username for u in existing_users)
            
            # Delete users yang tidak ada di sheet anymore
            to_delete = existing_usernames - sheet_usernames
            if to_delete:
                db.query(AccountUser).filter(AccountUser.username.in_(to_delete)).delete()
            
            # Insert/Update users dari sheet
            for user in users:
                username = str(user.get("Username", "")).strip()
                if not username:
                    continue
                    
                # Parse permissions
                perms = {}
                for tk in TOOL_KEYS:
                    val = str(user.get(tk, "0")).strip()
                    perms[tk] = 1 if val == "1" else 0
                
                # Check if user exists
                existing = db.query(AccountUser).filter(
                    AccountUser.username.ilike(username)
                ).first()
                
                if existing:
                    # Update existing user
                    existing.email = str(user.get("Email", "")).strip()
                    existing.password = str(user.get("Password", "")).strip()
                    existing.approval = str(user.get("Approval", "")).strip()
                    existing.permissions = perms
                else:
                    # Insert new user
                    new_user = AccountUser(
                        email=str(user.get("Email", "")).strip(),
                        username=username,
                        password=str(user.get("Password", "")).strip(),
                        approval=str(user.get("Approval", "")).strip(),
                        permissions=perms
                    )
                    db.add(new_user)
            
            db.commit()
            
            # Clear cache setelah sync
            global _cached_users_timestamp
            _cached_users_timestamp = 0
            
            return True, f"✓ Users synced successfully. ({len(sheet_usernames)} in sheet, {len(to_delete)} deleted)"
        finally:
            db.close()
    
    # Execute with timeout
    success, result = call_with_timeout(do_sync, timeout_sec=15)
    
    if success:
        return True, result
    else:
        # Timeout or error - still return meaningful error
        return False, result

def find_user_by_username(username: str) -> Optional[Dict]:
    """Find a user by username from the database (case-insensitive)."""
    db = SessionLocal()
    try:
        user = db.query(AccountUser).filter(
            AccountUser.username.ilike(username.strip().lower())
        ).first()
        
        if user:
            return {
                "Email": user.email,
                "Username": user.username,
                "Password": user.password,
                "Approval": user.approval,
                "permissions": user.permissions or {}
            }
        return None
    finally:
        db.close()


def find_user_by_email(email: str) -> Optional[Dict]:
    """Find a user by email from the database (case-insensitive)."""
    db = SessionLocal()
    try:
        user = db.query(AccountUser).filter(
            AccountUser.email.ilike(email.strip().lower())
        ).first()
        
        if user:
            return {
                "Email": user.email,
                "Username": user.username,
                "Password": user.password,
                "Approval": user.approval,
                "permissions": user.permissions or {}
            }
        return None
    finally:
        db.close()


def login_user_optimized(username: str, password: str) -> Tuple[bool, str, Optional[str]]:
    """
    Optimized login dengan single DB query.
    """
    try:
        db = SessionLocal()
        try:
            # Single query untuk find user
            user = db.query(AccountUser).filter(
                AccountUser.username.ilike(username.strip().lower())
            ).first()
            
            if not user:
                return False, "Username not found.", None
            
            # Check password
            hashed = hash_password(password)
            if hashed != user.password.strip():
                return False, "Incorrect password.", None
            
            # Check approval status
            approval = str(user.approval).strip().lower()
            if approval == "waiting":
                return False, "Your account is pending admin approval.", None
            if approval != "approve":
                return False, "Your account has been rejected or is inactive.", None
            
            # Generate JWT
            permissions = user.permissions or {}
            payload = {
                "username": user.username,
                "email": user.email or "",
                "permissions": permissions,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRE_HOURS),
                "iat": datetime.datetime.utcnow(),
            }
            token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            return True, "Login successful.", token
        finally:
            db.close()
    except Exception as e:
        print(f"[Login Error] {e}")
        return False, f"Login error: {str(e)}", None


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
        permissions = user.get("permissions", {})
        payload = {
            "username": user["Username"],
            "email": user.get("Email", ""),
            "permissions": permissions,
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
    """Menyimpan riwayat pengguna (Activity Log) ke PostgreSQL (Neon) dan ke DingTalk."""
    try:
        db = SessionLocal()
        
        jakarta_tz = datetime.timezone(datetime.timedelta(hours=7))
        # Get raw Jakarta time, then strip timezone details and microseconds so PostgreSQL stores the literal numbers safely.
        now_dt = datetime.datetime.now(jakarta_tz).replace(tzinfo=None, microsecond=0)
        
        new_log = ActivityLog(
            time=now_dt,
            username=username,
            tools=tool_name
        )
        db.add(new_log)
        db.commit()
        db.close()
        
        time_str = now_dt.strftime('%Y-%m-%d %H:%M:%S')
        print(f"[Activity Log] ✓ Logged to DB: {username} used {tool_name} at {time_str}")
        
        # Kirim notifikasi ke DingTalk
        from services.dingtalk_service import send_activity_log
        send_activity_log(username, tool_name, time_str)

    except Exception as e:
        print(f"[Activity Log DB Error] {e}")
        traceback.print_exc()

