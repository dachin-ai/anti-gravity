from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import traceback

from services.tiktok_ads_logic import process_tiktok_ads

router = APIRouter(prefix="/api/tiktok-ads", tags=["TikTok Ads Analyzer"])


class FileItem(BaseModel):
    filename: str
    content_b64: str  # base64-encoded file bytes


class TikTokAdsRequest(BaseModel):
    files: List[FileItem]


@router.post("/analyze")
def analyze_tiktok_ads(body: TikTokAdsRequest):
    try:
        if not body.files:
            raise HTTPException(status_code=400, detail="At least one file is required")

        result = process_tiktok_ads(
            files=[f.dict() for f in body.files],
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
