"""
ARBAL OCR Service — Indonesian Document Extraction API

FastAPI microservice for extracting structured data from Indonesian
identity documents (KTP, KK) using PaddleOCR + OpenCV preprocessing.

Endpoints:
  POST /ocr/ktp  — Extract KTP fields (NIK, nama, alamat, pekerjaan)
  POST /ocr/kk   — Extract KK fields (family members, alamat)
  GET  /health   — Health check with model status
"""

import os
import io
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import numpy as np

from preprocessing import preprocess_image
from ktp_parser import parse_ktp
from kk_parser import parse_kk

logger = logging.getLogger("arbal-ocr")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Global OCR engine — loaded once at startup
ocr_engine = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load PaddleOCR model on startup."""
    global ocr_engine
    logger.info("Loading PaddleOCR model (first run may download ~100MB)...")
    try:
        from paddleocr import PaddleOCR
        ocr_engine = PaddleOCR(
            use_angle_cls=True,  # handle rotated text
            lang="id",           # Indonesian language model
            show_log=False,      # suppress verbose logs
            use_gpu=False,       # CPU mode for VPS compatibility
        )
        logger.info("PaddleOCR model loaded successfully")
    except ImportError:
        logger.warning(
            "PaddleOCR not installed — running in STUB mode. "
            "Install with: pip install paddleocr paddlepaddle"
        )
        ocr_engine = None
    yield
    logger.info("Shutting down OCR service")


app = FastAPI(
    title="ARBAL OCR Service",
    description="Indonesian document OCR extraction (KTP, KK)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow NestJS backend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("CORS_ORIGIN", "http://localhost:3001"),
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class KTPResult(BaseModel):
    nik: Optional[str] = None
    nama: Optional[str] = None
    tempat_lahir: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    gol_darah: Optional[str] = None
    alamat: Optional[str] = None
    rt_rw: Optional[str] = None
    kel_desa: Optional[str] = None
    kecamatan: Optional[str] = None
    agama: Optional[str] = None
    status_perkawinan: Optional[str] = None
    pekerjaan: Optional[str] = None
    kewarganegaraan: Optional[str] = None
    confidence: float = 0.0
    raw_text: str = ""


class KKResult(BaseModel):
    no_kk: Optional[str] = None
    nama_kepala: Optional[str] = None
    alamat: Optional[str] = None
    rt_rw: Optional[str] = None
    kel_desa: Optional[str] = None
    kecamatan: Optional[str] = None
    kabupaten: Optional[str] = None
    provinsi: Optional[str] = None
    members: list = []
    confidence: float = 0.0
    raw_text: str = ""


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str = "1.0.0"


# ---------------------------------------------------------------------------
# Helper: run OCR on uploaded image
# ---------------------------------------------------------------------------

def run_ocr(image_bytes: bytes) -> tuple[str, float]:
    """
    Preprocess image and run PaddleOCR.
    Returns (raw_text, avg_confidence).
    """
    if ocr_engine is None:
        raise HTTPException(
            status_code=503,
            detail="OCR engine not loaded. Install paddleocr and paddlepaddle.",
        )

    # Convert bytes to numpy array for preprocessing
    img = Image.open(io.BytesIO(image_bytes))
    img_array = np.array(img)

    # Preprocess: resize, grayscale, threshold, deskew
    processed = preprocess_image(img_array)

    # Run PaddleOCR
    result = ocr_engine.ocr(processed, cls=True)

    # Extract text and confidence
    lines = []
    confidences = []
    if result and result[0]:
        for line in result[0]:
            text = line[1][0]
            conf = line[1][1]
            lines.append(text)
            confidences.append(conf)

    raw_text = "\n".join(lines)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

    return raw_text, avg_confidence


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health and model status."""
    return HealthResponse(
        status="ok" if ocr_engine else "stub",
        model_loaded=ocr_engine is not None,
    )


@app.post("/ocr/ktp", response_model=KTPResult)
async def extract_ktp(file: UploadFile = File(...)):
    """
    Extract structured fields from a KTP (Indonesian ID card) image.

    Pipeline: Upload → Preprocess (OpenCV) → PaddleOCR → Regex Parser → JSON
    """
    if not file.content_type or not file.content_type.startswith(("image/", "application/pdf")):
        raise HTTPException(status_code=422, detail="Only image and PDF files are accepted")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="File too large (max 10MB)")

    raw_text, confidence = run_ocr(image_bytes)
    parsed = parse_ktp(raw_text)

    logger.info(f"KTP extracted: NIK={parsed.get('nik', 'N/A')}, confidence={confidence:.2f}")

    return KTPResult(
        **parsed,
        confidence=round(confidence, 3),
        raw_text=raw_text,
    )


@app.post("/ocr/kk", response_model=KKResult)
async def extract_kk(file: UploadFile = File(...)):
    """
    Extract structured fields from a KK (Kartu Keluarga) image.

    Pipeline: Upload → Preprocess (OpenCV) → PaddleOCR → Regex Parser → JSON
    """
    if not file.content_type or not file.content_type.startswith(("image/", "application/pdf")):
        raise HTTPException(status_code=422, detail="Only image and PDF files are accepted")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="File too large (max 10MB)")

    raw_text, confidence = run_ocr(image_bytes)
    parsed = parse_kk(raw_text)

    logger.info(f"KK extracted: No.KK={parsed.get('no_kk', 'N/A')}, confidence={confidence:.2f}")

    return KKResult(
        **parsed,
        confidence=round(confidence, 3),
        raw_text=raw_text,
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
