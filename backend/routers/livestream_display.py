from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.livestream_display_logic import (
    sync_livestream_display_sheet,
    get_stores,
    get_etalases,
    get_items,
    get_price_options,
)

router = APIRouter(prefix="/api/livestream-display", tags=["livestream-display"])

class LivestreamSyncRequest(BaseModel):
    sheet_url: str | None = None

@router.post("/sync")
def sync_display_sheet(body: LivestreamSyncRequest):
    try:
        count = sync_livestream_display_sheet(body.sheet_url)
        return {"success": True, "message": f"Synced {count} livestream display rows.", "rows_synced": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stores")
def list_stores():
    try:
        return {"stores": get_stores()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/etalases")
def list_etalases(store: str | None = Query(None, description="Filter by store")):
    try:
        return {"etalases": get_etalases(store)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/price-types")
def price_types():
    try:
        return {"price_types": get_price_options()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/items")
def list_items(
    store: str = Query(..., description="Store name"),
    etalase: str = Query(..., description="Etalase / display section"),
    price_type: str | None = Query(None, description="Price type to compute")
):
    try:
        return {"items": get_items(store, etalase, price_type)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
