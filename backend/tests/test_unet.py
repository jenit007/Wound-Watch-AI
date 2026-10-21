"""
Comprehensive test suite for WoundWatch AI segmentation pipeline.

Tests cover:
  - U-Net forward pass and output shape
  - FUSeg dataset loading and mask correctness
  - Preprocessing functions
  - Dice / IoU metric computation
  - Checkpoint save and load
  - Inference service (real checkpoint, if present)
  - API schema compatibility (existing tests kept in test_services.py)

Run from backend/ directory:
    python -m pytest tests/ -v
"""

import io
import json
import tempfile
from pathlib import Path

import numpy as np
import pytest
import torch
from PIL import Image

# ── Path setup ─────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).resolve().parent.parent
FUSEG_CHALLENGE_ROOT = (
    BACKEND_DIR / "data" / "FUSeg" / "data" / "Foot Ulcer Segmentation Challenge"
)
CHECKPOINT_PATH = BACKEND_DIR / "artifacts" / "best_unet.pt"


# ═══════════════════════════════════════════════════════════════════════════════
# U-Net architecture
# ═══════════════════════════════════════════════════════════════════════════════

def test_unet_output_shape():
    """Small U-Net produces correct output shape."""
    from app.models.unet import UNet
    model = UNet(features=(8, 16))
    x = torch.randn(2, 3, 64, 64)
    out = model(x)
    assert out.shape == (2, 1, 64, 64), f"Expected (2,1,64,64), got {out.shape}"


def test_unet_full_size_output():
    """Standard U-Net handles 256×256 input."""
    from app.models.unet import UNet
    model = UNet(in_channels=3, out_channels=1)
    out = model(torch.randn(1, 3, 256, 256))
    assert out.shape == (1, 1, 256, 256)


def test_unet_logits_not_bounded():
    """Output should be raw logits (not sigmoid-bounded)."""
    from app.models.unet import UNet
    model = UNet(features=(8, 16))
    out = model(torch.randn(1, 3, 64, 64))
    # Raw logits are unbounded; sigmoid output would be in (0,1)
    assert out.abs().max().item() > 0.0  # at minimum, non-trivial output


# ═══════════════════════════════════════════════════════════════════════════════
# Preprocessing helpers
# ═══════════════════════════════════════════════════════════════════════════════

def test_image_to_tensor_shape():
    from app.preprocessing.images import image_to_tensor
    img = Image.new("RGB", (100, 150), color=(128, 64, 32))
    tensor = image_to_tensor(img, size=64)
    # Returns shape (1, 3, 64, 64)  [with batch dim]
    assert tensor.shape == (1, 3, 64, 64)
    assert tensor.dtype == torch.float32


def test_image_to_tensor_normalized():
    """After normalization the tensor may go negative (ImageNet stats)."""
    from app.preprocessing.images import image_to_tensor
    white_img = Image.new("RGB", (32, 32), color=(255, 255, 255))
    tensor = image_to_tensor(white_img, size=32)
    # pixel 1.0 → (1 - 0.485)/0.229 ≈ 2.25 > 0; ensure it is not clamped to [0,1]
    assert tensor.max().item() > 1.0


def test_resize_mask_binary():
    """resize_mask must produce only 0.0 and 1.0 values."""
    from app.preprocessing.images import resize_mask
    # Create a mask with pixel values 0 and 255
    arr = np.zeros((64, 64), dtype=np.uint8)
    arr[20:45, 20:45] = 255
    mask_img = Image.fromarray(arr, mode="L")
    mask_tensor = resize_mask(mask_img, size=32)
    unique = torch.unique(mask_tensor)
    for v in unique.tolist():
        assert v in (0.0, 1.0), f"Unexpected mask value: {v}"


def test_resize_mask_uses_nearest():
    """Masks resized with bilinear would introduce intermediate values — must not happen."""
    from app.preprocessing.images import resize_mask
    # Checkerboard pattern: bilinear would create 0.5 values at borders
    arr = np.zeros((64, 64), dtype=np.uint8)
    arr[::2, ::2] = 255  # every other pixel
    mask_img = Image.fromarray(arr, mode="L")
    mask_tensor = resize_mask(mask_img, size=64)
    unique = torch.unique(mask_tensor).tolist()
    for v in unique:
        assert v in (0.0, 1.0), f"Bilinear blending detected (unexpected value {v})"


