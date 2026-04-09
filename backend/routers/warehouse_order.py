from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import traceback

from services.warehouse_order_logic import process_warehouse_order

router = APIRouter(prefix="/api/warehouse-order", tags=["Warehouse Order Estimator"])


class PlatformItem(BaseModel):
    name: str
    number: Optional[float] = 1
    target: Optional[float] = None


class WarehouseItem(BaseModel):
    name: str
    number: Optional[float] = 1
    proportion: Optional[float] = 0


class EventItem(BaseModel):
    name: str
    dates_str: Optional[str] = ""
    proportion: Optional[float] = 0


class WarehouseOrderRequest(BaseModel):
    aov: float
    total_days: int
    platforms: List[PlatformItem]
    warehouses: List[WarehouseItem]
    events: List[EventItem]


@router.post("/calculate")
def calculate_warehouse_order(body: WarehouseOrderRequest):
    try:
        if body.aov <= 0:
            raise HTTPException(status_code=400, detail="AOV must be greater than 0")
        if body.total_days < 1 or body.total_days > 31:
            raise HTTPException(status_code=400, detail="Total days must be between 1 and 31")

        result = process_warehouse_order(
            aov=body.aov,
            total_days=body.total_days,
            platforms=[p.dict() for p in body.platforms],
            warehouses=[w.dict() for w in body.warehouses],
            events=[e.dict() for e in body.events],
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Calculation failed: {str(e)}")
