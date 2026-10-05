// 手機觸控：鎖住整個頁面，避免拖曳地圖、雙指縮放、旋轉螢幕時整頁被捲動、放大或回彈而「亂跑」。
// ・頁面本身不捲動、不縮放；只有面板、聊天、清單等可捲動區塊能在內部上下捲。
// ・旋轉（直屏 ↔ 橫屏）後把頁面歸位並重算地圖尺寸，地圖中心保持不變。
// ・支援的瀏覽器（Android Chrome 等）可在「設定」頁鎖定目前的螢幕方向（需進入全螢幕；iOS Safari 不支援）。
'use strict';

var Mobile = (function () {
  // 可在內部捲動的區塊；其餘地方的觸控移動一律不讓瀏覽器捲頁
  const SCROLLABLE = '.win-body, #chatlog, #teampanel, #menubar, #tilepop, #start, .hist-list, .hero-list, .picker, .rep-list, .rep-detail, .hdetail, .blog, #quest-mini';

  function canScroll(el) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (!n.matches || !n.matches(SCROLLABLE)) continue;
      const s = getComputedStyle(n);
      if ((/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) ||
          (/(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 1)) return true;
    }
    return false;
  }

  function resetPage() {
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  let rotTimer = 0;
  function onRotate() {
    // 旋轉動畫結束、網址列收合後尺寸才穩定，分兩次校正
    clearTimeout(rotTimer);
    const fix = () => {
      resetPage();
      if (typeof Render !== 'undefined' && Render.resize) Render.resize();
      const pop = document.getElementById('tilepop');
      if (pop && !pop.classList.contains('hidden') && typeof UI !== 'undefined' && UI.closeTile) UI.closeTile();
    };
    fix();
    rotTimer = setTimeout(fix, 350);
  }

  function init() {
    const opt = { passive: false };
    // iOS Safari 會忽略 user-scalable=no：擋掉雙指縮放手勢
    for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, e => e.preventDefault(), opt);
    // 多指觸控一律不讓瀏覽器縮放；單指只允許在可捲動區塊內捲動（擋掉整頁捲動與橡皮筋回彈）
    // 手指輕微晃動（點按時很常見）不要擋，否則按鈕的點擊會被吃掉
    let t0 = null;
    document.addEventListener('touchstart', e => { t0 = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (e.touches.length > 1) { e.preventDefault(); return; }
      if (canScroll(e.target)) return;
      if (t0 && Math.hypot(e.touches[0].clientX - t0.x, e.touches[0].clientY - t0.y) < 12) return;
      e.preventDefault();
    }, opt);
    // 不再攔截「快速連點」：頁面已設 touch-action 禁止雙擊放大，攔截只會讓連續點按鈕（例如加點 +1、強化戰法）被吃掉
    window.addEventListener('orientationchange', onRotate);
    if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', onRotate);
    window.addEventListener('resize', onRotate);
    window.addEventListener('scroll', resetPage);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { if (window.visualViewport.scale <= 1.01) resetPage(); });
    // 收起輸入法後頁面可能停在推高的位置
    document.addEventListener('focusout', e => { if (e.target.matches && e.target.matches('input, select, textarea')) setTimeout(resetPage, 60); });
  }

  // ===== 鎖定螢幕方向（需瀏覽器支援 Screen Orientation API 與全螢幕）=====
  const canLock = !!(screen.orientation && screen.orientation.lock) && !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  let locked = null;
  function curType() {
    const t = screen.orientation && screen.orientation.type;
    if (t) return t.startsWith('portrait') ? 'portrait' : 'landscape';
    return innerHeight >= innerWidth ? 'portrait' : 'landscape';
  }
  async function lock(type) {
    if (!canLock) return false;
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) await (el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen());
      await screen.orientation.lock(type || curType());
      locked = type || curType();
      return true;
    } catch (e) { console.warn('orientation lock failed', e); return false; }
  }
  function unlock() {
    locked = null;
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* */ }
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) { /* */ }
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) locked = null; });

  init();
  return { canLock, lock, unlock, get locked() { return locked; }, curType };
})();