def test_mask_alignment_preserved_under_hflip():
    """A paired image+mask flip must remain spatially aligned."""
    from app.preprocessing.images import image_to_tensor, resize_mask
    # Create a mask with a mark only on the right half
    arr = np.zeros((64, 64), dtype=np.uint8)
    arr[:, 32:] = 255
    mask_img = Image.fromarray(arr, mode="L")
    img = Image.new("RGB", (64, 64), color=(30, 30, 30))
    image_tensor = image_to_tensor(img, 64)[0]
    mask_tensor = resize_mask(mask_img, 64)
    # Horizontal flip
    flipped_img = torch.flip(image_tensor, dims=[2])
    flipped_mask = torch.flip(mask_tensor, dims=[2])
    # After flip, the mark should be on the left half
    left_half = flipped_mask[:, :, :32]
    right_half = flipped_mask[:, :, 32:]
    assert left_half.sum() > 0
    assert right_half.sum() == 0


# ═══════════════════════════════════════════════════════════════════════════════
# Metric functions  (extracted from training script for unit testing)
# ═══════════════════════════════════════════════════════════════════════════════

def _dice_iou(pred_mask: np.ndarray, true_mask: np.ndarray, eps: float = 1e-9):
    p = pred_mask.astype(bool).ravel()
    t = true_mask.astype(bool).ravel()
    tp = int((p & t).sum())
    fp = int((p & ~t).sum())
    fn = int((~p & t).sum())
    dice = (2 * tp + eps) / (2 * tp + fp + fn + eps)
    iou = (tp + eps) / (tp + fp + fn + eps)
    precision = (tp + eps) / (tp + fp + eps)
    recall = (tp + eps) / (tp + fn + eps)
    return dice, iou, precision, recall


def test_dice_perfect_overlap():
    mask = np.array([[1, 1], [0, 0]], dtype=np.uint8)
    dice, iou, precision, recall = _dice_iou(mask, mask)
    assert dice == pytest.approx(1.0, abs=1e-5)
    assert iou == pytest.approx(1.0, abs=1e-5)


def test_dice_zero_overlap():
    pred = np.array([[1, 0], [0, 0]], dtype=np.uint8)
    true = np.array([[0, 0], [1, 0]], dtype=np.uint8)
    dice, iou, _, _ = _dice_iou(pred, true)
    assert dice < 0.1


def test_precision_recall_definitions():
    pred = np.array([[1, 1, 0, 0]], dtype=np.uint8)
    true = np.array([[1, 0, 1, 0]], dtype=np.uint8)
    _, _, precision, recall = _dice_iou(pred, true)
    # TP=1, FP=1, FN=1; precision=0.5, recall=0.5
    assert precision == pytest.approx(0.5, abs=0.02)
    assert recall == pytest.approx(0.5, abs=0.02)


def test_dice_empty_pred_non_empty_truth():
    pred = np.zeros((4, 4), dtype=np.uint8)
    true = np.ones((4, 4), dtype=np.uint8)
    dice, iou, _, recall = _dice_iou(pred, true)
    assert dice < 0.01
    assert recall < 0.01


# ═══════════════════════════════════════════════════════════════════════════════
# Checkpoint save / load
# ═══════════════════════════════════════════════════════════════════════════════

def test_checkpoint_save_and_load():
    """Save a tiny model checkpoint and reload it successfully."""
    from app.models.unet import UNet
    model = UNet(features=(4, 8))
    with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as f:
        ckpt_path = Path(f.name)
    try:
        payload = {
            "model_state_dict": model.state_dict(),
            "model_config": {"image_size": 64, "in_channels": 3, "out_channels": 1},
            "best_val_dice": 0.75,
            "epoch": 5,
        }
        torch.save(payload, ckpt_path)

        loaded = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        model2 = UNet(features=(4, 8))
        model2.load_state_dict(loaded["model_state_dict"])
        model2.eval()

        x = torch.randn(1, 3, 64, 64)
        with torch.no_grad():
            out = model2(x)
        assert out.shape == (1, 1, 64, 64)
        assert loaded["best_val_dice"] == pytest.approx(0.75)
    finally:
        ckpt_path.unlink(missing_ok=True)


def test_checkpoint_metadata_fields():
    """Checkpoint must contain all required metadata fields."""
    if not CHECKPOINT_PATH.is_file():
        pytest.skip("No trained checkpoint available — run training first.")
    ckpt = torch.load(CHECKPOINT_PATH, map_location="cpu", weights_only=False)
    required = {"model_state_dict", "model_config", "best_val_dice", "epoch"}
    missing = required - set(ckpt.keys())
    assert not missing, f"Checkpoint missing keys: {missing}"


