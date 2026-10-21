# WoundWatch AI — Research & Clinical Monitoring Platform

A modern, responsive React + TypeScript healthcare AI business website and clinical research monitoring platform for **WoundWatch AI**. The platform uses computer vision to evaluate wound photographs, display quantitative boundary segmentations, calculate surface dimensions, and track longitudinal healing trajectories across sequential clinical visits.

> **Research Prototype Notice:** WoundWatch AI is an investigational software prototype developed for algorithm benchmarking and clinical workflow research. It is **not a certified medical device** and does not diagnose conditions, prescribe therapeutic treatments, or replace professional clinical judgment. Use synthetic or de-identified data only.

---

## Architecture & Tech Stack

- **Framework**: React 18 with TypeScript 5
- **Tooling & Dev Server**: Vite 6
- **Routing**: React Router DOM v6
- **Visualization**: Recharts (longitudinal healing trajectory curves & trend analysis)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS & custom design tokens (Medical Navy `#0a192f`, Clinical Teal `#0d9488`, Electric Sky `#0ea5e9`, and high-contrast Slate typography)
- **Camera API**: In-browser `navigator.mediaDevices.getUserMedia` with permission handling, live video preview, shutter snapshot, and hardware cleanup.
- **Backend Boundary**: Centralized Axios client (`src/services/api.ts`) configured for FastAPI integration.

---

## Quick Start & Setup

### Requirements
- Node.js 20 or newer
- npm
- (Optional) FastAPI Python backend for live inference mode

### Installation & Launch

```bash
# 1. Enter the project directory
cd WoundWatchAI_Frontend

# 2. Install dependencies
npm install

# 3. Create or inspect the environment configuration
cp .env.example .env

# 4. Start the local Vite development server
npm run dev
```

