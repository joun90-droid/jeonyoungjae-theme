/* 네이버 증권 기준 실시간 시세 — Firebase Hosting 정적 배포용 (브라우저 직접 연동) */
window.ThemeLivePrices = (function () {
  const NAVER_KR = "https://polling.finance.naver.com/api/realtime/domestic/stock/";
  const NAVER_US = "https://api.stock.naver.com/stock/";
  const DEFAULT_MS = 20000;
  const REFRESH_MS = DEFAULT_MS;

  function isKr(stock) {
    const market = String(stock.market || "").toUpperCase();
    const code = String(stock.code || "");
    if (["NASDAQ", "NYSE", "US", "AMEX"].includes(market)) return false;
    if (["KOSPI", "KOSDAQ", "KR"].includes(market)) return true;
    return /^\d+$/.test(code);
  }

  function parseKr(json) {
    const out = {};
    (json.datas || []).forEach((row) => {
      const code = row.itemCode;
      if (!code) return;
      let changeRate = parseFloat(row.fluctuationsRatio);
      if (Number.isNaN(changeRate)) changeRate = null;
      if (row.compareToPreviousPrice?.code === "5" && changeRate != null) changeRate = -changeRate;
      const price = parseInt(String(row.closePrice || "").replace(/,/g, ""), 10);
      const change = parseInt(String(row.compareToPreviousClosePrice || "").replace(/,/g, ""), 10);
      if (changeRate == null && Number.isFinite(price) && Number.isFinite(change) && price - change !== 0) {
        changeRate = (change / (price - change)) * 100;
        if (row.compareToPreviousPrice?.code === "5") changeRate = -Math.abs(changeRate);
      }
      out[code] = {
        code,
        name: row.stockName || "",
        price: Number.isFinite(price) ? price : null,
        change: Number.isFinite(change) ? change : null,
        changeRate,
        currency: "KRW",
        status: row.marketStatus || "",
        liveAt: row.localTradedAt || new Date().toISOString(),
      };
    });
    return out;
  }

  async function fetchKrCodes(codes) {
    const out = {};
    const uniq = [...new Set(codes.filter(Boolean))];
    const chunks = [];
    for (let i = 0; i < uniq.length; i += 40) {
      chunks.push(uniq.slice(i, i + 40));
    }
    await Promise.all(chunks.map(async (chunk) => {
      try {
        const res = await fetch(NAVER_KR + chunk.join(","), {
          cache: "no-store",
          headers: { Referer: "https://finance.naver.com/" },
        });
        if (!res.ok) return;
        Object.assign(out, parseKr(await res.json()));
      } catch (_) {
        /* batch skip */
      }
    }));
    return out;
  }

  async function fetchUsOne(stock) {
    const code = stock.code;
    const candidates = [stock.symbol || code];
    const sym = candidates[0];
    if (sym && !sym.includes(".")) {
      candidates.push(sym + ".O", sym + ".N");
    } else if (sym && (sym.endsWith(".O") || sym.endsWith(".N"))) {
      candidates.push(sym.slice(0, -2));
    }
    for (const s of [...new Set(candidates)]) {
      try {
        const res = await fetch(NAVER_US + encodeURIComponent(s) + "/basic", {
          cache: "no-store",
          headers: { Referer: "https://m.stock.naver.com/" },
        });
        if (!res.ok) continue;
        const d = await res.json();
        const price = parseFloat(String(d.closePrice || "").replace(/,/g, ""));
        const cmp = parseFloat(String(d.compareToPreviousClosePrice || "").replace(/,/g, ""));
        let changeRate = parseFloat(d.fluctuationsRatio);
        if (Number.isNaN(changeRate)) changeRate = null;
        if (changeRate == null && Number.isFinite(price) && Number.isFinite(cmp) && price - cmp !== 0) {
          changeRate = (cmp / (price - cmp)) * 100;
        }
        return {
          code,
          symbol: d.reutersCode || s,
          name: d.stockName || stock.name || "",
          price: Number.isFinite(price) ? Math.round(price * 100) / 100 : null,
          change: Number.isFinite(cmp) ? cmp : null,
          changeRate,
          currency: "USD",
          status: d.marketStatus || "",
          liveAt: d.localTradedAt || new Date().toISOString(),
        };
      } catch (_) {
        continue;
      }
    }
    return null;
  }

  async function fetchUsBatch(stocks) {
    const out = {};
    const uniq = [...new Map(stocks.map((s) => [s.code, s])).values()];
    const workers = 16;
    let idx = 0;
    async function worker() {
      while (idx < uniq.length) {
        const i = idx++;
        const row = await fetchUsOne(uniq[i]);
        if (row) out[uniq[i].code] = row;
      }
    }
    await Promise.all(Array.from({ length: Math.min(workers, uniq.length || 1) }, worker));
    return out;
  }

  async function fetchAll(stocks, onPartial) {
    const list = stocks || [];
    const kr = list.filter(isKr);
    const us = list.filter((s) => !isKr(s));
    const prices = {};
    const krPrices = await fetchKrCodes(kr.map((s) => s.code));
    Object.assign(prices, krPrices);
    if (onPartial && Object.keys(krPrices).length) {
      onPartial({
        success: true,
        updatedAt: new Date().toISOString(),
        count: Object.keys(prices).length,
        prices: { ...prices },
        partial: true,
        phase: "kr",
      });
    }
    Object.assign(prices, await fetchUsBatch(us));
    return {
      success: true,
      updatedAt: new Date().toISOString(),
      count: Object.keys(prices).length,
      prices,
      partial: false,
    };
  }

  let timer = null;
  let subscribers = [];
  let lastPayload = { prices: {}, updatedAt: null, error: null, syncing: false, partial: false };
  let runningStocks = [];
  let loadedOnce = false;

  function notify() {
    subscribers.forEach((cb) => {
      try {
        cb(lastPayload);
      } catch (_) {
        /* noop */
      }
    });
  }

  function subscribe(cb) {
    subscribers.push(cb);
    cb(lastPayload);
    return () => {
      subscribers = subscribers.filter((fn) => fn !== cb);
    };
  }

  async function refresh(stocks) {
    const target = stocks || runningStocks;
    const firstLoad = !loadedOnce;
    if (firstLoad) {
      lastPayload = { ...lastPayload, syncing: true, partial: false };
      notify();
    }
    try {
      const payload = await fetchAll(target, firstLoad ? (partial) => {
        lastPayload = {
          ...partial,
          prices: { ...lastPayload.prices, ...partial.prices },
          error: null,
          syncing: true,
          partial: true,
        };
        notify();
      } : null);
      loadedOnce = true;
      lastPayload = {
        ...payload,
        prices: { ...lastPayload.prices, ...payload.prices },
        error: null,
        syncing: false,
        partial: false,
      };
      notify();
      return lastPayload;
    } catch (err) {
      lastPayload = { ...lastPayload, error: err.message || "fetch failed", syncing: false, partial: false };
      notify();
      throw err;
    }
  }

  function startAuto(stocks, intervalMs) {
    runningStocks = stocks || runningStocks;
    stopAuto();
    refresh(runningStocks).catch(() => {});
    timer = setInterval(() => refresh(runningStocks).catch(() => {}), intervalMs || DEFAULT_MS);
  }

  function stopAuto() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { fetchAll, refresh, subscribe, startAuto, stopAuto, REFRESH_MS, get last() { return lastPayload; } };
})();
