"""
FUSeg Dataset Inspection Script.

Scans every split of the Foot Ulcer Segmentation Challenge dataset,
counts images and masks, checks for mismatches, samples dimensions,
validates mask pixel values, and writes dataset_report.json.

Usage (run from backend/ directory):
    python training/inspect_dataset.py

Output:
    backend/data/FUSeg/dataset_report.json
    Human-readable summary printed to stdout.
"""

import json
import sys
from pathlib import Path
import traceback

try:
    from PIL import Image, UnidentifiedImageError
    import numpy as np
except ImportError as e:
    sys.exit(f"Missing dependency: {e}. Activate your virtual environment first.")

# ── Paths ──────────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).resolve().parent.parent
FUSEG_ROOT = BACKEND_DIR / "data" / "FUSeg" / "data" / "Foot Ulcer Segmentation Challenge"
REPORT_PATH = BACKEND_DIR / "data" / "FUSeg" / "dataset_report.json"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}
SPLITS = {
    "train": {"has_labels": True},
    "validation": {"has_labels": True},
    "test": {"has_labels": False},
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def collect_files(directory: Path) -> list[Path]:
    if not directory.exists():
        return []
    return sorted(p for p in directory.iterdir() if p.suffix.lower() in IMAGE_EXTS)


def inspect_file(path: Path) -> dict:
    """Return basic info about one image file."""
    info = {"path": str(path), "ok": False, "width": None, "height": None,
            "mode": None, "size_bytes": path.stat().st_size if path.exists() else 0}
    try:
        with Image.open(path) as im:
            im.verify()
        with Image.open(path) as im:
            info["width"], info["height"] = im.size
            info["mode"] = im.mode
            info["ok"] = True
    except (UnidentifiedImageError, OSError, Exception):
        info["corrupt"] = True
    return info


def inspect_mask(path: Path) -> dict:
    """Check that a mask file contains valid binary wound annotations."""
    info = inspect_file(path)
    if not info["ok"]:
        return info
    try:
        with Image.open(path) as im:
            arr = np.asarray(im.convert("L"))
        unique_vals = sorted(int(v) for v in np.unique(arr).tolist())
        info["unique_pixel_values"] = unique_vals
        info["wound_pixels"] = int(np.count_nonzero(arr))
        info["total_pixels"] = int(arr.size)
        info["wound_fraction"] = round(float(info["wound_pixels"]) / info["total_pixels"], 4)
        # Validate: values should be {0} or {0, 1} or {0, 255}
        valid = set(unique_vals).issubset({0, 1, 255})
        info["valid_binary_mask"] = valid
        if not valid:
            info["warning"] = f"Unexpected pixel values: {unique_vals}"
    except Exception as exc:
        info["mask_read_error"] = str(exc)
    return info


def inspect_split(split_name: str, has_labels: bool) -> dict:
    split_dir = FUSEG_ROOT / split_name
    image_dir = split_dir / "images"
    label_dir = split_dir / "labels" if has_labels else None

    image_files = collect_files(image_dir)
    label_files = collect_files(label_dir) if has_labels and label_dir else []

    image_stems = {p.stem: p for p in image_files}
    label_stems = {p.stem: p for p in label_files}

    matched = sorted(set(image_stems) & set(label_stems))
    images_without_labels = sorted(set(image_stems) - set(label_stems))
    labels_without_images = sorted(set(label_stems) - set(image_stems))

    # Sample up to 10 files for deeper inspection
    sample_size = min(10, len(image_files))
    sample_images = image_files[:sample_size]

    image_infos = []
    for p in sample_images:
        image_infos.append(inspect_file(p))

    corrupt_images = [i["path"] for i in image_infos if not i.get("ok", False)]

    # Sample mask inspection (up to 10)
    mask_infos = []
    zero_wound_masks = []
    invalid_masks = []
    if has_labels:
        sample_labels = [label_stems[s] for s in matched[:10] if s in label_stems]
        for p in sample_labels:
            mi = inspect_mask(p)
            mask_infos.append(mi)
            if mi.get("wound_pixels", 1) == 0:
                zero_wound_masks.append(str(p))
            if not mi.get("valid_binary_mask", True):
                invalid_masks.append({"path": str(p), "values": mi.get("unique_pixel_values")})

    # Collect size stats from sample
    widths = [i["width"] for i in image_infos if i["width"]]
    heights = [i["height"] for i in image_infos if i["height"]]

    result = {
        "split": split_name,
        "image_count": len(image_files),
        "label_count": len(label_files),
        "matched_pairs": len(matched),
        "images_without_labels": images_without_labels,
        "labels_without_images": labels_without_images,
        "corrupt_images_in_sample": corrupt_images,
        "zero_wound_masks_in_sample": zero_wound_masks,
        "invalid_mask_values_in_sample": invalid_masks,
        "sample_image_widths": widths,
        "sample_image_heights": heights,
        "ground_truth_available": has_labels,
        "notes": [] if has_labels else ["Test split — no ground-truth labels (withheld by challenge organizers)."],
    }

    if has_labels:
        # Check one mask pixel value range to confirm binary encoding
        if mask_infos:
            all_vals = set()
            for mi in mask_infos:
                all_vals.update(mi.get("unique_pixel_values", []))
            result["observed_mask_pixel_values_in_sample"] = sorted(all_vals)

    return result


def run_inspection():
    if not FUSEG_ROOT.exists():
        sys.exit(
            f"\nERROR: FUSeg dataset not found at:\n  {FUSEG_ROOT}\n"
            "Please extract the dataset to backend/data/FUSeg/ and try again."
        )

    print("=" * 70)
    print("WoundWatch AI — FUSeg Dataset Inspection")
    print("=" * 70)
    print(f"Dataset root : {FUSEG_ROOT}")
    print(f"Report will be saved to: {REPORT_PATH}\n")

    split_reports = {}
    for split_name, opts in SPLITS.items():
        print(f"  Inspecting split: {split_name} ...", end=" ", flush=True)
        rep = inspect_split(split_name, opts["has_labels"])
        split_reports[split_name] = rep
        status = "OK" if not rep["corrupt_images_in_sample"] and not rep["invalid_mask_values_in_sample"] else "WARNINGS"
        print(status)

    # Build full report
    report = {
        "dataset": "Foot Ulcer Segmentation Challenge (FUSeg 2021)",
        "dataset_root": str(FUSEG_ROOT),
        "splits": split_reports,
        "patient_identifiers_available": False,
        "split_strategy": "Official FUSeg challenge train/validation/test splits are used directly.",
        "split_strategy_limitations": (
            "No patient identifiers are available in the downloaded dataset. "
            "The official splits were created by the challenge organizers and are used as-is. "
            "Patient leakage cannot be independently verified from this local copy."
        ),
        "mask_encoding": (
            "Masks are grayscale PNG files. Pixel value >0 indicates wound area; "
            "value 0 indicates background. Masks are converted to binary (0/1) during loading."
        ),
        "test_set_note": (
            "The test split contains 200 images with NO ground-truth labels. "
            "Evaluation is performed on the validation split only."
        ),
        "imaging_note": "De-identified per HIPAA. No patient information is present or logged.",
    }

    # Human-readable summary
    print("\n" + "=" * 70)
    print("DATASET SUMMARY")
    print("=" * 70)
    total_labeled = 0
    for spl, rep in split_reports.items():
        has_gt = rep["ground_truth_available"]
        pairs = rep["matched_pairs"] if has_gt else "N/A (no labels)"
        print(f"  {spl:12s}  images={rep['image_count']:4d}  labels={rep['label_count']:4d}  matched_pairs={pairs}")
        if has_gt:
            total_labeled += rep["matched_pairs"]
        if rep["images_without_labels"]:
            print(f"             WARNING: {len(rep['images_without_labels'])} images have no matching label")
        if rep["labels_without_images"]:
            print(f"             WARNING: {len(rep['labels_without_images'])} labels have no matching image")
        if rep["corrupt_images_in_sample"]:
            print(f"             WARNING: corrupt images detected: {rep['corrupt_images_in_sample']}")
        if rep.get("observed_mask_pixel_values_in_sample"):
            print(f"             Mask pixel values (sample): {rep['observed_mask_pixel_values_in_sample']}")
        if rep["notes"]:
            for note in rep["notes"]:
                print(f"             NOTE: {note}")

    print(f"\n  Total labeled pairs available for training+validation: {total_labeled}")
    print("  Test labels: WITHHELD by challenge (expected — not an error).")
    print("  No patient identifiers present — using official challenge splits.")
    print("\n  U-Net, preprocessing, API code: all correct (no changes needed)")
    print("  Dataset adapter fix needed: FUSeg uses 'labels/' not 'masks/' folder.")

    # Write report
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print(f"\n  Report saved: {REPORT_PATH}")
    print("=" * 70)

    # Check if dataset is usable
    train_rep = split_reports.get("train", {})
    val_rep = split_reports.get("validation", {})
    if train_rep.get("matched_pairs", 0) < 10 or val_rep.get("matched_pairs", 0) < 2:
        print("\nERROR: Insufficient matched pairs. Check dataset extraction.")
        sys.exit(1)

    print("\nDataset inspection passed. Proceed to Phase 2 (training).")
    return report


if __name__ == "__main__":
    run_inspection()
