"""
Dataset adapters for wound segmentation.

Two classes are provided:
  - WoundSegmentationDataset : original adapter (images/ + masks/ layout)
  - FUSegDataset             : FUSeg Challenge adapter (images/ + labels/ layout,
                               official train/validation/test splits)

Usage:
    from dataset import FUSegDataset, FUSegDatasetInspector
"""

from pathlib import Path
import numpy as np
import torch
from torch.utils.data import Dataset
from PIL import Image

# Allow importing from both `training/` (script context) and `backend/` (pytest context)
try:
    from app.preprocessing.images import image_to_tensor, resize_mask
except ImportError:
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from app.preprocessing.images import image_to_tensor, resize_mask

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


# ── Original adapter (kept for backward compatibility) ─────────────────────────

class WoundSegmentationDataset(Dataset):
    """Generic dataset: expects root/images/ and root/masks/ layout."""

    def __init__(self, root: str | Path, filenames: list[str] | None = None,
                 image_size: int = 256, augment: bool = False):
        self.root = Path(root)
        self.image_dir = self.root / "images"
        self.mask_dir = self.root / "masks"
        all_images = sorted(
            p for p in self.image_dir.glob("*") if p.suffix.lower() in IMAGE_EXTS
        )
        requested = set(filenames) if filenames is not None else None
        self.items = [
            (p, self._find_mask(p))
            for p in all_images
            if (requested is None or p.name in requested) and self._find_mask(p) is not None
        ]
        self.image_size = image_size
        self.augment = augment

    def _find_mask(self, image_path: Path) -> Path | None:
        for ext in IMAGE_EXTS:
            candidate = self.mask_dir / (image_path.stem + ext)
            if candidate.exists():
                return candidate
        return None

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, idx: int):
        ip, mp = self.items[idx]
        with Image.open(ip) as im:
            image = image_to_tensor(im.convert("RGB"), self.image_size)[0]
        with Image.open(mp) as im:
            mask = resize_mask(im, self.image_size)
        if self.augment:
            if torch.rand(()) < 0.5:
                image = torch.flip(image, dims=[2])
                mask = torch.flip(mask, dims=[2])
            if torch.rand(()) < 0.5:
                image = torch.flip(image, dims=[1])
                mask = torch.flip(mask, dims=[1])
        return image, mask


# ── FUSeg Challenge adapter ────────────────────────────────────────────────────

class FUSegDataset(Dataset):
    """
    Dataset adapter for the Foot Ulcer Segmentation Challenge (FUSeg 2021).

    Folder structure expected:
        <fuseg_challenge_root>/
            train/
                images/  *.png
                labels/  *.png   (binary masks: 0=background, >0=wound)
            validation/
                images/  *.png
                labels/  *.png
            test/
                images/  *.png   (no labels — withheld by challenge)

    Args:
        fuseg_challenge_root: Path to ``Foot Ulcer Segmentation Challenge/``
        split:   ``"train"``, ``"validation"``, or ``"test"``
        image_size: Resize both image and mask to this square dimension
        augment:    Apply random horizontal/vertical flips (training only)
        max_samples: If set, limit to this many samples (useful for smoke tests)
    """

    def __init__(
        self,
        fuseg_challenge_root: str | Path,
        split: str,
        image_size: int = 256,
        augment: bool = False,
        max_samples: int | None = None,
    ):
        self.root = Path(fuseg_challenge_root)
        if split not in ("train", "validation", "test"):
            raise ValueError(f"split must be 'train', 'validation', or 'test', got '{split}'")
        self.split = split
        self.image_size = image_size
        self.augment = augment

        image_dir = self.root / split / "images"
        label_dir = self.root / split / "labels"
        self.has_labels = label_dir.exists()

        if not image_dir.exists():
            raise FileNotFoundError(
                f"FUSeg images directory not found: {image_dir}\n"
                "Check that the dataset is extracted to backend/data/FUSeg/"
            )

        image_files = sorted(
            p for p in image_dir.glob("*") if p.suffix.lower() in IMAGE_EXTS
        )

        if self.has_labels:
            self.items: list[tuple[Path, Path | None]] = []
            for img in image_files:
                lbl = label_dir / img.name  # same filename, same extension
                if lbl.exists():
                    self.items.append((img, lbl))
                else:
                    # fallback: search for any extension match
                    found = None
                    for ext in IMAGE_EXTS:
                        cand = label_dir / (img.stem + ext)
                        if cand.exists():
                            found = cand
                            break
                    if found:
                        self.items.append((img, found))
                    # images without a matching label are silently skipped
        else:
            # Test split — no labels
            self.items = [(img, None) for img in image_files]

        if max_samples is not None:
            self.items = self.items[:max_samples]

    # ── properties ────────────────────────────────────────────────────────────

    @property
    def image_paths(self) -> list[Path]:
        return [ip for ip, _ in self.items]

    @property
    def label_paths(self) -> list[Path | None]:
        return [lp for _, lp in self.items]

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, idx: int):
        ip, lp = self.items[idx]

        with Image.open(ip) as im:
            image = image_to_tensor(im.convert("RGB"), self.image_size)[0]

        if lp is not None:
            with Image.open(lp) as im:
                mask = resize_mask(im, self.image_size)
        else:
            # Test split: return a dummy all-zero mask
            mask = torch.zeros(1, self.image_size, self.image_size)

        if self.augment:
            # Identical geometric transform applied to both image and mask
            if torch.rand(()) < 0.5:
                image = torch.flip(image, dims=[2])
                mask = torch.flip(mask, dims=[2])
            if torch.rand(()) < 0.5:
                image = torch.flip(image, dims=[1])
                mask = torch.flip(mask, dims=[1])
            # Random 90° rotation
            k = torch.randint(0, 4, ()).item()
            if k > 0:
                image = torch.rot90(image, k=k, dims=[1, 2])
                mask = torch.rot90(mask, k=k, dims=[1, 2])

        return image, mask


# ── Inspector (used by training / inspect_dataset.py) ─────────────────────────

def inspect_fuseg(fuseg_challenge_root: str | Path) -> dict:
    """Return a summary dict for each FUSeg split. Does not read pixel data."""
    root = Path(fuseg_challenge_root)
    report = {}
    for split in ("train", "validation", "test"):
        image_dir = root / split / "images"
        label_dir = root / split / "labels"
        imgs = sorted(p for p in image_dir.glob("*") if image_dir.exists() and p.suffix.lower() in IMAGE_EXTS)
        lbls = sorted(p for p in label_dir.glob("*") if label_dir.exists() and p.suffix.lower() in IMAGE_EXTS) if label_dir.exists() else []
        img_stems = {p.stem for p in imgs}
        lbl_stems = {p.stem for p in lbls}
        report[split] = {
            "image_count": len(imgs),
            "label_count": len(lbls),
            "matched_pairs": len(img_stems & lbl_stems),
            "images_without_labels": sorted(img_stems - lbl_stems),
            "labels_without_images": sorted(lbl_stems - img_stems),
            "ground_truth_available": label_dir.exists() and len(lbls) > 0,
        }
    return report
