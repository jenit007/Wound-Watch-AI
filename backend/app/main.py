import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.services.inference import SegmentationService

app = FastAPI(title="WoundWatch AI API", version="0.1.0", description="Research prototype for wound image segmentation and descriptive area trends.")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"])
router.segmentation_service = SegmentationService()
app.include_router(router)
