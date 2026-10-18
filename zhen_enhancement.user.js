// ==UserScript==
// @name         三国杀打小抄 - 组阵增强
// @namespace    https://github.com/lkfun
// @version      1.0.0
// @description  为打小抄脚本添加组阵胜率功能（需配合原脚本与胜率数据）
// @author       Assistant
// @match        https://game.4399iw2.com/yxxsgs/*
// @match        *://*.sanguosha.com/10/*
// @match        *://*.sanguosha.com/x/*
// @match        *://*.sanguosha.com/10th/*
// @match        https://wan.baidu.com/*gameId=19793616*
// @match        *://h5.7k7k.com/web/H5GAMES.html?gid=960982bec2f555de44ea43ca8a7ef418/*
// @match        *://qqgame.qq.com/webappframe/?appid=10951
// @match        *://s118.app1107877410.qqopenapp.com/pc/qqLobby_index.php*
// @match        *://sgsszn.wan.360.cn/game_login.php*
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  // ========== CONFIG ==========
  // Replace with your hosted URL of zhen_winrate.json
  const DATA_URL = "https://your-host.com/zhen_winrate.json";
  // ============================

  let ZHEN_LOOKUP = null;
  let partnerDrawGenerals = new Set();
  let uiInjected = false;

  // Load win-rate data
  function loadData() {
    if (typeof GM_xmlhttpRequest === "undefined") {
      console.warn("[组阵] GM_xmlhttpRequest not available, trying fetch");
      fetch(DATA_URL).then(r => r.json()).then(d => {
        ZHEN_LOOKUP = d;
        console.info("[组阵] 数据加载完成 (fetch)");
      }).catch(e => console.error("[组阵] 数据加载失败", e));
      return;
    }
    GM_xmlhttpRequest({
      method: "GET",
      url: DATA_URL,
      onload: function(resp) {
        try {
          ZHEN_LOOKUP = JSON.parse(resp.responseText);
          console.info("[组阵] 胜率数据加载完成，条目数:", Object.keys(ZHEN_LOOKUP).length);
        } catch (e) {
          console.error("[组阵] JSON 解析失败", e);
        }
      },
      onerror: function() {
        console.error("[组阵] 数据请求失败，请检查 DATA_URL");
      }
    });
  }

  // Determine 先手 / 后手
  function getXianHou(seat) {
    const s = Number(seat);
    // Adjust if seat is 0-based; current assumption: 1-based as displayed in UI
    const displaySeat = s >= 0 && s <= 3 ? s + 1 : s;
    return (displaySeat === 1 || displaySeat === 4) ? "先手" : "后手";
  }

  // Compute combinations
  function computeZhen(selfIds, partnerIds, seat) {
    if (!ZHEN_LOOKUP || !selfIds.length || !partnerIds.length) return [];
    const xh = getXianHou(seat);
    const results = [];
    const dict = (window.pe && window.pe.generalDict) || {};

    for (const a of selfIds) {
      for (const b of partnerIds) {
        const nameA = dict[a] || String(a);
        const nameB = dict[b] || String(b);
        const key1 = `${xh}|${nameA}|${nameB}`;
        const key2 = `${xh}|${nameB}|${nameA}`;
        const data = ZHEN_LOOKUP[key1] || ZHEN_LOOKUP[key2];
        if (data) {
          results.push({
            pair: `${nameA} + ${nameB}`,
            winrate: data[0],
            total: data[1],
            wins: data[2]
          });
        }
      }
    }
    results.sort((x, y) => y.winrate - x.winrate);
    return results;
  }

  // Inject UI panel
  function injectUI() {
    if (uiInjected) return;
    const headers = document.querySelectorAll(".panel-header");
    let target = null;
    headers.forEach(h => {
      if (h.textContent.includes("设置")) target = h;
    });
    if (!target) return;

    const newHeader = document.createElement("button");
    newHeader.className = "panel-header";
    newHeader.innerHTML = '<span class="triangle"></span> <b>组阵</b>';

    const content = document.createElement("div");
    content.className = "panel-content";
    content.id = "zhenPanel";
    content.style.display = "none";
    content.innerHTML = `
      <div id="zhenList" style="font-size:12px;max-height:360px;overflow:auto;line-height:1.6;"></div>
      <button id="refreshZhen" class="function mizhuBTN phrase" style="margin-top:6px;">刷新组阵</button>
      <div style="font-size:11px;color:#aaa;margin-top:4px;">需双方选将框出现后点击刷新</div>
    `;

    target.parentNode.insertBefore(newHeader, target.nextSibling);
    target.parentNode.insertBefore(content, newHeader.nextSibling);

    newHeader.onclick = function() {
      const open = content.style.display !== "none";
      content.style.display = open ? "none" : "block";
    };

    document.getElementById("refreshZhen").onclick = function() {
      const we = window.we;
      if (!we) {
        document.getElementById("zhenList").innerHTML = "未检测到原脚本对象 we";
        return;
      }
      const selfIds = [...(we.myDrawGenerals || new Set())];
      const partnerIds = [...partnerDrawGenerals];
      const list = computeZhen(selfIds, partnerIds, we.myDrawSeat);
      const el = document.getElementById("zhenList");
      if (!list.length) {
        el.innerHTML = "暂无匹配数据（检查选将框或数据是否加载）";
        return;
      }
      el.innerHTML = list.map(r =>
        `<div>${r.pair}　<strong>${(r.winrate * 100).toFixed(1)}%</strong>　(${r.wins}/${r.total})</div>`
      ).join("");
    };

    uiInjected = true;
    console.info("[组阵] UI 面板已注入");
  }

  // Hook into protocol messages to capture partner box
  function hookMessages() {
    // The original script processes messages in a large handler.
    // We periodically check for new partner data by watching console or by patching.
    // Simpler approach: poll we.mySeats and intercept if possible.
    // For reliability, we advise manual patch of the original script's MsgDealCharacters handler.
    // This companion will still provide the UI and lookup once partnerDrawGenerals is filled.
  }

  // Main
  loadData();

  const observer = new MutationObserver(() => {
    if (document.querySelector(".panel-header")) injectUI();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  setTimeout(injectUI, 2000);
  setTimeout(injectUI, 5000);

  // Expose for manual filling from console if needed
  window.__zhenSetPartner = function(ids) {
    partnerDrawGenerals = new Set(ids);
    console.info("[组阵] 手动设置队友选将:", [...partnerDrawGenerals]);
  };
  window.__zhenGetPartner = () => [...partnerDrawGenerals];

})();
