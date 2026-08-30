# Security model

## Desktop boundary

The desktop application uses Tauri 2 with the application identifier
`io.github.purpleempress.CinnyThreads`.

- No updater is configured.
- No shell, filesystem, process or unrestricted HTTP plugin is included.
- The only application capability is `core:default`.
- New webview windows are denied.
- External navigation is handed to the system only for `http`, `https`,
  `matrix` and `mailto` URLs.
- JavaScript, file, data and unknown URL schemes are rejected.
- The Flatpak has no home or host filesystem access.

Matrix access requires network permission. Desktop notifications, audio, GPU
acceleration and X11 access are explicitly declared by the Flatpak manifest.

## Build boundary

- GitHub Actions are pinned by immutable commit SHA.
- npm dependencies are installed with lifecycle scripts disabled.
- Flatpak npm and Cargo dependencies are downloaded as hash-pinned sources and
  consumed offline during the sandboxed build.
- `npm audit` reports no vulnerabilities in either npm lockfile. `cargo audit`
  reports no vulnerability advisories, but does report 17 allowed RustSec
  warnings inherited from the Tauri Linux GUI stack: 16 unmaintained
  dependencies and the `glib` `VariantStrIter` unsoundness warning
  (RUSTSEC-2024-0429). The application does not use that iterator directly;
  this remains a tracked transitive-dependency risk rather than being hidden.
- The Windows artifact is an unsigned NSIS installer. Windows will therefore
  show an unknown-publisher warning. Verify its SHA-256 checksum before use.

## Reporting

Report a suspected vulnerability privately to the repository owner rather than
opening a public issue containing credentials, access tokens or exploit details.
