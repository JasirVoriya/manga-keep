# Project AI rules

## Global project standards

Project-wide standards live under `docs/global-standards/`. Before making
changes, check that directory for any standards that apply to the work area.

Current global standard documents:

- `docs/global-standards/README.md`
- `docs/global-standards/ui/manga-keep-ui-theme-style.md`

Hard rule: whenever a Markdown document is added to or deleted from
`docs/global-standards/`, update this list in the same change. Do not leave
the global standards directory and this AGENTS.md document list out of sync.

## Mobile preview verification

This project is a mobile app. For any future change that affects app behavior,
UI, navigation, assets, release configuration, or Expo configuration, the
development flow must include both desktop and phone preview paths before the
work is considered complete.

- Start the Expo development server in a mode that a phone can reach:

```bash
cd mobile
npm start -- --host lan
```

- Verify the app can be previewed from a desktop browser or simulator. The web
  preview is acceptable when the changed behavior is supported on web.
- Verify the app can be previewed from a real phone with Expo Go on the same
  Wi-Fi network by scanning the Expo QR code.
- If LAN preview is blocked by the network, try tunnel mode:

```bash
cd mobile
npm start -- --tunnel
```

- If phone preview cannot be completed, report the exact reason and do not
  describe the work as fully verified.
- After code changes, run the relevant checks before final reporting:

```bash
cd mobile
npm run typecheck
npm test
```
