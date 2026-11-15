# PrepDay brand assets

Logo: the "Shared stem" mark (a white P on a lime D), indigo + lime palette.
The wordmark is Inter Display Bold, converted to outlines, so the SVGs need no font.

## Palette

| Name   | Hex       | Use                                   |
| ------ | --------- | ------------------------------------- |
| Black  | `#050305` | Dark backgrounds, banners             |
| Indigo | `#120A3D` | App icon tile, wordmark on light      |
| Plum   | `#412854` | Secondary accent                      |
| Green  | `#4CC35B` | Secondary accent (don't pair with lime in one mark) |
| Lime   | `#68DA23` | The D, "Day", highlights              |
| White  | `#FFFFFF` | The P, "Prep" on dark                 |

## Files

- `logo/` – horizontal and stacked lockups, wordmark only, and mark only.
  Use `*-on-light` on white/light backgrounds and `*-on-dark` on black/dark ones.
- `icons/` – `icon.svg`, PNG sizes 16–1024, `favicon.ico` (16/32/48),
  `apple-touch-icon.png` (180), and `site.webmanifest`.
- `social/` – round avatar (`avatar-400.png`), square avatar for platforms that crop
  themselves, X header (1500×500), LinkedIn banner (1584×396) and Open Graph image (1200×630).

## Wiring it into `src/index.html`

```html
<link rel="icon" href="assets/icons/favicon.ico" sizes="any">
<link rel="icon" href="assets/icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
<link rel="manifest" href="assets/icons/site.webmanifest">
<meta name="theme-color" content="#120A3D">
<meta property="og:image" content="/assets/social/og-image-1200x630.png">
```

## Don'ts

- Don't recolour the P and D in the two greens together; they're too close in brightness.
- Keep clear space around the logo of at least half the icon's width.
- Don't stretch, rotate or add effects to the mark.
