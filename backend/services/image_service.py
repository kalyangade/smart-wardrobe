import os
import uuid
from io import BytesIO
from fastapi import UploadFile, HTTPException
from PIL import Image
from config import get_settings

settings = get_settings()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
THUMBNAIL_SIZE = (400, 400)


def get_upload_dirs() -> tuple[str, str]:
    originals = os.path.join(settings.UPLOAD_DIR, "originals")
    thumbnails = os.path.join(settings.UPLOAD_DIR, "thumbnails")
    os.makedirs(originals, exist_ok=True)
    os.makedirs(thumbnails, exist_ok=True)
    return originals, thumbnails


async def validate_and_read_image(file: UploadFile) -> tuple[bytes, str]:
    """Validate file type and size. Returns (bytes, mime_type)."""
    content_type = file.content_type or ""

    # Normalize HEIC
    if content_type in ("image/heic", "image/heif"):
        content_type = "image/jpeg"  # Pillow will handle conversion

    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {content_type}. Allowed: JPEG, PNG, WebP, HEIC",
        )

    image_bytes = await file.read()
    max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024

    if len(image_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large. Max size: {settings.MAX_IMAGE_SIZE_MB}MB",
        )

    return image_bytes, content_type


def save_image(image_bytes: bytes, original_mime: str) -> tuple[str, str]:
    """
    Save original and generate a 400x400 thumbnail.
    Returns (original_relative_path, thumbnail_relative_path).
    """
    originals_dir, thumbnails_dir = get_upload_dirs()
    filename = str(uuid.uuid4())
    ext = "jpg" if "jpeg" in original_mime or "heic" in original_mime else original_mime.split("/")[-1]

    # Save original
    original_filename = f"{filename}.{ext}"
    original_path = os.path.join(originals_dir, original_filename)
    with open(original_path, "wb") as f:
        f.write(image_bytes)

    # Generate thumbnail
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    img.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)
    thumb_filename = f"{filename}_thumb.jpg"
    thumb_path = os.path.join(thumbnails_dir, thumb_filename)
    img.save(thumb_path, "JPEG", quality=85)

    # Return relative paths (served via static files)
    return (
        f"uploads/originals/{original_filename}",
        f"uploads/thumbnails/{thumb_filename}",
    )


def image_to_base64(image_bytes: bytes) -> str:
    import base64
    return base64.standard_b64encode(image_bytes).decode("utf-8")