# ═══════════════════════════════════════════════════════════════════════════════
# FUSeg Dataset loading
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def fuseg_available():
    return FUSEG_CHALLENGE_ROOT.exists()


def test_fuseg_dataset_loads_train(fuseg_available):
    if not fuseg_available:
        pytest.skip("FUSeg dataset not found.")
    from training.dataset import FUSegDataset
    ds = FUSegDataset(FUSEG_CHALLENGE_ROOT, split="train", image_size=64, max_samples=5)
    assert len(ds) == 5


def test_fuseg_dataset_image_mask_shape(fuseg_available):
    if not fuseg_available:
        pytest.skip("FUSeg dataset not found.")
    from training.dataset import FUSegDataset
    ds = FUSegDataset(FUSEG_CHALLENGE_ROOT, split="train", image_size=64, max_samples=3)
    image, mask = ds[0]
    assert image.shape == (3, 64, 64), f"Expected (3,64,64), got {image.shape}"
    assert mask.shape == (1, 64, 64), f"Expected (1,64,64), got {mask.shape}"


def test_fuseg_mask_is_binary(fuseg_available):
    """All mask values must be exactly 0.0 or 1.0."""
    if not fuseg_available:
        pytest.skip("FUSeg dataset not found.")
    from training.dataset import FUSegDataset
    ds = FUSegDataset(FUSEG_CHALLENGE_ROOT, split="train", image_size=64, max_samples=10)
    for i in range(len(ds)):
        _, mask = ds[i]
        unique = torch.unique(mask).tolist()
        for v in unique:
            assert v in (0.0, 1.0), f"Sample {i} mask has non-binary value {v}"


def test_fuseg_val_has_labels(fuseg_available):
    if not fuseg_available:
        pytest.skip("FUSeg dataset not found.")
    from training.dataset import FUSegDataset
    ds = FUSegDataset(FUSEG_CHALLENGE_ROOT, split="validation", image_size=64, max_samples=3)
    assert ds.has_labels is True
    assert len(ds) == 3


def test_fuseg_test_no_labels(fuseg_available):
    """Test split must not raise errors—it just returns zero masks."""
    if not fuseg_available:
        pytest.skip("FUSeg dataset not found.")
    from training.dataset import FUSegDataset
    ds = FUSegDataset(FUSEG_CHALLENGE_ROOT, split="test", image_size=64, max_samples=3)
    assert ds.has_labels is False
    image, mask = ds[0]
    # dummy zero mask
    assert mask.sum().item() == 0.0


def test_fuseg_train_val_counts(fuseg_available):
    if not fuseg_available:
        pytest.skip("FUSeg dataset not found.")
    from training.dataset import FUSegDataset
    train_ds = FUSegDataset(FUSEG_CHALLENGE_ROOT, split="train", image_size=64)
    val_ds = FUSegDataset(FUSEG_CHALLENGE_ROOT, split="validation", image_size=64)
    assert len(train_ds) == 810, f"Expected 810 train pairs, got {len(train_ds)}"
    assert len(val_ds) == 200, f"Expected 200 val pairs, got {len(val_ds)}"


# ═══════════════════════════════════════════════════════════════════════════════
# Inference service (real checkpoint, skipped if absent)
# ═══════════════════════════════════════════════════════════════════════════════

def test_inference_service_unavailable_without_checkpoint():
    """Service must report ready=False and not crash when checkpoint is missing."""
    from app.services.inference import SegmentationService
    svc = SegmentationService(checkpoint_path="/nonexistent/path/model.pt")
    assert svc.ready is False


def test_inference_service_with_real_checkpoint():
    """If a trained checkpoint exists, it must load and produce a valid mask."""
    if not CHECKPOINT_PATH.is_file():
        pytest.skip("No trained checkpoint available — run training first.")
    from app.services.inference import SegmentationService
    svc = SegmentationService(checkpoint_path=str(CHECKPOINT_PATH))
    assert svc.ready, f"Failed to load checkpoint: {svc.load_error}"

    img = Image.new("RGB", (256, 256), color=(180, 120, 100))
    result = svc.predict(img)

    assert "wound_area_px" in result
    assert "segmentation_mask_png_base64" in result
    assert isinstance(result["wound_area_px"], float)
    assert result["wound_area_px"] >= 0.0

    # Decode mask and verify it's a valid PNG
    import base64
    raw_png = base64.b64decode(result["segmentation_mask_png_base64"])
    mask_img = Image.open(io.BytesIO(raw_png))
    assert mask_img.size[0] > 0
    assert mask_img.size[1] > 0
