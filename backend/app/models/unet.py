"""Small configurable U-Net for binary wound-region segmentation."""
from __future__ import annotations

import torch
from torch import nn

class DoubleConv(nn.Module):
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels), nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels), nn.ReLU(inplace=True),
        )
    def forward(self, x): return self.block(x)

class UNet(nn.Module):
    def __init__(self, in_channels: int = 3, out_channels: int = 1, features=(32, 64, 128, 256)):
        super().__init__()
        self.downs = nn.ModuleList()
        self.pools = nn.ModuleList()
        current = in_channels
        for feature in features:
            self.downs.append(DoubleConv(current, feature))
            self.pools.append(nn.MaxPool2d(2))
            current = feature
        self.bottleneck = DoubleConv(features[-1], features[-1] * 2)
        self.ups = nn.ModuleList()
        self.ups_conv = nn.ModuleList()
        current = features[-1] * 2
        for feature in reversed(features):
            self.ups.append(nn.ConvTranspose2d(current, feature, kernel_size=2, stride=2))
            self.ups_conv.append(DoubleConv(feature * 2, feature))
            current = feature
        self.head = nn.Conv2d(features[0], out_channels, kernel_size=1)
    def forward(self, x):
        skips = []
        for down, pool in zip(self.downs, self.pools):
            x = down(x); skips.append(x); x = pool(x)
        x = self.bottleneck(x)
        for up, conv, skip in zip(self.ups, self.ups_conv, reversed(skips)):
            x = up(x)
            if x.shape[-2:] != skip.shape[-2:]:
                x = nn.functional.interpolate(x, size=skip.shape[-2:], mode="bilinear", align_corners=False)
            x = conv(torch.cat((skip, x), dim=1))
        return self.head(x)
