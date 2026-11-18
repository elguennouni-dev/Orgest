#!/usr/bin/env python3
"""Génère des images de démonstration (bijoux dorés stylisés) pour tester Orgest. Nécessite Pillow."""
import math, random, os
from PIL import Image, ImageDraw, ImageFilter

S = 2          # sur-échantillonnage
N = 640 * S
OUT = os.path.join(os.path.dirname(__file__), 'demo-photos')
VELVET = [(70, 12, 24), (14, 28, 58), (12, 12, 12), (10, 52, 40), (232, 224, 200), (52, 30, 66)]
rnd = random.Random(7)

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def background(c):
    img = Image.new('RGB', (N, N), c)
    px = img.load()
    cx, cy = N * .5, N * .42
    for y in range(0, N, 2):
        for x in range(0, N, 2):
            d = min(1, math.hypot(x - cx, y - cy) / (N * .75))
            col = lerp(tuple(min(255, int(v * 1.5 + 18)) for v in c), tuple(int(v * .45) for v in c), d)
            px[x, y] = col
            if x + 1 < N: px[x + 1, y] = col
            if y + 1 < N:
                px[x, y + 1] = col
                if x + 1 < N: px[x + 1, y + 1] = col
    return img

STOPS = [(0, (153, 106, 19)), (.3, (234, 167, 34)), (.5, (254, 234, 137)), (.7, (234, 167, 34)), (1, (153, 106, 19))]
def gold_fill():
    g = Image.new('RGB', (N, N))
    d = ImageDraw.Draw(g)
    for i in range(2 * N):
        t = i / (2 * N)
        for k in range(len(STOPS) - 1):
            if STOPS[k][0] <= t <= STOPS[k + 1][0]:
                u = (t - STOPS[k][0]) / (STOPS[k + 1][0] - STOPS[k][0])
                c = lerp(STOPS[k][1], STOPS[k + 1][1], u); break
        d.line([(i, 0), (i - N, N)], fill=c, width=2)
    return g
GOLD = gold_fill()

def paint(img, mask):
    shadow = Image.new('L', (N, N), 0)
    shadow.paste(mask, (14 * S, 20 * S))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14 * S))
    img.paste(Image.new('RGB', (N, N), (0, 0, 0)), (0, 0), shadow.point(lambda v: int(v * .55)))
    img.paste(GOLD, (0, 0), mask)
    # liseré clair pour le relief
    edge = mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(1.2 * S))
    img.paste(Image.new('RGB', (N, N), (255, 244, 190)), (0, 0), edge.point(lambda v: int(v * .6)))

def sparkle(img, x, y, r):
    d = ImageDraw.Draw(img)
    d.polygon([(x, y - r), (x + r * .18, y - r * .18), (x + r, y), (x + r * .18, y + r * .18), (x, y + r), (x - r * .18, y + r * .18), (x - r, y), (x - r * .18, y - r * .18)], fill=(255, 255, 240))

def annulus(cx, cy, rx, ry, thick):
    m = Image.new('L', (N, N), 0); d = ImageDraw.Draw(m)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    d.ellipse([cx - rx + thick, cy - ry + thick * .8, cx + rx - thick, cy + ry - thick * .8], fill=0)
    return m

def diamond(img, cx, cy, r):
    d = ImageDraw.Draw(img)
    top = [(cx - r, cy), (cx - r * .55, cy - r * .6), (cx + r * .55, cy - r * .6), (cx + r, cy)]
    d.polygon(top, fill=(225, 245, 255))
    d.polygon([(cx - r, cy), (cx + r, cy), (cx, cy + r * 1.1)], fill=(190, 225, 245))
    for a, b in ((-.55, -.2), (0, 0), (.55, .2)):
        d.line([(cx + r * a, cy - r * .6), (cx + r * b, cy)], fill=(255, 255, 255), width=2 * S)
    d.line([(cx - r, cy), (cx, cy + r * 1.1), (cx + r, cy)], fill=(150, 200, 230), width=2 * S)
    sparkle(img, cx - r * .3, cy - r * .3, r * .5)

def ring(img, v):
    cx, cy = N / 2, N * .56
    m = annulus(cx, cy, N * .27, N * .27, N * (.075 + .01 * v)); paint(img, m)
    diamond(img, cx, cy - N * .29, N * (.09 + .01 * v))

def bracelet(img, v):
    cx, cy = N / 2, N * .52
    paint(img, annulus(cx, cy, N * .38, N * .2, N * .06))
    d = ImageDraw.Draw(img)
    for i in range(18 + v * 2):
        a = 2 * math.pi * i / (18 + v * 2)
        x, y = cx + math.cos(a) * N * .35, cy + math.sin(a) * N * .17
        d.ellipse([x - 5 * S, y - 5 * S, x + 5 * S, y + 5 * S], fill=(120, 80, 10))
    sparkle(img, cx - N * .2, cy - N * .13, 24 * S)

