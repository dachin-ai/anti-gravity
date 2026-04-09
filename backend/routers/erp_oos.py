from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import traceback
import base64

from services.erp_oos_logic import process_erp_oos

router = APIRouter(prefix="/erp-oos", tags=["ERP OOS"])

@router.post("/calculate")
async def calculate_erp_oos(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...)
):
    try:
        content_a = await file_a.read()
        content_b = await file_b.read()
        
        summary, excel_bytes = process_erp_oos(content_a, file_a.filename.lower(), content_b, file_b.filename.lower())
        
        return JSONResponse({
            "summary": summary,
            "file_base64": base64.b64encode(excel_bytes).decode('utf-8')
        })
        
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
