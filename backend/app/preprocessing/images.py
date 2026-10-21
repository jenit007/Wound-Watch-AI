"""Image validation and preprocessing helpers."""
from io import BytesIO
from PIL import Image, UnidentifiedImageError
import numpy as np
import torch

SUPPORTED_FORMATS = {"JPEG", "PNG", "WEBP"}

def load_rgb_image(data: bytes, max_pixels: int = 25_000_000) -> Image.Image:
    try:
        image = Image.open(BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError("Uploaded file is not a valid image") from exc
    if image.format not in SUPPORTED_FORMATS:
        raise ValueError("Only JPEG, PNG, and WebP images are supported")
    if image.width * image.height > max_pixels:
        raise ValueError("Image dimensions are too large")
    return image.convert("RGB")

def image_to_tensor(image: Image.Image, size: int = 256) -> torch.Tensor:
    resized = image.resize((size, size), Image.Resampling.BILINEAR)
    arr = np.asarray(resized, dtype=np.float32) / 255.0
    arr = (arr - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / np.array([0.229, 0.224, 0.225], dtype=np.float32)
    return torch.from_numpy(arr.transpose(2, 0, 1).copy()).float().unsqueeze(0)

def resize_mask(mask: Image.Image, size: int) -> torch.Tensor:
    arr = np.asarray(mask.convert("L").resize((size, size), Image.Resampling.NEAREST), dtype=np.uint8)
    return torch.from_numpy((arr > 0).astype(np.float32)).unsqueeze(0)
