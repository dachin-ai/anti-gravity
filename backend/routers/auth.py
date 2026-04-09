from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.auth_logic import signup_user, login_user, verify_token, log_activity

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class SignupRequest(BaseModel):
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


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
    ip = request.client.host if request.client else ""
    success, msg, token = login_user(body.username.strip(), body.password)
    if not success:
        raise HTTPException(status_code=401, detail=msg)
    return {
        "message": msg,
        "token": token,
    }


@router.post("/verify")
def verify(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    token = auth_header.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    return {"valid": True, "username": payload["username"], "email": payload.get("email", "")}


@router.post("/log-activity")
def log_tool_activity(body: LogActivityRequest, request: Request):
    """Called by frontend whenever a tool is used."""
    payload = verify_token(body.token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    ip = request.client.host if request.client else ""
    log_activity(payload["username"], body.tool_name, ip)
    return {"logged": True}
