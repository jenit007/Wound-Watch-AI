# WoundWatch AI — ML Backend

A research prototype for wound-region segmentation, pixel-area measurement, and descriptive longitudinal analysis. **Not a diagnostic, triage, or treatment system.**

---

## Quick Start (Windows PowerShell)

All commands below are run from the **`backend/`** directory unless stated otherwise.

### 1. Activate Your Virtual Environment

```powershell
# From the project root (WoundWatchAI_ML_Backend/)
.\.venv\Scripts\Activate.ps1
# Your prompt should now show (.venv)
```

### 2. Install Missing Dependencies

```powershell
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
```

> If you need PyTorch with GPU (CUDA), install it first from https://pytorch.org/get-started/locally/ before running `pip install -r requirements.txt`.

---

## Dataset

The **FUSeg (Foot Ulcer Segmentation Challenge 2021)** dataset is located at:

```
backend/data/FUSeg/data/Foot Ulcer Segmentation Challenge/
    train/          810 images + 810 labels (ground-truth masks)
    validation/     200 images + 200 labels (ground-truth masks)
    test/           200 images (NO labels — withheld by challenge organizers)
```

### 3. Inspect the Dataset

```powershell
# From backend/
$env:PYTHONPATH = "."
python training/inspect_dataset.py
```

This prints a human-readable summary and saves `backend/data/FUSeg/dataset_report.json`.

---

## Training

### 4. Short Smoke Test (20 images, 3 epochs — takes ~1 minute on CPU)

```powershell
# From backend/
$env:PYTHONPATH = "."
python training/train_segmentation.py --fuseg --smoke
```

Check for errors. If successful, you will see 3 lines of epoch metrics printed.

### 5. Full Training Run (810 train images, up to 30 epochs)

```powershell
# From backend/
$env:PYTHONPATH = "."
python training/train_segmentation.py --fuseg --config configs/train.yaml --output artifacts/best_unet.pt
```

- If `artifacts/best_unet.pt` already exists, you will be prompted before overwriting.
- Training saves per-epoch metrics to `artifacts/best_unet.pt.history.json`.
- The best checkpoint (highest validation Dice) is saved automatically.
- Early stopping triggers after `patience=7` epochs with no improvement.
- To change `batch_size`, `image_size`, `epochs`, or `learning_rate`, edit `configs/train.yaml`.

**On CPU, full training can take several hours.** If you have a CUDA GPU it will be used automatically.

---

## Evaluation

### 6. Evaluate the Trained Model

```powershell
# From backend/
$env:PYTHONPATH = "."
python training/evaluate_segmentation.py --checkpoint artifacts/best_unet.pt
```

Results are saved to:
- `artifacts/evaluation/metrics.json` — Dice, IoU, Precision, Recall
- `artifacts/evaluation/per_image.json` — one result per validation image

> **Note:** Evaluation runs on the **validation** split (200 labeled images). The FUSeg test-set labels are withheld by the challenge organizers and cannot be used.

---

## Viewing Metrics and Visualizations

### 7. View Training Metrics

```powershell
# Print training history (epoch-by-epoch Dice / IoU)
Get-Content artifacts/best_unet.pt.history.json | python -m json.tool

# Print evaluation results
Get-Content artifacts/evaluation/metrics.json | python -m json.tool
```

### Generate Visualizations

```powershell
# From backend/
$env:PYTHONPATH = "."
python training/visualize.py --checkpoint artifacts/best_unet.pt --num-samples 8
```

Saves 8 side-by-side panels (photo | ground truth | prediction | overlay) to `artifacts/visualizations/`.

---

## API Server

### 8. Configure the Checkpoint

```powershell
$env:WOUNDWATCH_CHECKPOINT = "artifacts/best_unet.pt"
```

Without this, the API starts but returns `model_status: "unavailable"` — this is correct behavior.

### 9. Start the FastAPI Server

