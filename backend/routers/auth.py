from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.auth_logic import signup_user, login_user_optimized, verify_token, log_activity, sync_users_from_sheet, reset_password, change_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class SignupRequest(BaseModel):
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class ForgotPasswordRequest(BaseModel):
    username: str
    email: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class LogActivityRequest(BaseModel):
    tool_name: str
    token: str


@router.post("/signup")
def signup(body: SignupRequest):
    success, msg = signup_user(body.email.strip(), body.username.strip(), body.password)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}


@router.post("/login")
def login(body: LoginRequest, request: Request):
    success, msg, token = login_user_optimized(body.username.strip(), body.password)
    if not success:
        # If user not found, give hint about sync
        if "not found" in msg.lower():
            msg = f"{msg} Try refreshing users from the login page first."
        raise HTTPException(status_code=401, detail=msg)
    payload = verify_token(token)
    return {
        "message": msg,
        "token": token,
        "username": payload.get("username", body.username.strip()) if payload else body.username.strip(),
        "email": payload.get("email", "") if payload else "",
        "permissions": payload.get("permissions", {}) if payload else {},
    }


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest):
    success, msg = reset_password(body.username.strip(), body.email.strip())
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}


@router.post("/change-password")
def change_pwd(body: ChangePasswordRequest, request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    username = payload["username"]
    success, msg = change_password(username, body.current_password, body.new_password)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}


@router.post("/verify")
def verify(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    token = auth_header.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    return {"valid": True, "username": payload["username"], "email": payload.get("email", ""), "permissions": payload.get("permissions", {})}


@router.post("/log-activity")
def log_tool_activity(body: LogActivityRequest, request: Request):
    """Called by frontend whenever a tool is used."""
    # Try body token first, then Authorization header
    token = body.token
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

    payload = verify_token(token) if token else None
    if not payload:
        print(f"[Auth Router] log-activity: token invalid or missing. Token prefix: {str(token)[:20] if token else 'NONE'}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    ip = request.client.host if request.client else ""
    username = payload["username"]
    print(f"[Auth Router] log-activity: {username} used {body.tool_name}")
    log_activity(username, body.tool_name, ip)
    return {"logged": True, "username": username, "tool": body.tool_name}


@router.post("/sync-users")
def sync_users():
    """Sync all users from Google Sheets Account tab into the PostgreSQL database."""
    success, msg = sync_users_from_sheet()
    if not success:
        raise HTTPException(status_code=500, detail=msg)
    return {"message": msg}


@router.get("/test-sheet")
def test_sheet_access():
    """Debug endpoint - check which sheets are accessible."""
    try:
        from services.auth_logic import get_sheet_client
        sh = get_sheet_client()
        sheets = [s.title for s in sh.worksheets()]
        return {"sheets": sheets, "spreadsheet": sh.title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
