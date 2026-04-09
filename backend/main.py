from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import price_checker

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(price_checker.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to FastAPI Backend!"}
