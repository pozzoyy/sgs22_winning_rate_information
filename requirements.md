# Win-rate JSON requirements

## Files and stable URL

- Archive each monthly dataset as `zhen_winrate_YYYY-MM.json` (for example, `zhen_winrate_2026-10.json`).
- Keep `zhen_winrate_latest.json` as an exact, byte-for-byte copy of the newest published monthly dataset.
- Currently, latest is October 2026: `zhen_winrate_2026-10.json` (73,356 entries).
- Both 组阵 userscript versions must load this stable raw URL:
  https://raw.githubusercontent.com/pozzoyy/sgs22_winning_rate_information/main/zhen_winrate_latest.json
- Preserve existing monthly archives when publishing a newer month.

## JSON structure

Use valid UTF-8 JSON. The root must be a single object mapping each pairing key to a three-element numeric array. Do not wrap the object in another property, insert metadata keys, or include comments.

```json
{
  "先手|钟毓|刘巴": [0.7157, 11281, 8074],
  "后手|乐蔡文姬|蒲元": [0.5894, 5901, 3478]
}
```

### Pairing keys

Each key is exactly `先后手|奇数位武将|偶数位武将`, using two ASCII pipe characters (`|`).

| Component | Requirement |
| --- | --- |
| 先后手 | Exactly `先手` or `后手`. |
| 奇数位武将 | General name at visual seat 1 or 3. |
| 偶数位武将 | General name at visual seat 2 or 4. |

For 2v2, the first team occupies visual seats 1 and 4 (`先手`); the second occupies visual seats 2 and 3 (`后手`). These are displayed seat numbers, not raw protocol seat IDs. Always put the odd-seat name before the even-seat name, regardless of which player is local. Do not sort the names alphabetically or treat a reversed pairing as interchangeable.

Preserve names and variant prefixes exactly, such as `界`, `神`, `谋`, `威`, and `乐`. Names must match the lookup names used by the userscripts, must not contain a pipe, and must not have leading or trailing whitespace. Keys must be unique; conflicting duplicate rows must be resolved explicitly rather than overwritten silently.

### Values

Each value must be `[winRate, totalMatches, wins]`, in that order.

| Index | Field | Requirement |
| --- | --- | --- |
| 0 | 胜率 | A finite JSON number between 0 and 1 inclusive; `0.7157` means 71.57%, not 0.7157%. |
| 1 | 总场 | An integer of at least 10. |
| 2 | 胜场 | An integer satisfying `0 <= wins <= totalMatches`. |

Use numeric values, not strings. Do not use null, NaN, Infinity, percentage strings, or extra array elements. Preserve a source-supplied rate rounded to four decimal places; it must agree with `wins / totalMatches` within `0.00005` (allowing a small floating-point tolerance). When no source rate is supplied, round that quotient to four decimal places.

For compatibility with the September and October publications, omit source rows with fewer than 10 total matches. Do not round a small count upward, invent absent pairings, or substitute zero values for missing data. A missing key means no published statistic is available.

## Spreadsheet conversion

The current source columns are:

| Spreadsheet column | JSON destination |
| --- | --- |
| 先后手 | First key component |
| 奇数位武将 | Second key component |
| 偶数位武将 | Third key component |
| 胜场 | Value index 2 |
| 总场 | Value index 1 |
| 胜率 | Value index 0 |

Exclude the header row. Check all populated source rows for valid sides, names, integer counts, rate consistency, and duplicate keys. Retain eligible rows without changing their meaning. Compact or indented JSON is acceptable, but the latest file must copy the chosen monthly file exactly.

## Publishing a new month

1. Convert and validate the new spreadsheet using the format and minimum-match cutoff above.
2. Add `zhen_winrate_YYYY-MM.json` for the new month. Keep earlier monthly files unchanged.
3. Replace the entire contents of `zhen_winrate_latest.json` with an exact copy of that newest monthly file. It must contain the JSON data itself, not a URL, redirect description, symlink, merged history, or filename.
4. Update the "Currently, latest" month and entry count in this document.
5. Publish the monthly file, latest copy, and documentation update together in one commit where possible.
6. Verify both files parse, every entry meets the schema, the exported entry count matches the eligible source rows, and their Git blob SHA or SHA-256 hashes are identical.
7. Verify the stable raw URL serves the new JSON. Reload the game page to load fresh data; an already running userscript may keep previously loaded rates in memory, and HTTP caches may briefly retain an earlier response.

Userscripts keep the stable latest URL when a new month is published; no monthly URL edit should be required.
