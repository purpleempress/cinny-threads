# Cinny Threads desktop wrapper

This directory vendors the reviewed Tauri wrapper used to package the root Cinny Threads web application.

## Security profile

- updater support is disabled
- no native Cytale SSO integration is included
- JavaScript has no shell, process, arbitrary filesystem, or unrestricted HTTP Tauri capability
- external windows are denied and permitted links are handed to the system browser
- release artifacts are unsigned private builds and must be verified with the published SHA-256 files

## Local build

```sh
npm ci --ignore-scripts
npm --prefix desktop ci --ignore-scripts
npm --prefix desktop run tauri build
```

Use the Flatpak manifest under `../packaging/flatpak` for the sandboxed Linux package.
