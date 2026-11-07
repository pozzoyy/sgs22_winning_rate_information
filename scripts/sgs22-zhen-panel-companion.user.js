// ==UserScript==
// @name         三国杀打小抄 · 2v2组阵面板
// @namespace    urn:sgs22:zhen-companion
// @version      1.0.2
// @description  配合原版打小抄，按座位显示选将候选与组阵胜率。
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

    function reset() {
        offers.clear();
        order.clear();
        roster = [];
    }

    function receive(type, data) {
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
        if (event?.payload && !event.isReplay) receive(String(event.name).split('.').pop(), event.payload);
    }

    function onLog(...args) {
        const payload = args[args.length - 1];
        if (!payload || typeof payload !== 'object' || String(args[1]).includes('replay')) return;
        const protocol = String(args[1]).match(/(?:cmsg|logicmsg|netframe)\.(\w+)/);
        receive(protocol?.[1] || payload.className || payload.constructor?.name, payload);
    }

    function subscribe(previous, current, listener) {
        if (previous !== current && previous?.includes(listener)) previous.splice(previous.indexOf(listener), 1);
        if (!Array.isArray(current)) return undefined;
        if (!current.includes(listener)) current.push(listener);
        return current;
    }

    // Use the game's own general configuration, with the same name conversion as 打小抄.
    async function generalNames() {
        const version = window.configVersion?.['res/config/Config.sgs'];
        const url = location.hostname === 'test.sanguosha.com'
            ? 'https://test.sanguosha.com/h5/res/config//Config_w.sgs'
            : 'https://web.sanguosha.com/10/pc/res/config/Config.sgs?v=' + version + '1';
        const bytes = await new Promise((resolve, reject) => JSZipUtils.getBinaryContent(url,
            (err, data) => err ? reject(err) : resolve(data)));
        const files = await new Promise((resolve, reject) => fflate.unzip(new Uint8Array(bytes),
            (err, files) => err ? reject(err) : resolve(files)));
        const entry = files['GeneralCards.sgs'];
        const decoded = CtrUtil.Ctr.Ofb_Dec(entry.slice().buffer);
        const config = JSON.parse(new TextDecoder().decode(fflate.gunzipSync(decoded)));
        return new Map(config.Character.map(p => [Number(p.CharacterId), (p.ai || '') + (p.Name || '').replaceAll('&', '')]));
    }

    async function loadData() {
        if (loading || (rates && names) || Date.now() < retryAt) return;
        loading = true;
        const results = await Promise.allSettled([
            names || generalNames(),
            rates || fetch(ratesURL).then(response => {
                if (!response.ok) throw Error(String(response.status));
                return response.json();
            })
        ]);
        if (results[0].status === 'fulfilled') names = results[0].value;
        if (results[1].status === 'fulfilled') rates = results[1].value;
        dataStatus = [!names && '武将名称', !rates && '胜率数据'].filter(Boolean).join('、');
        retryAt = Date.now() + 15000;
        loading = false;
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
    tick();
    setInterval(tick, 350);
})();
