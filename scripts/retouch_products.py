#!/usr/bin/env python3
"""
LAXTHA product photo retouch (local, zero-cost).

Pipeline per image:
  1. tone: autocontrast + gentle brightness/contrast/saturation
  2. snap near-white low-sat background -> pure white (cohesive catalog bg)
  3. remove baked-in text / logos via connected-component analysis:
     keep the product blob + anything attached/near it, whiten isolated blobs
  4. trim to product, recenter on square white canvas w/ even padding
  5. upscale to 1200x1200 (LANCZOS) + unsharp, save optimized progressive JPEG

Originals are preserved in _original/.
"""
import os, glob
import numpy as np
from PIL import Image, ImageOps, ImageEnhance, ImageFilter, ImageDraw
from scipy import ndimage

SRC = r"C:\Users\user\Desktop\claude\laxtha-redesign\public\assets\products\_original"
DST = r"C:\Users\user\Desktop\claude\laxtha-redesign\public\assets\products"
OUT = 1200
PAD = 0.09
WHITE_LUM = 236     # snap to white above this luminance ...
WHITE_SAT = 0.16    # ... when saturation is below this
FG_THR = 238        # pixel darker than this = foreground content


# Targeted caption masks (relative x0,y0,x1,y1) for images whose text is fused
# to the product and can't be isolated by the generic component logic.
PRE_WHITE = {
    "bm-m01p.jpg": [(0.55, 0.0, 1.0, 0.10), (0.0, 0.88, 1.0, 1.0)],
    "brush.jpg":   [(0.30, 0.05, 1.0, 0.21), (0.27, 0.855, 0.92, 1.0)],
}


def apply_pre_white(im, name):
    boxes = PRE_WHITE.get(name)
    if not boxes:
        return im
    w, h = im.size
    d = ImageDraw.Draw(im)
    for x0, y0, x1, y1 in boxes:
        d.rectangle([x0 * w, y0 * h, x1 * w, y1 * h], fill=(255, 255, 255))
    return im


def to_rgb(im):
    if im.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        im = im.convert("RGBA")
        bg.paste(im, mask=im.split()[-1])
        return bg
    return im.convert("RGB")


def snap_background(arr):
    """arr: HxWx3 uint8 -> snap near-white, low-saturation pixels to pure white."""
    a = arr.astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    sat = np.where(mx == 0, 0, (mx - mn) / np.maximum(mx, 1))
    white = (lum >= WHITE_LUM) & (sat <= WHITE_SAT)
    arr[white] = 255
    return arr


def remove_text_blobs(arr):
    """Whiten connected components that are isolated from the main product blob."""
    gray = np.asarray(Image.fromarray(arr).convert("L"))
    fg = gray < FG_THR
    if not fg.any():
        return arr

    lbl, n = ndimage.label(fg, structure=np.ones((3, 3)))
    if n <= 1:
        return arr
    areas = ndimage.sum(np.ones_like(lbl), lbl, index=np.arange(1, n + 1))
    main = int(np.argmax(areas)) + 1
    main_area = areas[main - 1]

    H, W = gray.shape
    maxgap = 0.028 * max(H, W)     # true silhouette-distance tolerance
    # distance from every pixel to the nearest product (main-blob) pixel
    dist = ndimage.distance_transform_edt(lbl != main)
    # min distance from each component to the product silhouette
    mindist = ndimage.minimum(dist, lbl, index=np.arange(1, n + 1))

    cy = np.array(ndimage.center_of_mass(fg, lbl, index=np.arange(1, n + 1)))[:, 0]
    margin = 0.17 * H
    keep = np.zeros(n + 1, bool)
    keep[main] = True
    for i in range(1, n + 1):
        if i == main:
            continue
        attached = mindist[i - 1] <= maxgap          # physically part of product
        substantial = areas[i - 1] >= 0.20 * main_area  # big detached real part
        # small blob whose centroid sits in the top/bottom margin = caption text
        caption = (cy[i - 1] < margin or cy[i - 1] > H - margin) and areas[i - 1] < 0.06 * main_area
        if (attached or substantial) and not caption:
            keep[i] = True

    kept = keep[lbl]
    out = arr.copy()
    out[~kept] = 255
    return out


def content_crop(arr):
    gray = np.asarray(Image.fromarray(arr).convert("L"))
    ys, xs = np.where(gray < FG_THR)
    if len(xs) == 0:
        return arr
    return arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def process(path):
    im = to_rgb(Image.open(path))
    im = apply_pre_white(im, os.path.basename(path))
    im = ImageOps.autocontrast(im, cutoff=0.4)
    im = ImageEnhance.Brightness(im).enhance(1.03)
    im = ImageEnhance.Contrast(im).enhance(1.06)
    im = ImageEnhance.Color(im).enhance(1.10)

    arr = np.asarray(im).copy()
    arr = snap_background(arr)
    arr = remove_text_blobs(arr)
    arr = snap_background(arr)      # clean any residue left around removed blobs
    arr = content_crop(arr)

    obj = Image.fromarray(arr)
    w, h = obj.size
    inner = int(OUT * (1 - 2 * PAD))
    scale = min(inner / w, inner / h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    obj = obj.resize((nw, nh), Image.LANCZOS)
    obj = obj.filter(ImageFilter.UnsharpMask(radius=2.0, percent=90, threshold=2))

    canvas = Image.new("RGB", (OUT, OUT), (255, 255, 255))
    canvas.paste(obj, ((OUT - nw) // 2, (OUT - nh) // 2))
    return canvas


def main():
    files = sorted(glob.glob(os.path.join(SRC, "*.jpg")))
    for f in files:
        name = os.path.basename(f)
        process(f).save(os.path.join(DST, name), "JPEG",
                        quality=90, optimize=True, progressive=True)
        print("ok", name)
    print("done", len(files))


if __name__ == "__main__":
    main()
