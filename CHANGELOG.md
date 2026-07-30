# Changelog

## Unreleased

### Added
- Germany in coverage: FAQ / Guide / Contacts, geocode preference, SEO
- Weather severity colours (green / orange / red) and always-on header weather ticker
- Locale-aware ULC official link (EN general-information / PL hub)

### Changed
- Zone map fill/outline driven by `mapStatus` severity (airports read as red)

## [0.3.0] — 2026-07-30

### Added
- Czechia in coverage: FAQ / Guide / Contacts country selector and copy
- Geocode preference for ES + CZ + PL
- SEO / JSON-LD areaServed includes Czechia (ANS CR)

## [0.2.2] — 2026-07-30

### Fixed
- Clear previous tap status immediately so Clear/Restricted cannot flash the wrong verdict
- Ignore out-of-order airspace status responses when taps race
- Default basemap style OpenFreeMap **liberty** (fixes Open Sans glyph 404s on bright)

## [0.2.1] — 2026-07-30

### Added
- Desktop top-pilots stack (rank, photo, name, pin count) bottom-right on the map
- Contacts page country selector with Poland official links (PANSA, DroneTower, ULC)

## [0.2.0] — 2026-07-30

### Added
- Poland in coverage (with Spain): FAQ / Guide country selector and per-country copy
- Geocode preference for ES + PL
- Soft EU coverage messaging in SEO / meta
- Release versioning: semver in `package.json`, `CHANGELOG.md`, git tags `vX.Y.Z`

### Ops
- Document `PANSA_API_KEY` for Render in `DEPLOY.md`
- Production coverage this release: **Spain + Poland only**

## [0.1.0]

Initial canifly.org web app (map, auth, i18n, Spain-focused content).
