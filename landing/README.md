# Landing source media

Drop original photos/videos here. They are **not** committed — run the optimizer to publish web assets:

```bash
npm run optimize:landing
```

Requires `ffmpeg` on your PATH for videos. Outputs go to `public/landing/`.

| Source | Public name | Use |
|--------|-------------|-----|
| `landing-bg.mov` | `clip-coast.av1.mp4` / `.hevc.mp4` / `.mp4` + poster | **Fixed viewport BG** — swipe scrubs timeline (AV1 → HEVC → H.264) |
| `DJI_0049.JPG` | `spot-coast-*` | Plan card image |
| `DJI_0054.JPG` | `spot-ridge-*` | Trust card image |
| `DJI_0082.JPG` | `spot-valley-*` | SEO card image |
| `DJI_0021.JPG` | `hero-*` | Optional / unused in current layout |
| `DJI_0061.MP4` | `clip-ridge.mp4` + poster | Optimized reserve clip |

Replace a file with the same name and re-run the script.
