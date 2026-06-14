# ARBAL OCR Service — Docker
# Build:  docker build -t arbal-ocr ./ocr-service
# Run:    docker run -p 8000:8000 --env-file .env arbal-ocr

FROM python:3.10-slim

# System dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# PaddleOCR downloads models on first run (~100MB)
# Pre-download at build time for faster container starts
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='id', show_log=False)" || true

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
