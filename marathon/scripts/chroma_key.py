"""
One-off dev utility: removes a green-screen background from the trophy
source photos and saves a transparent PNG. Not part of the widget runtime.

Usage: python chroma_key.py <input.jpeg> <output.png>
"""
import sys
import numpy as np
from PIL import Image


def chroma_key(path_in, path_out, low=12, high=55, spill=0.6):
    img = Image.open(path_in).convert("RGB")
    arr = np.asarray(img).astype(np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    # How much green dominates the other two channels — high for the pure
    # green backdrop, near zero/negative for gold, blue, white or silver
    # trophy pixels.
    dominance = g - np.maximum(r, b)

    alpha = 1.0 - np.clip((dominance - low) / (high - low), 0.0, 1.0)

    # Spill suppression on the partially-transparent edge band: pull the
    # green channel down toward the r/b average so no green fringe survives
    # around the trophy silhouette.
    edge = (dominance > 0) & (alpha > 0)
    target_g = (r + b) / 2.0
    g_suppressed = np.where(edge, g - spill * (g - target_g), g)

    out = np.stack([r, g_suppressed, b, alpha * 255.0], axis=-1)
    out = np.clip(out, 0, 255).astype(np.uint8)

    Image.fromarray(out, mode="RGBA").save(path_out)


if __name__ == "__main__":
    chroma_key(sys.argv[1], sys.argv[2])
