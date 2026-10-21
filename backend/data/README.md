# Dataset format

Place authorized research data locally in this folder (data is not included in the source archive):

```text
data/your_dataset/
  images/
    case_001.jpg
    case_002.png
  masks/
    case_001.png
    case_002.png
  metadata.csv                 # optional
```

Each image must have a binary mask with the same filename stem in `masks/`. White/nonzero mask pixels are treated as wound foreground; black pixels are background. Masks are resized with nearest-neighbor interpolation. Common image formats include JPEG, PNG, WebP, BMP, and TIFF for training. The API accepts JPEG, PNG, and WebP.

Optional `metadata.csv` may include `filename`, `patient_id`, and actual dataset-supported feature/outcome columns. Include `patient_id` whenever available; the split helper groups records by patient. If it is absent, splits occur at image level and may leak patients across splits, so longitudinal/patient-level evaluation is not trustworthy. Metadata should not include direct identifiers in model features. Keep patient records private and verify dataset license/consent and annotation protocol.

The pipeline does not assume that all datasets have masks, calibration, multiple visits, or outcome labels. Segmentation training requires matched image/mask pairs. Clinical baseline training requires an explicitly selected target and feature columns.
