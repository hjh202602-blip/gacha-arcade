// 구슬 떨어뜨리기: 위에서 좌우로 움직이는 발사대를 멈춰 구슬을 떨어뜨림 → 핀에 통통 튀며 아래 칸으로
// 칸은 가운데가 넓고(쉬운 등급) 바깥으로 갈수록 좁아짐(귀한 등급)
const MarbleGame = (() => {
  const W = 420, H = 600;
  const L = 34, Rw = 386, TOP = 96, SLOT_Y = 470, FLOOR = 556;
  const BALL_R = 7, PEG_R = 4.5, G = 1300;
  // 아래 칸: [등급, 너비]  (합계 352 = Rw - L)
  const SLOTS = [['S', 20], ['A', 26], ['B', 32], ['C', 36], ['X', 40], ['D', 44], ['X', 40], ['C', 36], ['B', 32], ['A', 26], ['S', 20]];   // X = 꽝
  const EDGES = [L];
  SLOTS.forEach(([, w]) => EDGES.push(EDGES[EDGES.length - 1] + w));
  // 핀: 엇갈린 줄
  const PEGS = [];
  for (let r = 0; r < 9; r++) {
    const off = r % 2 ? 20 : 0;
    for (let x = L + 16 + off; x <= Rw - 10; x += 40) PEGS.push({ x, y: 150 + r * 34 });
  }

  let canvas, ctx, els, hooks, machine, loop;
  let state = 'idle', t = 0, time = 0, lx = 210, ldir = 1, ball = null, grade = null, slotIdx = -1, glow = 0, trail = [];

  const launcherSpeed = () => 150;
  // 발사대는 가운데 구간만 움직임 (벽에 붙여 떨어뜨리면 너무 쉬워서)
  const AIM_MIN = 120, AIM_MAX = 300;

  function slotAt(x) {
    for (let i = 0; i < SLOTS.length; i++) if (x >= EDGES[i] && x < EDGES[i + 1]) return i;
    return x < L ? 0 : SLOTS.length - 1;
  }

  function step(dt) {
    const b = ball;
    b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    for (const p of PEGS) {
      const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), rr = BALL_R + PEG_R;
      if (d < rr && d > 1e-6) {
        const nx = dx / d, ny = dy / d;
        b.x = p.x + nx * rr; b.y = p.y + ny * rr;
        // 핀에 맞으면 반반 확률로 왼쪽/오른쪽으로 반 칸쯤 튐 (같은 핀에 연달아 맞으면 무시)
        if (b.lastPeg !== p) {
          b.lastPeg = p;
          b.vx = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 30);
          b.vy = 90;
        }
        p.hit = 0.25;
      }
    }
    if (b.x < L + BALL_R) { b.x = L + BALL_R; b.vx = Math.abs(b.vx) * 0.8; }
    if (b.x > Rw - BALL_R) { b.x = Rw - BALL_R; b.vx = -Math.abs(b.vx) * 0.8; }
    // 칸막이
    if (b.y > SLOT_Y) {
      for (const ex of EDGES.slice(1, -1)) {
        if (Math.abs(b.x - ex) < BALL_R + 1.5) { b.x = ex + (b.x < ex ? -1 : 1) * (BALL_R + 1.5); b.vx *= -0.4; }
      }
    }
    b.vx *= 0.999;
    if (b.y > FLOOR - BALL_R) { b.y = FLOOR - BALL_R; finish(); }
  }

  function finish() {
    slotIdx = slotAt(ball.x);
    grade = SLOTS[slotIdx][0] === 'X' ? null : SLOTS[slotIdx][0];
    state = 'result'; t = 0; glow = 1;
    if (grade) {
      const doll = pickOfGrade(machine.id, grade);
      setTimeout(() => hooks.award(doll, `구슬이 ${grade} 칸에 쏙!`), 450);
    }
    setUI();
  }

  function update(dt) {
    time += dt; t += dt;
    glow = Math.max(0, glow - dt * 0.6);
    for (const p of PEGS) if (p.hit) p.hit = Math.max(0, p.hit - dt);
    if (state === 'aim') {
      lx += ldir * launcherSpeed() * dt;
      if (lx > AIM_MAX) { lx = AIM_MAX; ldir = -1; }
      if (lx < AIM_MIN) { lx = AIM_MIN; ldir = 1; }
    } else if (state === 'fall') {
      for (let i = 0; i < 4 && state === 'fall'; i++) step(dt / 4);
      if (ball) { trail.push({ x: ball.x, y: ball.y }); if (trail.length > 12) trail.shift(); }
    } else if (state === 'result' && t > 1.8) { state = 'idle'; ball = null; trail = []; setUI(); }
  }

  function action() {
    if (state === 'idle') { if (hooks.spendCoin()) { state = 'aim'; lx = 210; ldir = Math.random() < 0.5 ? 1 : -1; grade = null; slotIdx = -1; setUI(); } }
    else if (state === 'aim') {
      // 숨겨진 행동: 맨 왼쪽 끝에서 떨어뜨리기
      if (lx <= AIM_MIN + 4) hooks.secret();
      ball = { x: lx, y: TOP + 10, vx: 0, vy: 40 }; trail = [];
      state = 'fall'; t = 0; setUI();
    }
  }

  function drawScene(c, m, live) {
    Kit.bg(c, m);
    const th = m.theme;
    c.fillStyle = th.cab2; Kit.rr(c, L - 14, 40, Rw - L + 28, FLOOR - 26, 18); c.fill();
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(L, TOP, Rw - L, FLOOR - TOP);
    c.fillStyle = '#fff'; c.font = '900 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('● MARBLE DROP ●', 210, 64);
    // 발사대 레일
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(L, TOP - 6, Rw - L, 6);
    c.fillStyle = 'rgba(255,224,102,.35)'; c.fillRect(AIM_MIN, TOP - 6, AIM_MAX - AIM_MIN, 6);
    const x = live ? lx : 150;
    if (!live || state === 'aim' || state === 'idle') {
      c.fillStyle = '#ffe066'; Kit.rr(c, x - 16, TOP - 16, 32, 14, 6); c.fill();
      c.fillStyle = '#e8ecf5'; c.beginPath(); c.arc(x, TOP + 4, BALL_R, 0, 6.28); c.fill();
      if (live && state === 'aim') {
        c.save(); c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x, TOP + 12); c.lineTo(x, 146); c.stroke(); c.restore();
      }
    }
    // 핀
    for (const p of PEGS) {
      c.fillStyle = p.hit ? '#ffe066' : '#c9d6ea';
      c.beginPath(); c.arc(p.x, p.y, PEG_R + (p.hit ? 1.5 : 0), 0, 6.28); c.fill();
    }
    // 칸
    SLOTS.forEach(([g, w], i) => {
      const x0 = EDGES[i];
      const lit = live && state === 'result' && i === slotIdx;
      const col = g === 'X' ? '#5a4a66' : GRADES[g].color;
      c.fillStyle = lit ? col : shadeTo(col);
      c.fillRect(x0 + 1, SLOT_Y, w - 2, FLOOR - SLOT_Y);
      c.fillStyle = lit ? '#1a0f2c' : '#fff'; c.font = `900 ${w >= 30 ? 16 : 12}px sans-serif`;
      c.fillText(g === 'X' ? '꽝' : g, x0 + w / 2, SLOT_Y + 46);
    });
    c.fillStyle = '#c9d6ea';
    for (const ex of EDGES) c.fillRect(ex - 1.5, SLOT_Y - 6, 3, FLOOR - SLOT_Y + 6);
    // 구슬
    if (live && ball) {
      trail.forEach((p, i) => { c.fillStyle = `rgba(255,255,255,${(i / trail.length) * 0.25})`; c.beginPath(); c.arc(p.x, p.y, BALL_R * 0.8, 0, 6.28); c.fill(); });
      const g = c.createRadialGradient(ball.x - 2, ball.y - 3, 1, ball.x, ball.y, BALL_R);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8fb8e8');
      c.fillStyle = g; c.beginPath(); c.arc(ball.x, ball.y, BALL_R, 0, 6.28); c.fill();
    }
    // 아래
    c.fillStyle = th.cab; Kit.rr(c, 20, 566, 380, 28, 12); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.font = 'bold 12px sans-serif';
    c.fillText(live && state === 'result' ? (grade ? `${grade}등급 칸!` : '꽝!') : '바깥쪽 좁은 칸일수록 귀한 인형 · 꽝 주의', 210, 580);
    // 미리보기용 인형
    if (!live) { const pool = dollsOf(m.id); DollArt.drawAt(c, pool[pool.length - 1], 210, 300, 30); }
  }
  // 칸 바탕색: 등급 색을 어둡게
  function shadeTo(hex) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.round(v * 0.45 + 13 * 0.55);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }
  function draw() { drawScene(ctx, machine, true); }

  function setUI() {
    const map = {
      idle: ['🪙 코인 넣기', Kit.idleMsg(hooks)],
      aim: ['● 떨어뜨리기', '발사대가 원하는 위치에 올 때 떨어뜨려요'],
      fall: ['...', '통통통…'],
      result: ['...', grade ? `${grade}등급 칸! 인형 획득` : '아쉬워요, 꽝!'],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'aim' || (state === 'idle' && hooks.coins() > 0));
    els.status.textContent = msg;
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = Kit.setup(canvas);
      machine = MACHINES.find(m => m.type === 'marble');
      loop = Kit.loop(update, draw);
      canvas.addEventListener('pointerdown', () => { if (state === 'aim') action(); });
    },
    open(m) { machine = m; setUI(); draw(); },
    start() { loop.start(); },
    stop() { loop.stop(); },
    action,
    get state() { return state; },
    refresh() { if (els) setUI(); },
    preview: m => Kit.preview(m, drawScene),
  };
})();
