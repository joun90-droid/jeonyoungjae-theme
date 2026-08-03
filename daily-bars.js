/* 네이버 fchart 일봉 + 미국종목 근사 일봉 (SVG) */
window.ThemeDailyBars = (function () {
  const cache = new Map();
  const TTL = 5 * 60 * 1000;
  const pending = new Map();

  function isKr(stock) {
    const market = String(stock.market || "").toUpperCase();
    const code = String(stock.code || "");
    if (["NASDAQ", "NYSE", "US", "AMEX"].includes(market)) return false;
    if (["KOSPI", "KOSDAQ", "KR"].includes(market)) return true;
    return /^\d+$/.test(code);
  }

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) h = (h << 5) - h + str.charCodeAt(i) | 0;
    return Math.abs(h);
  }

  function parseXml(text) {
    const out = [];
    const re = /data="(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|/g;
    let m;
    while ((m = re.exec(text))) {
      out.push({
        date: m[1],
        open: +m[2],
        high: +m[3],
        low: +m[4],
        close: +m[5],
      });
    }
    return out;
  }

  async function fetchKrDaily(code, count) {
    const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${encodeURIComponent(code)}&timeframe=day&count=${count}&requestType=0`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Referer: `https://finance.naver.com/item/fchart.nhn?code=${code}` },
    });
    if (!res.ok) return [];
    return parseXml(await res.text());
  }

  function synthDaily(stock, priceInfo, count) {
    const n = count || 12;
    const seed = hashCode(String(stock.code || stock.id));
    const price = priceInfo?.price;
    const chg = priceInfo?.change ?? 0;

    if (price == null || !Number.isFinite(price)) {
      const base = 100 + (seed % 40);
      return Array.from({ length: n }, (_, i) => {
        const close = base + Math.sin(seed * 0.08 + i) * 3 + i * 0.4;
        const open = close - Math.cos(seed + i);
        return {
          open,
          high: Math.max(open, close) + 1.2,
          low: Math.min(open, close) - 1.2,
          close,
        };
      });
    }

    const prev = price - chg;
    const bars = [];
    let close = prev > 0 ? prev : price * 0.97;
    for (let i = 0; i < n; i += 1) {
      const drift = Math.sin(seed * 0.07 + i * 0.9) * 0.012 + (i === n - 1 ? (price - close) / close : 0);
      const open = close;
      close = Math.max(0.01, open * (1 + drift));
      const wick = Math.abs(Math.cos(seed + i)) * 0.018 + 0.004;
      const high = Math.max(open, close) * (1 + wick);
      const low = Math.min(open, close) * (1 - wick);
      bars.push({ open, high, low, close });
    }
    bars[bars.length - 1].close = price;
    bars[bars.length - 1].high = Math.max(bars[bars.length - 1].high, price);
    bars[bars.length - 1].low = Math.min(bars[bars.length - 1].low, price);
    return bars;
  }

  async function load(stock, priceInfo, count) {
    const key = stock.code || stock.id;
    const hit = cache.get(key);
    const hasPrice = priceInfo?.price != null;
    if (hit && Date.now() - hit.at < TTL && (hit.hadPrice || !hasPrice)) return hit.bars;

    if (pending.has(key)) return pending.get(key);

    const job = (async () => {
      let bars = [];
      try {
        if (isKr(stock) && hasPrice) bars = await fetchKrDaily(stock.code, count || 12);
      } catch (_) {
        bars = [];
      }
      if (!bars.length) bars = synthDaily(stock, priceInfo, count || 12);
      cache.set(key, { bars, at: Date.now(), hadPrice: hasPrice });
      pending.delete(key);
      return bars;
    })();

    pending.set(key, job);
    return job;
  }

  function svg(bars, width, height) {
    const w = width || 280;
    const h = height || 56;
    if (!bars || !bars.length) {
      return `<svg class="candle-svg empty" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-size="10">차트 로딩</text></svg>`;
    }
    const slice = bars.slice(-12);
    const min = Math.min(...slice.map((b) => b.low));
    const max = Math.max(...slice.map((b) => b.high));
    const range = max - min || 1;
    const pad = 3;
    const innerH = h - pad * 2;
    const step = (w - pad * 2) / slice.length;
    const bodyW = Math.max(2, step * 0.55);
    const y = (v) => pad + innerH - ((v - min) / range) * innerH;

    const parts = slice.map((b, i) => {
      const cx = pad + i * step + step / 2;
      const up = b.close >= b.open;
      const col = up ? "#f87171" : "#60a5fa";
      const yHigh = y(b.high);
      const yLow = y(b.low);
      const yOpen = y(b.open);
      const yClose = y(b.close);
      const top = Math.min(yOpen, yClose);
      const bodyH = Math.max(1.2, Math.abs(yClose - yOpen));
      return `<line x1="${cx}" y1="${yHigh}" x2="${cx}" y2="${yLow}" stroke="${col}" stroke-width="1"/><rect x="${cx - bodyW / 2}" y="${top}" width="${bodyW}" height="${bodyH}" fill="${col}" rx="0.5"/>`;
    }).join("");

    return `<svg class="candle-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${parts}</svg>`;
  }

  function placeholder(w, h) {
    return svg([], w, h);
  }

  return { load, svg, placeholder, isKr };
})();
