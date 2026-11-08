# SGS lineup pairs (组阵)

## Files
- `lineup-pairs.json`: 378 pair records from 377 retained video titles, in source order. 49 titles with one or more names absent from the reference were removed. ID 192 contributes two records.
- [Reference names.xlsx](https://github.com/pozzoyy/Temp/blob/main/sgs/names.xlsx): all 481 distinct reference names, with numeric IDs; exact spelling and variant prefixes preserved. IDs use Unicode name sorting and are specific to this snapshot.

## Source and selection
Reference: `pozzoyy/sgs22_winning_rate_information/zhen_winrate_latest.json`, October 2026; identical blob to `zhen_winrate_2026-10.json`. Blob SHA: `c21f4fbcd79e5c4826d6710f54a873176af1fa79`. Names are collected from BOTH name positions of every `先手|name|name` / `后手|name|name` key, deduplicated.
Video input: `bilibili-filtered-titles-years.csv`. Sugar titles: 2023-11-08 through 2026-11-08 inclusive; 经典配阵: all dates in original export. No pair deduplication: repeated videos remain separate records.

## JSON fields
- `id`: 1-based row index in filtered CSV, excluding header.
- `names`: exactly two character names in title order, NOT a claim about player seats. Combined-character cards such as 界关兴张苞 count as ONE name.
- `name_ids`: corresponding numeric IDs from names.xlsx; all retained IDs are non-null. Entire titles containing an absent name were removed. A missing name is NOT replaced by a different version just to obtain an ID.
- `labels`: array containing any of 零糖 / 三分糖 / 五分糖 / 七分糖 / 全糖 / 经典配阵 present in the title.
- `year`, `title`: source year and unchanged title, retained for traceability.
- `review_notes`: empty for exact matches, otherwise records inferred aliases, missing names or ambiguity. Inferences are provisional.

## Parsing and uncertainty
For 经典配阵, read the pair before the colon; for 我爱发明, read it after the colon. Two exceptional classic titles (IDs 297, 366) put the pair after the colon. Ignore trailing seat markers 14/23 and bracketed labels. Prefer an exact complete two-name segmentation; do not match incidental character mentions in the descriptive text.
Provisional aliases: 甘糜夫人→甘夫人糜夫人; 魏贾诩→SP贾诩; 万年→万年公主; 关张→界关兴张苞; 郭逢→郭图逢纪; 神诸葛→神诸葛亮; 蜀孙尚香→SP孙尚香.
ID 192: user confirmed both variants. Two records are emitted: 神华佗 + 威曹丕 and 神华佗 + 曹丕. Both retain source ID 192; identify a record by (id, names), not id alone. Source IDs are preserved, so gaps after filtering are expected.
Bare names remain bare: e.g. 甄姬 is not automatically changed to 界甄姬, 胡烈 is not automatically changed to 谋胡烈.


## Filtering
Removed source IDs: 60, 93, 138, 155, 179, 199, 210, 223, 231, 233, 241, 243, 244, 252, 253, 254, 272, 275, 287, 290, 297, 305, 312, 315, 317, 323, 324, 325, 330, 332, 335, 338, 341, 348, 353, 354, 358, 365, 369, 382, 383, 384, 393, 399, 403, 406, 414, 417, 418.

“Lineup” translates 阵容/组阵; “lineup pairs” describes these two-character combinations. Names remain in title order and do not establish seat order. This file is separate from the win-rate JSON schema.
