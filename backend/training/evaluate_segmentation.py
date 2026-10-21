"""
Evaluate a trained U-Net checkpoint on the FUSeg validation split.

The FUSeg test split has NO ground-truth labels (withheld by challenge organizers).
Evaluation is therefore performed on the validation split to report held-out metrics.

Usage (run from backend/ directory):
    python training/evaluate_segmentation.py --fuseg --checkpoint artifacts/best_unet.pt

Outputs:
    artifacts/evaluation/metrics.json      — aggregate metrics
    artifacts/evaluation/per_image.json    — per-image Dice / IoU
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from training.dataset import FUSegDataset
from app.models.unet import UNet

FUSEG_CHALLENGE_ROOT = (
    BACKEND_DIR / "data" / "FUSeg" / "data" / "Foot Ulcer Segmentation Challenge"
)


def parse_args():
    p = argparse.ArgumentParser(description="Evaluate trained U-Net on FUSeg validation split")
    p.add_argument("--fuseg", action="store_true", default=True,
                   help="Use FUSeg validation split (default; test split has no labels)")
    p.add_argument("--checkpoint", default=str(BACKEND_DIR / "artifacts" / "best_unet.pt"),
                   help="Path to trained .pt checkpoint")
    p.add_argument("--output-dir", default=str(BACKEND_DIR / "artifacts" / "evaluation"),
                   help="Directory to save evaluation results")
    p.add_argument("--batch-size", type=int, default=8)
    return p.parse_args()


def compute_metrics(pred_mask: np.ndarray, true_mask: np.ndarray, eps: float = 1e-9) -> dict:
    """Compute Dice, IoU, precision, recall for a single binary mask pair."""
    p = pred_mask.astype(bool).ravel()
    t = true_mask.astype(bool).ravel()
    tp = int((p & t).sum())
    fp = int((p & ~t).sum())
    fn = int((~p & t).sum())
    tn = int((~p & ~t).sum())
    dice = (2 * tp + eps) / (2 * tp + fp + fn + eps)
    iou = (tp + eps) / (tp + fp + fn + eps)
    precision = (tp + eps) / (tp + fp + eps)
    recall = (tp + eps) / (tp + fn + eps)
    return {
        "dice": float(dice),
        "iou": float(iou),
        "precision": float(precision),
        "recall": float(recall),
        "tp": tp, "fp": fp, "fn": fn, "tn": tn,
    }


@torch.inference_mode()
def main():
    args = parse_args()

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
    in_channels = int(cfg.get("in_channels", 3))

    model = UNet(in_channels=in_channels, out_channels=1)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    # ── Dataset ────────────────────────────────────────────────────────────────
    print("Loading FUSeg validation split ...")
    val_ds = FUSegDataset(
        FUSEG_CHALLENGE_ROOT, split="validation",
        image_size=image_size, augment=False
    )
    if not len(val_ds):
        sys.exit("Validation dataset is empty. Check your FUSeg directory.")

    dl = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)
    print(f"Samples: {len(val_ds)}   Split: validation (NOTE: test split has no labels)")

    # ── Evaluation ─────────────────────────────────────────────────────────────
    all_metrics = []
    for x, y in dl:
        x = x.to(device)
        logits = model(x)
        preds = (torch.sigmoid(logits) >= 0.5).cpu().numpy().astype(np.uint8)
        truths = (y.numpy() >= 0.5).astype(np.uint8)
        for pred, truth in zip(preds, truths):
            m = compute_metrics(pred[0], truth[0])
            all_metrics.append(m)

    # Aggregate
    agg = {
        "evaluated_split": "validation",
        "sample_count": len(all_metrics),
        "dice": float(np.mean([m["dice"] for m in all_metrics])),
        "iou": float(np.mean([m["iou"] for m in all_metrics])),
        "precision": float(np.mean([m["precision"] for m in all_metrics])),
        "recall": float(np.mean([m["recall"] for m in all_metrics])),
        "dice_std": float(np.std([m["dice"] for m in all_metrics])),
        "iou_std": float(np.std([m["iou"] for m in all_metrics])),
        "checkpoint_epoch": ckpt.get("epoch"),
        "checkpoint_best_val_dice": ckpt.get("best_val_dice"),
        "image_size": image_size,
        "limitations": [
            "Evaluated on the validation split (200 images). "
            "FUSeg test-set labels are withheld by challenge organizers.",
            "No patient identifiers — cannot guarantee absence of patient overlap "
            "between train and validation (split is from the challenge organizers).",
            "This prototype is not validated for clinical use.",
        ],
    }

    # Save
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "metrics.json").write_text(json.dumps(agg, indent=2))

    # Per-image results (image path + metrics)
    per_image = []
    for i, m in enumerate(all_metrics):
        img_path = str(val_ds.image_paths[i]) if i < len(val_ds.image_paths) else str(i)
        per_image.append({"image": img_path, **m})
    (out_dir / "per_image.json").write_text(json.dumps(per_image, indent=2))

    # Print summary
    print("\n" + "=" * 55)
    print("EVALUATION RESULTS  (validation split)")
    print("=" * 55)
    print(f"  Samples   : {agg['sample_count']}")
    print(f"  Dice      : {agg['dice']:.4f}  ± {agg['dice_std']:.4f}")
    print(f"  IoU       : {agg['iou']:.4f}  ± {agg['iou_std']:.4f}")
    print(f"  Precision : {agg['precision']:.4f}")
    print(f"  Recall    : {agg['recall']:.4f}")
    print(f"\n  Results saved to: {out_dir}")
    print("\n  NOTE: These are VALIDATION metrics, not test-set metrics.")
    print("  The FUSeg test-set labels are withheld by the challenge organizers.")
    print("=" * 55)


if __name__ == "__main__":
    main()
