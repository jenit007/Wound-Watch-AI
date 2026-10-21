"""
U-Net segmentation training script for the FUSeg / WoundWatch AI pipeline.

Usage (run from backend/ directory):
    # Smoke test (20 images, 3 epochs — quick sanity check):
    python training/train_segmentation.py --fuseg --smoke

    # Full training run:
    python training/train_segmentation.py --fuseg

    # Original adapter (images/ + masks/ layout):
    python training/train_segmentation.py --data <path_to_root>
"""

import argparse
import json
import random
import sys
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader
import yaml

# Path setup so both `python training/train_segmentation.py` and
# `python -m training.train_segmentation` work correctly.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from training.dataset import FUSegDataset, WoundSegmentationDataset, inspect_fuseg
from app.models.unet import UNet

FUSEG_CHALLENGE_ROOT = (
    BACKEND_DIR / "data" / "FUSeg" / "data" / "Foot Ulcer Segmentation Challenge"
)


# ── Loss / metrics ─────────────────────────────────────────────────────────────

def dice_loss(logits: torch.Tensor, targets: torch.Tensor, eps: float = 1e-6) -> torch.Tensor:
    probs = torch.sigmoid(logits)
    dims = (1, 2, 3)
    intersection = (probs * targets).sum(dims)
    dice = (2 * intersection + eps) / (probs.sum(dims) + targets.sum(dims) + eps)
    return 1 - dice.mean()


def batch_metrics(logits: torch.Tensor, targets: torch.Tensor, threshold: float = 0.5) -> dict:
    """Return mean Dice and IoU for a batch."""
    pred = torch.sigmoid(logits) >= threshold
    truth = targets >= 0.5
    dims = (1, 2, 3)
    tp = (pred & truth).sum(dims).float()
    fp = (pred & ~truth).sum(dims).float()
    fn = (~pred & truth).sum(dims).float()
    dice = ((2 * tp + 1e-6) / (2 * tp + fp + fn + 1e-6)).mean().item()
    iou = ((tp + 1e-6) / (tp + fp + fn + 1e-6)).mean().item()
    return {"dice": dice, "iou": iou}


# ── Main ───────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Train U-Net wound segmentation model")
    mode = p.add_mutually_exclusive_group()
    mode.add_argument(
        "--fuseg", action="store_true",
        help="Use the FUSeg Challenge dataset (recommended; uses official splits)"
    )
    mode.add_argument(
        "--data", default=None,
        help="Root directory for original adapter (must contain images/ and masks/)"
    )
    p.add_argument(
        "--config", default=str(BACKEND_DIR / "configs" / "train.yaml"),
        help="Path to train.yaml config file"
    )
    p.add_argument(
        "--output", default=str(BACKEND_DIR / "artifacts" / "best_unet.pt"),
        help="Path to save best checkpoint"
    )
    p.add_argument(
        "--smoke", action="store_true",
        help="Smoke-test mode: 20 train images, 5 val images, 3 epochs"
    )
    return p.parse_args()


