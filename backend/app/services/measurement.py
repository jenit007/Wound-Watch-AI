"""Area and mask-visualization helpers."""
from io import BytesIO
import base64
import numpy as np
from PIL import Image

def wound_area_px(mask: np.ndarray) -> float:
    arr = np.asarray(mask)
    if arr.ndim == 3:
        arr = arr.squeeze()
    if arr.ndim != 2:
        raise ValueError("Mask must be a 2D array")
    return float(np.count_nonzero(arr))

def area_px_to_cm2(area_px: float, pixels_per_cm: float | None) -> float | None:
    if pixels_per_cm is None:
        return None
    if not np.isfinite(pixels_per_cm) or pixels_per_cm <= 0:
        raise ValueError("pixels_per_cm must be a positive finite value")
    if not np.isfinite(area_px) or area_px < 0:
        raise ValueError("area_px must be non-negative and finite")
    return float(area_px / (pixels_per_cm ** 2))

def mask_png_base64(mask: np.ndarray) -> str:
    binary = (np.asarray(mask).squeeze().astype(bool) * 255).astype(np.uint8)
    image = Image.fromarray(binary, mode="L")
    buf = BytesIO(); image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")

def overlay_png_base64(image: Image.Image, mask: np.ndarray, alpha: float = 0.4) -> str:
    base = image.convert("RGBA")
    mask_img = Image.fromarray((np.asarray(mask).squeeze().astype(bool) * 255).astype(np.uint8), mode="L")
    mask_img = mask_img.resize(base.size, Image.Resampling.NEAREST)
    overlay = Image.new("RGBA", base.size, (255, 40, 100, 0))
    overlay.putalpha(mask_img.point(lambda p: int(p * alpha)))
    out = Image.alpha_composite(base, overlay)
    buf = BytesIO(); out.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")
