"""Persist per-tool 'last update' metadata (keterangan + waktu) in PostgreSQL."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from models import ToolUpdateInfo

# Price Checker — stock Excel → Google Sheet "In-Stock" tab
TOOL_KEY_PRICE_CHECKER_STOCK = "price_checker_stock"


def get_tool_info(db: Session, tool_key: str) -> dict[str, Any] | None:
    row = db.query(ToolUpdateInfo).filter(ToolUpdateInfo.tool_key == tool_key).first()
    if not row:
        return None
    waktu_iso = row.waktu.isoformat() if row.waktu else None
    return {
        "tool_key": row.tool_key,
        "keterangan": row.keterangan,
        "waktu": waktu_iso,
        "last_uploaded_at": waktu_iso,
    }


def upsert_tool_info(db: Session, tool_key: str, keterangan: str | None) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    row = db.query(ToolUpdateInfo).filter(ToolUpdateInfo.tool_key == tool_key).first()
    if row:
        row.keterangan = keterangan
        row.waktu = now
    else:
        row = ToolUpdateInfo(tool_key=tool_key, keterangan=keterangan, waktu=now)
        db.add(row)
    db.commit()
    db.refresh(row)
    waktu_iso = row.waktu.isoformat() if row.waktu else None
    return {
        "tool_key": row.tool_key,
        "keterangan": row.keterangan,
        "waktu": waktu_iso,
        "last_uploaded_at": waktu_iso,
    }
