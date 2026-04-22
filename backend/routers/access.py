from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import AccessRequest, AccountUser
from services.auth_logic import verify_token

router = APIRouter(prefix="/api/access", tags=["Access"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _require_auth(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(auth.split(" ", 1)[1])
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    return payload


def _require_admin(request: Request) -> dict:
    payload = _require_auth(request)
    if payload.get("permissions", {}).get("admin") != 1:
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload


class RequestBody(BaseModel):
    tool_key: str


class PermissionsBody(BaseModel):
    permissions: dict


@router.post("/request")
def submit_request(body: RequestBody, request: Request, db: Session = Depends(get_db)):
    payload = _require_auth(request)
    username = payload["username"]

    user = db.query(AccountUser).filter(AccountUser.username == username).first()
    if user and user.permissions and user.permissions.get(body.tool_key) == 1:
        raise HTTPException(status_code=400, detail="You already have access to this tool.")

    existing = db.query(AccessRequest).filter(
        AccessRequest.username == username,
        AccessRequest.tool_key == body.tool_key,
        AccessRequest.status == "pending",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request for this tool.")

    req = AccessRequest(username=username, tool_key=body.tool_key, status="pending")
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"message": "Request submitted successfully", "id": req.id}


@router.get("/my-requests")
def my_requests(request: Request, db: Session = Depends(get_db)):
    payload = _require_auth(request)
    rows = db.query(AccessRequest).filter(
        AccessRequest.username == payload["username"]
    ).order_by(AccessRequest.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "tool_key": r.tool_key,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/requests")
def get_requests(request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    rows = db.query(AccessRequest).order_by(AccessRequest.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "username": r.username,
            "tool_key": r.tool_key,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.put("/requests/{req_id}/approve")
def approve_request(req_id: int, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    req = db.query(AccessRequest).filter(AccessRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "approved"
    user = db.query(AccountUser).filter(AccountUser.username == req.username).first()
    if user:
        perms = dict(user.permissions or {})
        perms[req.tool_key] = 1
        user.permissions = perms
    db.commit()
    return {"message": "Request approved"}


@router.put("/requests/{req_id}/reject")
def reject_request(req_id: int, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    req = db.query(AccessRequest).filter(AccessRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "rejected"
    db.commit()
    return {"message": "Request rejected"}


@router.get("/users")
def get_users(request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    users = db.query(AccountUser).order_by(AccountUser.username).all()
    return [
        {"username": u.username, "email": u.email, "permissions": u.permissions or {}}
        for u in users
    ]


@router.put("/users/{username}/permissions")
def update_permissions(username: str, body: PermissionsBody, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    user = db.query(AccountUser).filter(AccountUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.permissions = body.permissions
    db.commit()
    return {"message": "Permissions updated"}
