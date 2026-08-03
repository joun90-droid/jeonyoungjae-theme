/* 영재 테마주분석 - detail with live price + analysis charts */
(function () {
  const data = window.THEME_DATA || { themes: [], stocks: [] };
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const stock = data.stocks.find((s) => s.id === id);
  const charts = {};

  if (!stock) {
    document.getElementById("name").textContent = "종목을 찾을 수 없습니다";
    document.getElementById("thesis").textContent = "홈으로 돌아가 다시 선택해 주세요.";
    return;
  }

  const theme = data.themes.find((t) => t.id === stock.theme);
  document.title = `${stock.name} 재료분석 | 영재 테마주분석`;
  const link = document.createElement("link");
  link.rel = "canonical";
  link.href = `https://jeonyoungjae-theme.web.app/detail.html?id=${stock.id}`;
  document.head.appendChild(link);

  document.getElementById("themeLabel").textContent = theme
    ? `${theme.emoji} ${theme.name}`
    : "THEME";
  document.getElementById("name").textContent = stock.name;
  document.getElementById("thesis").textContent = stock.thesis;
  document.getElementById("sectorView").textContent = stock.sectorView || (theme && theme.sectorPath) || "";
  document.getElementById("logic").textContent = stock.logic || "";
  document.getElementById("tags").innerHTML = `
    <span class="tag">${stock.market} ${stock.displayCode || stock.code}</span>
    <span class="tag">${stock.tag}</span>
    <span class="tag">${stock.role}</span>
    <span class="tag">종합 ${stock.score}점</span>
    <span class="tag">위험 ${stock.riskLabel}</span>
    <span class="tag">성장 ${stock.growthLabel}</span>
  `;

  document.getElementById("kv").innerHTML = `
    <div class="box"><div class="k">종합점수</div><div class="v">${stock.score}</div></div>
    <div class="box"><div class="k">위험도</div><div class="v" style="color:${stock.risk >= 70 ? "#f87171" : stock.risk >= 50 ? "#f59e0b" : "#34d399"}">${stock.risk} · ${stock.riskLabel}</div></div>
    <div class="box"><div class="k">성장가능성</div><div class="v" style="color:#2dd4bf">${stock.growth} · ${stock.growthLabel}</div></div>
    <div class="box"><div class="k">핵심 재료</div><div class="v" style="font-size:1rem">${stock.focus || "-"}</div></div>
  `;

  const impactClass = (v) => (v === "강세" ? "up" : v === "약세" ? "down" : "mid");
  document.getElementById("materials").innerHTML = (stock.materials || [])
    .map(
      (m) => `
      <article class="mat-item rich">
        <div class="impact ${impactClass(m.impact)}">${m.impact}</div>
        <div>
          <strong>${m.title}</strong>
          <p>${m.detail}</p>
          <p class="mat-logic"><b>논리:</b> ${m.logic || ""}</p>
          <p class="mat-watch"><b>관찰:</b> ${m.watch || ""} · <b>시나리오:</b> ${m.scenario || ""}</p>
        </div>
      </article>`
    )
    .join("");

  if (theme) {
    document.getElementById("materials").insertAdjacentHTML(
      "beforeend",
      `<article class="mat-item rich">
        <div class="impact mid">섹터</div>
        <div>
          <strong>${theme.name} 경로 전망</strong>
          <p>${theme.sectorPath}</p>
          <p class="mat-logic"><b>촉매:</b> ${theme.catalysts.join(" · ")}</p>
          <p class="mat-watch"><b>리스크:</b> ${theme.risks.join(" · ")}</p>
        </div>
      </article>`
    );
  }

  document.getElementById("pros").innerHTML = stock.pros
    .map((x) => `<li class="pro">✅ ${x}</li>`)
    .join("");
  document.getElementById("cons").innerHTML = stock.cons
    .map((x) => `<li class="con">⚠ ${x}</li>`)
    .join("");

  const related = data.stocks
    .filter((s) => s.theme === stock.theme && s.id !== stock.id)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  document.getElementById("related").innerHTML = related
    .map(
      (s) => `
      <a class="card" href="detail.html?id=${s.id}">
        <div class="rank">${s.score}</div>
        <div>
          <div class="card-head">
            <div>
              <h4>${s.name}</h4>
              <div class="code">${s.code} · ${s.focus} · 위험 ${s.riskLabel}</div>
            </div>
          </div>
          <p class="thesis">${s.thesis}</p>
        </div>
      </a>`
    )
    .join("");

  function renderCharts() {
    if (typeof Chart === "undefined") {
      setTimeout(renderCharts, 120);
      return;
    }
    const cp = stock.chartProfile || {};
    const labels = ["수요", "공급여력", "정책", "실적가시성", "유동성", "변동성"];
    const values = [
      cp.demand || stock.growth,
      cp.supply || 50,
      cp.policy || 60,
      cp.earnings || stock.score - 10,
      cp.liquidity || 50,
      cp.volatility || stock.risk,
    ];
    const text = "#94a3b8";
    const grid = "rgba(148,163,184,.15)";

    if (charts.radar) charts.radar.destroy();
    charts.radar = new Chart(document.getElementById("radarChart"), {
      type: "radar",
      data: {
        labels,
        datasets: [
          {
            label: stock.name,
            data: values,
            fill: true,
            backgroundColor: "rgba(20,184,166,.25)",
            borderColor: "#2dd4bf",
            pointBackgroundColor: "#2dd4bf",
          },
        ],
      },
      options: {
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { display: false },
            grid: { color: grid },
            angleLines: { color: grid },
            pointLabels: { color: text, font: { size: 11 } },
          },
        },
        plugins: { legend: { display: false } },
      },
    });

    if (charts.score) charts.score.destroy();
    charts.score = new Chart(document.getElementById("scoreChart"), {
      type: "bar",
      data: {
        labels: ["종합", "성장", "위험", "테마히트"],
        datasets: [
          {
            data: [stock.score, stock.growth, stock.risk, theme ? theme.heat : 0],
            backgroundColor: [
              "rgba(45,212,191,.8)",
              "rgba(14,165,233,.8)",
              "rgba(248,113,113,.8)",
              "rgba(245,158,11,.8)",
            ],
            borderRadius: 10,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: text }, grid: { display: false } },
          y: { max: 100, ticks: { color: text }, grid: { color: grid } },
        },
      },
    });
  }

  function applyPrice(payload) {
    const p = (payload.prices || {})[stock.code];
    if (!p) return;
    const cur = p.currency || stock.currency || "KRW";
    if (p.price == null) {
      document.getElementById("livePrice").textContent = "—";
    } else if (cur === "USD") {
      document.getElementById("livePrice").textContent =
        "$" + Number(p.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      document.getElementById("livePrice").textContent =
        Number(p.price).toLocaleString("ko-KR") + "원";
    }
    const chg = p.changeRate;
    const el = document.getElementById("liveChg");
    if (chg == null) {
      el.textContent = "—";
      el.className = "price-chg flat";
    } else {
      el.textContent = `${chg > 0 ? "+" : ""}${Number(chg).toFixed(2)}%`;
      el.className = "price-chg " + (chg > 0 ? "up" : chg < 0 ? "down" : "flat");
    }
    document.getElementById("liveTime").textContent =
      (p.liveAt || payload.updatedAt || "").slice(11, 19) || "—";
  }

  function fetchPrice() {
    ThemeLivePrices.subscribe((payload) => {
      applyPrice(payload);
      if (!payload.prices?.[stock.code]?.price && payload.error) {
        document.getElementById("livePrice").textContent = "재연결 중…";
      }
    });
    ThemeLivePrices.startAuto([stock], ThemeLivePrices.REFRESH_MS || 20000);
  }

  renderCharts();
  fetchPrice();
})();
