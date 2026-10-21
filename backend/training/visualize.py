"""
Generate visual comparisons of U-Net wound segmentation predictions.

For each sample: original photo | ground-truth mask | predicted mask | overlay

Usage (run from backend/ directory):
    python training/visualize.py --checkpoint artifacts/best_unet.pt
    python training/visualize.py --checkpoint artifacts/best_unet.pt --num-samples 16

Outputs saved to: artifacts/visualizations/
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from training.dataset import FUSegDataset
from app.models.unet import UNet
from app.preprocessing.images import image_to_tensor

FUSEG_CHALLENGE_ROOT = (
    BACKEND_DIR / "data" / "FUSeg" / "data" / "Foot Ulcer Segmentation Challenge"
)


def add_label(img: Image.Image, text: str, color: str = "white", bg: str = "#333333") -> Image.Image:
    """Stamp a text label bar at the bottom of an image tile."""
    label_h = 22
    result = Image.new("RGB", (img.width, img.height + label_h), bg)
    result.paste(img, (0, 0))
    draw = ImageDraw.Draw(result)
    draw.text((4, img.height + 3), text, fill=color)
    return result


def mask_to_rgb(binary_mask: np.ndarray, wound_color=(255, 80, 80)) -> Image.Image:
    """Convert a binary (0/1) uint8 mask to a coloured RGB image."""
    h, w = binary_mask.shape
    canvas = np.zeros((h, w, 3), dtype=np.uint8)
    canvas[binary_mask > 0] = wound_color
    return Image.fromarray(canvas, mode="RGB")


def overlay(photo: Image.Image, binary_mask: np.ndarray, alpha: float = 0.45) -> Image.Image:
    photo_rgba = photo.convert("RGBA")
    overlay_layer = Image.new("RGBA", photo.size, (255, 60, 60, 0))
    mask_img = Image.fromarray((binary_mask * 255).astype(np.uint8), mode="L")
    mask_img = mask_img.resize(photo.size, Image.Resampling.NEAREST)
    overlay_layer.putalpha(mask_img.point(lambda p: int(p * alpha)))
    return Image.alpha_composite(photo_rgba, overlay_layer).convert("RGB")


@torch.inference_mode()
def main():
    p = argparse.ArgumentParser(description="Visualize U-Net segmentation predictions")
    p.add_argument("--checkpoint", default=str(BACKEND_DIR / "artifacts" / "best_unet.pt"))
    p.add_argument("--num-samples", type=int, default=8,
                   help="Number of validation samples to visualize (default: 8)")
    p.add_argument("--output-dir", default=str(BACKEND_DIR / "artifacts" / "visualizations"))
    args = p.parse_args()

    ckpt_path = Path(args.checkpoint)
    if not ckpt_path.is_file():
        sys.exit(
            f"Checkpoint not found: {ckpt_path}\n"
            "Train the model first:\n"
            "  python training/train_segmentation.py --fuseg"
        )

    print(f"Loading checkpoint: {ckpt_path}")
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    cfg = ckpt.get("model_config", {})
    image_size = int(cfg.get("image_size", 256))

    model = UNet(in_channels=3, out_channels=1)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    # Load validation samples
    val_ds = FUSegDataset(
        FUSEG_CHALLENGE_ROOT, split="validation",
        image_size=image_size, augment=False,
        max_samples=args.num_samples
    )
    if not len(val_ds):
        sys.exit("Validation dataset is empty.")

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating {len(val_ds)} visualizations -> {out_dir}")

    tile_w, tile_h = image_size, image_size
    panel_h = tile_h + 22  # +22 for label bar
    num_panels = 4          # photo | gt | prediction | overlay

    for idx, (img_path, lbl_path) in enumerate(zip(val_ds.image_paths, val_ds.label_paths)):
        # Load original photo at native resolution for display
        with Image.open(img_path) as im:
            photo_orig = im.convert("RGB")

        # Resize to model input for inference
        tensor = image_to_tensor(photo_orig, image_size).to(device)
        logits = model(tensor)
        pred_mask = (torch.sigmoid(logits)[0, 0] >= 0.5).cpu().numpy().astype(np.uint8)

        # Display photo at model size
        photo_display = photo_orig.resize((tile_w, tile_h), Image.Resampling.BILINEAR)

        # Ground-truth mask
        if lbl_path is not None:
            with Image.open(lbl_path) as im:
                gt_arr = np.asarray(im.convert("L"))
            gt_mask = (gt_arr > 0).astype(np.uint8)
            gt_img = mask_to_rgb(gt_mask).resize((tile_w, tile_h), Image.Resampling.NEAREST)
        else:
            gt_img = Image.fromarray(np.zeros((tile_h, tile_w, 3), dtype=np.uint8), mode="RGB")

        # Prediction mask
        pred_img = mask_to_rgb(
            (Image.fromarray(pred_mask * 255, mode="L")
             .resize((tile_w, tile_h), Image.Resampling.NEAREST)
             .__array__() if False else pred_mask)
        )

        # Overlay on original photo
        overlay_img = overlay(photo_display, pred_mask)

        # Assemble side-by-side panel
        panel = Image.new("RGB", (tile_w * num_panels, panel_h), (40, 40, 40))
        tiles = [
            add_label(photo_display, "Original Photo", bg="#1a1a2e"),
            add_label(gt_img, "Ground Truth", bg="#1a2e1a"),
            add_label(pred_img, "Model Prediction", bg="#2e1a1a"),
            add_label(overlay_img, "Overlay (prediction)", bg="#1a1a2e"),
        ]
        for col, tile in enumerate(tiles):
            panel.paste(tile, (col * tile_w, 0))

        fname = f"sample_{idx + 1:03d}_{img_path.stem}.png"
        panel.save(out_dir / fname)
        print(f"  Saved: {fname}")

    print(f"\nDone. {len(val_ds)} panels saved to: {out_dir}")
    print("Labels: 'Ground Truth' = annotated by wound professionals | "
          "'Model Prediction' = U-Net output (not clinically validated)")


if __name__ == "__main__":
    main()
