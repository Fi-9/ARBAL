"""
Image preprocessing pipeline for Indonesian document OCR.

Optimizes photos of KTP/KK (often taken by phone in suboptimal conditions)
for maximum OCR accuracy with PaddleOCR.

Pipeline: Resize → Grayscale → Threshold → Deskew → Denoise
"""

import cv2
import numpy as np
from typing import Optional


def preprocess_image(
    image: np.ndarray,
    target_width: int = 1200,
    apply_deskew: bool = True,
    apply_denoise: bool = True,
) -> np.ndarray:
    """
    Full preprocessing pipeline for document images.

    Args:
        image: BGR image as numpy array (from cv2 or PIL→numpy)
        target_width: Resize to this width (maintains aspect ratio)
        apply_deskew: Whether to correct rotation/skew
        apply_denoise: Whether to apply denoising filter

    Returns:
        Preprocessed grayscale image ready for OCR
    """
    if image is None or image.size == 0:
        raise ValueError("Empty or invalid image")

    # Step 1: Resize to normalize processing speed
    resized = _resize(image, target_width)

    # Step 2: Convert to grayscale
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

    # Step 3: Deskew (fix rotated photos)
    if apply_deskew:
        gray = _deskew(gray)

    # Step 4: Adaptive threshold for better text contrast
    # Works better than global threshold for uneven lighting
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=15,
        C=8,
    )

    # Step 5: Denoise (remove speckles from phone camera noise)
    if apply_denoise:
        denoised = cv2.fastNlMeansDenoising(thresh, h=10, templateWindowSize=7, searchWindowSize=21)
        return denoised

    return thresh


def _resize(image: np.ndarray, target_width: int) -> np.ndarray:
    """Resize image maintaining aspect ratio."""
    h, w = image.shape[:2]
    if w <= target_width:
        return image
    ratio = target_width / w
    new_h = int(h * ratio)
    return cv2.resize(image, (target_width, new_h), interpolation=cv2.INTER_AREA)


def _deskew(gray: np.ndarray) -> np.ndarray:
    """
    Detect and correct skew/rotation in document images.

    Uses Hough line detection to find the dominant text angle,
    then rotates the image to align text horizontally.
    """
    # Edge detection for line finding
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)

    # Find lines using probabilistic Hough transform
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=100, minLineLength=100, maxLineGap=10)

    if lines is None or len(lines) == 0:
        return gray

    # Calculate median angle of detected lines
    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        # Only consider near-horizontal lines (text lines)
        if abs(angle) < 45:
            angles.append(angle)

    if not angles:
        return gray

    median_angle = np.median(angles)

    # Only rotate if skew is significant (>0.5 degrees)
    if abs(median_angle) < 0.5:
        return gray

    # Rotate to correct skew
    h, w = gray.shape
    center = (w // 2, h // 2)
    rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)
    rotated = cv2.warpAffine(
        gray, rotation_matrix, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )

    return rotated


def preprocess_for_ktp(image: np.ndarray) -> np.ndarray:
    """
    KTP-specific preprocessing.
    KTP cards are small and text is dense — use smaller block size.
    """
    resized = _resize(image, 1400)  # KTP needs higher resolution
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    gray = _deskew(gray)

    # Sharpen for small text
    kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
    sharpened = cv2.filter2D(gray, -1, kernel)

    thresh = cv2.adaptiveThreshold(
        sharpened, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=11,
        C=5,
    )
    return cv2.fastNlMeansDenoising(thresh, h=8)


def preprocess_for_kk(image: np.ndarray) -> np.ndarray:
    """
    KK-specific preprocessing.
    KK is larger with tabular layout — standard preprocessing works well.
    """
    return preprocess_image(image, target_width=1600)  # KK is wider, keep more detail
