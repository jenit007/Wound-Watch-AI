"""Checkpoint loading and real U-Net inference; no fabricated fallback masks."""
from __future__ import annotations

import os
from pathlib import Path
import torch
import numpy as np
from PIL import Image
from app.models.unet import UNet
from app.preprocessing.images import image_to_tensor
from app.services.measurement import wound_area_px, mask_png_base64, overlay_png_base64

class SegmentationService:
    def __init__(self, checkpoint_path: str | None = None, image_size: int = 256, device: str | None = None):
        if checkpoint_path is not None:
            self.checkpoint_path = Path(checkpoint_path)
        else:
            candidates = [
                os.getenv("WOUNDWATCH_CHECKPOINT"),
                "backend/artifacts/best_unet.pt",
                "artifacts/best_unet.pt",
                str(Path(__file__).resolve().parent.parent.parent / "artifacts" / "best_unet.pt"),
                str(Path(__file__).resolve().parent.parent.parent / "backend" / "artifacts" / "best_unet.pt"),
            ]
            chosen = None
            for c in candidates:
                if c and Path(c).is_file():
                    chosen = Path(c)
                    break
            self.checkpoint_path = chosen or Path("artifacts/best_unet.pt")
        self.image_size = int(image_size)
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.model = None
        self.load_error = None
        self._load()
    @property
    def ready(self): return self.model is not None
    def _load(self):
        if not self.checkpoint_path.is_file():
            self.load_error = "Segmentation checkpoint not found"
            return
        try:
            checkpoint = torch.load(self.checkpoint_path, map_location=self.device, weights_only=False)
            config = checkpoint.get("model_config", {}) if isinstance(checkpoint, dict) else {}
            self.image_size = int(config.get("image_size", self.image_size))
            self.model = UNet(in_channels=int(config.get("in_channels", 3)), out_channels=1)
            state = checkpoint.get("model_state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint
            self.model.load_state_dict(state)
            self.model.to(self.device).eval()
        except Exception as exc:
            self.model = None
            self.load_error = f"Checkpoint could not be loaded: {exc}"
            print(f"[ERROR] Failed to load checkpoint {self.checkpoint_path}: {exc}")
    @torch.inference_mode()
    def predict(self, image: Image.Image, pixels_per_cm: float | None = None):
        if not self.ready:
            raise RuntimeError("Segmentation model is unavailable")
        tensor = image_to_tensor(image, self.image_size).to(self.device)
        logits = self.model(tensor)
        small_mask = (torch.sigmoid(logits)[0, 0] >= 0.5).cpu().numpy().astype(np.uint8)
        mask_image = Image.fromarray(small_mask * 255).resize(image.size, Image.Resampling.NEAREST)
        mask = (np.asarray(mask_image) > 0).astype(np.uint8)
        area = wound_area_px(mask)
        return {"wound_area_px": area, "segmentation_mask_png_base64": mask_png_base64(mask),
                "overlay_png_base64": overlay_png_base64(image, mask), "mask": mask}
