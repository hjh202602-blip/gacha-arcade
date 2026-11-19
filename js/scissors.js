// 가위 뽑기: 버튼을 누르고 있으면 가위가 오른쪽으로 → 손을 떼는 순간 싹둑! 흔들리는 실을 잘라야 함
const ScissorsGame = (() => {
  const TOP = 70, CUT_Y = 210, START_X = 34, END_X = 392, SPEED = 130;
  const SWAY = { D: 2, C: 6, B: 10, A: 14, S: 18 };   // 자르는 높이에서 실이 흔들리는 폭(px)
  const TOL = { D: 9, C: 7, B: 6, A: 5, S: 4 };        // 가위 날이 실에 맞아야 하는 범위(±px)
  const SLOTS = [80, 145, 210, 275, 340];

  let canvas, ctx, els, hooks, machine, loop;
  let strings = [], state = 'idle', t = 0, time = 0, sx = START_X, cut = null, snip = 0;

  function build() {
    const pool = dollsOf(machine.id).slice().sort(() => Math.random() - 0.5);
    strings = SLOTS.map((x, i) => {
      const doll = pool[i % pool.length];
      return { x0: x, doll, len: 170 + ((i * 53) % 70), ph: Math.random() * 6.28, w: 1.6 + Math.random() * 0.8, fall: null };
    });
  }
  // 높이 y에서 실의 x 위치 (위가 고정된 진자처럼 흔들림)
  function strX(s, y) {
    const k = (y - TOP) / (CUT_Y - TOP);
    return s.x0 + Math.sin(time * s.w + s.ph) * SWAY[s.doll.grade] * k;
  }

  function update(dt) {
    time += dt; t += dt;
    snip = Math.max(0, snip - dt * 3);
    if (state === 'move') {
      sx += SPEED * dt;
      if (sx >= END_X) { sx = END_X; doCut(); }
    } else if (state === 'falling') {
      const f = cut.fall;
      f.vy += 1500 * dt; f.y += f.vy * dt; f.a += dt * 3;
      if (f.y > 640) {
        hooks.award(cut.doll, `싹둑! ${GRADES[cut.doll.grade].name} 실을 잘랐다`);
        // 잘린 자리에 새 인형 매달기
        const pool = dollsOf(machine.id);
        Object.assign(cut, { doll: pickDoll(machine.id) || pool[0], fall: null, ph: Math.random() * 6.28 });
        state = 'done'; t = 0; setUI();
      }
    } else if (state === 'miss' || state === 'done') {
      if (t > 1.0) { state = 'idle'; sx = START_X; cut = null; setUI(); }
    }
  }

  function doCut() {
    snip = 1;
    const hit = strings.find(s => Math.abs(strX(s, CUT_Y) - sx) <= TOL[s.doll.grade]);
    if (hit) {
      cut = hit;
      hit.fall = { x: strX(hit, TOP + hit.len), y: TOP + hit.len + 34, vy: -80, a: 0 };
      state = 'falling';
    } else state = 'miss';
    t = 0; setUI();
  }

  function drawScissors(c, x, y, open) {
    c.save(); c.translate(x, y);
    const a = 0.12 + open * 0.35;
    c.fillStyle = '#dfe4ef'; c.strokeStyle = '#6f7388'; c.lineWidth = 1.5;
    for (const s of [-1, 1]) {
      c.save(); c.rotate(s * a);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-34, s * -3); c.lineTo(-34, s * 3); c.closePath(); c.fill(); c.stroke();
      c.restore();
      c.save(); c.rotate(s * a);
      c.strokeStyle = '#ff5c8a'; c.lineWidth = 5;
      c.beginPath(); c.ellipse(16, s * 7, 9, 6, 0, 0, 6.28); c.stroke();
      c.restore();
    }
    c.fillStyle = '#6f7388'; c.beginPath(); c.arc(0, 0, 3, 0, 6.28); c.fill();
    c.restore();
  }

  function drawScene(c, m, live) {
    Kit.bg(c, m);
    const th = m.theme;
    // 매다는 봉
    c.fillStyle = th.cab2; Kit.rr(c, 20, TOP - 16, 380, 18, 9); c.fill();
    for (const s of strings) {
      const bottomY = TOP + s.len;
      if (live && s === cut && s.fall) {
        // 잘린 실 윗부분만
        c.strokeStyle = '#fff'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(s.x0, TOP); c.lineTo(strX(s, CUT_Y), CUT_Y); c.stroke();
        DollArt.drawAt(c, s.doll, s.fall.x, s.fall.y, 28, s.fall.a);
        continue;
      }
      c.strokeStyle = s.doll.grade === 'S' ? 'rgba(255,255,255,.75)' : '#ffffff';
      c.lineWidth = s.doll.grade === 'S' ? 1 : 1.8;
      c.beginPath(); c.moveTo(s.x0, TOP);
      for (let y = TOP; y <= bottomY; y += 10) c.lineTo(strX(s, y), y);
      c.stroke();
      const bx = strX(s, bottomY);
      DollArt.drawAt(c, s.doll, bx, bottomY + 34, 28, (bx - s.x0) * 0.01);
      c.fillStyle = GRADES[s.doll.grade].color; Kit.rr(c, s.x0 - 11, TOP + 6, 22, 14, 4); c.fill();
      c.fillStyle = '#1a0f2c'; c.font = '900 11px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(s.doll.grade, s.x0, TOP + 13);
    }
    // 가위 레일
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(20, CUT_Y - 2, 380, 4);
    drawScissors(c, live ? sx : 120, CUT_Y, live ? (state === 'move' || state === 'ready' ? 1 : snip) : 1);
    if (live && snip > 0.5) {
      c.fillStyle = '#ff5c8a'; c.font = '900 30px sans-serif'; c.textAlign = 'center';
      c.fillText('싹둑!', sx, CUT_Y - 40);
    }
    if (live && state === 'miss' && t < 1) {
      c.fillStyle = '#1f7fa3'; c.font = '900 32px sans-serif'; c.fillText('헛손질!', 210, 320);
    }
    // 아래 받는 통
    c.fillStyle = th.cab; Kit.rr(c, 20, 500, 380, 90, 20); c.fill();
    c.fillStyle = '#0b2530'; Kit.rr(c, 40, 470, 340, 50, 14); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center';
    c.fillText('▼ 떨어진 인형 받는 곳', 210, 548);
  }

  function draw() { drawScene(ctx, machine, true); }

  function setUI() {
    const map = {
      idle: ['🪙 코인 넣기', Kit.idleMsg(hooks)],
      ready: ['꾹 누르고 있기 ▶', '누르는 동안 가위가 움직이고, 떼면 잘라요'],
      move: ['손 떼면 싹둑!', '실 위에서 손을 떼세요!'],
      falling: ['...', '잘렸다!!'],
      miss: ['...', '실을 못 잘랐어요'],
      done: ['...', '획득!'],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'ready' || state === 'move' || (state === 'idle' && hooks.coins() > 0));
    els.status.textContent = msg;
  }

  // 누르기 / 떼기
  function press() {
    if (state === 'idle') { if (hooks.spendCoin()) { state = 'ready'; sx = START_X; setUI(); } }
    else if (state === 'ready') { state = 'move'; setUI(); }
  }
  function release() { if (state === 'move') doCut(); }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = Kit.setup(canvas);
      machine = MACHINES.find(m => m.type === 'scissors');
      build();
      loop = Kit.loop(update, draw);
    },
    // 특별 뽑기 시작/종료 때 기계 안 인형을 새로 채움 (게임 중이면 다음에)
    restock() { if (state !== 'idle') return false; build(); draw(); return true; },
    open(m) { machine = m; setUI(); draw(); },
    start() { loop.start(); },
    stop() { loop.stop(); if (state === 'move') doCut(); },
    press, release,
    action: press,
    get state() { return state; },
    refresh() { if (els) setUI(); },
    preview: m => Kit.preview(m, drawScene),
  };
})();
