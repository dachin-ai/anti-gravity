from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from services.permission_guard import require_tool_access
from fastapi.responses import JSONResponse
import traceback
import base64

from services.presales_logic import process_presales

router = APIRouter(prefix="/api/pre-sales", tags=["Pre-Sales"])

@router.post("/calculate", dependencies=[Depends(require_tool_access("pre_sales"))])
async def calculate_presales(
    file: UploadFile = File(...)
):
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        summary, excel_bytes = process_presales(content, filename)
        
        return JSONResponse({
            "summary": summary,
            "file_base64": base64.b64encode(excel_bytes).decode('utf-8')
        })
        
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
