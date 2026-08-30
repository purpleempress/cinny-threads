# Source provenance and review

## Pinned inputs

- Upstream Cinny baseline: `cinnyapp/cinny@33f4ba3674fa4f57e048e81b28f8426defc03eac` (`v4.12.6`)
- Reviewed thread implementation: `jrimmer/cinny-threads@01663f34dd0289f68ff283a6ea6eb61f653869b2`
- Maintained repository: `purpleempress/cinny-threads`

The working branch was created from the pinned upstream Cinny baseline. It was
not made by copying the reviewed fork's final tree.

## Imported thread commits

Only these commits from `jrimmer/cinny-threads` were selected:

```text
54e82f4c5ae19b0e16f65efc3d73a85b9554424a
59e0b9bf80ff02d40e966d8369527e476cd990bb
4e2780fb0b8cbd1e322042f3a0e3780b5f39357c
42fdb56dc5b31535b42d2246e2a19434fe51d1d4
5ee5bdcfc81ca4a44569e0ba452cef0c11623a98
f2e326354ef8f6bd442aee52f11ee4861aaec976
95e5d5dce5da8e06fc2ab154adebe2b96982f5a1
c28eab6a32831dfb24dc11f3a917f4b61f7f6e98
940a4cff35f607d459e791445603f0e183074a7c
b8ff4489ba580fca494acad2a4b6856dd0c55954
31a6c757315fee59e9db2ec61300d9a47264252d
7de4525510b3736cf42e6ce4161447649863a37d
a58fe07709a2349a09a7e6f643d408766a864eb1
337ae279f480614923339e20af61c8abf1eade61
6672b7e325ea9c17abd57698c91f03ab95eb73af
8dd6be2c57541c91976a9db994fa0589bc1fce54
918cbdf750b2b8389ee1f11b10197511bdb64198
9d11467d92bb52d034d3bc198cec5cb0b2af300d
9aead7c0f29c2eb6dee6ae9f8a1fee6a3cd7639f
db9f075e0793fc7510f229ce7de668ca7c21ba4b
ea53d489f111f9c25f398b7f5510d2203c1b0332
0a8e36b42f8d0e1c54682b1f22a98b0c53225b37
e7160346bba36423713303fb800a775a88352094
8ca0f31e6ef369a93a7a1138f34bd5ba1e0a4dd8
01663f34dd0289f68ff283a6ea6eb61f653869b2
```

## Thread feature delta

Before desktop packaging and dependency hardening, the selected thread feature
diverges from the pinned Cinny baseline in 16 files:

```text
docs/thread-panel-rfc.md
src/app/features/room/Room.tsx
src/app/features/room/RoomTimeline.tsx
src/app/features/room/RoomViewHeader.tsx
src/app/features/room/ThreadReplyInput.tsx
src/app/features/room/ThreadSummary.css.ts
src/app/features/room/ThreadSummary.tsx
src/app/features/room/ThreadsDrawer.css.ts
src/app/features/room/ThreadsDrawer.tsx
src/app/features/settings/general/General.tsx
src/app/hooks/useThreadUnreadCount.ts
src/app/state/room/roomInputDrafts.ts
src/app/state/room/threadSelection.ts
src/app/state/settings.ts
src/client/initMatrix.ts
tests/thread-feature-contract.test.mjs
```

These changes add the thread drawer and focused conversation view, room timeline
entry points, reply composition, unread state, local draft state, a user setting,
and Matrix SDK thread aggregation.

## Deliberately excluded divergence

The reviewed fork also diverged from Cinny in areas unrelated to Matrix threads.
Those changes were not imported, including:

- Cytale-specific SSO and authentication behaviour
- removal of Dependabot configuration
- fork-specific deployment, build and README changes
- unrelated global unread and media behaviour
- unrelated packaging and CI glue

The maintained fork restores narrowly scoped CI and dependency maintenance rather
than inheriting either project's deployment credentials or publication jobs.

## Desktop wrapper provenance

The desktop wrapper was compared against the official
`cinnyapp/cinny-desktop@35c467de100e1d5379d6f780642304eb92772cdb` tree. The
icons and Windows installer artwork are byte-for-byte identical to that source.
The privilege-bearing Rust code, Cargo manifest, capability file and Tauri
configuration were deliberately reduced and reviewed in this repository. In
particular, the upstream updater and broad shell, filesystem, process and HTTP
plugins are not carried into this build.

## Malware and supply-chain review

The review compared the fork commit graph and file diff against the pinned
upstream baseline, inspected package scripts and dependency changes, inspected
workflows and external network destinations, and rebuilt the selected feature
on the clean baseline. Contract tests prohibit the excluded Cytale SSO path.
Both npm lockfiles are audited in CI and install with lifecycle scripts disabled.
The Rust lockfile has no `cargo audit` vulnerability advisories. Its 17 allowed
RustSec warnings, including unmaintained GTK3 bindings and RUSTSEC-2024-0429 in
the transitive `glib` 0.18 stack, are disclosed in `SECURITY.md` and checked in
CI rather than silently ignored.

No malware indicators or hidden credential-exfiltration paths were found in the
reviewed thread changes. This is an evidence-based code review conclusion, not a
claim that any finite review can prove the absence of all malicious behaviour.
