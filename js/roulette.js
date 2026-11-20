// 행운 룰렛: 코인 → START로 돌리기 → STOP을 누르면 1.6~2.6초 동안 서서히 멈춤 → 바늘이 가리킨 칸의 등급
// 칸 크기가 곧 확률 (S 4° · A 10° · B 44° · C 70° · D 162° · 꽝 70°)
const RouletteGame = (() => {
  const W = 420, H = 600, CX = 210, CY = 270, R = 158;
  const SECTORS = [['D', 55], ['C', 35], ['X', 20], ['B', 22], ['D', 55], ['A', 10], ['C', 35], ['X', 20], ['S', 4], ['B', 22], ['D', 52], ['X', 30]];
  const COL = { X: '#4a3d55' };
  const SPIN = 9.5;   // 돌 때 속도 (rad/s)
  // 각 칸의 시작 각도
  const START = [];
  SECTORS.reduce((a, [, deg]) => { START.push(a); return a + deg; }, 0);

  let canvas, ctx, els, hooks, machine, loop;
  let state = 'idle', t = 0, ang = 0, vel = 0, slowT = 0, slowDur = 2, v0 = 0, grade = null, spinT = 0, secretDone = false;

  // 바늘(위쪽)이 가리키는 칸
  function sectorAt(a) {
    const deg = ((((-a * 180) / Math.PI) % 360) + 360) % 360;   // 바늘 기준 돌림판 각도
    let i = SECTORS.length - 1;
    for (let k = 0; k < SECTORS.length; k++) if (deg >= START[k] && deg < START[k] + SECTORS[k][1]) { i = k; break; }
    return SECTORS[i][0];
  }

  function update(dt) {
    t += dt;
    if (state === 'spin') {
      ang += SPIN * dt;
      spinT += dt;
      // 숨겨진 행동: 멈추지 않고 15초 동안 돌게 두기
      if (!secretDone && spinT >= 15) { secretDone = true; hooks.secret(); }
    } else if (state === 'slow') {
      slowT += dt;
      const k = Math.min(1, slowT / slowDur);
      vel = v0 * (1 - k) ** 2;
      ang += vel * dt;
      if (k >= 1) finish();
    } else if (state === 'result' && t > 1.8) { state = 'idle'; setUI(); }
  }

  function finish() {
    const g = sectorAt(ang);
    grade = g === 'X' ? null : g;
    state = 'result'; t = 0;
    if (grade) {
      const doll = pickOfGrade(machine.id, grade);
      setTimeout(() => hooks.award(doll, `룰렛이 ${grade} 칸에 멈췄다!`), 450);
    }
    setUI();
  }

  function action() {
    if (state === 'idle') { if (hooks.spendCoin()) { state = 'ready'; grade = null; setUI(); } }
    else if (state === 'ready') { state = 'spin'; spinT = 0; secretDone = false; setUI(); }
    else if (state === 'spin') {
      // 멈추는 시간에 무작위를 섞어서 '보고 누르기'로는 칸을 고를 수 없게
      state = 'slow'; slowT = 0; slowDur = 1.6 + Math.random(); v0 = SPIN * (0.9 + Math.random() * 0.25);
      setUI();
    }
  }

  function drawScene(c, m, live) {
    Kit.bg(c, m);
    const th = m.theme;
    // 장식 전구
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, on = live ? Math.floor(t * 6 + i) % 2 : i % 2;
      c.fillStyle = on ? '#ffe066' : '#6b5520';
      c.beginPath(); c.arc(CX + Math.cos(a) * (R + 26), CY + Math.sin(a) * (R + 26), 5, 0, 6.28); c.fill();
    }
    c.fillStyle = th.cab2; c.beginPath(); c.arc(CX, CY, R + 14, 0, 6.28); c.fill();
    // 돌림판
    const a0 = live ? ang : 0.6;
    c.save(); c.translate(CX, CY); c.rotate(a0 - Math.PI / 2);
    SECTORS.forEach(([g, deg], i) => {
      const s = (START[i] * Math.PI) / 180, e = ((START[i] + deg) * Math.PI) / 180;
      c.fillStyle = g === 'X' ? COL.X : GRADES[g].color;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, s, e); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.stroke();
      if (deg >= 10) {
        const mid = (s + e) / 2;
        c.save(); c.rotate(mid); c.translate(R * 0.72, 0); c.rotate(Math.PI / 2);
        c.fillStyle = g === 'X' ? '#d9c8e8' : '#1a0f2c';
        c.font = `900 ${deg >= 30 ? 22 : 15}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(g === 'X' ? '꽝' : g, 0, 0);
        c.restore();
      } else if (g === 'S') {
        const mid = (s + e) / 2;
        c.save(); c.rotate(mid); c.translate(R * 0.86, 0);
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 4, 0, 6.28); c.fill(); c.restore();
      }
    });
    c.restore();
    // 가운데
    const pool = dollsOf(m.id);
    c.fillStyle = '#fff8e8'; c.beginPath(); c.arc(CX, CY, 42, 0, 6.28); c.fill();
    c.strokeStyle = th.cab2; c.lineWidth = 5; c.stroke();
    DollArt.drawAt(c, live && grade ? pickPreview(pool, grade) : pool[pool.length - 1], CX, CY + 6, 24);
    // 바늘
    c.fillStyle = '#ffffff'; c.strokeStyle = '#1a0f2c'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(CX, CY - R + 18); c.lineTo(CX - 16, CY - R - 22); c.lineTo(CX + 16, CY - R - 22); c.closePath(); c.fill(); c.stroke();
    // 아래 패널
    c.fillStyle = th.cab; Kit.rr(c, 20, 470, 380, 120, 22); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (live && state === 'result') {
      c.fillStyle = grade ? GRADES[grade].color : '#d9c8e8'; c.font = '900 40px sans-serif';
      c.fillText(grade ? `${grade}등급!` : '꽝!', 210, 520);
    } else {
      c.fillStyle = '#fff'; c.font = '900 26px sans-serif'; c.fillText('LUCKY ROULETTE', 210, 512);
      c.font = 'bold 14px sans-serif'; c.fillStyle = 'rgba(255,255,255,.8)';
      c.fillText('STOP을 누르면 서서히 멈춰요', 210, 548);
    }
  }
  const pickPreview = (pool, g) => pool.find(d => d.grade === g) || pool[0];
  function draw() { drawScene(ctx, machine, true); }

  function setUI() {
    const map = {
      idle: ['🪙 코인 넣기', Kit.idleMsg(hooks)],
      ready: ['START', 'START를 누르면 돌림판이 돌아요'],
      spin: ['⏹ STOP', '원하는 때에 STOP!'],
      slow: ['...', '두근두근… 어디서 멈출까?'],
      result: ['...', grade ? `${grade}등급 인형 획득!` : '아쉬워요, 꽝!'],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'ready' || state === 'spin' || (state === 'idle' && hooks.coins() > 0));
    els.btn.classList.toggle('stop', state === 'spin');
    els.status.textContent = msg;
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = Kit.setup(canvas);
      machine = MACHINES.find(m => m.type === 'roulette');
      loop = Kit.loop(update, draw);
      canvas.addEventListener('pointerdown', () => { if (state === 'ready' || state === 'spin') action(); });
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
