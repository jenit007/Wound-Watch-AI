"""Simple research baseline for combining image embeddings and clinical features.

This module is an architecture scaffold, not a clinically validated model. Training
requires a dataset with an explicitly defined outcome label.
"""
import torch
from torch import nn

class MultimodalMLP(nn.Module):
    def __init__(self, image_feature_dim: int, clinical_feature_dim: int, output_dim: int = 1, hidden_dim: int = 128):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(image_feature_dim + clinical_feature_dim, hidden_dim), nn.ReLU(), nn.Dropout(.2), nn.Linear(hidden_dim, output_dim))
    def forward(self, image_features, clinical_features):
        return self.net(torch.cat([image_features, clinical_features], dim=-1))
