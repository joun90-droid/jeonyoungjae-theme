/* 영재 테마주분석 — live prices, charts, movers, watchlist */
(function () {
  const data = window.THEME_DATA || { themes: [], stocks: [] };
  const WATCH_KEY = "theme_watchlist";
  const state = {
    theme: "all",
    q: "",
    sortBy: "score",
    riskFilter: "all",
    chartView: "all",
    prices: {},
  };
  const charts = {};
  let chartsReady = false;
  let chartUpdateTimer = null;
  let stockRenderTimer = null;
  let priceSyncing = false;
  let pricesLoaded = false;
  let uiUpdateTimer = null;
  const REFRESH_MS = (window.ThemeLivePrices && ThemeLivePrices.REFRESH_MS) || 20000;

  const themeGrid = document.getElementById("themeGrid");
  const stockList = document.getElementById("stockList");
  const chartDefaults = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    transitions: { active: { animation: { duration: 0 } } },
  };

  function detailHref(id) {
    return `detail.html?id=${encodeURIComponent(id)}`;
  }
  function themeById(id) {
    return data.themes.find((t) => t.id === id);
  }
  function themeLabel() {
    if (state.theme === "all") return "전체 테마";
    const t = themeById(state.theme);
    return t ? `${t.emoji} ${t.name}` : "전체 테마";
  }
  function riskClass(label) {
    if (label === "높음") return "risk-high";
    if (label === "낮음") return "risk-low";
    return "risk-mid";
  }
  function fmtPrice(n, currency) {
    if (n == null || Number.isNaN(n)) return "—";
    if (currency === "USD") {
      return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return Number(n).toLocaleString("ko-KR");
  }
  function priceUnit(currency) {
    return currency === "USD" ? "" : "원";
  }
  function fmtChg(n) {
    if (n == null || Number.isNaN(n)) return "—";
    const sign = n > 0 ? "+" : "";
    return `${sign}${Number(n).toFixed(2)}%`;
  }
  function fmtChangeAmt(n, currency) {
    if (n == null || Number.isNaN(n)) return "—";
    const sign = n > 0 ? "+" : n < 0 ? "" : "";
    if (currency === "USD") {
      return `${sign}${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${sign}${Number(n).toLocaleString("ko-KR")}`;
  }
  function getChg(code) {
    const p = state.prices[code];
    if (!p) return null;
    if (p.changeRate != null && !Number.isNaN(p.changeRate)) return p.changeRate;
    if (p.price != null && p.change != null) {
      const prev = p.price - p.change;
      if (prev !== 0) return (p.change / prev) * 100;
    }
    if (p.price != null) return 0;
    return null;
  }
  function getChange(code) {
    const p = state.prices[code];
    if (!p) return null;
    if (p.change != null && !Number.isNaN(p.change)) return p.change;
    const chg = getChg(code);
    if (chg != null && p.price != null) {
      const prev = p.price / (1 + chg / 100);
      return Math.round(p.price - prev);
    }
    return null;
  }
  function chgClass(n) {
    if (n == null) return "flat";
    if (n > 0) return "up";
    if (n < 0) return "down";
    return "flat";
  }
  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) h = (h << 5) - h + str.charCodeAt(i) | 0;
    return Math.abs(h);
  }
  function starBtn(id, watched, label) {
    const cls = watched ? "btn-watch on" : "btn-watch";
    const fill = watched ? "#fcd34d" : "none";
    return `<button type="button" class="${cls}" data-id="${id}" aria-label="${label || "관심종목"}">
      <svg class="ico-star" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5l2.45 4.96 5.48.8-3.96 3.86.93 5.46L12 16.2l-4.9 2.58.93-5.46-3.96-3.86 5.48-.8L12 3.5z" fill="${fill}" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    </button>`;
  }
  function showToast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { el.hidden = true; }, 2200);
  }
  function getWatchlist() {
    try {
      return JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function setWatchlist(ids) {
    localStorage.setItem(WATCH_KEY, JSON.stringify(ids));
  }
  function toggleWatch(id, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const list = getWatchlist();
    const i = list.indexOf(id);
    if (i >= 0) {
      list.splice(i, 1);
      showToast("관심종목에서 제거했습니다");
    } else {
      list.push(id);
      showToast("⭐ 관심종목에 추가했습니다");
    }
    setWatchlist(list);
    renderWatchlist();
    renderStocks();
  }

  function filtered() {
    let list = data.stocks.slice();
    if (state.theme !== "all") list = list.filter((s) => s.theme === state.theme);
    if (state.riskFilter !== "all") list = list.filter((s) => s.riskLabel === state.riskFilter);
    const q = state.q.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        [s.name, s.code, s.tag, s.thesis, s.focus, s.role].join(" ").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (state.sortBy === "growth") return b.growth - a.growth;
      if (state.sortBy === "riskAsc") return a.risk - b.risk;
      if (state.sortBy === "chgDesc") return (getChg(b.code) ?? -999) - (getChg(a.code) ?? -999);
      if (state.sortBy === "chgAsc") return (getChg(a.code) ?? 999) - (getChg(b.code) ?? 999);
      return b.score - a.score;
    });
    return list;
  }

  function themeAvgChg(themeId) {
    const stocks = themeId === "all"
      ? data.stocks
      : data.stocks.filter((s) => s.theme === themeId);
    const chgs = stocks.map((s) => getChg(s.code)).filter((c) => c != null);
    if (!chgs.length) return null;
    return chgs.reduce((a, b) => a + b, 0) / chgs.length;
  }

  function updateFilterBar(count) {
    const label = document.getElementById("filterThemeLabel");
    const countEl = document.getElementById("filterStockCount");
    const bar = document.getElementById("themeFilterBar");
    if (label) label.textContent = themeLabel();
    if (countEl) countEl.textContent = `${count}종목`;
    if (bar) bar.hidden = state.theme === "all";
  }

  function renderStats(list) {
    const liveN = list.filter((s) => state.prices[s.code]?.price != null).length;
    const chgs = list.map((s) => getChg(s.code)).filter((c) => c != null);
    const avgChg = chgs.length ? chgs.reduce((a, b) => a + b, 0) / chgs.length : null;

    document.getElementById("statThemes").textContent = String(data.themes.length);
    document.getElementById("statStocks").textContent = String(list.length);
    document.getElementById("statAvgChg").textContent = avgChg != null ? fmtChg(avgChg) : "-";
    document.getElementById("statAvgChg").className = "v " + chgClass(avgChg);
    document.getElementById("statLive").textContent = list.length ? `${liveN}/${list.length}` : "-";
    updateFilterBar(list.length);
  }

  function setLiveBadge(syncing, liveN, total, updatedAt, error) {
    const badge = document.getElementById("liveBadge");
    const wrap = document.querySelector(".live");
    if (!badge || !wrap) return;
    const sec = REFRESH_MS / 1000;
    const base = `LIVE · ${sec}초마다 자동갱신`;
    const showSync = syncing && !pricesLoaded;
    wrap.classList.toggle("is-syncing", showSync);
    wrap.classList.toggle("is-live", !showSync && liveN > 0);
    if (error && !liveN) badge.textContent = `${base} · 재연결`;
    else badge.textContent = base;
  }

  function applyThemeFilter(themeId, scroll) {
    state.theme = themeId;
    renderThemes();
    renderStocks();
    if (scroll) {
      document.getElementById("stocks")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function moverSkeleton() {
    return Array.from({ length: 5 }, () =>
      '<div class="mover-item mover-loading"><span class="sk-line sk-nm"></span><span class="sk-line sk-chg"></span></div>'
    ).join("");
  }

  function moverCandidates() {
    const ranked = data.stocks
      .map((s) => ({ s, chg: getChg(s.code) }))
      .filter((x) => x.chg != null)
      .sort((a, b) => b.chg - a.chg);
    if (ranked.length >= 2) return ranked;
    const priced = data.stocks
      .filter((s) => state.prices[s.code]?.price != null)
      .sort((a, b) => b.score - a.score)
      .map((s) => ({ s, chg: getChg(s.code) ?? 0 }));
    if (priced.length) return priced;
    return data.stocks
      .slice()
      .sort((a, b) => b.score - a.score)
      .map((s) => ({ s, chg: 0 }));
  }

  function renderMovers() {
    const el = document.getElementById("moverGrid");
    if (!el) return;
    const withChg = moverCandidates();

    if (!withChg.length) {
      const loading = !pricesLoaded && priceSyncing;
      el.innerHTML = `
        <div class="mover-col up"><h4>📈 급등 TOP 5</h4>${loading ? moverSkeleton() : '<div class="empty-watch">등락 데이터 없음</div>'}</div>
        <div class="mover-col down"><h4>📉 급락 TOP 5</h4>${loading ? moverSkeleton() : '<div class="empty-watch">등락 데이터 없음</div>'}</div>`;
      return;
    }

    const topUp = withChg.slice(0, 5);
    const topDown = withChg.slice(-5).reverse();
    if (topUp.length === 1 && topDown.length === 1 && topUp[0].s.id === topDown[0].s.id) {
      topDown.length = 0;
    }

    const itemHtml = (x) => {
      const p = state.prices[x.s.code] || {};
      const cur = p.currency || x.s.currency || "KRW";
      const chgAmt = getChange(x.s.code);
      const unit = priceUnit(cur);
      return `<a class="mover-item" href="${detailHref(x.s.id)}">
        <div><div class="nm">${x.s.name}</div><div class="cd">${x.s.displayCode || x.s.code} · ${fmtPrice(p.price, cur)}${unit}</div></div>
        <div class="mover-right">
          <div class="chg-amt ${chgClass(chgAmt)}">${fmtChangeAmt(chgAmt, cur)}${unit ? " " + unit.trim() : ""}</div>
          <div class="chg ${chgClass(x.chg)}">${fmtChg(x.chg)}</div>
        </div>
      </a>`;
    };

    el.innerHTML = `
      <div class="mover-col up"><h4>📈 급등 TOP 5</h4>${topUp.map(itemHtml).join("")}</div>
      <div class="mover-col down"><h4>📉 급락 TOP 5</h4>${topDown.length ? topDown.map(itemHtml).join("") : '<div class="empty-watch">하락 종목 없음</div>'}</div>
    `;
  }

  function renderTodayPick() {
    const el = document.getElementById("todayPick");
    if (!el || !data.themes.length) return;
    const day = new Date().getDate();
    const theme = data.themes[day % data.themes.length];
    const stocks = data.stocks.filter((s) => s.theme === theme.id).sort((a, b) => b.score - a.score).slice(0, 5);
    const avg = themeAvgChg(theme.id);
    el.innerHTML = `
      <div class="pick-badge">⭐ 오늘의 테마 Pick · ${new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}</div>
      <h3>${theme.emoji} ${theme.name}</h3>
      <p class="muted">${theme.summary}</p>
      <div class="pick-meta">
        <span class="pill hot">히트 ${theme.heat}</span>
        <span class="pill ${chgClass(avg)}">평균 ${avg != null ? fmtChg(avg) : "—"}</span>
        <span class="pill">${stocks.length}+ 종목</span>
      </div>
      <div class="pick-stocks">
        ${stocks.map((s) => `<a class="pick-chip" href="${detailHref(s.id)}">${s.name}</a>`).join("")}
      </div>
      <div class="hero-actions" style="margin-top:12px">
        <button type="button" class="btn btn-primary" id="btnPickTheme">이 테마 종목 보기</button>
      </div>
    `;
    document.getElementById("btnPickTheme")?.addEventListener("click", () => {
      applyThemeFilter(theme.id, true);
    });
  }

  function renderWatchlist() {
    const el = document.getElementById("watchList");
    if (!el) return;
    const ids = getWatchlist();
    const stocks = ids.map((id) => data.stocks.find((s) => s.id === id)).filter(Boolean);
    if (!stocks.length) {
      el.innerHTML = '<div class="empty-watch">관심종목이 없습니다. 아래 종목에서 ☆를 눌러 추가하세요.</div>';
      return;
    }
    el.innerHTML = stocks.map((s) => {
      const p = state.prices[s.code] || {};
      const chg = getChg(s.code);
      const chgAmt = getChange(s.code);
      const cur = p.currency || s.currency || "KRW";
      return `<div class="watch-card">
        <a class="watch-main" href="${detailHref(s.id)}">
          <h4>${s.name}</h4>
          <span class="watch-quote">
            <strong>${fmtPrice(p.price, cur)}${priceUnit(cur)}</strong>
            <em class="${chgClass(chgAmt)}">${fmtChangeAmt(chgAmt, cur)}</em>
            <em class="${chgClass(chg)}">${fmtChg(chg)}</em>
          </span>
        </a>
        ${starBtn(s.id, true, "관심 해제")}
      </div>`;
    }).join("");
  }

  function renderThemes() {
    const allAvg = themeAvgChg("all");
    const allCard = `
      <article class="theme-card ${state.theme === "all" ? "active" : ""}" data-theme="all" role="button" tabindex="0">
        <div class="theme-top"><div><div class="theme-name">전체 테마</div>
        <div class="theme-meta"><span class="pill hot">ALL</span><span class="pill">${data.stocks.length}종목</span></div>
        <div class="theme-chg ${chgClass(allAvg)}" data-theme-chg="all">평균 ${allAvg != null ? fmtChg(allAvg) : "—"}</div></div>
        <div class="theme-emoji">📊</div></div>
        <p>모든 테마 추천 종목을 실시간 시세와 함께 비교합니다.</p>
        <div class="heat"><span style="width:100%"></span></div>
      </article>`;
    themeGrid.innerHTML =
      allCard +
      data.themes
        .map((t) => {
          const count = data.stocks.filter((s) => s.theme === t.id).length;
          const avg = themeAvgChg(t.id);
          return `
          <article class="theme-card ${state.theme === t.id ? "active" : ""}" data-theme="${t.id}" role="button" tabindex="0">
            <div class="theme-top"><div><div class="theme-name">${t.name}</div>
            <div class="theme-meta"><span class="pill hot">히트 ${t.heat}</span><span class="pill">${count}종목</span></div>
            <div class="theme-chg ${chgClass(avg)}" data-theme-chg="${t.id}">평균 ${avg != null ? fmtChg(avg) : "—"}</div></div>
            <div class="theme-emoji">${t.emoji}</div></div>
            <p>${t.summary}</p>
            <p class="theme-path">${t.sectorPath}</p>
            <div class="heat"><span style="width:${t.heat}%"></span></div>
          </article>`;
        })
        .join("");
  }

  function patchThemeChg() {
    document.querySelectorAll("[data-theme-chg]").forEach((el) => {
      const id = el.dataset.themeChg;
      const avg = themeAvgChg(id);
      el.textContent = `평균 ${avg != null ? fmtChg(avg) : "—"}`;
      el.className = `theme-chg ${chgClass(avg)}`;
    });
  }

  function renderStocks() {
    const list = filtered();
    const watchIds = getWatchlist();
    renderStats(list);
    if (!list.length) {
      stockList.innerHTML = '<div class="empty">조건에 맞는 종목이 없습니다.</div>';
      return;
    }
    stockList.innerHTML = list
      .map((s, idx) => {
        const theme = themeById(s.theme);
        const p = state.prices[s.code] || {};
        const chg = getChg(s.code);
        const chgAmt = getChange(s.code);
        const cur = p.currency || s.currency || "KRW";
        const unit = priceUnit(cur);
        const shownCode = s.displayCode || s.code;
        const watched = watchIds.includes(s.id);
        const hasPrice = p.price != null;
        return `
        <article class="stock-item">
          ${starBtn(s.id, watched, "관심종목")}
          <div class="stock-rank">${idx + 1}</div>
          <a class="stock-link" href="${detailHref(s.id)}">
            <div class="stock-head">
              <div class="stock-info">
                <h4>${s.name}</h4>
                <p class="stock-meta">${s.market} · ${shownCode} · ${theme ? theme.name : ""} · ${s.role}</p>
              </div>
              <div class="stock-quote ${hasPrice ? "" : "pending"}">
                <div class="quote-price">${fmtPrice(p.price, cur)}<span class="quote-unit">${unit}</span></div>
                <div class="quote-delta ${chgClass(chg)}">
                  <span class="delta-amt">${fmtChangeAmt(chgAmt, cur)}${unit && chgAmt != null ? unit : ""}</span>
                  <span class="delta-pct">${fmtChg(chg)}</span>
                </div>
              </div>
            </div>
            <div class="stock-chart-row">
              <span class="chart-label">최근 12일</span>
              <div class="mini-candles" data-code="${s.code}">${ThemeDailyBars ? ThemeDailyBars.placeholder(300, 56) : ""}</div>
            </div>
            <p class="stock-thesis">${s.thesis}</p>
            <div class="meters">
              <div class="meter">
                <label><span>위험도</span><span>${s.risk} · ${s.riskLabel}</span></label>
                <div class="bar risk"><i style="width:${s.risk}%"></i></div>
              </div>
              <div class="meter">
                <label><span>성장가능성</span><span>${s.growth} · ${s.growthLabel}</span></label>
                <div class="bar growth"><i style="width:${s.growth}%"></i></div>
              </div>
            </div>
            <div class="tags">
              <span class="tag">${s.tag}</span>
              <span class="tag">재료 ${s.focus}</span>
              <span class="tag ${riskClass(s.riskLabel)}">위험 ${s.riskLabel}</span>
              <span class="tag growth-high">종합 ${s.score}</span>
            </div>
          </a>
        </article>`;
      })
      .join("");
    hydrateDailyCharts(list);
  }

  let dailyChartTimer = null;
  function hydrateDailyCharts(list) {
    if (!window.ThemeDailyBars) return;
    clearTimeout(dailyChartTimer);
    dailyChartTimer = setTimeout(async () => {
      const batch = list.slice(0, 40);
      await Promise.all(batch.map(async (s) => {
        const el = stockList.querySelector(`.mini-candles[data-code="${CSS.escape(s.code)}"]`);
        if (!el) return;
        const bars = await ThemeDailyBars.load(s, state.prices[s.code], 12);
        el.innerHTML = ThemeDailyBars.svg(bars, 300, 56);
      }));
    }, 60);
  }

  function scheduleRenderStocks() {
    clearTimeout(stockRenderTimer);
    stockRenderTimer = setTimeout(renderStocks, 350);
  }

  function chgColor(chg) {
    if (chg == null) return "rgba(148,163,184,0.6)";
    if (chg > 0) return "rgba(248,113,113,0.85)";
    if (chg < 0) return "rgba(96,165,250,0.85)";
    return "rgba(148,163,184,0.6)";
  }

  function setChartVisibility() {
    const grid = document.getElementById("chartGrid");
    if (!grid) return;
    grid.querySelectorAll(".chart-panel").forEach((p) => {
      const id = p.querySelector("canvas")?.id || "";
      let show = true;
      if (state.chartView === "score") show = ["scatterChart", "barChart", "riskChart"].includes(id);
      if (state.chartView === "momentum") show = ["chgChart", "themeMomentumChart", "themeChart"].includes(id);
      p.style.display = show ? "" : "none";
    });
  }

  function destroyChart(key) {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  }

  function chartList() {
    return data.stocks.slice();
  }

  function getChgSorted(list) {
    const withChg = list
      .map((s) => ({ s, chg: getChg(s.code) }))
      .filter((x) => x.chg != null)
      .sort((a, b) => b.chg - a.chg)
      .slice(0, 10);
    if (withChg.length) return withChg;
    return list
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((s) => ({ s, chg: 0 }));
  }

  function hasLiveChg() {
    return data.stocks.some((s) => {
      const p = state.prices[s.code];
      return p && (p.changeRate != null || p.change != null);
    });
  }

  function getThemeMomentum() {
    const live = hasLiveChg();
    return data.themes.map((t) => {
      const avg = themeAvgChg(t.id);
      const display = live && avg != null ? avg : (t.heat - 70) * 0.12;
      return {
        name: t.name,
        emoji: t.emoji,
        avg: display,
        heat: t.heat,
        live,
      };
    }).sort((a, b) => {
      if (a.avg !== b.avg) return b.avg - a.avg;
      return b.heat - a.heat;
    });
  }

  function buildScatterData(list) {
    return list.map((s) => {
      const chg = getChg(s.code) ?? 0;
      return { x: s.risk, y: s.growth, r: Math.max(4, s.score / 12), name: s.name, chg };
    });
  }

  function initCharts() {
    if (chartsReady || typeof Chart === "undefined") return false;
    const list = chartList();
    if (!list.length) return false;
    const top = list.slice().sort((a, b) => b.score - a.score).slice(0, 8);
    const text = "#94a3b8";
    const grid = "rgba(148,163,184,.1)";

    try {
    destroyChart("scatter");
    charts.scatter = new Chart(document.getElementById("scatterChart"), {
      type: "bubble",
      data: {
        datasets: [{
          label: "종목",
          data: buildScatterData(list),
          backgroundColor: list.map((s) => chgColor(getChg(s.code))),
          borderColor: "#2dd4bf",
          borderWidth: 1,
        }],
      },
      options: {
        ...chartDefaults,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => `${c.raw.name}: 위험 ${c.raw.x} / 성장 ${c.raw.y} / ${fmtChg(c.raw.chg)}`,
            },
          },
        },
        scales: {
          x: { title: { display: true, text: "위험도 →", color: text }, min: 30, max: 100, ticks: { color: text }, grid: { color: grid } },
          y: { title: { display: true, text: "성장 →", color: text }, min: 50, max: 100, ticks: { color: text }, grid: { color: grid } },
        },
      },
    });

    const chgSorted = getChgSorted(list);
    destroyChart("chg");
    charts.chg = new Chart(document.getElementById("chgChart"), {
      type: "bar",
      data: {
        labels: chgSorted.map((x) => x.s.name),
        datasets: [{
          data: chgSorted.map((x) => x.chg),
          backgroundColor: chgSorted.map((x) => chgColor(x.chg)),
          borderRadius: 8,
        }],
      },
      options: {
        ...chartDefaults,
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: text, callback: (v) => v + "%" }, grid: { color: grid } },
          y: { ticks: { color: text, font: { size: 10 } }, grid: { display: false } },
        },
      },
    });

    destroyChart("bar");
    charts.bar = new Chart(document.getElementById("barChart"), {
      type: "bar",
      data: {
        labels: top.map((s) => s.name),
        datasets: [{
          label: "종합점수",
          data: top.map((s) => s.score),
          backgroundColor: "rgba(20,184,166,.75)",
          borderRadius: 8,
        }],
      },
      options: {
        ...chartDefaults,
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: text }, grid: { color: grid }, max: 100 },
          y: { ticks: { color: text, font: { size: 10 } }, grid: { display: false } },
        },
      },
    });

    const themeMomentum = getThemeMomentum();
    destroyChart("themeMomentum");
    charts.themeMomentum = new Chart(document.getElementById("themeMomentumChart"), {
      type: "bar",
      data: {
        labels: themeMomentum.map((t) => t.emoji + " " + t.name),
        datasets: [{
          data: themeMomentum.map((t) => t.avg),
          backgroundColor: themeMomentum.map((t) => chgColor(t.avg)),
          borderRadius: 8,
        }],
      },
      options: {
        ...chartDefaults,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: text, font: { size: 9 }, maxRotation: 45 }, grid: { display: false } },
          y: { ticks: { color: text, callback: (v) => v + "%" }, grid: { color: grid } },
        },
      },
    });

    destroyChart("theme");
    charts.theme = new Chart(document.getElementById("themeChart"), {
      type: "doughnut",
      data: {
        labels: data.themes.map((t) => t.name),
        datasets: [{
          data: data.themes.map((t) => t.heat),
          backgroundColor: ["#14b8a6", "#0ea5e9", "#f59e0b", "#f87171", "#a78bfa", "#34d399", "#38bdf8", "#fb7185", "#fbbf24", "#2dd4bf", "#818cf8", "#22d3ee"],
        }],
      },
      options: {
        ...chartDefaults,
        plugins: { legend: { position: "bottom", labels: { color: text, boxWidth: 10, font: { size: 9 } } } },
      },
    });

    const bins = { 낮음: 0, 보통: 0, 높음: 0 };
    list.forEach((s) => { bins[s.riskLabel] = (bins[s.riskLabel] || 0) + 1; });
    destroyChart("risk");
    charts.risk = new Chart(document.getElementById("riskChart"), {
      type: "polarArea",
      data: {
        labels: Object.keys(bins),
        datasets: [{
          data: Object.values(bins),
          backgroundColor: ["rgba(52,211,153,.55)", "rgba(245,158,11,.55)", "rgba(248,113,113,.55)"],
        }],
      },
      options: {
        ...chartDefaults,
        plugins: { legend: { labels: { color: text } } },
        scales: { r: { ticks: { display: false }, grid: { color: grid } } },
      },
    });

    chartsReady = true;
    setChartVisibility();
    Object.values(charts).forEach((c) => { if (c) c.resize(); });
    return true;
    } catch (err) {
      console.warn("chart init", err);
      chartsReady = false;
      return false;
    }
  }

  function updateCharts() {
    if (!chartsReady) {
      initCharts();
      return;
    }
    const list = chartList();
    const top = list.slice().sort((a, b) => b.score - a.score).slice(0, 8);

    if (charts.scatter) {
      charts.scatter.data.datasets[0].data = buildScatterData(list.slice(0, 80));
      charts.scatter.data.datasets[0].backgroundColor = list.slice(0, 80).map((s) => chgColor(getChg(s.code)));
      charts.scatter.update("none");
    }

    const chgSorted = getChgSorted(list);
    if (charts.chg) {
      charts.chg.data.labels = chgSorted.map((x) => x.s.name);
      charts.chg.data.datasets[0].data = chgSorted.map((x) => x.chg);
      charts.chg.data.datasets[0].backgroundColor = chgSorted.map((x) => chgColor(x.chg));
      charts.chg.update("none");
    }

    if (charts.bar) {
      charts.bar.data.labels = top.map((s) => s.name);
      charts.bar.data.datasets[0].data = top.map((s) => s.score);
      charts.bar.update("none");
    }

    const themeMomentum = getThemeMomentum();
    if (charts.themeMomentum) {
      charts.themeMomentum.data.labels = themeMomentum.map((t) => t.emoji + " " + t.name);
      charts.themeMomentum.data.datasets[0].data = themeMomentum.map((t) => t.avg);
      charts.themeMomentum.data.datasets[0].backgroundColor = themeMomentum.map((t) => chgColor(t.avg));
      charts.themeMomentum.update("none");
    }

    const bins = { 낮음: 0, 보통: 0, 높음: 0 };
    list.forEach((s) => { bins[s.riskLabel] = (bins[s.riskLabel] || 0) + 1; });
    if (charts.risk) {
      charts.risk.data.datasets[0].data = Object.values(bins);
      charts.risk.update("none");
    }

    setChartVisibility();
  }

  function scheduleChartUpdate(immediate) {
    clearTimeout(chartUpdateTimer);
    if (immediate) {
      updateCharts();
      return;
    }
    chartUpdateTimer = setTimeout(updateCharts, 300);
  }

  function waitForCharts(cb) {
    if (typeof Chart !== "undefined") cb();
    else setTimeout(() => waitForCharts(cb), 40);
  }

  function bootCharts() {
    waitForCharts(() => {
      if (!initCharts()) setTimeout(bootCharts, 200);
    });
  }

  window.addEventListener("load", () => {
    if (!chartsReady) bootCharts();
    else Object.values(charts).forEach((c) => { if (c) c.resize(); });
  });

  function schedulePriceUI(immediate) {
    clearTimeout(uiUpdateTimer);
    const run = () => {
      const list = filtered();
      patchThemeChg();
      renderMovers();
      renderStocks();
      scheduleChartUpdate(false);
      renderWatchlist();
      renderStats(list);
    };
    if (immediate) {
      run();
      return;
    }
    uiUpdateTimer = setTimeout(run, 600);
  }

  function onPricePayload({ prices, updatedAt, error, syncing, partial }) {
    if (prices && typeof prices === "object") {
      state.prices = { ...state.prices, ...prices };
      if (Object.keys(state.prices).length) pricesLoaded = true;
    }
    priceSyncing = !!syncing;
    const list = filtered();
    const liveN = list.filter((s) => state.prices[s.code]?.price != null).length;
    setLiveBadge(priceSyncing, liveN, list.length, updatedAt, error);
    if (partial && pricesLoaded) {
      schedulePriceUI(false);
    } else {
      schedulePriceUI(!partial);
    }
  }

  function fetchPrices() {
    ThemeLivePrices.subscribe(onPricePayload);
    ThemeLivePrices.startAuto(data.stocks, REFRESH_MS);
  }

  function bindDelegates() {
    themeGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".theme-card");
      if (!card) return;
      applyThemeFilter(card.dataset.theme, true);
    });
    themeGrid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".theme-card");
      if (!card) return;
      e.preventDefault();
      applyThemeFilter(card.dataset.theme, true);
    });

    stockList.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-watch");
      if (btn) toggleWatch(btn.dataset.id, e);
    });

    document.getElementById("watchList")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-watch");
      if (btn) toggleWatch(btn.dataset.id, e);
    });

    document.getElementById("btnClearTheme")?.addEventListener("click", () => {
      applyThemeFilter("all", false);
    });
  }

  document.getElementById("q").addEventListener("input", (e) => {
    state.q = e.target.value;
    renderStocks();
  });
  document.getElementById("sortBy").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderStocks();
  });
  document.getElementById("riskFilter").addEventListener("change", (e) => {
    state.riskFilter = e.target.value;
    renderStocks();
  });

  document.getElementById("chartTabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".ctab");
    if (!btn) return;
    state.chartView = btn.dataset.view;
    document.querySelectorAll(".ctab").forEach((b) => b.classList.toggle("active", b === btn));
    setChartVisibility();
  });

  bindDelegates();
  renderTodayPick();
  renderWatchlist();
  renderThemes();
  renderStocks();
  renderMovers();
  bootCharts();
  fetchPrices();
})();
