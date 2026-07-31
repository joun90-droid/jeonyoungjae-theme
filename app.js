/* 영재 테마주분석 - home with live prices + charts */
(function () {
  const data = window.THEME_DATA || { themes: [], stocks: [] };
  const state = {
    theme: "all",
    q: "",
    sortBy: "score",
    riskFilter: "all",
    prices: {},
  };
  const charts = {};

  const themeGrid = document.getElementById("themeGrid");
  const stockList = document.getElementById("stockList");

  function themeById(id) {
    return data.themes.find((t) => t.id === id);
  }
  function riskClass(label) {
    if (label === "높음") return "risk-high";
    if (label === "낮음") return "risk-low";
    return "risk-mid";
  }
  function fmtPrice(n, currency) {
    if (n == null || Number.isNaN(n)) return "—";
    if (currency === "USD") return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  function chgClass(n) {
    if (n == null) return "flat";
    if (n > 0) return "up";
    if (n < 0) return "down";
    return "flat";
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
      if (state.sortBy === "chgDesc") {
        const ca = state.prices[a.code]?.changeRate ?? -999;
        const cb = state.prices[b.code]?.changeRate ?? -999;
        return cb - ca;
      }
      return b.score - a.score;
    });
    return list;
  }

  function renderStats(list) {
    const avg = (key) =>
      list.length ? Math.round(list.reduce((a, b) => a + b[key], 0) / list.length) : 0;
    const liveN = list.filter((s) => state.prices[s.code]?.price != null).length;
    document.getElementById("statThemes").textContent = String(data.themes.length);
    document.getElementById("statStocks").textContent = String(list.length);
    document.getElementById("statRisk").textContent = list.length ? avg("risk") + "점" : "-";
    document.getElementById("statLive").textContent = list.length ? `${liveN}/${list.length}` : "-";
  }

  function renderThemes() {
    const allCard = `
      <article class="theme-card ${state.theme === "all" ? "active" : ""}" data-theme="all">
        <div class="theme-top"><div><div class="theme-name">전체 테마</div>
        <div class="theme-meta"><span class="pill hot">ALL</span><span class="pill">${data.stocks.length}종목</span></div></div>
        <div class="theme-emoji">📊</div></div>
        <p>모든 테마 추천 종목을 실시간 시세와 함께 비교합니다.</p>
        <div class="heat"><span style="width:100%"></span></div>
      </article>`;
    themeGrid.innerHTML =
      allCard +
      data.themes
        .map((t) => {
          const count = data.stocks.filter((s) => s.theme === t.id).length;
          return `
          <article class="theme-card ${state.theme === t.id ? "active" : ""}" data-theme="${t.id}">
            <div class="theme-top"><div><div class="theme-name">${t.name}</div>
            <div class="theme-meta"><span class="pill hot">히트 ${t.heat}</span><span class="pill">${count}종목</span></div></div>
            <div class="theme-emoji">${t.emoji}</div></div>
            <p>${t.summary}</p>
            <p class="theme-path">${t.sectorPath}</p>
            <div class="heat"><span style="width:${t.heat}%"></span></div>
          </article>`;
        })
        .join("");
    themeGrid.querySelectorAll(".theme-card").forEach((el) => {
      el.addEventListener("click", () => {
        state.theme = el.dataset.theme;
        renderThemes();
        renderStocks();
        renderCharts();
        document.getElementById("stocks").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderStocks() {
    const list = filtered();
    renderStats(list);
    if (!list.length) {
      stockList.innerHTML = '<div class="empty">조건에 맞는 종목이 없습니다.</div>';
      return;
    }
    stockList.innerHTML = list
      .map((s, idx) => {
        const theme = themeById(s.theme);
        const p = state.prices[s.code] || {};
        const chg = p.changeRate;
        const cur = p.currency || s.currency || "KRW";
        const shownCode = s.displayCode || s.code;
        return `
        <article class="card" data-id="${s.id}">
          <div class="rank">${idx + 1}</div>
          <div>
            <div class="card-head">
              <div>
                <h4>${s.name}</h4>
                <div class="code">${s.market} · ${shownCode} · ${theme ? theme.name : ""} · ${s.role}</div>
              </div>
              <div class="price-box">
                <div class="score">${fmtPrice(p.price, cur)}<span class="won">${priceUnit(cur)}</span></div>
                <div class="chg ${chgClass(chg)}">${fmtChg(chg)}</div>
              </div>
            </div>
            <p class="thesis">${s.thesis}</p>
            <p class="logic-preview">${s.logic}</p>
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
              <span class="tag growth-high">성장 ${s.growthLabel}</span>
              <span class="tag">종합 ${s.score}</span>
            </div>
          </div>
        </article>`;
      })
      .join("");
    stockList.querySelectorAll(".card").forEach((el) => {
      el.addEventListener("click", () => {
        location.href = `detail.html?id=${encodeURIComponent(el.dataset.id)}`;
      });
    });
  }

  function destroyChart(key) {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  }

  function renderCharts() {
    if (typeof Chart === "undefined") {
      setTimeout(renderCharts, 120);
      return;
    }
    const list = filtered();
    const top = list.slice(0, 8);
    const text = "#94a3b8";
    const grid = "rgba(148,163,184,.12)";

    destroyChart("scatter");
    charts.scatter = new Chart(document.getElementById("scatterChart"), {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "종목",
            data: list.map((s) => ({ x: s.risk, y: s.growth, name: s.name })),
            backgroundColor: "rgba(45,212,191,.75)",
            borderColor: "#2dd4bf",
            pointRadius: 5,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => `${c.raw.name}: 위험 ${c.raw.x} / 성장 ${c.raw.y}`,
            },
          },
        },
        scales: {
          x: { title: { display: true, text: "위험도 →", color: text }, min: 30, max: 100, ticks: { color: text }, grid: { color: grid } },
          y: { title: { display: true, text: "성장가능성 →", color: text }, min: 50, max: 100, ticks: { color: text }, grid: { color: grid } },
        },
      },
    });

    destroyChart("bar");
    charts.bar = new Chart(document.getElementById("barChart"), {
      type: "bar",
      data: {
        labels: top.map((s) => s.name),
        datasets: [
          {
            label: "종합점수",
            data: top.map((s) => s.score),
            backgroundColor: "rgba(20,184,166,.75)",
            borderRadius: 8,
          },
        ],
      },
      options: {
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: text }, grid: { color: grid }, max: 100 },
          y: { ticks: { color: text }, grid: { display: false } },
        },
      },
    });

    destroyChart("theme");
    const themeVals = data.themes.map((t) => t.heat);
    charts.theme = new Chart(document.getElementById("themeChart"), {
      type: "doughnut",
      data: {
        labels: data.themes.map((t) => t.name),
        datasets: [
          {
            data: themeVals,
            backgroundColor: [
              "#14b8a6", "#0ea5e9", "#f59e0b", "#f87171", "#a78bfa",
              "#34d399", "#38bdf8", "#fb7185", "#fbbf24", "#2dd4bf",
              "#818cf8", "#22d3ee",
            ],
          },
        ],
      },
      options: {
        plugins: { legend: { position: "bottom", labels: { color: text, boxWidth: 10, font: { size: 10 } } } },
      },
    });

    destroyChart("risk");
    const bins = { 낮음: 0, 보통: 0, 높음: 0 };
    list.forEach((s) => {
      bins[s.riskLabel] = (bins[s.riskLabel] || 0) + 1;
    });
    charts.risk = new Chart(document.getElementById("riskChart"), {
      type: "polarArea",
      data: {
        labels: Object.keys(bins),
        datasets: [
          {
            data: Object.values(bins),
            backgroundColor: [
              "rgba(52,211,153,.55)",
              "rgba(245,158,11,.55)",
              "rgba(248,113,113,.55)",
            ],
          },
        ],
      },
      options: {
        plugins: { legend: { labels: { color: text } } },
        scales: { r: { ticks: { display: false }, grid: { color: grid } } },
      },
    });
  }

  function fetchPrices() {
    fetch("/api/prices", { credentials: "omit" })
      .then((r) => r.json())
      .then((payload) => {
        state.prices = payload.prices || {};
        const n = Object.keys(state.prices).length;
        const t = (payload.updatedAt || "").slice(11, 19);
        document.getElementById("liveBadge").textContent = n
          ? `실시간 ${t || ""}`.trim()
          : "시세 대기";
        renderStocks();
      })
      .catch(() => {
        document.getElementById("liveBadge").textContent = "시세 연결 실패";
      });
  }

  document.getElementById("q").addEventListener("input", (e) => {
    state.q = e.target.value;
    renderStocks();
    renderCharts();
  });
  document.getElementById("sortBy").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderStocks();
  });
  document.getElementById("riskFilter").addEventListener("change", (e) => {
    state.riskFilter = e.target.value;
    renderStocks();
    renderCharts();
  });

  renderThemes();
  renderStocks();
  renderCharts();
  fetchPrices();
  setInterval(fetchPrices, 15000);
})();
