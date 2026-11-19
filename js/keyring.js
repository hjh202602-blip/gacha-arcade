// 열쇠고리 걸기: 위에서 지나가는 열쇠고리의 고리에 갈고리를 쏘아 올려 걸기
const KeyringGame = (() => {
  const W = 420, BELT_Y = 104, HOOK_X = 210, HOOK_REST = 520, SHOOT = 950, PULL = 260;
  const SPACING = 84, COUNT = 6, BELT_SPEED = 105;
  const RING_R = { D: 16, C: 13, B: 10, A: 8, S: 6.5 }; // 등급이 높을수록 고리가 작다
  const TIP = 2; // 갈고리 끝 두께

  let canvas, ctx, els, hooks, machine, loop;
  let items = [], state = 'idle', t = 0, time = 0, hookY = HOOK_REST, caught = null, result = '';
  let beltPos = 0, readyT = 0, secretDone = false;
  // 지그재그 키링: 벨트 속도가 출렁이다가 거꾸로도 감
  const beltSpeed = () => (machine && machine.gimmick === 'zigzag'
    ? BELT_SPEED * (Math.sin(time * 0.8) * 1.7 + Math.sin(time * 2.3) * 0.5)
    : BELT_SPEED);
  const SPAN = SPACING * COUNT;

  const ringY = it => BELT_Y + 34 + Math.sin(time * 1.7 + it.ph) * 1.5;
  const ringX = it => it.x + Math.sin(time * 1.3 + it.ph) * 2.5;

  function makeItem(x) {
    const doll = pickDoll(machine.id);
    return { x, doll, r: RING_R[doll.grade], ph: Math.random() * 6.28 };
  }
  function fill() {
    items = [];
    for (let i = 0; i < COUNT; i++) items.push(makeItem(-40 + i * SPACING));
  }

  function update(dt) {
    time += dt; t += dt;
    const v = beltSpeed();
    beltPos += v * dt;
    for (const it of items) {
      if (it === caught) continue;
      it.x += v * dt;
      if (it.x > W + 60) Object.assign(it, makeItem(it.x - SPAN));
      else if (it.x < W + 60 - SPAN) Object.assign(it, makeItem(it.x + SPAN));
    }
    if (state === 'ready') {
      // 숨겨진 행동(열쇠고리 걸기): 발사하지 않고 15초 구경하기
      readyT += dt;
      if (machine.gimmick !== 'zigzag' && !secretDone && readyT >= 15) { secretDone = true; hooks.secret(); }
    }
    if (state === 'shoot') {
      hookY -= SHOOT * dt;
      // 갈고리 끝이 고리 높이를 지나는 순간 판정
      for (const it of items) {
        const ry = ringY(it);
        if (!it.checked && hookY <= ry) {
          it.checked = true;
          if (Math.abs(ringX(it) - HOOK_X) < it.r - TIP) { caught = it; break; }
        }
      }
      if (caught) {
        // 숨겨진 행동(지그재그): 벨트가 거꾸로 갈 때 걸기
        if (machine.gimmick === 'zigzag' && beltSpeed() < 0) hooks.secret();
        state = 'pull'; t = 0; result = 'hit'; setUI();
      }
      else if (hookY <= BELT_Y + 14) { hookY = BELT_Y + 14; state = 'miss'; t = 0; result = 'miss'; setUI(); }
    } else if (state === 'pull') {
      hookY = Math.min(HOOK_REST + 40, hookY + PULL * dt);
      caught.x = HOOK_X;
      if (hookY >= HOOK_REST + 40) {
        const doll = caught.doll;
        items[items.indexOf(caught)] = makeItem(items.reduce((mn, i) => Math.min(mn, i.x), Infinity) - SPACING);
        caught = null; state = 'done'; t = 0;
        hooks.award(doll, `${GRADES[doll.grade].name} 고리 걸기 성공!`);
        setUI();
      }
    } else if (state === 'miss') {
      hookY = Math.min(HOOK_REST, hookY + 700 * dt);
      if (hookY >= HOOK_REST && t > 0.8) { state = 'idle'; setUI(); }
    } else if (state === 'done') {
      hookY = Math.max(HOOK_REST, hookY - 200 * dt);
      if (t > 0.6) { hookY = HOOK_REST; state = 'idle'; setUI(); }
    }
  }

  function drawItem(c, it, x, ry) {
    // 체인
    c.strokeStyle = '#b8bfcf'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, BELT_Y + 8); c.lineTo(x, ry - it.r); c.stroke();
    // 고리
    c.strokeStyle = it.doll.grade === 'S' ? '#ffd23f' : '#d8dde8'; c.lineWidth = 3.5;
    c.beginPath(); c.arc(x, ry, it.r, 0, 6.28); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1;
    c.beginPath(); c.arc(x, ry, it.r + 1.8, 0, 6.28); c.stroke();
    // 인형
    c.strokeStyle = '#b8bfcf'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, ry + it.r); c.lineTo(x, ry + it.r + 10); c.stroke();
    DollArt.drawAt(c, it.doll, x, ry + it.r + 38, 24, Math.sin(time * 1.3 + it.ph) * 0.08);
  }

  function drawScene(c, m, live) {
    Kit.bg(c, m);
    const th = m.theme;
    c.fillStyle = 'rgba(255,255,255,.25)';
    for (let y = 40; y < 600; y += 44) for (let x = 22 + ((y / 44) % 2) * 22; x < W; x += 44) { c.beginPath(); c.arc(x, y, 2.5, 0, 6.28); c.fill(); }

    // 벨트
    c.fillStyle = th.cab2; Kit.rr(c, 6, BELT_Y - 14, W - 12, 22, 11); c.fill();
    c.fillStyle = 'rgba(255,255,255,.2)';
    const off = ((beltPos % 24) + 24) % 24;
    for (let x = -24 + off; x < W; x += 24) c.fillRect(x, BELT_Y - 10, 10, 4);
    for (const x of [18, W - 18]) { c.fillStyle = '#c0c6d4'; c.beginPath(); c.arc(x, BELT_Y - 3, 9, 0, 6.28); c.fill(); }

    const list = live ? items : demoItems(m);
    for (const it of list) {
      const x = it === caught ? HOOK_X : ringX(it), ry = it === caught ? hookY - 6 : ringY(it);
      if (it === caught) {
        c.strokeStyle = '#d8dde8'; c.lineWidth = 3.5;
        c.beginPath(); c.arc(x, ry, it.r, 0, 6.28); c.stroke();
        DollArt.drawAt(c, it.doll, x, ry + it.r + 38, 24);
      } else drawItem(c, it, x, ry);
    }

    // 가이드 & 갈고리
    const hy = live ? hookY : HOOK_REST;
    if (!live || state === 'ready') {
      c.save(); c.setLineDash([5, 8]); c.strokeStyle = 'rgba(124,92,255,.5)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(HOOK_X, BELT_Y + 14); c.lineTo(HOOK_X, hy); c.stroke(); c.restore();
    }
    c.fillStyle = '#9aa1b5'; c.fillRect(HOOK_X - 4, hy, 8, 600 - hy);
    c.strokeStyle = '#e8ecf5'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(HOOK_X, hy + 6); c.lineTo(HOOK_X, hy - 6); c.arc(HOOK_X - 6, hy - 6, 6, 0, Math.PI, true); c.stroke();

    // 아래 패널
    c.fillStyle = th.cab; Kit.rr(c, 20, 500, 380, 90, 20); c.fill();
    c.fillStyle = '#1b1030'; Kit.rr(c, HOOK_X - 46, 512, 92, 60, 10); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('▼ 상품 나오는 곳', HOOK_X, 582);
    c.fillStyle = '#fff'; c.font = '900 20px sans-serif';
    c.fillText('고리', 76, 544); c.fillText('걸기', 344, 544);
    if (live && state === 'miss' && t < 0.8) {
      c.fillStyle = '#ff5c8a'; c.font = '900 34px sans-serif'; c.fillText('빗나감!', HOOK_X, 300);
    }
  }

  let demo = null;
  function demoItems(m) {
    { const pool = dollsOf(m.id); demo = [40, 124, 208, 292, 376].map((x, i) => ({ x, doll: pool[i % pool.length], r: RING_R[pool[i % pool.length].grade], ph: i })); demo.m = m; }
    return demo;
  }

  function draw() { drawScene(ctx, machine, true); }

  function setUI() {
    const map = {
      idle: ['🪙 코인 넣기', Kit.idleMsg(hooks)],
      ready: ['갈고리 발사!', '고리가 가운데 점선에 올 때를 노려요'],
      shoot: ['...', '휙!'],
      pull: ['...', '걸렸다!'],
      miss: ['...', '아쉽게 빗나갔어요'],
      done: ['...', '획득!'],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'ready' || (state === 'idle' && hooks.coins() > 0));
    els.status.textContent = msg;
  }

  function action() {
    if (state === 'idle') { if (hooks.spendCoin()) { state = 'ready'; readyT = 0; secretDone = false; setUI(); } }
    else if (state === 'ready') {
      items.forEach(it => { it.checked = false; });
      state = 'shoot'; t = 0; setUI();
    }
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = Kit.setup(canvas);
      machine = MACHINES.find(m => m.type === 'keyring');
      fill();
      loop = Kit.loop(update, draw);
      canvas.addEventListener('pointerdown', () => { if (state === 'ready') action(); });
    },
    // 특별 뽑기 시작/종료 때 기계 안 인형을 새로 채움 (게임 중이면 다음에)
    restock() { if (state !== 'idle') return false; fill(); draw(); return true; },
    open(m) {
      if (machine !== m) {
        if (state === 'ready') hooks.refund(machine.price || 1, '다른 기계로 옮겨서 넣어둔 코인을 돌려받았어요');
        machine = m; state = 'idle'; caught = null; hookY = HOOK_REST; demo = null; fill();
      }
      setUI(); draw();
    },
    start() { loop.start(); },
    stop() { loop.stop(); },
    action,
    get state() { return state; },
    refresh() { if (els) setUI(); },
    preview: m => Kit.preview(m, drawScene),
  };
})();
