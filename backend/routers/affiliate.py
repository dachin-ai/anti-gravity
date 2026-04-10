from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import traceback
from services.affiliate_logic import analyze_affiliates

router = APIRouter(prefix="/api/affiliate", tags=["Affiliate Analyzer"])

@router.post("/analyze")
async def analyze(
    mode: str = Form(...),
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...)
):
    try:
        content_a = await file_a.read()
        content_b = await file_b.read()
        
        is_csv_a = file_a.filename.lower().endswith('.csv')
        is_csv_b = file_b.filename.lower().endswith('.csv')

        result = analyze_affiliates(
            content_a, is_csv_a,
            content_b, is_csv_b,
            mode
        )
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"Error in affiliate logic:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
