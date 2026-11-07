# Independent companion debug collection

This diagnostic build is based on companion 1.0.1. It preserves the existing message-reading logic while recording why it may fail. It is not a confirmed fix.

## Installation

1. Enable the original 打小抄 userscript.
2. Disable both the combined 组阵 version and the normal independent companion.
3. Install `sgs22-zhen-panel-companion-debug.user.js` from the scripts directory.
4. Reload the entire game page before joining a new 2v2 match. Installing after the selection messages have already arrived cannot recover those earlier messages.

## Capture one reproduction

1. Confirm the floating **组阵 DEBUG 1.0.2-debug.1** controls appear at the bottom right.
2. Enter 2v2 normally. When your selection box is visible, press **标记：已打开选将框**.
3. Press **检查数据加载** once. This checks the rates and general-name dependencies even if draft detection is failing.
4. Wait about 15 seconds while the box is visible if possible; finish selection normally if the timer requires it.
5. Press **导出诊断**. Send the downloaded `sgs22-zhen-debug-....json` file in the conversation.
6. If the download is blocked, the same report appears in a selected text box under the buttons. Copy it into a plain text file with a `.json` extension and attach that.
7. Also send a screenshot showing the debug controls and the selection/panel state, the browser and Tampermonkey versions, which original 打小抄 version is enabled, and whether the game runs in a webpage or 微端.
8. If possible, export once during selection and once after entering the battle. Keep the tab open until both reports are saved; reload starts a new recording.

The report includes protocol counts and relevant message field names, candidate IDs, pseudonymous seat mappings, subscription state, available dependencies, data fetch results/errors, resets, and the last 3,000 diagnostic events. Earlier events are discarded once the limit is reached; the report records that count. It records only events observed after this debug script starts.

It intentionally omits arbitrary packet bodies, chat, hand cards, cookies, tokens, and URL queries. Player IDs are replaced with consistent labels within each page recording. The report is stored in memory and downloaded locally; the debug script does not upload it. Review screenshots for personal information before sharing them.

## If no floating debug controls appear

Send a screenshot of Tampermonkey's enabled scripts and any Console error pointing to this userscript. In browser developer tools, select the actual game frame and run:

```js
window.__sgs22ZhenDebug?.report()
```

If it returns an object, right-click that object to copy it, or run `window.__sgs22ZhenDebug.export()` to download the report and show the text backup. If it returns undefined, report that along with the game host/path (omit login tokens or URL query parameters). A wrong frame can also return undefined.

After collection, disable the debug version. Use the working combined version for normal play while the companion is investigated. Do not run the combined and debug versions together during reproduction, since both copies of the original infrastructure could alter the hooks being diagnosed.
