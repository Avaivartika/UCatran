# Third-party source

This application incorporates Mattlo0546/moodle-mcp v0.3.0 from
https://github.com/Mattlo0546/moodle-mcp (main archive retrieved 2026-11-06).
The complete MIT license and copyright notice are retained at
vendor/moodle-mcp/LICENSE and inside the application resources.

Local changes to the vendored source:
- Reject mismatching mobile-login callback signatures and empty tokens.
- Reject token files associated with another Moodle origin.
- Disable automatic HTTP redirects carrying credentials.
- Restrict file download origin, use temporary files, cap downloads at 250 MB,
  and avoid overwriting existing files.

The desktop application uses the upstream Python login and Moodle client directly
through a local JSON bridge. It does not expose an MCP listener or arbitrary tools.
Electron and npm dependency notices remain in their distributed packages.

## Pi (0.3.0 architecture)

Uses @earendil-works/pi-agent-core 0.84.4 and @earendil-works/pi-ai 0.84.4,
MIT licensed, Mario Zechner / Pi contributors. Source:
https://github.com/earendil-works/pi
Reference fork: https://github.com/SJTU-Geek/pi
These are upstream npm artifacts, not a claim to bundle Jaide or every fork modification.
Their package license files and transitive dependency notices are bundled in node_modules.

## tikz-flora / web-flora

@alpaca-software/web-flora 0.1.0, MIT, copyright (c) 2026 the tikz-flora authors.
Source: https://github.com/wn-mitch/flora
The browser generator is bundled locally in renderer/flora.bundle.js. Its full
license is included in renderer/flora.LICENSE. The plant uses the actual generator;
the static page-background placement, five-minute refresh, and surrounding interface are app-specific.

## Desktop pet character artwork

Character artwork is separate from the application source-code licenses. Images are displayed from original official artwork without redrawing. SVG files wrap the original PNG bytes and select the official sprite viewport; source URLs, viewport coordinates and hashes are recorded in `renderer/assets/pets/sources.json`.

- Hello Kitty, Cinnamoroll, My Melody and Pompompurin: © SANRIO. Sources: https://www.sanrio.co.jp/characters/hellokitty/ and https://www.sanrio.co.jp/characters/cinnamon/
- Chiikawa, Hachiware, Usagi, Momonga and Goblin: © ナガノ / ちいかわ製作委員会. Sources: https://www.anime-chiikawa.jp/chara.html and https://chiikawamarket.jp/collections/goblin

These character assets are not covered by the MIT licenses of the app's software dependencies.

## 0.5.0 platform changes

The vendored login launcher now tries installed Edge/Chrome before Playwright's
Chromium fallback and reports an actionable missing-browser message. Python is
provided by Astral python-build-standalone; its licenses are retained in the
runtime. The UCatran app icon is original vector artwork; character pet artwork
continues to have its separate third-party ownership notices above.
