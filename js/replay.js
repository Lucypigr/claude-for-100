// 戰鬥回放：依戰報的結構化事件逐步重現戰鬥（行動者、目標、戰法、傷害/治療、狀態、陣亡）
'use strict';

var Replay = (function () {
  const E = U.esc;
  const SLOT = ['大營', '中軍', '前鋒'];
  const DELAY = { round: 1000, cast: 750, prep: 650, dmg: 560, heal: 560, buff: 420, st: 480, ev: 480, ctl: 560, dead: 650, end: 1200 };
  let rep = null, bt = null, units = null, steps = null, pos = -1, timer = 0, playing = false, speed = 1, el = null;

  function artOf(name, size) {
    const t = typeof HERO_BY_NAME !== 'undefined' ? HERO_BY_NAME[name] : null;
    return t && t.icon && typeof CardArt !== 'undefined' && CardArt.on ? CardArt.url(t.icon, size) : '';
  }

  // 由事件序列重建第 i 步之後的狀態（可倒退、跳轉）
  function stateAt(i) {
    const s = {};
    for (const k in units) s[k] = { n: units[k].start, dead: false, sts: [], prep: '' };
    let round = -1;
    for (let j = 0; j <= i && j < steps.length; j++) {
      const e = steps[j].e;
      if (e.k === 'round') {
        round = e.r;
        if (e.r >= 2) for (const k in s) s[k].sts = s[k].sts.filter(x => x.left >= 99 || --x.left > 0);
      } else if ((e.k === 'dmg' || e.k === 'heal') && s[e.d]) {
        s[e.d].n = e.n;
        if (e.n > 0) s[e.d].dead = false;
      } else if (e.k === 'dead' && s[e.d]) {
        s[e.d].dead = true; s[e.d].n = 0; s[e.d].sts = [];
      } else if ((e.k === 'st' || e.k === 'buff') && s[e.d]) {
        const list = s[e.d].sts.filter(x => x.s !== e.s);
        const bad = e.k === 'st' ? (e.ctl || e.bad) : !e.up;
        list.push({ s: e.s, left: e.dur || 1, bad: bad ? 1 : 0, ctl: e.ctl ? 1 : 0 });
        s[e.d].sts = list;
      } else if (e.k === 'prep' && s[e.a]) {
        s[e.a].prep = e.s;
      } else if (e.k === 'cast' && s[e.a] && s[e.a].prep === e.s) {
        s[e.a].prep = '';
      }
    }
    return { s, round };
  }

  function open(report, battleIdx) {
    rep = report; bt = report.battles[battleIdx];
    units = {};
    for (const u of bt.A) units[u.slot] = Object.assign({ side: 0 }, u);
    for (const u of bt.D) units[3 + u.slot] = Object.assign({ side: 1 }, u);
    steps = [];
    bt.log.forEach((l, i) => { if (l.e) steps.push({ e: l.e, t: l.t, c: l.c, li: i }); });
    pos = -1; speed = speed || 1;
    if (!el) {
      el = document.createElement('div');
      el.id = 'replay';
      el.addEventListener('click', onClick);
      document.body.appendChild(el);
    }
    el.classList.remove('hidden');
    build();
    render(false);
    play();
  }
  function close() {
    stop();
    if (el) el.classList.add('hidden');
  }

  function card(k) {
    const u = units[k];
    if (!u) return '<div class="rp-card empty"></div>';
    const col = (typeof FACTION_COLOR !== 'undefined' && FACTION_COLOR[u.faction]) || '#6d6177';
    const art = artOf(u.name, 'medium');
    return '<div class="rp-card" data-k="' + k + '" style="--fc:' + col + '">' +
      '<div class="rp-slot">' + SLOT[u.slot] + '</div>' +
      // 卡圖載入失敗時退回文字卡面
      '<div class="rp-face"><span>' + E(u.name.slice(0, 1)) + '</span>' + (art ? '<img src="' + art + '" alt="" onerror="this.remove()">' : '') + '</div>' +
      '<div class="rp-name">' + E(u.name) + '<small>Lv' + u.lv + ' ' + E(u.troop || '') + '</small></div>' +
      '<div class="rp-bar"><i></i></div><div class="rp-num"></div>' +
      '<div class="rp-sts"></div><div class="rp-prep"></div><div class="rp-fx"></div></div>';
  }
  function build() {
    const left = [0, 1, 2].map(card).join('');         // 我方：大營 中軍 前鋒（前鋒靠中間）
    const right = [5, 4, 3].map(card).join('');        // 敵方：前鋒 中軍 大營
    const wn = bt.winner === 'atk' ? '進攻方勝' : bt.winner === 'def' ? '防守方勝' : '平局';
    el.innerHTML = '<div class="rp-box">' +
      '<div class="rp-head"><span>戰鬥回放・' + E(rep.target) + '　<span class="muted">' + E(rep.atkName) + ' vs ' + E(bt.def) + '（' + wn + '）</span></span><button class="x" data-rp="close">✕</button></div>' +
      '<div class="rp-round"></div>' +
      '<div class="rp-field"><div class="rp-side">' + left + '</div><div class="rp-vs">VS</div><div class="rp-side">' + right + '</div></div>' +
      '<div class="rp-caption"></div>' +
      '<div class="rp-ctrl">' +
      '<button class="btn small dark" data-rp="first" title="回到開頭">⏮</button>' +
      '<button class="btn small dark" data-rp="prev">上一步</button>' +
      '<button class="btn small" data-rp="toggle"></button>' +
      '<button class="btn small dark" data-rp="next">下一步</button>' +
      '<button class="btn small dark" data-rp="last" title="跳到結尾">⏭</button>' +
      '<span class="rp-speed">' + [1, 2, 4].map(v => '<button class="btn small dark" data-rp="speed" data-v="' + v + '">' + v + '×</button>').join('') + '</span>' +
      '<span class="muted rp-count"></span></div>' +
      '<div class="rp-log">' + steps.map((st, i) => '<div class="' + st.c + '" data-rp="goto" data-i="' + i + '">' + E(st.t) + '</div>').join('') + '</div>' +
      '</div>';
  }

  function render(animate) {
    const { s, round } = stateAt(pos);
    for (const k in units) {
      const c = el.querySelector('.rp-card[data-k="' + k + '"]');
      if (!c) continue;
      const u = units[k], st = s[k];
      const pct = u.start ? Math.max(0, st.n) / u.start * 100 : 0;
      c.querySelector('.rp-bar i').style.width = pct + '%';
      c.querySelector('.rp-num').textContent = Math.max(0, st.n) + ' / ' + u.start;
      c.classList.toggle('dead', st.dead);
      c.querySelector('.rp-sts').innerHTML = st.sts.map(x => '<span class="' + (x.ctl ? 'ctl' : x.bad ? 'bad' : 'good') + '">' + E(x.s) + (x.left < 99 ? x.left : '') + '</span>').join('');
      c.querySelector('.rp-prep').textContent = st.prep ? '準備【' + st.prep + '】' : '';
      c.classList.remove('act', 'hit');
    }
    el.querySelector('.rp-round').textContent = round < 0 ? '戰鬥開始' : round === 0 ? '準備回合' : '第 ' + round + ' 回合';
    const cur = steps[pos];
    el.querySelector('.rp-caption').innerHTML = cur ? '<span class="' + cur.c + '">' + E(cur.t) + '</span>' : '<span class="muted">按「播放」開始</span>';
    el.querySelector('[data-rp="toggle"]').textContent = playing ? '⏸ 暫停' : (pos >= steps.length - 1 ? '↻ 重播' : '▶ 播放');
    el.querySelectorAll('[data-rp="speed"]').forEach(b => b.classList.toggle('on', +b.dataset.v === speed));
    el.querySelector('.rp-count').textContent = Math.max(0, pos + 1) + ' / ' + steps.length;
    const lines = el.querySelectorAll('.rp-log > div');
    lines.forEach((d, i) => d.classList.toggle('cur', i === pos));
    if (lines[pos]) {
      const box = el.querySelector('.rp-log');
      const top = lines[pos].offsetTop - box.offsetTop;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 24) box.scrollTop = top - box.clientHeight / 2;
    }
    if (cur && animate) fx(cur.e);
    else if (cur) mark(cur.e);
  }
  function cardEl(k) { return el.querySelector('.rp-card[data-k="' + k + '"]'); }
  function mark(e) {
    if (e.a !== undefined && cardEl(e.a)) cardEl(e.a).classList.add('act');
    if (e.d !== undefined && cardEl(e.d) && e.k !== 'round') cardEl(e.d).classList.add('hit');
  }
  function float(k, text, cls) {
    const c = cardEl(k);
    if (!c) return;
    const f = document.createElement('div');
    f.className = 'rp-float ' + cls;
    f.textContent = text;
    c.querySelector('.rp-fx').appendChild(f);
    setTimeout(() => f.remove(), 1400);
  }
  function fx(e) {
    mark(e);
    const d = e.d, a = e.a;
    if (e.k === 'cast') float(a, '【' + e.s + '】', 'sk q' + (e.q || ''));
    else if (e.k === 'prep') float(a, '準備【' + e.s + '】', 'prep');
    else if (e.k === 'dmg') float(d, '-' + e.v, e.dot ? 'dot' : e.t ? 'int' : 'phys');
    else if (e.k === 'heal') float(d, '+' + e.v, 'heal');
    else if (e.k === 'st' || e.k === 'buff') float(d, e.s, e.k === 'st' ? (e.ctl || e.bad ? 'ctl' : 'buff') : (e.up ? 'buff' : 'ctl'));
    else if (e.k === 'ev') float(d, e.s || '規避', 'ev');
    else if (e.k === 'ctl') float(a, e.s, 'ctl');
    else if (e.k === 'dead') float(d, '潰敗', 'dead');
  }

  function step(n) { pos = Math.max(-1, Math.min(steps.length - 1, pos + n)); render(n > 0 && n === 1); }
  function schedule() {
    clearTimeout(timer);
    if (!playing) return;
    if (pos >= steps.length - 1) { playing = false; render(false); return; }
    const wait = pos < 0 ? 400 : (DELAY[steps[pos].e.k] || 500);
    timer = setTimeout(() => { step(1); schedule(); }, wait / speed);
  }
  function play() { if (pos >= steps.length - 1) pos = -1; playing = true; render(false); schedule(); }
  function stop() { playing = false; clearTimeout(timer); }

  function onClick(ev) {
    const t = ev.target.closest('[data-rp]');
    if (!t) { if (ev.target === el) close(); return; }
    const act = t.dataset.rp;
    if (act === 'close') close();
    else if (act === 'toggle') { if (playing) { stop(); render(false); } else play(); }
    else if (act === 'next') { stop(); step(1); }
    else if (act === 'prev') { stop(); step(-1); }
    else if (act === 'first') { stop(); pos = -1; render(false); }
    else if (act === 'last') { stop(); pos = steps.length - 1; render(false); }
    else if (act === 'speed') { speed = +t.dataset.v; render(false); if (playing) schedule(); }
    else if (act === 'goto') { stop(); pos = +t.dataset.i; render(true); }
  }
  document.addEventListener('keydown', e => {
    if (!el || el.classList.contains('hidden')) return;
    // 回放開啟時攔下快捷鍵，避免地圖同時平移或暫停遊戲
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Escape') close();
    else if (e.key === ' ') { if (playing) { stop(); render(false); } else play(); }
    else if (e.key === 'ArrowRight') { stop(); step(1); }
    else if (e.key === 'ArrowLeft') { stop(); step(-1); }
  }, true);

  function canReplay(battle) { return !!(battle && battle.log && battle.log.some(l => l.e)); }
  return { open, close, canReplay };
})();
