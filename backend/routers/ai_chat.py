import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import google.generativeai as genai
from routers.price_checker import get_db, calculate_prices

router = APIRouter(prefix="/api/chat", tags=["ai-chat"])

# API Key from environment variable (required for Cloud Run)
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set. Please configure it in Cloud Run secrets.")

try:
    genai.configure(api_key=API_KEY)
except Exception as e:
    print(f"[AI Chat] Warning: Failed to configure Gemini: {e}")
    raise

# Define the model with tools
model = genai.GenerativeModel(
    model_name='gemini-flash-latest',
    system_instruction="""You are freemir AI, the smart AI companion for the Business Intelligence Hub.
Your job is to help the company staff navigate tools and answer questions based on your tools.
Tools available in Antigravity:
- Price Checker / Price Setting: Check target prices and margin safety.
- Order Planner: Estimate daily order volume per warehouse.
- Order Review: Analyze lost orders and cancellation reasons.
- Affiliate Performance: Shopee Affiliate performance data.
- Pre-Sales Checker: TikTok volume estimation.
- Affiliate Analyzer: TikTok affiliate analytics.
- Ads Analyzer: TikTok Ads performance data.

CRITICAL INSTRUCTION FOR PRICE CHECKING:
Whenever a user asks for the price or safety of a specific SKU (e.g. FR0208A44601), you MUST use the check_product_price function.
The function returns a dictionary of calculated prices for different campaigns.
- `Warning` -> This is the Base System Price / Harga Dasar Tertinggi. (Ini juga acuan margin aman / safe price batas terakhir).
- `Daily-Discount`, `Daily-Livestream`, etc. -> These are the target prices for specific sales campaigns.
- If a value is "Invalid", it means the SKU is not found in the database.
DO NOT INVENT NUMBERS. DO NOT HALUCINATE PRICES. ONLY provide the exact numeric prices returned by the tool. If the tool returns an error, tell the user the exact error (e.g. database not loaded).
""",
    tools=[
        {
            "function_declarations": [
                {
                    "name": "check_product_price",
                    "description": "Check the price details of a specific product SKU. Always use this if user asks for the price or safety margin of an SKU.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sku": {
                                "type": "string",
                                "description": "The SKU of the product, e.g. FR0208A44601"
                            }
                        },
                        "required": ["sku"]
                    }
                }
            ]
        }
    ]
)

class ChatMessage(BaseModel):
    role: str # "user" or "model"
    text: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

# Store active sessions in memory (for simplicity and speed)
# In production, you would attach this to user session/DB.
import uuid
chat_sessions = {}

def get_chat_session(session_id: str):
    if session_id not in chat_sessions:
        chat_sessions[session_id] = model.start_chat(enable_automatic_function_calling=False)
    return chat_sessions[session_id]

@router.post("/ask")
async def ask_assistant(request: ChatRequest, session_id: str = "default_session"):
    try:
        # Only process the latest message here because history is managed by genai.ChatSession
        # But we'll just feed the latest user prompt 
        user_prompt = next((msg.text for msg in reversed(request.messages) if msg.role == 'user'), None)
        if not user_prompt:
            raise HTTPException(status_code=400, detail="No user message found")

        chat = get_chat_session(session_id)
        
        # Send message to Gemini
        response = chat.send_message(user_prompt)
        
        # Check if model wants to call a function
        if response.candidates and response.candidates[0].content.parts:
            part = response.candidates[0].content.parts[0]
            if part.function_call:
                fn = part.function_call
                if fn.name == "check_product_price":
                    sku = fn.args.get("sku")
                    
                    # Execute local python logic
                    price_db, name_map, link_map = get_db()
                    if not price_db:
                        api_result = {"error": "Price database is currently not loaded. Please inform the user to refresh the price checker tool."}
                    else:
                        try:
                            price_info = calculate_prices(sku, price_db, name_map, link_map)
                            api_result = {"sku": sku, "result": price_info}
                        except Exception as e:
                            api_result = {"error": f"Failed to calculate price for {sku}: {str(e)}"}
                    
                    # Return function output to Gemini
                    response = chat.send_message(
                        genai.types.Part.from_function_response(
                            name="check_product_price",
                            response={"content": api_result}
                        )
                    )
        
        # Return the final text
        return {"response": response.text}

    except Exception as e:
        print(f"[AI Chat Error] {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