Open the local development URL in your browser: [http://localhost:5173/](http://localhost:5173/) (or `http://localhost:5174/` if 5173 is in use).

### Available Scripts

```bash
npm run dev       # Starts Vite development server with HMR
npm run build     # Full TypeScript typecheck (tsc -b) + Vite production build
npm run preview   # Previews production build locally
npm run lint      # Runs ESLint across the codebase
```

---

## Operating Modes

### 1. Demo Mode (`VITE_APP_MODE=demo`) — Default
In `.env`:
```env
VITE_APP_MODE=demo
VITE_API_BASE_URL=http://localhost:8000
```
- No external backend or Python service required.
- Includes pre-seeded synthetic sample records (`WW-0001` through `WW-0004`) with historical measurements.
- Submissions on `/test-wound` produce clearly labeled synthetic research outputs (`DEMO-...`) to preview the complete results and chart interface.
- Clearly labeled with `SYNTHETIC DEMO DATA` to ensure absolute transparency.

### 2. API Mode (`VITE_APP_MODE=api`)
In `.env`:
```env
VITE_APP_MODE=api
VITE_API_BASE_URL=http://localhost:8000
```
- Connects to your live FastAPI backend service.
- Checks connectivity via `GET /health`.
- Dispatches multipart form data to `POST /api/analyze` containing:
  - `image`: selected JPEG/PNG/WebP file
  - `clinical_data`: JSON string of patient ID, visit date, location, duration, and notes.
- Gracefully renders actual returned values (`wound_area_px`, `wound_area_cm2`, `area_change_percent`, `trajectory`, `risk_level`, `segmentation_mask_png_base64`, `explanation`, `warnings`).
- Missing or null fields are reported as unavailable; no fabricated predictions are generated.

---

## Page Overview & Structure

1. **Home (`/`)**:
   - Hero banner: *"See the Change. Understand the Journey."* with computer vision viewport graphic.
   - Company introduction explaining computer vision for wound monitoring.
   - Four-step workflow: **Capture → Analyze → Measure → Monitor**.
   - Feature breakdown: multi-format capture, U-Net segmentation, dual measurement metrics, and longitudinal tracking.
   - Interactive product preview with simulated multi-visit Recharts curve and mask opacity slider.
   - Clinical importance overview and primary call to action.

2. **About Us (`/about`)**:
   - Our Story: addressing inter-observer variability in manual ruler measurements.
   - Mission & Vision for reproducible, objective wound documentation.
   - Technical Architecture: deep convolutional segmentation, scale fiducial calibration, and longitudinal velocity formulas.
   - Responsible AI: clinical primacy (human-in-the-loop), privacy by design, and uncertainty disclosure.

3. **Wound Care & Awareness (`/wound-care`)**:
   - Educational taxonomy: acute, surgical, diabetic foot ulcers, pressure injuries, venous leg ulcers, and arterial ulcers.
   - 4 Biological stages of wound repair: Hemostasis, Inflammation, Proliferation, and Remodeling.
   - Critical infection & ischemia warning signs requiring emergency medical attention.
   - **Two Interactive Flowcharts** (built with React/SVG components):
     1. *Clinical Wound Assessment & Escalation Protocol* (when to seek urgent assessment vs routine tracking).
     2. *End-to-End Computer Vision Pipeline* with decision branches for image blur, missing scale markers, and backend error states.

4. **Test Your Wound (`/test-wound`)**:
   - Dual-input image acquisition: file picker / drag-and-drop OR in-browser live camera capture.
   - 10 MB file size limit and JPEG/PNG/WebP format validation.
   - Accessible metadata form (patient selection or new synthetic ID, visit date, anatomical location, duration, notes).
   - Real-time progress bar and prevention of duplicate clicks.
   - Navigates to `/results/:requestId` upon completion.
   - *(Note: `/upload` route is preserved and automatically redirects to `/test-wound`)*.

5. **Analysis Results (`/results/:requestId`)**:
   - Visual inspection viewer with original photograph and segmentation mask overlay (with opacity slider and side-by-side mode).
   - Dual metrics grid: raw pixel area (`wound_area_px`) and calibrated area (`wound_area_cm2` when scale fiducial is present).
   - Percentage change vs baseline/prior visits.
   - Longitudinal healing trend chart (Recharts) linking prior visits for the patient.
   - Model reasoning statements, algorithmic caveats, and uncalibrated risk descriptors.
   - Export report as structured text document (`.txt`).

6. **Contact Us (`/contact`)**:
   - Academic collaboration and integration inquiries form.
   - Client-side validation with honest simulation state (clearly indicating that prototype email dispatch is not connected to a live mail server).
   - Configurable research coordinates (`research@woundwatch.ai`, office hours, ethics statement).

7. **Clinical Workspace**:
   - **Overview Dashboard (`/dashboard`)**: summary cards, recent visit activity, and workspace trend graph.
   - **Patient Records (`/patients`, `/patients/:id`)**: directory, search, status filter, local record creation, and visit timeline.
   - **Reports & History (`/history`)**: searchable visit log with CSV and Text report exports.

---

## Backend Contract Reference

### `GET /health`
```json
{
  "status": "ok"
}
```

### `POST /api/analyze`
**Request Payload**: `multipart/form-data`
- `image`: Binary file (JPEG/PNG/WebP)
- `clinical_data`: JSON-encoded string
  ```json
  {
    "patient_id": "WW-0001",
    "visit_date": "2026-10-21",
    "wound_location": "Lower leg",
    "wound_duration": "3–4 weeks",
    "age_range": "60–69",
    "diabetes_status": "Yes",
    "smoking_status": "Never",
    "notes": "Follow-up visit"
  }
  ```

**Expected Response Schema**:
```json
{
  "request_id": "string",
  "model_status": "ready",
  "wound_area_px": 12345.0,
  "wound_area_cm2": null,
  "area_change_percent": null,
  "trajectory": "improving | stable | worsening | insufficient_data | unavailable",
  "risk_level": "low | moderate | high | unavailable",
  "risk_score": null,
  "segmentation_mask_png_base64": null,
  "explanation": [],
  "warnings": []
}
```

---

## Ethical & Privacy Principles

- **Client-Side Privacy**: Only synthetic identifiers are used. No direct patient names, health insurance numbers, or identifying biometrics are stored or requested.
- **No Hallucinated Claims**: If an image lacks a physical calibration marker, the platform explicitly marks the physical area as `Unavailable` and reports pixel dimensions only.
- **Clinical Primacy**: All pages include visible disclaimers reminding users that algorithmic analyses are experimental research aids and must be evaluated by licensed medical personnel.
