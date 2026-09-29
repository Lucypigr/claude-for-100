// 官網卡圖（僅限本機自用）：在本機瀏覽器執行 index.html 時，直接向《率土之濱》官網載入武將卡圖。
// ・卡圖不存進 repo；只有武將資料中的官方 iconId。
// ・只在 file://、localhost 或區網位址啟用；嵌入版 play.html 不引用本檔，不會載入任何卡圖。
// ・可在「設定」頁關閉。
'use strict';

var CardArt = (function () {
  const BASE = 'https://g0.gph.netease.com/ngsocial/community/stzb/cn/cards/cut/';
  const host = location.hostname;
  const local = location.protocol === 'file:' || host === 'localhost' || host === '[::1]' || host === '::1' ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /\.local$/.test(host);
  let off = false;
  try { off = localStorage.getItem('stzb_cardart') === 'off'; } catch (e) { /* */ }
  return {
    available: local,
    get on() { return local && !off; },
    set(v) {
      off = !v;
      try { localStorage.setItem('stzb_cardart', v ? 'on' : 'off'); } catch (e) { /* */ }
    },
    // size: medium（約 240×348 立繪）/ small（80×80 頭像）
    url(icon, size) { return BASE + 'card_' + (size || 'medium') + '_' + icon + '.jpg?gameid=g10'; },
  };
})();
