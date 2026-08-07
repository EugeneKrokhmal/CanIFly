# Landing source media

Drop original photos/videos here. They are **not** committed — run the optimizer to publish web assets:

```bash
npm run optimize:landing
```

Requires `ffmpeg` on your PATH for videos. Outputs go to `public/landing/`.

**Git:** only `clip-coast.mp4` (+ posters/images) is committed. AV1/HEVC and reserve clips stay local (see `.gitignore`).

| Source | Public name | Use |
|--------|-------------|-----|
| `landing-bg.mov` | `clip-coast.mp4` + `clip-coast-mobile.mp4` + poster | **Fixed viewport BG** — scroll scrubs timeline (1080p30 desktop / 1080-wide mobile; H.264; AV1/HEVC optional local) |
| `DJI_0049.JPG` | `spot-coast-*` | Plan card image |
| `DJI_0054.JPG` | `spot-ridge-*` | Trust card image |
| `DJI_0082.JPG` | `spot-valley-*` | SEO card image |
| `DJI_0021.JPG` | `hero-*` | OG / optional |
| `DJI_0061.MP4` | `clip-ridge.mp4` + poster | Local reserve clip (not in git) |

Replace a file with the same name and re-run the script.