```powershell
# From backend/
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Interactive API docs: http://localhost:8000/docs

---

## Testing the API

### 10. Test Health and Analyze Endpoints

```powershell
# Health check (in a new PowerShell window)
Invoke-RestMethod -Uri http://localhost:8000/health

# Upload a wound image (replace path with a real image)
$form = @{
    image = Get-Item "path\to\wound_photo.jpg"
    clinical_data = '{}'
}
Invoke-RestMethod -Uri http://localhost:8000/api/analyze -Method Post -Form $form
```

Expected response fields: `request_id`, `model_status`, `wound_area_px`, `wound_area_cm2`, `area_change_percent`, `trajectory`, `risk_level`, `risk_score`, `segmentation_mask_png_base64`, `explanation`, `warnings`.

---

## Automated Tests

### 11. Run pytest

```powershell
# From backend/
$env:PYTHONPATH = "."
python -m pytest tests/ -v
```

Tests that require the trained checkpoint are **automatically skipped** if `artifacts/best_unet.pt` is absent. Tests that need the FUSeg dataset are **automatically skipped** if the dataset is not found.

---

## Model Status Explained

| `model_status` | Meaning |
|---|---|
| `"unavailable"` | No checkpoint found or failed to load. Safe fallback. |
| `"ready"` | Trained checkpoint loaded; real segmentation returned. |

The API never fabricates masks, areas, or risk scores.

---

## API Contract

### `GET /health`
```json
{"status": "ok"}
```

### `POST /api/analyze`

**Multipart form fields:**
- `image`: JPEG, PNG, or WebP, max 10 MB
- `clinical_data`: JSON string (default `{}`)
  - `pixels_per_cm`: positive number (enables `wound_area_cm2`)
  - `visits`: array of `{"visit_date": "YYYY-MM-DD", "area_cm2": number}`

**Response fields:** `request_id`, `model_status`, `wound_area_px`, `wound_area_cm2`, `area_change_percent`, `trajectory`, `risk_level`, `risk_score`, `segmentation_mask_png_base64`, `explanation`, `warnings`

---

## Reproducibility

- Fixed seed (default 42) set in `configs/train.yaml`
- Augmentation (horizontal flip, vertical flip, 90° rotation) applied to training data only
- Masks resize with **nearest-neighbour** interpolation (no blending artefacts)
- Best checkpoint selected by **validation Dice only** — test data never used for model selection
- No patient identifiers in the FUSeg local copy; official challenge splits used as-is

---

## Project Layout

```
backend/
├── app/                  FastAPI app, U-Net, preprocessing, inference, schemas
│   ├── api/routes.py     GET /health  POST /api/analyze
│   ├── models/unet.py    Configurable U-Net
│   ├── preprocessing/    image_to_tensor, resize_mask
│   └── services/         SegmentationService, measurement, trajectory
├── training/
│   ├── inspect_dataset.py   Phase 1: dataset inspection → dataset_report.json
│   ├── dataset.py           FUSegDataset + WoundSegmentationDataset adapters
│   ├── train_segmentation.py  --fuseg --smoke  Phase 3 training
│   ├── evaluate_segmentation.py  Phase 4 evaluation
│   └── visualize.py         Phase 5 visualizations
├── tests/
│   ├── test_unet.py         U-Net, FUSeg, preprocessing, metrics, checkpoint tests
│   └── test_services.py     API contract, trajectory, measurement tests
├── configs/train.yaml       Training hyperparameters
├── artifacts/               Checkpoints, evaluation results, visualizations
└── data/FUSeg/              FUSeg Challenge dataset
```

---

## Limitations

- **No clinical validation.** This prototype is not validated for clinical diagnosis or treatment guidance.
- **Test-set labels unavailable.** FUSeg test labels are withheld by challenge organizers; evaluation uses the validation split.
- **No patient identifiers.** Cannot independently verify patient-level split integrity.
- **No physical calibration.** `wound_area_cm2` is null unless `pixels_per_cm` is provided by the caller.
- **Risk outputs unavailable.** `risk_level` and `risk_score` remain `"unavailable"` and `null` — no clinical risk model is implemented or validated.
