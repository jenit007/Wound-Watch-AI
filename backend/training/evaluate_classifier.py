"""Evaluation helper: training script saves held-out metrics beside the model artifact.
Re-run training with a fixed seed to reproduce the evaluation; do not treat it as external validation.
"""
import argparse, json
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--model',required=True); args=p.parse_args()
metrics=Path(args.model+'.metrics.json')
if not metrics.exists(): raise SystemExit(f'No saved metrics at {metrics}; train/evaluate with training/train_classifier.py first.')
print(metrics.read_text())
