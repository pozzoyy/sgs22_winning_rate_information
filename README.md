# SGS 2v2 Lineup Pairs

Curated character pairings and monthly 2v2 lineup win rates, with a companion userscript for 打小抄.

## Files

| Path | Contents |
| --- | --- |
| [lineup-pairs.json](lineup-pairs.json) | Curated pairings from video titles |
| [lineup-pairs.md](lineup-pairs.md) | Pairing schema, sources, and filtering |
| [lineup-pairs-winrates-latest.json](lineup-pairs-winrates-latest.json) | Newest monthly win-rate data |
| `lineup-pairs-winrates-YYYY-MM.json` | Monthly archives |
| [lineup-pairs-winrates.md](lineup-pairs-winrates.md) | Win-rate format and publishing requirements |
| [scripts/sgs22-lineup-pairs-panel.user.js](scripts/sgs22-lineup-pairs-panel.user.js) | Independent companion panel |
| [scripts/debugging.md](scripts/debugging.md) | Historical diagnostic instructions; debug build is no longer included |

## Installation and automatic updates

Current version: **1.0.4**. Keep the original 打小抄 enabled; enable only one copy of this companion.

1. Open the [raw userscript](https://raw.githubusercontent.com/pozzoyy/sgs22_winning_rate_information/main/scripts/sgs22-lineup-pairs-panel.user.js) and accept Tampermonkey's Install/Update prompt. This one-time installation is needed if your existing copy has no update URL or was installed from a local file.
2. If the raw link shows text, use Tampermonkey Dashboard → Utilities → Install from URL, paste the raw link, and install. Alternatively replace the code of the existing companion with the raw file contents and save.
3. Verify the installed version is 1.0.4. In the script's Settings, enable update checks and ensure custom update/download URL overrides are not pointing to an old file. The update and download URLs should both be the raw userscript link above.
4. Use Tampermonkey's Check for updates command to check manually. Automatic checks follow the update interval configured in Tampermonkey; future releases must increase `@version`.
5. Reload the game page after updating.

The `@name` and `@namespace` remain unchanged to preserve script identity. If installation creates a second copy, disable/remove the older companion to avoid running both.

## Data URL

The panel fetches [lineup-pairs-winrates-latest.json](https://raw.githubusercontent.com/pozzoyy/sgs22_winning_rate_information/main/lineup-pairs-winrates-latest.json). It loads win-rate data when needed and keeps it in memory for the page session; reload the game page to load a new publication. Monthly data updates do not require a script version bump.

The curated [lineup-pairs.json](lineup-pairs.json) file is a separate dataset and is not currently loaded by this panel.

Repository URLs use the current repository name `sgs22_winning_rate_information`. If the repository is renamed, update the script metadata URLs, data URL, and documentation together.