def main():
    args = parse_args()

    # ── Config ─────────────────────────────────────────────────────────────────
    cfg_path = Path(args.config)
    if not cfg_path.is_file():
        sys.exit(f"Config not found: {cfg_path}")
    cfg = yaml.safe_load(cfg_path.read_text())

    seed = int(cfg.get("seed", 42))
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)

    image_size = int(cfg.get("image_size", 256))
    batch_size = int(cfg.get("batch_size", 8))
    num_workers = int(cfg.get("num_workers", 0))
    learning_rate = float(cfg.get("learning_rate", 1e-3))
    patience = int(cfg.get("patience", 7))
    max_epochs = int(cfg.get("epochs", 30))

    # Smoke-test overrides
    if args.smoke:
        max_epochs = 3
        train_max = 20
        val_max = 5
        print("=" * 60)
        print("SMOKE TEST MODE — 20 train images, 5 val images, 3 epochs")
        print("=" * 60)
    else:
        train_max = None
        val_max = None

    # ── Dataset ────────────────────────────────────────────────────────────────
    if args.fuseg or (not args.data):
        # FUSeg official splits
        if not FUSEG_CHALLENGE_ROOT.exists():
            sys.exit(
                f"FUSeg dataset not found at:\n  {FUSEG_CHALLENGE_ROOT}\n"
                "Re-run with --data <path> for a custom dataset layout."
            )
        print(f"\nDataset  : FUSeg Challenge (official splits)")
        print(f"Root     : {FUSEG_CHALLENGE_ROOT}")
        report = inspect_fuseg(FUSEG_CHALLENGE_ROOT)
        print(f"  Train  : {report['train']['matched_pairs']} pairs")
        print(f"  Val    : {report['validation']['matched_pairs']} pairs")
        print(f"  Test   : {report['test']['image_count']} images (no labels)")

        train_ds = FUSegDataset(
            FUSEG_CHALLENGE_ROOT, split="train",
            image_size=image_size, augment=True, max_samples=train_max
        )
        val_ds = FUSegDataset(
            FUSEG_CHALLENGE_ROOT, split="validation",
            image_size=image_size, augment=False, max_samples=val_max
        )
    else:
        # Original adapter
        from training.dataset import WoundSegmentationDataset, split_filenames
        data_root = Path(args.data)
        splits = split_filenames(
            data_root, seed=seed,
            train_fraction=cfg.get("train_fraction", 0.70),
            validation_fraction=cfg.get("validation_fraction", 0.15)
        )
        train_ds = WoundSegmentationDataset(data_root, splits[0], image_size, augment=True)
        val_ds = WoundSegmentationDataset(data_root, splits[1], image_size, augment=False)

    if not len(train_ds):
        sys.exit("Training dataset is empty. Check your image/label directories.")
    if not len(val_ds):
        sys.exit("Validation dataset is empty. Check your image/label directories.")

    print(f"\nConfig   : {cfg_path.name}")
    print(f"Images   : {image_size}×{image_size}   Batch: {batch_size}   LR: {learning_rate}")
    print(f"Max epochs: {max_epochs}   Patience: {patience}")
    print(f"Train samples: {len(train_ds)}   Val samples: {len(val_ds)}\n")

    train_dl = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers, pin_memory=False)
    val_dl = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=False)

    # ── Model ──────────────────────────────────────────────────────────────────
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    model = UNet(in_channels=3, out_channels=1).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    bce = nn.BCEWithLogitsLoss()

    # ── Checkpoint path ────────────────────────────────────────────────────────
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.is_file() and not args.smoke:
        print(f"WARNING: Checkpoint already exists at {output}")
        ans = input("Overwrite? [y/N]: ").strip().lower()
        if ans != "y":
            sys.exit("Aborted. Use --output to specify a different path.")

    # ── Training loop ──────────────────────────────────────────────────────────
    best_dice = -1.0
    stale = 0
    history = []

    for epoch in range(max_epochs):
        # Train
        model.train()
        train_losses = []
        for x, y in train_dl:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            try:
                logits = model(x)
                loss = bce(logits, y) + dice_loss(logits, y)
                loss.backward()
                optimizer.step()
                train_losses.append(loss.item())
            except RuntimeError as exc:
                if "out of memory" in str(exc).lower():
                    torch.cuda.empty_cache()
                    sys.exit(
                        "GPU out of memory. Reduce batch_size or image_size in configs/train.yaml."
                    )
                raise

        # Validate
        model.eval()
        val_losses, dices, ious = [], [], []
        with torch.no_grad():
            for x, y in val_dl:
                x, y = x.to(device), y.to(device)
                logits = model(x)
                val_losses.append((bce(logits, y) + dice_loss(logits, y)).item())
                m = batch_metrics(logits, y)
                dices.append(m["dice"])
                ious.append(m["iou"])

        val_dice = float(np.mean(dices))
        val_iou = float(np.mean(ious))
        record = {
            "epoch": epoch + 1,
            "train_loss": float(np.mean(train_losses)),
            "val_loss": float(np.mean(val_losses)),
            "val_dice": val_dice,
            "val_iou": val_iou,
        }
        history.append(record)
        print(json.dumps(record))

        # Checkpoint
        if val_dice > best_dice:
            best_dice = val_dice
            stale = 0
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "model_config": {
                        "image_size": image_size,
                        "in_channels": 3,
                        "out_channels": 1,
                        "features": [32, 64, 128, 256],
                    },
                    "training_config": cfg,
                    "best_val_dice": best_dice,
                    "best_val_iou": val_iou,
                    "epoch": epoch + 1,
                    "dataset": "FUSeg_Challenge" if (args.fuseg or not args.data) else str(args.data),
                    "preprocessing": {
                        "image_size": image_size,
                        "normalize_mean": [0.485, 0.456, 0.406],
                        "normalize_std": [0.229, 0.224, 0.225],
                        "mask_encoding": "binary: pixel>0 → 1.0 (wound), 0 → 0.0 (background)",
                    },
                    "note": (
                        "Checkpoint selected on validation Dice. "
                        "This is validation performance — not test-set performance. "
                        "Do not use test metrics for model selection."
                    ),
                },
                output,
            )
        else:
            stale += 1
            if stale >= patience:
                print(f"Early stopping at epoch {epoch + 1}: no improvement for {patience} epochs.")
                break

    # ── Save history ───────────────────────────────────────────────────────────
    history_path = Path(str(output) + ".history.json")
    history_path.write_text(
        json.dumps(
            {
                "history": history,
                "best_val_dice": best_dice,
                "dataset": "FUSeg_Challenge" if (args.fuseg or not args.data) else str(args.data),
                "patient_ids_used_for_split": False,
                "split_note": (
                    "Official FUSeg challenge train/validation splits. "
                    "Test split has no labels."
                ),
            },
            indent=2,
        )
    )

    print(f"\nTraining complete.")
    print(f"Best checkpoint : {output}")
    print(f"Best val Dice   : {best_dice:.4f}  (validation performance only)")
    print(f"History saved   : {history_path}")
    print(
        "\nIMPORTANT: Validation Dice is NOT test performance. "
        "Do not tune hyperparameters using test data."
    )


if __name__ == "__main__":
    main()
