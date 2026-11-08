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

Current version: **1.0.7**. Keep the original 打小抄 enabled; enable only one copy of this companion.

1. Open the [raw userscript](https://raw.githubusercontent.com/pozzoyy/sgs22_winning_rate_information/main/scripts/sgs22-lineup-pairs-panel.user.js) and accept Tampermonkey's Install/Update prompt. This one-time installation is needed if your existing copy has no update URL or was installed from a local file.
2. If the raw link shows text, use Tampermonkey Dashboard → Utilities → Install from URL, paste the raw link, and install. Alternatively replace the code of the existing companion with the raw file contents and save.
3. Verify the installed version is 1.0.7. In the script's Settings, enable update checks and ensure custom update/download URL overrides are not pointing to an old file. The update and download URLs should both be the raw userscript link above.
4. Use Tampermonkey's Check for updates command to check manually. Automatic checks follow the update interval configured in Tampermonkey; future releases must increase `@version`.
5. Reload the game page after updating.

The `@name` and `@namespace` remain unchanged to preserve script identity. If installation creates a second copy, disable/remove the older companion to avoid running both.

## Data URL

The panel fetches [lineup-pairs-winrates-latest.json](https://raw.githubusercontent.com/pozzoyy/sgs22_winning_rate_information/main/lineup-pairs-winrates-latest.json). It starts loading data when the panel becomes available and keeps it in memory for the page session; reload the game page to load a new publication. Monthly data updates do not require a script version bump.

The panel also loads [lineup-pairs.json](lineup-pairs.json) for sugar labels. Pairs match in either order, with exact character names and version prefixes preserved. Matching rows appear in green and come before all unlisted pairs. They are ranked by 经典配阵 > 零糖 > 三分糖 > 五分糖 > 七分糖 > 全糖, then by descending win rate within each level. For multiple labels, the highest-ranked label determines placement. Missing win rates sort last within the same level. Remaining unlisted pairs are ranked by descending win rate. Labels from repeated records are merged and deduplicated, in this order: 经典配阵 / 零糖 / 三分糖 / 五分糖 / 七分糖 / 全糖. A matching pair without published win-rate statistics still appears, marked 暂无胜率. Win-rate lookup remains seat- and side-specific. If sugar data fails to load, win rates remain usable and the panel reports the failure and retries.

Repository URLs use the current repository name `sgs22_winning_rate_information`. If the repository is renamed, update the script metadata URLs, data URL, and documentation together.

## Panel resource status

The panel always shows 配阵胜率 and 糖阵信息, including while waiting for selection. Each reports 未读取, 读取中, 已读取 with the number of validated source records, or a failure/timeout with automatic retry. 糖阵信息 also reports the number of distinct unordered pairs after merging repeated records. Full resource URLs are not displayed in the panel. Requests time out after 20 seconds; unsuccessful resources are retried after the current load attempt finishes and a 15-second delay. Successful resources are retained for the page session.
