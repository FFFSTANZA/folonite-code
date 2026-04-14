# PawWork

AI workstation that works out of the box. Download, open, get to work.

[中文说明](README_CN.md)

---

PawWork is a desktop AI workstation for non-technical knowledge workers. No API key, no command line, no configuration needed.

- **Works out of the box** — built-in tools, no brew/pip/npm required
- **Free model included** — ships with a free AI model, zero setup
- **Desktop app** — macOS / Windows, native experience

## Download

macOS (Apple Silicon): [pawwork-mac-arm64.dmg](https://github.com/Astro-Han/pawwork/releases/latest)

### macOS first launch

PawWork is not yet code-signed with Apple Developer ID. On first launch:
Right-click the app → Open → confirm "Open" in the dialog.

## Built-in Tools

- **Office documents** — create and edit .docx / .xlsx / .pptx (via officecli)
- More tools coming soon

## Build from Source

Requires [Bun](https://bun.sh) v1.2+.

```bash
git clone https://github.com/Astro-Han/pawwork.git
cd pawwork
bun install
cd packages/desktop-electron && bun run dev
```

## Credits

PawWork is a fork of [OpenCode](https://github.com/anomalyco/opencode) (MIT license).

## License

MIT
