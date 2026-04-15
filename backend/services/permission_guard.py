"""
Permission Guard — FastAPI dependency for tool access control.

Each tool endpoint can use `require_tool_access("tool_key")` as a dependency
to verify that the logged-in user has permission for that specific tool.

Permission data is stored in the JWT token (set at login time from the
Account sheet / PostgreSQL `account_users.permissions` JSON column).
"""

from fastapi import Request, HTTPException, Depends
from services.auth_logic import verify_token


def _extract_token(request: Request) -> str:
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid.")
    return auth_header.split(" ", 1)[1]


def require_tool_access(tool_key: str):
    """
    FastAPI dependency factory.

    Usage:
        @router.post("/calculate", dependencies=[Depends(require_tool_access("price_checker"))])
        def calculate(...):
            ...
    """
    def _guard(request: Request):
        token = _extract_token(request)
        payload = verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Token expired or invalid.")

        permissions = payload.get("permissions", {})
        if permissions.get(tool_key) != 1:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. You do not have permission for '{tool_key}'. Contact admin."
            )
        return payload

    return _guard
