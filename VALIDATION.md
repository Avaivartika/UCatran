# UCatran 0.5.0 validation — 2026-11-06

## Scope

Native Windows 11 x64 (build 26200) testing on the owner's remote computer, and
macOS Apple Silicon testing on the development Mac. Each automated app test uses
an isolated temporary workspace. Models are local HTTP/SSE fixtures; Moodle
course data is explicitly labelled demonstration data.

## Passed

- 17 Node tests on both platforms: URL/path boundaries, Pi tool execution,
  argument validation, cancellation, session continuation, Codex configuration,
  theme/pet persistence, runtime OS/architecture selection and window controls.
- Six packaged desktop suites on Windows: UI sync/browse/todos/settings,
  model-to-tool-to-answer flow, Codex import and secret isolation, native Python
  document reading, appearance and pet behavior, repeated direct pet dragging.
- Windows installed application: UI smoke plus actual bundled Python reading
  UTF-8 text in Chinese/space-containing paths; encrypted fixture key restored
  after app restart. No external model key or student account used.
- Windows installer: fresh install, same-version reinstall/upgrade, uninstall,
  user-data marker preservation, final reinstall. Version 0.5.0 remains installed.
- Windows Python connector: 3 regression tests and a visible installed-browser
  launch/close check. Browser check does not submit credentials or log into UCL.
- macOS: six packaged desktop suites passed before the final UTF-8 correction;
  the correction explicitly selects UTF-8 rather than Windows' legacy code page.
  Final packaged Python/document/encryption recheck passed after the user
  approved macOS Keychain access for the changed ad-hoc signature.
- macOS DMG checksum and ad-hoc bundle signature verified.
- Windows ZIP/installer SHA-256 matched between remote outputs and local copies.
- Tracked release source scanned for common credential patterns; no matches.

## Fixed during real-machine testing

Windows used the locale code page when opening UTF-8 TXT files. Document reads
now specify UTF-8 (including BOM), the worker uses UTF-8 mode, and Node decodes
worker output as a stream so split multibyte characters remain intact. Retest
passed on Windows using the installed application.

## Limits

Real UCL SSO/MFA, course access and downloads still require a UCL account and
school service permissions. External production model services were not tested.
Windows executables are not Authenticode-signed. macOS is ad-hoc signed, not
Apple Developer ID signed or notarized; a changed build may request Keychain
access again. No Intel Mac or Windows ARM release is included.