def chain_points(n, f):
    return [f(i / (n - 1)) for i in range(n)]

def necklace(img, v):
    m = Image.new('L', (N, N), 0); d = ImageDraw.Draw(m)
    pts = chain_points(70, lambda t: (N * (.12 + .76 * t), N * .15 + math.sin(math.pi * t) * N * (.52 - .02 * v)))
    for i, (x, y) in enumerate(pts):
        r = 9 * S
        d.ellipse([x - r, y - r * .7, x + r, y + r * .7], fill=255)
        d.ellipse([x - r * .55, y - r * .35, x + r * .55, y + r * .35], fill=0)
    px, py = pts[35]
    d.polygon([(px, py + 6 * S), (px - 38 * S, py + 80 * S), (px, py + 140 * S), (px + 38 * S, py + 80 * S)], fill=255)
    paint(img, m); diamond(img, px, py + 78 * S, 26 * S)

def earrings(img, v):
    m = Image.new('L', (N, N), 0); d = ImageDraw.Draw(m)
    for cx in (N * .33, N * .67):
        d.ellipse([cx - 22 * S, N * .22, cx + 22 * S, N * .22 + 44 * S], fill=255)
        d.rectangle([cx - 4 * S, N * .22 + 40 * S, cx + 4 * S, N * .42], fill=255)
        d.polygon([(cx, N * .40), (cx - 62 * S, N * .60), (cx, N * .80), (cx + 62 * S, N * .60)], fill=255)
        d.polygon([(cx, N * .47), (cx - 30 * S, N * .60), (cx, N * .73), (cx + 30 * S, N * .60)], fill=0)
    paint(img, m)
    for cx in (N * .33, N * .67): diamond(img, cx, N * .6, 22 * S)

def pendant(img, v):
    m = Image.new('L', (N, N), 0); d = ImageDraw.Draw(m)
    pts = chain_points(40, lambda t: (N * (.2 + .6 * t), N * .1 + math.sin(math.pi * t) * N * .18))
    for x, y in pts:
        d.ellipse([x - 8 * S, y - 6 * S, x + 8 * S, y + 6 * S], fill=255)
    cx, cy = N / 2, N * .62
    d.ellipse([cx - 120 * S, cy - 120 * S, cx + 120 * S, cy + 120 * S], fill=255)
    d.ellipse([cx - 92 * S, cy - 92 * S, cx + 92 * S, cy + 92 * S], fill=0)
    d.ellipse([cx - 60 * S, cy - 60 * S, cx + 60 * S, cy + 60 * S], fill=255)
    paint(img, m); diamond(img, cx, cy - 6 * S, 46 * S)

def chain(img, v):
    m = Image.new('L', (N, N), 0); d = ImageDraw.Draw(m)
    pts = chain_points(26, lambda t: (N * (.08 + .84 * t), N * .5 + math.sin(t * 5.5 + v) * N * .16))
    for i, (x, y) in enumerate(pts):
        w, h = (46 * S, 26 * S) if i % 2 else (26 * S, 46 * S)
        d.ellipse([x - w, y - h, x + w, y + h], fill=255)
        d.ellipse([x - w + 12 * S, y - h + 12 * S, x + w - 12 * S, y + h - 12 * S], fill=0)
    paint(img, m); sparkle(img, N * .3, N * .35, 26 * S)

def parure(img, v):
    necklace(img, v)
    m = Image.new('L', (N, N), 0); d = ImageDraw.Draw(m)
    for cx in (N * .2, N * .8):
        d.ellipse([cx - 26 * S, N * .74, cx + 26 * S, N * .74 + 52 * S], fill=255)
    paint(img, m)

CATS = {'ring': ring, 'bracelet': bracelet, 'necklace': necklace, 'earrings': earrings, 'pendant': pendant, 'chain': chain, 'set': parure}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for cat, fn in CATS.items():
        for v in range(4):
            img = background(VELVET[(v * 2 + list(CATS).index(cat)) % len(VELVET)])
            fn(img, v)
            sparkle(img, N * rnd.uniform(.15, .85), N * rnd.uniform(.12, .5), 18 * S)
            img = img.resize((640, 640), Image.LANCZOS)
            img.save(os.path.join(OUT, f'{cat}-{v + 1}.jpg'), quality=82, optimize=True)
    print('ok', len(os.listdir(OUT)))
