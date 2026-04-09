from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import traceback

from services.socmed_scraping_logic import run_specific, run_general

router = APIRouter(prefix="/api/socmed", tags=["Social Media Scraper"])


class SpecificRequest(BaseModel):
    token: str
    platform: str           # "instagram" | "tiktok"
    url: str
    comments_limit: int = 0


class GeneralRequest(BaseModel):
    token: str
    platform: str           # "instagram" | "tiktok"
    raw_links: str
    dedupe: bool = True
    boost_type: Optional[str] = None


@router.post("/scrape-specific")
def scrape_specific(body: SpecificRequest):
    try:
        if body.platform not in ("instagram", "tiktok"):
            raise HTTPException(status_code=400, detail="platform must be 'instagram' or 'tiktok'")
        result = run_specific(
            token=body.token,
            platform=body.platform,
            url=body.url,
            comments_limit=body.comments_limit,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scrape-general")
def scrape_general(body: GeneralRequest):
    try:
        if body.platform not in ("instagram", "tiktok"):
            raise HTTPException(status_code=400, detail="platform must be 'instagram' or 'tiktok'")
        result = run_general(
            token=body.token,
            platform=body.platform,
            raw_links=body.raw_links,
            dedupe=body.dedupe,
            boost_type=body.boost_type,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
