// ==UserScript==
// @name         三国杀组阵面板 · 独立伴随版 DEBUG
// @namespace    urn:sgs22:zhen-companion
// @version      1.0.2-debug.2
// @description  诊断独立组阵面板：记录订阅、消息、座位与数据加载，支持导出诊断。
// @icon         https://i0.hdslb.com/bfs/new_dyn/17ec41a0ca79633b77399065ab80da3f2138912.png
// @match        https://game.4399iw2.com/yxxsgs/*
// @match        *://*.sanguosha.com/10/*
// @match        *://*.sanguosha.com/x/*
// @match        *://*.sanguosha.com/10th/*
// @match        https://wan.baidu.com/*gameId=19793616*
// @match        *://h5.7k7k.com/web/H5GAMES.html?gid=960982bec2f555de44ea43ca8a7ef418/*
// @match        *://qqgame.qq.com/webappframe/?appid=10951
// @match        *://s118.app1107877410.qqopenapp.com/pc/qqLobby_index.php*
// @match        *://sgsszn.wan.360.cn/game_login.php*
// @exclude      *://*.sanguosha.com/220/*
// @grant        none
// @run-at       document-start
// ==/UserScript==
(() => {
    'use strict';

    const ratesURL = 'https://raw.githubusercontent.com/pozzoyy/sgs22_winning_rate_information/main/zhen_winrate_latest.json';
    // Mode 9 is the four-player 2v2 room observed in the diagnostic report.
    const supportedModes = new Set([8, 9]);
    let localUserID;
    function currentUserID() {
        if (localUserID) return localUserID;
        try {
            const raw = localStorage.getItem('DXC_selfUserID');
            if (!raw) return undefined;
            let value;
            try { value = JSON.parse(raw); } catch { value = raw; }
            return value != null && String(value) !== '0' ? String(value) : undefined;
        } catch { return undefined; }
    }
    const offers = new Map();
    const order = new Map();
    let roster = [], mode = 0, rates, names, panel, header;
    let dataStatus = '', loading = false, retryAt = 0, lastText;
    let busList, logList;

    const debugStarted = new Date().toISOString();
    const debugEvents = [], debugCounts = Object.create(null), debugUsers = new Map();
    let debugDropped = 0, debugUI, debugStatus, debugLastSnapshot = '', debugLastPeriodic = 0;
    const debugErrors = new Set();
    function debugUser(value) {
        if (value == null || value === '') return null;
        const key = String(value);
        if (!debugUsers.has(key)) debugUsers.set(key, 'user-' + (debugUsers.size + 1));
        return debugUsers.get(key);
    }
    function debugError(error) {
        return String(error?.stack || error?.message || error).replace(/https?:\/\/[^\s)]+/g,
            value => { try { const u = new URL(value); return u.origin + u.pathname; } catch { return '[URL]'; } }).slice(0, 1800);
    }
    function debugRecord(kind, detail = {}) {
        debugEvents.push({at: new Date().toISOString(), kind, detail});
        if (debugEvents.length > 3000) { debugEvents.shift(); debugDropped++; }
    }
    function debugPacket(source, type, payload) {
        const key = source + ':' + String(type).slice(0, 140);
        debugCounts[key] = (debugCounts[key] || 0) + 1;
        const relevant = /Mode|Lobby|Seat|Character|GameOver|RecommendShop|ActionOrder/.test(String(type));
        if (!relevant && debugCounts[key] > 2) return;
        const detail = {source, type: String(type), keys: Object.keys(payload || {}).slice(0, 60)};
        // Only export draft/seat fields; never dump arbitrary packet bodies or chat/hand cards.
        for (const field of ['modeIDInt', 'curModeID', 'modeID', 'seatIds', 'seatId', 'seat', 'actionSeatId']) {
            const v = payload?.[field];
            if (typeof v === 'number' || typeof v === 'string' && /^\d+$/.test(v)) detail[field] = v;
            else if (Array.isArray(v)) detail[field] = v.slice(0, 16).map(Number);
        }
        if (Array.isArray(payload?.seatInfo)) detail.seatInfo = payload.seatInfo.slice(0, 16).map(p =>
            ({seatPos: p.seatPos, user: debugUser(p.userId), keys: Object.keys(p).slice(0, 30)}));
        if (Array.isArray(payload?.dealCharacter)) detail.dealCharacter = payload.dealCharacter.slice(0, 150).map(p =>
            ({characterId: p?.characterId, keys: Object.keys(p || {}).slice(0, 20)}));
        if (Array.isArray(payload?.gameUserActionOrderList)) detail.actionOrder = payload.gameUserActionOrderList.slice(0, 16).map(p =>
            ({actionSeatId: p.actionSeatId, actionOrderIndex: p.actionOrderIndex}));
        debugRecord('packet', detail);
    }
    function debugSnapshot() {
        let user, identityError;
        try { user = currentUserID(); } catch (e) { identityError = debugError(e); }
        const bus = window.__dxcProtoBus;
        const me = roster.find(p => user != null && p[1] === String(user))?.[0];
        return {
            mode, roster: roster.map(([seat, uid]) => ({seat, user: debugUser(uid)})),
            localUser: debugUser(user), identityError, me, partner: me == null ? null : me ^ 1,
            offers: Array.from(offers), order: Array.from(order),
            hooks: {busPresent: !!bus, busArray: Array.isArray(bus?.subs), busSubscribed: !!bus?.subs?.includes?.(onPacket),
                busSource: bus?.source, busReason: bus?.reason, busStopped: bus?.stopped,
                busStats: bus?.stats ? {...bus.stats} : null,
                logArray: Array.isArray(window.SGSMODULE), logSubscribed: !!window.SGSMODULE?.includes?.(onLog)},
            dependencies: {JSZipUtils: typeof JSZipUtils, fflate: typeof fflate, CtrUtil: typeof CtrUtil,
                configVersion: !!window.configVersion, Laya: !!window.Laya},
            data: {ratesLoaded: !!rates, rateEntries: rates ? Object.keys(rates).length : 0,
                namesLoaded: !!names, nameEntries: names?.size || 0, loading, dataStatus, retryAt},
            ui: {host: !!document.getElementById('createIframe'), mounted: !!panel?.isConnected,
                headers: Array.from(document.querySelectorAll('.panel-header')).slice(0, 20).map(h => h.textContent.trim().slice(0, 60)),
                text: panel?.textContent?.slice(0, 5000)},
            frame: {top: window === window.top, origin: location.origin, pathname: location.pathname,
                readyState: document.readyState, visibility: document.visibilityState}
        };
    }
    function debugReport() {
        return {format: 'sgs22-zhen-companion-debug-v1', version: '1.0.2-debug.2', started: debugStarted,
            exported: new Date().toISOString(), userAgent: navigator.userAgent, ratesURL,
            privacy: 'User IDs are replaced with stable labels. No chat, hand cards, cookies, tokens, or URL queries are intentionally collected.',
            snapshot: debugSnapshot(), counts: {...debugCounts}, droppedEvents: debugDropped, events: debugEvents.slice()};
    }
    function debugExport() {
        debugRecord('export');
        const text = JSON.stringify(debugReport(), null, 2);
        try {
            const url = URL.createObjectURL(new Blob([text], {type: 'application/json'}));
            const link = document.createElement('a'); link.href = url;
            link.download = 'sgs22-zhen-debug-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
            document.body.appendChild(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) { debugRecord('export-error', {error: debugError(e)}); }
        // Always expose a copyable backup if this browser blocks file downloads.
        let area = document.getElementById('sgs22-zhen-debug-report');
        if (!area) { area = document.createElement('textarea'); area.id = 'sgs22-zhen-debug-report';
            area.style.cssText = 'display:block;width:300px;height:110px;color:#111;background:#fff'; debugUI.appendChild(area); }
        area.value = text; area.focus(); area.select();
        return text;
    }
    function debugTick() {
        if (!debugUI?.isConnected && document.body) {
            debugUI = document.createElement('div'); debugUI.id = 'sgs22-zhen-debug-controls';
            debugUI.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483647;background:#172033;color:#fff;padding:10px;font:12px/1.5 monospace;max-width:330px;border:1px solid #91a4c5;border-radius:6px';
            const title = document.createElement('b'); title.textContent = '组阵 DEBUG 1.0.2-debug.2'; debugUI.appendChild(title);
            debugStatus = document.createElement('div'); debugUI.appendChild(debugStatus);
            for (const [label, action] of [
                ['导出诊断', debugExport],
                ['标记：已打开选将框', () => debugRecord('user-marker', {state: 'selection-box-visible', snapshot: debugSnapshot()})],
                ['检查数据加载', () => { debugRecord('manual-data-check'); retryAt = 0; void loadData(); }]
            ]) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
                button.style.cssText = 'margin:4px 4px 0 0;color:#111;background:#eee;font:12px sans-serif';
                button.onclick = action; debugUI.appendChild(button); }
            document.body.appendChild(debugUI); debugRecord('debug-ui-mounted');
        }
        const now = Date.now();
        if (now - debugLastPeriodic < 3000) return;
        debugLastPeriodic = now;
        const snapshot = debugSnapshot();
        const text = JSON.stringify(snapshot);
        if (text !== debugLastSnapshot) { debugLastSnapshot = text; debugRecord('snapshot', snapshot); }
        if (debugStatus) debugStatus.textContent = `mode=${mode} 玩家=${roster.length} 候选座位=${offers.size}\n` +
            `协议钩子=${snapshot.hooks.busSubscribed ? '已订阅' : '未订阅'} 日志钩子=${snapshot.hooks.logSubscribed ? '已订阅' : '未订阅'}\n` +
            `消息类型=${Object.keys(debugCounts).length} 事件=${debugEvents.length} 面板=${snapshot.ui.mounted ? '已挂载' : '未挂载'}`;
    }
    function debugFailure(where, error) {
        const message = debugError(error), key = where + ':' + message;
        if (!debugErrors.has(key)) { debugErrors.add(key); debugRecord('error', {where, error: message}); }
    }
    window.__sgs22ZhenDebug = {report: debugReport, export: debugExport,
        mark: () => debugRecord('console-marker', {snapshot: debugSnapshot()})};
    debugRecord('boot');

    function reset() {
        debugRecord("reset", {mode, rosterCount: roster.length, offerSeats: Array.from(offers.keys())});
        offers.clear();
        order.clear();
        roster = [];
    }

    function receive(type, data) {
        debugPacket("receive", type, data);
        switch (type) {
            case 'CRespAuth':
            case 'CRespLogin':
                if (data.userID != null && String(data.userID) !== '0') localUserID = String(data.userID);
                break;
            case 'CReqModeMatch':
            case 'CReqLobbyJoin':
            case 'CRespLobbyTableCreate':
            case 'CRespLobbyTableJoin':
            case 'CRespLobbyJoin': {
                const next = Number(data.modeIDInt || data.curModeID || data.modeID);
                if (next > 0 && next !== mode) {
                    reset();
                    mode = next;
                }
                break;
            }
            case 'CNotifyTableModifyUserSeat':
                if (Array.isArray(data.seatInfo)) {
                    const next = data.seatInfo.map(p => [Number(p.seatPos ?? 0), String(p.userId)]);
                    if (roster.length && JSON.stringify(roster) !== JSON.stringify(next)) offers.clear();
                    roster = next;
                }
                break;
            case 'ModeGameActionOrderListNotify':
                if (Array.isArray(data.gameUserActionOrderList)) {
                    order.clear();
                    for (const p of data.gameUserActionOrderList) {
                        order.set(Number(p.actionSeatId ?? 0), Number(p.actionOrderIndex ?? 0) + 1);
                    }
                }
                break;
            case 'MsgDealCharacters': {
                // A list with multiple owners cannot be attributed to one player.
                if (data.seatIds?.length !== 1 || !Array.isArray(data.dealCharacter)) break;
                const seat = Number(data.seatIds[0]);
                if (!Number.isInteger(seat) || seat < 0 || seat > 3) break;
                const ids = data.dealCharacter.map(p => Number(p?.characterId)).filter(id => id > 0);
                offers.set(seat, [...new Set(ids)]);
                break;
            }
            case 'CRespLobbyTableLeave':
                mode = 0;
                reset();
                break;
            case 'MsgGameOver':
            case 'ClientRecommendShopItemRep':
                reset();
                break;
        }
    }

    function onPacket(event) {
        try {
            debugPacket('bus', event?.name, event?.payload);
            if (event?.isReplay) debugRecord('replay-skipped', {name: event.name});
        } catch (e) { debugFailure('bus-observer', e); }
        if (event?.payload && !event.isReplay) { try { receive(String(event.name).split('.').pop(), event.payload); } catch (e) { debugFailure('bus-receive', e); } }
    }

    function onLog(...args) {
        const payload = args[args.length - 1];
        try {
            const signatures = args.filter(a => typeof a === 'string').map(a =>
                a.match(/(?:cmsg|logicmsg|netframe)\.\w+/)?.[0]).filter(Boolean);
            const type = signatures[0] || payload?.className || payload?.constructor?.name || typeof payload;
            debugPacket('log', type, payload);
            if ((debugCounts['log:' + type] || 0) <= 2) debugRecord('log-shape', {
                argumentTypes: args.map(a => typeof a), signatures, payloadConstructor: payload?.constructor?.name,
                secondArgumentProtocol: typeof args[1] === 'string' ? args[1].match(/(?:cmsg|logicmsg|netframe)\.\w+/)?.[0] : null
            });
        } catch (e) { debugFailure('log-observer', e); }
        if (!payload || typeof payload !== 'object' || String(args[1]).includes('replay')) return;
        const protocol = String(args[1]).match(/(?:cmsg|logicmsg|netframe)\.(\w+)/);
        try { receive(protocol?.[1] || payload.className || payload.constructor?.name, payload); } catch (e) { debugFailure('log-receive', e); }
    }

    function subscribe(previous, current, listener) {
        if (previous !== current && previous?.includes(listener)) previous.splice(previous.indexOf(listener), 1);
        if (!Array.isArray(current)) return undefined;
        if (!current.includes(listener)) {
            current.push(listener);
            debugRecord('subscribed', {hook: listener === onPacket ? 'protocol-bus' : 'SGSMODULE', count: current.length});
        }
        return current;
    }

    // Use the game's own general configuration, with the same name conversion as 打小抄.
    async function generalNames() {
        const version = window.configVersion?.['res/config/Config.sgs'];
        const url = location.hostname === 'test.sanguosha.com'
            ? 'https://test.sanguosha.com/h5/res/config//Config_w.sgs'
            : 'https://web.sanguosha.com/10/pc/res/config/Config.sgs?v=' + version + '1';
        debugRecord("names-fetch-start", {url});
        const bytes = await new Promise((resolve, reject) => JSZipUtils.getBinaryContent(url,
            (err, data) => err ? reject(err) : resolve(data)));
        debugRecord("names-fetch-complete", {bytes: bytes?.byteLength || bytes?.length});
        const files = await new Promise((resolve, reject) => fflate.unzip(new Uint8Array(bytes),
            (err, files) => err ? reject(err) : resolve(files)));
        debugRecord('names-unzip-complete', {generalCardsPresent: !!files['GeneralCards.sgs']});
        const entry = files['GeneralCards.sgs'];
        const decoded = CtrUtil.Ctr.Ofb_Dec(entry.slice().buffer);
        const config = JSON.parse(new TextDecoder().decode(fflate.gunzipSync(decoded)));
        return new Map(config.Character.map(p => [Number(p.CharacterId), (p.ai || '') + (p.Name || '').replaceAll('&', '')]));
    }

    async function loadData() {
        if (loading || (rates && names) || Date.now() < retryAt) return;
        loading = true;
        debugRecord("data-load-start", {haveRates: !!rates, haveNames: !!names});
        const results = await Promise.allSettled([
            names || generalNames(),
            rates || fetch(ratesURL).then(response => {
                debugRecord("rates-response", {status: response.status, ok: response.ok});
                if (!response.ok) throw Error(String(response.status));
                return response.json();
            })
        ]);
        results.forEach((r, i) => debugRecord('data-load-result', {resource: i ? 'rates' : 'names',
            status: r.status, error: r.status === 'rejected' ? debugError(r.reason) : null}));
        if (results[0].status === 'fulfilled') names = results[0].value;
        if (results[1].status === 'fulfilled') rates = results[1].value;
        dataStatus = [!names && '武将名称', !rates && '胜率数据'].filter(Boolean).join('、');
        retryAt = Date.now() + 15000;
        loading = false;
        debugRecord("data-load-complete", {names: names?.size || 0, rates: rates ? Object.keys(rates).length : 0});
    }

    function mount() {
        if (panel?.isConnected && header?.isConnected) return true;
        const host = document.getElementById('createIframe');
        const settings = [...(host?.querySelectorAll('.panel-header') || [])]
            .find(h => h.textContent.trim() === '设置');
        const anchor = settings?.nextElementSibling;
        if (!anchor) return false;
        header?.remove();
        panel?.remove();
        header = document.createElement('button');
        header.type = 'button';
        header.className = 'panel-header active';
        header.textContent = '组阵';
        header.setAttribute('aria-expanded', 'true');
        panel = document.createElement('div');
        panel.className = 'panel-content';
        panel.style.cssText = 'display:block;max-height:50vh;overflow-y:auto;padding:6px;white-space:pre-line;line-height:1.5';
        header.onclick = () => {
            const open = panel.style.display === 'none';
            panel.style.display = open ? 'block' : 'none';
            header.classList.toggle('active', open);
            header.setAttribute('aria-expanded', String(open));
        };
        anchor.after(header, panel);
        lastText = undefined;
        return true;
    }

    function describe() {
        if (!supportedModes.has(mode) || roster.length !== 4) return '等待 2v2 选将（当前模式 ' + mode + '，玩家 ' + roster.length + '）';
        const uid = currentUserID();
        const me = roster.find(p => uid && p[1] === String(uid))?.[0];
        if (me === undefined) return '等待读取自己的座位';
        const partner = me ^ 1;
        // Default 2v2 seat labels used by the original selection overlay.
        const draftSeats = [4, 1, 2, 3];
        const mySeat = order.get(me) ?? draftSeats[me];
        const partnerSeat = order.get(partner) ?? draftSeats[partner];
        const team = mySeat === 1 || mySeat === 4 ? '先手' : '后手';
        const mine = offers.get(me), theirs = offers.get(partner);
        const label = id => names?.get(id) || '#' + id;
        const lines = [`座位：我 ${mySeat}　队友 ${partnerSeat}　${team}`,
            '自己：' + (mine?.map(label).join('、') || '等待候选'),
            '队友：' + (theirs?.map(label).join('、') || '等待候选')];
        if (dataStatus) lines.push(dataStatus + '暂不可用，稍后重试');
        if (!mine?.length || !theirs?.length || !rates || !names) return lines.join('\n');
        const rows = [];
        for (const a of mine) for (const b of theirs) {
            const pair = [[mySeat, label(a)], [partnerSeat, label(b)]];
            if (mySeat % 2 === 0) pair.reverse();
            const [[s1, n1], [s2, n2]] = pair;
            const stats = rates[[team, n1, n2].join('|')];
            if (Array.isArray(stats)) rows.push({rate: stats[0], text:
                `${s1} ${n1} + ${s2} ${n2}　${(100 * stats[0]).toFixed(1)}%（${stats[2]}/${stats[1]}）`});
        }
        rows.sort((a, b) => b.rate - a.rate);
        lines.push(...(rows.length ? rows.map(row => row.text) : ['胜率表中没有对应组合']));
        return lines.join('\n');
    }

    function tick() {
        busList = subscribe(busList, window.__dxcProtoBus?.subs, onPacket);
        logList = subscribe(logList, window.SGSMODULE, onLog);
        if (!mount()) return;
        if (supportedModes.has(mode) && offers.size) void loadData();
        const text = describe();
        if (text !== lastText) panel.textContent = lastText = text;
    }
    function safeTick() {
        try { tick(); } catch (e) { debugFailure('tick', e); }
        try { debugTick(); } catch (e) { debugFailure('diagnostics', e); }
    }
    safeTick();
    setInterval(safeTick, 350);
})();
