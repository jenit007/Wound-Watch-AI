# Wound-Watch-AI

An intelligent, full-stack wound assessment system integrating a deep learning PyTorch U-Net segmentation model with an interactive React + TypeScript frontend and a FastAPI backend. WoundWatch AI enables automated wound boundary detection, quantitative pixel-area measurements, evidence-based clinical risk triage, observed pixel-reduction rate tracking, and healing trajectory visualization.

---

## Architecture Overview

```
Wound-Watch-AI/
├── backend/                  # FastAPI Machine Learning Service
│   ├── app/
│   │   ├── api/routes.py     # Endpoints: /api/analyze, /api/wounds, /health
│   │   ├── models/unet.py    # PyTorch U-Net segmentation architecture
│   │   ├── services/         # Inference, measurement, risk triage, storage
│   │   └── main.py           # FastAPI application entrypoint
│   ├── artifacts/            # Trained U-Net checkpoint (best_unet.pt)
│   ├── requirements.txt      # Python dependencies
│   └── tests/                # Pytest unit & E2E verification tests
│
├── frontend/                 # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/       # UI elements, camera capture, flowcharts
│   │   ├── pages/            # TestWound, Results, Dashboard, Patients
│   │   ├── services/api.ts   # Axios API client
│   │   └── styles.css        # Responsive custom CSS styling
│   └── package.json          # Vite and frontend dependencies
│
├── vercel.json               # Vercel Multi-Service project orchestration
├── .vercelignore             # Deployment exclusion filter
└── .gitignore                # Git repository exclusions
```

---

## Features

1. **Minimal "Test Your Wound" Workflow**:
   - Upload or capture wound photographs directly from webcams or mobile devices.
   - 4 minimal questions (duration, qualitative progression status, and warning signs checklist).
   - Instant emergency alert warning when critical systemic signs (confusion, dizziness, fainting) are flagged.
2. **PyTorch U-Net Wound Segmentation**:
   - Automated binary lesion mask generation and contour visualization.
   - Interactive mask opacity slider and side-by-side original/mask inspection.
   - Direct quantitative 2D pixel-area summation and calibrated metric scale calculation ($cm^2$).
3. **Evidence-Based Risk Triage**:
   - Conservative rule-based clinical evaluation returning `LOW`, `MODERATE`, `HIGH`, `URGENT`, or `UNAVAILABLE`.
   - Actionable recommendations and guidance.
4. **Observed Pixel-Reduction Rate & Healing Trajectory**:
   - Empirical tracking:
     $$\text{pixel\_reduction\_rate} = \frac{\text{area}_{\text{initial}} - \text{area}_{\text{current}}}{\text{elapsed\_days}}$$
   - Experimental linear closure projection (`EXPERIMENTAL_PIXEL_PROJECTION`) for contracting lesions.
   - Chronological Recharts progress graph displayed underneath Risk Assessment and Healing Time.
5. **Persistent History Tracking**:
   - Lightweight SQLite database tracking sequential visits and measurements for each wound without mixing patient records.

---

## Local Development Setup

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# In repository root
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt

# Start FastAPI backend on port 8000
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

### 3. Frontend Setup
```bash
# In a new terminal
cd frontend
npm install
npm run dev
```
The application will be live at `http://localhost:5173`.

---

## Vercel Multi-Service Deployment

This repository is configured for deployment using **Vercel Services** via `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "backend": {
      "root": "backend",
      "framework": "fastapi"
    },
    "frontend": {
      "root": "frontend",
      "framework": "vite"
    }
  },
  "rewrites": [
    { "source": "/health", "destination": { "service": "backend" } },
    { "source": "/api/(.*)", "destination": { "service": "backend" } },
    { "source": "/(.*)", "destination": { "service": "frontend" } }
  ]
}
```

### Deploying to Vercel:
```bash
vercel
```
*Note: Due to the size of PyTorch, set `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` in your Vercel Project Settings to support bundles up to 5 GB with Active CPU.*

---

## Testing

```bash
# Run backend pytest suite (47 tests)
pytest backend/tests

# Run frontend Vitest suite (16 tests)
cd frontend && npm test

# Run browser E2E test in Microsoft Edge
python backend/tests/browser_e2e_test.py
```
