# Tricognita Brand Assets

> **Canonical brand system:** [`docs/02_Company/Design/BRAND_SYSTEM.md`](../../../docs/02_Company/Design/BRAND_SYSTEM.md). This file is the asset-level quick reference.

**Single source of truth:** the `tricognita_logos_clean` package (supplied 2026-07-19) — high-resolution PNGs with
**true transparency** and **light/dark variants** for both the mark and the full lockup. (The prior black-background
raster-wrapped SVG master has been retired.) The octopus (8 arms) = distributed intelligence; the triangle = the
primary geometric identity; the octopus is always integrated into the triangle, exactly as supplied.
**Canonical domain: https://tricognita.com** — never `tricognita.ai`.

## Canonical masters (source of truth)
| File | Size | Use |
|---|---|---|
| `tricognita_mark_transparent.png` | 1056×928, RGBA | **Mark master** (white, transparent) — dark surfaces / UI / icons |
| `tricognita_mark_for_light_bg.png` | 1056×928, RGBA | Mark for light backgrounds (ink, transparent) |
| `tricognita_mark_black.png` | 1056×928, RGB | Mark on black |
| `tricognita_logo_transparent.png` | 1703×1409, RGBA | Full lockup (mark + wordmark), white, transparent |
| `tricognita_logo_for_light_bg.png` | 1703×1409, RGBA | Full lockup for light backgrounds (ink) |
| `tricognita_logo_black.png` | 1703×1409, RGB | Full lockup on black |

## Derived assets (regenerated from the masters — do not hand-edit)
| File | Purpose |
|---|---|
| `tricognita-mark.png` | Square-padded mark (512²), used across navbars/footer/login/register/marketing |
| `tricognita-lockup.png` | Full lockup, transparent — dark surfaces |
| `tricognita-lockup-dark.png` | Full lockup on brand ink `#0B0914` — README / dark contexts |
| `tricognita-lockup-light.png` | Full lockup on light `#F8F9FA` — light contexts |
| `icons/icon-{16,32,48,64,180,192,256,512}.png` | Favicon / PWA icon set (square mark, transparent) |
| `icons/maskable-512.png` | Android maskable (mark on ink, safe-zone padded) |
| `icons/monochrome-512.png` | Monochrome white silhouette |

App-router icons live in `app/`: `favicon.ico`, `icon.png`, `apple-icon.png`; PWA manifest at `app/manifest.ts`.
All are regenerated from the masters above (mark square-padded to avoid distortion in fixed-size UI slots).

## Regeneration
Derived assets are produced from the masters with Pillow (Lanczos): the mark is padded to a square canvas,
resized to each target, and — for maskable/apple/lockup-dark — composited on brand ink `#0B0914`. Re-run the
generation whenever the masters change; do not edit derived files by hand.
