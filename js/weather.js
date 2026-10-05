// 天氣系統：每州每 6 小時（遊戲時間）換一次天氣，由「賽季種子 + 州 + 時段」決定，不需存檔。
// 季節：賽季 30 天依序為春(1~7 天)、夏(8~15)、秋(16~23)、冬(24~30)；北方多雪、南方多雨霧、西北多風。
// 影響：行軍時間、屯田與產量、弓/騎/遠程與火攻傷害、大霧時進攻無預警（奇襲）。
'use strict';

var Weather = (function () {
  const BLOCK = 360; // 每個天氣時段（分鐘）
  // time: 行軍時間倍率；prod: 資源產量倍率；farm: 能否屯田；fire: 灼燒/恐慌等持續傷害倍率；
  // bow/cav/far: 弓兵/騎兵/攻擊距離 3 以上武將的傷害倍率；ambush: 進攻不會預警
  const TYPES = {
    sunny: { name: '晴', icon: '☀', time: 1, prod: 1, farm: true, fire: 1, bow: 1, cav: 1, far: 1, desc: '天氣晴朗，一切如常' },
    cloudy: { name: '陰', icon: '☁', time: 1, prod: 1, farm: true, fire: 1, bow: 1, cav: 1, far: 1, desc: '天色陰沉，沒有特別影響' },
    rain: { name: '雨', icon: '🌧', time: 1.07, prod: 1, farm: true, fire: 0.7, bow: 0.92, cav: 1, far: 1, desc: '行軍時間 +7%；弓兵傷害 -8%；灼燒類傷害 -30%' },
    storm: { name: '暴雨', icon: '⛈', time: 1.2, prod: 0.9, farm: true, fire: 0.5, bow: 0.85, cav: 0.95, far: 1, desc: '行軍時間 +20%；產量 -10%；弓兵傷害 -15%、騎兵 -5%；灼燒類傷害 -50%' },
    fog: { name: '大霧', icon: '🌫', time: 1, prod: 1, farm: true, fire: 1, bow: 1, cav: 1, far: 0.9, ambush: true, desc: '視野受限：遠程（攻擊距離 3 以上）武將傷害 -10%；進攻不會被對方預警（奇襲的好時機）' },
    wind: { name: '狂風', icon: '🌪', time: 1, prod: 1, farm: true, fire: 1.4, bow: 0.95, cav: 1, far: 1, desc: '風助火勢：灼燒類傷害 +40%；弓兵傷害 -5%' },
    snow: { name: '暴雪', icon: '❄', time: 1.25, prod: 0.6, farm: false, fire: 0.8, bow: 1, cav: 0.92, far: 1, desc: '冬歇：行軍時間 +25%；產量 -40%；無法屯田；騎兵傷害 -8%' },
  };
  const SEASONS = [['春', 0, 7], ['夏', 7, 15], ['秋', 15, 23], ['冬', 23, 99]];
  // 各州氣候：n 北方（冷）、s 南方（濕）、w 多風、m 中原
  const CLIMATE = { 司隸: 'm', 雍州: 'w', 兗州: 'm', 豫州: 'm', 涼州: 'w', 并州: 'n', 冀州: 'n', 幽州: 'n', 青州: 'm', 徐州: 'm', 揚州: 's', 荊州: 's', 益州: 's' };
  // [晴, 陰, 雨, 暴雨, 霧, 風, 雪] 權重
  const W = {
    春: { m: [34, 24, 22, 4, 12, 4, 0], n: [36, 24, 14, 2, 8, 12, 4], s: [22, 22, 28, 8, 18, 2, 0], w: [30, 22, 12, 2, 8, 24, 2] },
    夏: { m: [40, 18, 14, 14, 6, 8, 0], n: [46, 18, 14, 10, 4, 8, 0], s: [30, 14, 18, 24, 10, 4, 0], w: [44, 18, 8, 8, 4, 18, 0] },
    秋: { m: [34, 28, 12, 4, 14, 8, 0], n: [34, 26, 8, 2, 8, 20, 2], s: [24, 26, 16, 6, 22, 6, 0], w: [30, 22, 6, 2, 8, 30, 2] },
    冬: { m: [26, 30, 8, 0, 8, 8, 20], n: [18, 22, 2, 0, 4, 16, 38], s: [28, 34, 18, 0, 14, 2, 4], w: [18, 22, 2, 0, 4, 20, 34] },
  };
  const ORDER = ['sunny', 'cloudy', 'rain', 'storm', 'fog', 'wind', 'snow'];
  let seed = 1;
  function setSeed(s) { seed = (s | 0) || 1; }
  function hash(a, b, c) {
    let x = (a ^ 0x9e3779b9) + Math.imul(b + 1, 0x85ebca6b) + Math.imul(c + 7, 0xc2b2ae35);
    x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
    x = Math.imul(x ^ (x >>> 12), 0x297a2d39);
    return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
  }
  function season(time) {
    const d = Math.floor(time / 1440);
    for (const [n, a, b] of SEASONS) if (d >= a && d < b) return n;
    return '冬';
  }
  // 某州在某時間的天氣代號
  function key(stateName, time) {
    const block = Math.floor(time / BLOCK);
    const clim = CLIMATE[stateName] || 'm';
    const w = W[season(time)][clim];
    const total = w.reduce((s, x) => s + x, 0);
    // 天氣會延續：同一個 24 小時（4 個時段）內，有 40% 的機率沿用上一時段
    const prev = block > 0 && hash(seed, stateName.charCodeAt(0) * 131 + block, 77) < 0.4;
    const b = prev ? block - 1 : block;
    let r = hash(seed, stateName.charCodeAt(0) * 131 + b, 5) * total;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return ORDER[i]; }
    return 'sunny';
  }
  function at(stateName, time) { return TYPES[key(stateName, time)]; }
  return { TYPES, ORDER, BLOCK, setSeed, key, at, season };
})();
