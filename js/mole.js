// 쏙쏙 터치: 9개 구멍에서 인형이 쏙 나오면 재빨리 터치! 24번 나오는 동안 몇 개 잡았는지로 등급
// 가끔 폭탄이 나오는데 누르면 2개 감점
const MoleGame = (() => {
  const W = 420, H = 600, TOTAL = 24;
  const TIERS = [['S', 22], ['A', 19], ['B', 15], ['C', 11], ['D', 7]];
  const HOLES = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) HOLES.push([100 + c * 110, 214 + r * 118]);
  const HIT_R = 50;

  let canvas, ctx, els, hooks, machine, loop;
  let state = 'idle', t = 0, time = 0, moles = [], spawned = 0, hits = 0, next = 0, grade = null, pops = [], bombs = 0;

  const progress = () => spawned / TOTAL;
  const bestKey = () => (machine ? machine.id : 'mole');

  function spawn() {
    const busy = new Set(moles.map(m => m.hole));
    const free = HOLES.map((_, i) => i).filter(i => !busy.has(i));
    if (!free.length) return;
    const hole = free[Math.floor(Math.random() * free.length)];
    const bomb = spawned > 2 && Math.random() < 0.16;
    const pool = dollsOf(machine.id);
    const life = 1.05 - 0.5 * progress();
    moles.push({ hole, t: 0, life, bomb, hit: false, doll: pool[Math.floor(Math.random() * pool.length)] });
    if (!bomb) spawned++;
  }

  function finish() {
    state = 'end'; t = 0;
    const tier = TIERS.find(([, n]) => hits >= n);
    grade = tier ? tier[0] : null;
    const best = hooks.best(bestKey(), hits);
    els.extra.textContent = `최고 ${best}개`;
    if (grade) {
      const doll = pickOfGrade(machine.id, grade);
      setTimeout(() => hooks.award(doll, `${TOTAL}개 중 ${hits}개 터치! ${grade}등급`), 500);
    }
    setUI();
  }

  function update(dt) {
    time += dt; t += dt;
    pops = pops.filter(p => (p.t += dt) < 0.6);
    if (state === 'count' && t >= 1.5) { state = 'play'; t = 0; next = 0.3; setUI(); }
    else if (state === 'play') {
      next -= dt;
      if (next <= 0 && spawned < TOTAL) { spawn(); next = 0.78 - 0.33 * progress() + Math.random() * 0.2; }
      for (const m of moles) m.t += dt;
      moles = moles.filter(m => m.t < m.life + (m.hit ? 0.25 : 0));
      if (spawned >= TOTAL && !moles.some(m => !m.bomb)) { moles = []; finish(); }
      setStatus();
    } else if (state === 'end' && t > 2) { state = 'idle'; setUI(); }
  }

  function tap(i) {
    if (state !== 'play') return;
    const m = moles.find(o => o.hole === i && !o.hit && o.t > 0.06);
    if (!m) {
      // 빈 구멍을 누르면 1개 감점 (마구 누르기 방지)
      if (!moles.some(o => o.hole === i)) { hits = Math.max(0, hits - 1); pops.push({ x: HOLES[i][0], y: HOLES[i][1] - 40, txt: '-1', col: '#ff9a9a', t: 0 }); }
      return;
    }
    m.hit = true; m.life = m.t;
    if (m.bomb) {
      bombs++;
      if (bombs === 3) hooks.secret();   // 숨겨진 행동: 한 판에 폭탄 세 번 누르기
      hits = Math.max(0, hits - 2); pops.push({ x: HOLES[i][0], y: HOLES[i][1] - 40, txt: '-2 💥', col: '#ff5c5c', t: 0 }); }
    else { hits++; pops.push({ x: HOLES[i][0], y: HOLES[i][1] - 40, txt: '+1', col: '#ffe066', t: 0 }); }
  }

  function onPointer(e) {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    let best = -1, bd = HIT_R;
    HOLES.forEach(([hx, hy], i) => { const d = Math.hypot(x - hx, y - (hy - 22)); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) tap(best);
  }

  // 구멍에서 올라오는 정도 (0~1)
  function rise(m) {
    if (m.hit) return Math.max(0, 1 - (m.t - m.life) / 0.25);
    const k = Math.min(1, m.t / 0.12, (m.life - m.t) / 0.12);
    return Math.max(0, k);
  }

  function drawScene(c, m, live) {
    Kit.bg(c, m);
    const th = m.theme;
    c.fillStyle = th.cab2; Kit.rr(c, 20, 24, 380, 100, 22); c.fill();
    c.fillStyle = '#fff'; c.font = '900 24px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('쏙쏙 터치!', 210, 56);
    // 점수판
    const shownHits = live ? hits : 22, left = live ? TOTAL - spawned : TOTAL;
    c.font = 'bold 16px sans-serif';
    c.fillText(`터치 ${shownHits}개 · 남은 인형 ${left}`, 210, 92);
    // 진행 막대
    c.fillStyle = 'rgba(0,0,0,.3)'; Kit.rr(c, 40, 132, 340, 10, 5); c.fill();
    c.fillStyle = '#ffe066'; Kit.rr(c, 40, 132, 340 * (live ? progress() : 0.6), 10, 5); c.fill();

    const list = live ? moles : demo(m);
    HOLES.forEach(([x, y], i) => {
      // 구멍 뒤쪽
      c.fillStyle = '#2b1a12'; c.beginPath(); c.ellipse(x, y, 46, 16, 0, 0, 6.28); c.fill();
      const mo = list.find(o => o.hole === i);
      if (mo) {
        const k = live ? rise(mo) : 1;
        c.save();
        c.beginPath(); c.rect(x - 60, y - 120, 120, 120); c.clip();
        const yy = y + 34 - k * 62;
        if (mo.bomb) {
          c.fillStyle = '#1b1b24'; c.beginPath(); c.arc(x, yy, 26, 0, 6.28); c.fill();
          c.strokeStyle = '#c9a227'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 14, yy - 20); c.quadraticCurveTo(x + 26, yy - 34, x + 18, yy - 42); c.stroke();
          c.fillStyle = '#ff9f1c'; c.beginPath(); c.arc(x + 18, yy - 44, 5 + Math.sin(time * 30) * 2, 0, 6.28); c.fill();
          c.fillStyle = '#fff'; c.font = '900 22px sans-serif'; c.fillText('✕', x, yy + 1);
        } else DollArt.drawAt(c, mo.doll, x, yy, 28, mo.hit ? 0.4 : 0);
        c.restore();
      }
      // 구멍 앞 테두리
      c.strokeStyle = th.floor; c.lineWidth = 8; c.beginPath(); c.ellipse(x, y, 48, 17, 0, 0, Math.PI); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.font = 'bold 11px sans-serif'; c.fillText(String(i + 1), x, y + 30);
    });
    if (live) for (const p of pops) {
      c.globalAlpha = 1 - p.t / 0.6; c.fillStyle = p.col; c.font = '900 26px sans-serif';
      c.fillText(p.txt, p.x, p.y - p.t * 50); c.globalAlpha = 1;
    }
    if (live && state === 'count') {
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 150, W, 380);
      c.fillStyle = '#fff'; c.font = '900 72px sans-serif'; c.fillText(t < 1 ? '준비…' : '시작!', 210, 340);
    }
    if (live && state === 'end') {
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, 150, W, 380);
      c.fillStyle = grade ? GRADES[grade].color : '#fff'; c.font = '900 54px sans-serif';
      c.fillText(grade ? `${grade}등급!` : '아쉬워요', 210, 320);
      c.fillStyle = '#fff'; c.font = 'bold 22px sans-serif'; c.fillText(`${TOTAL}개 중 ${hits}개`, 210, 372);
    }
    c.fillStyle = th.cab; Kit.rr(c, 20, 540, 380, 50, 18); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.font = 'bold 13px sans-serif';
    c.fillText('인형을 터치! 💣 폭탄 -2 · 빈 구멍 -1 · 키보드 1~9', 210, 565);
  }
  let demoList = null;
  function demo(m) {
    const pool = dollsOf(m.id);
    demoList = [0, 4, 6, 8].map((hole, i) => ({ hole, doll: pool[(i * 2) % pool.length], bomb: i === 3 }));
    return demoList;
  }
  function draw() { drawScene(ctx, machine, true); }

  function setStatus() {
    if (state === 'play') els.status.textContent = `터치 ${hits}개 · 남은 인형 ${TOTAL - spawned}`;
  }
  function setUI() {
    const map = {
      idle: ['🪙 코인 넣기', Kit.idleMsg(hooks)],
      ready: ['START', '인형이 쏙 나오면 바로 터치!'],
      count: ['...', '준비…'],
      play: ['...', ''],
      end: ['...', grade ? `${hits}개! ${grade}등급 인형 획득` : `${hits}개… ${TIERS[4][1]}개 이상이면 인형을 받아요`],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'ready' || (state === 'idle' && hooks.coins() > 0));
    els.status.textContent = msg;
    setStatus();
  }
  function action() {
    if (state === 'idle') { if (hooks.spendCoin()) { state = 'ready'; setUI(); } }
    else if (state === 'ready') { state = 'count'; t = 0; moles = []; spawned = 0; hits = 0; bombs = 0; grade = null; setUI(); }
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = Kit.setup(canvas);
      machine = MACHINES.find(m => m.type === 'mole');
      loop = Kit.loop(update, draw);
      canvas.addEventListener('pointerdown', onPointer);
      document.addEventListener('keydown', ev => {
        if (state === 'play' && canvas.offsetParent && /^[1-9]$/.test(ev.key)) tap(+ev.key - 1);
      });
    },
    open(m) {
      if (machine !== m && state === 'ready') hooks.refund(machine.price || 1, '다른 기계로 옮겨서 넣어둔 코인을 돌려받았어요');
      if (machine !== m) state = 'idle';
      machine = m;
      const b = hooks.best(bestKey());
      els.extra.textContent = b !== undefined ? `최고 ${b}개` : '';
      setUI(); draw();
    },
    start() { loop.start(); },
    // 게임 중에 나가면 그 자리에서 끝 (잡은 개수로 판정)
    stop() { loop.stop(); if (state === 'count' || state === 'play') { moles = []; spawned = TOTAL; finish(); } },
    action,
    get state() { return state; },
    refresh() { if (els) setUI(); },
    preview: m => Kit.preview(m, drawScene),
  };
})();
