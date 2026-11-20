// 풍선 다트: 아래 발사대의 각도가 좌우로 흔들림 → 눌러서 다트 발사 → 맞힌 풍선에 매달린 인형 획득
// 풍선 크기는 등급에 따라 다름 (작을수록 귀함). 천장의 작은 별을 맞히면 숨겨진 행동
const BalloonGame = (() => {
  const W = 420, H = 600, LX = 210, LY = 540, DART_SPEED = 900, COUNT = 6;
  const SIZE = { D: 30, C: 24, B: 18, A: 13, S: 9 };
  const STAR = { x: 210, y: 86, r: 7 };
  const BCOL = ['#ff6fae', '#ffd23f', '#5ee6ff', '#7ee081', '#b28dff', '#ff9f40'];

  let canvas, ctx, els, hooks, machine, loop;
  let state = 'idle', t = 0, time = 0, aim = 0, aimSpeed = 1.6, dart = null, balloons = [], popped = null, grade = null, sparks = [];

  function makeBalloon(i) {
    const doll = pickDoll(machine.id);
    return { doll, r: SIZE[doll.grade], col: BCOL[i % BCOL.length], bx: 70 + Math.random() * 280, by: 150 + Math.random() * 200,
      ax: 25 + Math.random() * 40, wx: 0.5 + Math.random() * 0.7, ph: Math.random() * 6.28 };
  }
  function fill() { balloons = Array.from({ length: COUNT }, (_, i) => makeBalloon(i)); }
  const posOf = b => ({ x: b.bx + Math.sin(time * b.wx + b.ph) * b.ax, y: b.by + Math.sin(time * 1.3 + b.ph) * 8 });
  const aimAngle = () => Math.sin(aim) * 1.05;   // -60° ~ 60° (0 = 똑바로 위)

  function update(dt) {
    time += dt; t += dt;
    sparks = sparks.filter(s => (s.t += dt) < 0.6);
    if (state === 'aim') aim += aimSpeed * dt;
    else if (state === 'fly') {
      const steps = 4;
      for (let i = 0; i < steps && state === 'fly'; i++) {
        dart.x += dart.vx * dt / steps; dart.y += dart.vy * dt / steps;
        const tipX = dart.x, tipY = dart.y;
        if (!dart.star && Math.hypot(tipX - STAR.x, tipY - STAR.y) < STAR.r + 3) { dart.star = true; hooks.secret(); burst(STAR.x, STAR.y, '#ffe066'); }
        const hit = balloons.find(b => { const p = posOf(b); return Math.hypot(tipX - p.x, tipY - p.y) < b.r; });
        if (hit) {
          const p = posOf(hit);
          popped = { ...hit, x: p.x, y: p.y, vy: 0 };
          balloons[balloons.indexOf(hit)] = makeBalloon(balloons.indexOf(hit));
          grade = hit.doll.grade;
          burst(p.x, p.y, hit.col);
          state = 'pop'; t = 0; setUI();
        } else if (tipY < 30 || tipX < 0 || tipX > W) { state = 'miss'; t = 0; setUI(); }
      }
    } else if (state === 'pop') {
      popped.vy += 900 * dt; popped.y += popped.vy * dt;
      if (popped.y > 640) {
        const doll = popped.doll; popped = null;
        hooks.award(doll, `펑! ${GRADES[doll.grade].name} 풍선을 맞혔다`);
        state = 'done'; t = 0; setUI();
      }
    } else if ((state === 'miss' && t > 1) || (state === 'done' && t > 0.8)) { state = 'idle'; dart = null; setUI(); }
  }
  function burst(x, y, col) {
    for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28; sparks.push({ x, y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, col, t: 0 }); }
  }

  function action() {
    if (state === 'idle') { if (hooks.spendCoin()) { state = 'aim'; aim = Math.random() * 6.28; aimSpeed = 1.4 + Math.random() * 0.6; grade = null; setUI(); } }
    else if (state === 'aim') {
      const a = aimAngle();
      dart = { x: LX, y: LY - 30, vx: Math.sin(a) * DART_SPEED, vy: -Math.cos(a) * DART_SPEED, a };
      state = 'fly'; t = 0; setUI();
    }
  }

  function drawBalloon(c, x, y, b) {
    // 줄 + 매달린 인형
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x, y + b.r); c.quadraticCurveTo(x + 4, y + b.r + 14, x, y + b.r + 24); c.stroke();
    DollArt.drawAt(c, b.doll, x, y + b.r + 40, 14);
    // 풍선
    const g = c.createRadialGradient(x - b.r * 0.35, y - b.r * 0.4, 1, x, y, b.r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, b.col); g.addColorStop(1, b.col);
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y, b.r * 0.88, b.r, 0, 0, 6.28); c.fill();
    c.fillStyle = b.col; c.beginPath(); c.moveTo(x - 3, y + b.r); c.lineTo(x + 3, y + b.r); c.lineTo(x, y + b.r + 5); c.fill();
    c.fillStyle = GRADES[b.doll.grade].color; c.font = `900 ${Math.max(9, b.r * 0.6)}px sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.doll.grade, x, y + 1);
  }

  function drawScene(c, m, live) {
    Kit.bg(c, m);
    const th = m.theme;
    // 구름
    c.fillStyle = 'rgba(255,255,255,.6)';
    for (const [x, y, r] of [[70, 60, 22], [100, 52, 28], [320, 70, 24], [350, 60, 30], [380, 74, 18]]) { c.beginPath(); c.arc(x, y, r, 0, 6.28); c.fill(); }
    // 천장의 작은 별
    c.save(); c.translate(STAR.x, STAR.y); c.rotate(time);
    c.fillStyle = '#ffe066'; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5, rr = i % 2 ? STAR.r * 0.45 : STAR.r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.restore();
    // 풍선
    const list = live ? balloons : demo(m);
    for (const b of list) { const p = live ? posOf(b) : { x: b.bx, y: b.by }; drawBalloon(c, p.x, p.y, b); }
    if (live && popped) DollArt.drawAt(c, popped.doll, popped.x, popped.y + 20, 20, popped.vy * 0.002);
    for (const s of sparks) {
      c.globalAlpha = 1 - s.t / 0.6; c.fillStyle = s.col;
      c.beginPath(); c.arc(s.x + s.vx * s.t, s.y + s.vy * s.t, 3, 0, 6.28); c.fill(); c.globalAlpha = 1;
    }
    // 발사대
    const a = live && state === 'aim' ? aimAngle() : live && dart ? dart.a : -0.3;
    if (live && state === 'aim') {
      c.save(); c.setLineDash([5, 8]); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(LX, LY - 30); c.lineTo(LX + Math.sin(a) * 260, LY - 30 - Math.cos(a) * 260); c.stroke(); c.restore();
    }
    c.fillStyle = th.cab; Kit.rr(c, 20, 552, 380, 40, 16); c.fill();
    c.save(); c.translate(LX, LY); c.rotate(a);
    c.fillStyle = th.cab2; Kit.rr(c, -10, -36, 20, 44, 8); c.fill();
    c.restore();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(LX, LY, 14, 0, 6.28); c.fill();
    // 날아가는 다트
    if (live && dart && state === 'fly') drawDart(c, dart.x, dart.y, dart.a);
    if (live && !dart && state === 'aim') drawDart(c, LX + Math.sin(a) * 30, LY - Math.cos(a) * 30, a);
    if (live && state === 'miss') { c.fillStyle = '#e8304a'; c.font = '900 34px sans-serif'; c.fillText('빗나감!', 210, 300); }
    c.fillStyle = 'rgba(255,255,255,.9)'; c.font = 'bold 12px sans-serif';
    c.fillText('작은 풍선일수록 귀한 인형 · 화면을 눌러도 발사', 210, 572);
  }
  function drawDart(c, x, y, a) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = '#c0c6d4'; c.beginPath(); c.moveTo(0, -12); c.lineTo(3, 0); c.lineTo(-3, 0); c.closePath(); c.fill();
    c.fillStyle = '#e8304a'; c.fillRect(-2, 0, 4, 18);
    c.fillStyle = '#ffe066'; c.beginPath(); c.moveTo(0, 12); c.lineTo(7, 22); c.lineTo(-7, 22); c.closePath(); c.fill();
    c.restore();
  }
  function demo(m) {
    const pool = dollsOf(m.id);
    return [['D', 90, 200], ['B', 170, 160], ['S', 230, 250], ['C', 300, 190], ['A', 350, 280]].map(([g, bx, by], i) => {
      const doll = pool.find(d => d.grade === g) || pool[0];
      return { doll, r: SIZE[doll.grade], col: BCOL[i], bx, by };
    });
  }
  function draw() { drawScene(ctx, machine, true); }

  function setUI() {
    const map = {
      idle: ['🪙 코인 넣기', Kit.idleMsg(hooks)],
      aim: ['🎯 다트 발사!', '흔들리는 점선이 풍선을 가리킬 때 발사!'],
      fly: ['...', '슝!'],
      pop: ['...', `펑! ${grade}등급 풍선!`],
      miss: ['...', '아쉽게 빗나갔어요'],
      done: ['...', '획득!'],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'aim' || (state === 'idle' && hooks.coins() > 0));
    els.status.textContent = msg;
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = Kit.setup(canvas);
      machine = MACHINES.find(m => m.type === 'balloon');
      fill();
      loop = Kit.loop(update, draw);
      canvas.addEventListener('pointerdown', () => { if (state === 'aim') action(); });
    },
    // 특별 뽑기 시작/종료 때 풍선을 새로 채움
    restock() { if (state !== 'idle') return false; fill(); draw(); return true; },
    open(m) { machine = m; setUI(); draw(); },
    start() { loop.start(); },
    stop() { loop.stop(); },
    action,
    get state() { return state; },
    refresh() { if (els) setUI(); },
    preview: m => Kit.preview(m, drawScene),
  };
})();
