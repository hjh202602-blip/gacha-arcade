// 펀치 기계: 코인 → 오르내리는 게이지가 꼭대기일 때 펀치 → 점수에 따라 인형 등급 결정
const PunchGame = (() => {
  const W = 420, H = 600;
  const THRESH = [['S', 950], ['A', 850], ['B', 700], ['C', 500], ['D', 300]];
  // 게이지 왕복 속도: 판마다 무작위 (약 0.8~1.1초에 한 번 왕복). 박자 외워서 치는 걸 막음
  const newSpeed = () => 1.8 + Math.random() * 0.7;
  const PIVOT = { x: 190, y: 250 };
  const GAUGE = { x: 362, y: 190, w: 28, h: 330 };
  const scoreOf = v => Math.max(0, Math.min(999, Math.round(999 * v ** 1.5 + (Math.random() * 16 - 8))));
  const gaugeY = v => GAUGE.y + GAUGE.h * (1 - v);
  const vForScore = s => (s / 999) ** (2 / 3);

  let canvas, ctx, els, hooks, machine;
  let running = false, raf = 0, last = 0;
  let state = 'idle', t = 0, p = 0, v = 0, speed = 2, score = 0, shown = 0, grade = null;
  let padUp = 0, hit = 0, shake = 0;
  // 삼연타 펀치: 세 번 치고 평균 점수로 판정. 칠 때마다 게이지가 25% 빨라짐
  let hits = [];
  const isCombo = () => machine && machine.gimmick === 'combo';
  const bestKey = () => (machine ? machine.id : 'punch');

  const easeOut = k => 1 - (1 - k) ** 3;

  function update(dt) {
    t += dt;
    const wantUp = state === 'ready' || state === 'punch' || state === 'counting';
    padUp += ((wantUp ? 1 : 0) - padUp) * Math.min(1, dt * 6);
    hit = Math.max(0, hit - dt * 1.6);
    shake = Math.max(0, shake - dt * 3);

    if (state === 'ready') {
      p = (p + dt * speed) % 2;
      v = 1 - Math.abs(p - 1);
    } else if (state === 'punch') {
      if (t >= 0.22) { hit = 1; shake = 1; state = 'counting'; t = 0; }
    } else if (state === 'counting') {
      shown = Math.round(score * easeOut(Math.min(1, t / 1.3)));
      if (t >= 1.3 && isCombo() && hits.length < 2) {
        hits.push(score); shown = score;
        state = 'ready'; t = 0; speed *= 1.25; p = Math.random() * 2; v = 1 - Math.abs(p - 1);
        setUI();
      } else if (t >= 1.3) {
        if (isCombo()) { hits.push(score); score = Math.round(hits.reduce((a, b) => a + b, 0) / hits.length); }
        shown = score; state = 'result'; t = 0;
        const g = THRESH.find(([, s]) => score >= s);
        grade = g ? g[0] : null;
        const best = hooks.best(bestKey(), score);
        els.extra.textContent = `최고 ${best}점`;
        if (grade) {
          const doll = pickOfGrade(machine.id, grade);
          hooks.award(doll, isCombo() ? `${hits.join(' + ')} → 평균 ${score}점! ${grade}등급` : `${score}점! ${grade}등급 달성`);
        }
        setUI();
      }
    } else if (state === 'result') {
      if (t > 1.6) { state = 'idle'; setUI(); }
    }
  }

  // ---------- 그리기 ----------
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }

  function drawScene(c, m, live) {
    const th = m.theme;
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, th.inside[0]); bg.addColorStop(1, th.inside[1]);
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = th.floor; c.fillRect(0, 560, W, 40);

    c.save();
    if (live && shake > 0) c.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 12 * shake);

    // 몸통
    c.fillStyle = th.cab2; rr(c, 40, 24, 300, 556, 26); c.fill();
    c.fillStyle = th.cab; rr(c, 52, 34, 276, 536, 22); c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(52, 420 + i * 26); c.lineTo(328, 380 + i * 26); c.lineTo(328, 392 + i * 26); c.lineTo(52, 432 + i * 26); c.fill(); }

    // 점수판
    c.fillStyle = '#ffe066'; c.font = '900 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(m.gimmick === 'combo' ? '★ 3 COMBO ★' : '★ PUNCH ★', 190, 58);
    c.fillStyle = '#0d0608'; rr(c, 72, 76, 236, 112, 14); c.fill();
    c.font = 'bold 92px Consolas, "Courier New", monospace';
    c.fillStyle = 'rgba(255,59,48,.12)'; c.fillText('888', 190, 136);
    const val = live ? shown : 999;
    c.save(); c.shadowColor = '#ff3b30'; c.shadowBlur = 18; c.fillStyle = '#ff4d3d';
    c.fillText(String(val).padStart(3, '0'), 190, 136);
    c.restore();
    if (live && state === 'result') {
      c.fillStyle = grade ? GRADES[grade].color : '#9aa5b1';
      rr(c, 120, 196, 140, 34, 17); c.fill();
      c.fillStyle = '#1a0f2c'; c.font = '900 18px sans-serif';
      c.fillText(grade ? `${grade}등급!` : '아쉬워요', 190, 214);
    }

    // 펀치 패드 (맞으면 뒤로 젖혀지며 작아짐)
    const up = live ? padUp : 1, h = live ? hit : 0;
    const py = PIVOT.y + 50 + 110 * up - h * 50;
    const sc = (0.55 + 0.45 * up) * (1 - h * 0.3);
    c.fillStyle = '#b9bdcc'; rr(c, PIVOT.x - 9, PIVOT.y, 18, py - PIVOT.y, 6); c.fill();
    c.fillStyle = '#6f7388'; c.beginPath(); c.arc(PIVOT.x, PIVOT.y, 16, 0, 6.28); c.fill();
    c.save(); c.translate(PIVOT.x, py); c.scale(sc, sc);
    const pg = c.createRadialGradient(-18, -20, 8, 0, 0, 66);
    pg.addColorStop(0, '#ff8a7a'); pg.addColorStop(1, '#c4161c');
    c.fillStyle = pg; c.beginPath(); c.arc(0, 0, 64, 0, 6.28); c.fill();
    c.lineWidth = 6; c.strokeStyle = '#7d0c10'; c.stroke();
    c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.85)';
    c.beginPath(); c.arc(0, 0, 40, 0, 6.28); c.stroke();
    c.beginPath(); c.arc(0, 0, 16, 0, 6.28); c.stroke();
    c.fillStyle = '#fff'; c.font = '900 20px sans-serif'; c.fillText('HIT', 0, 1);
    c.restore();

    // 맞는 순간 효과
    if (live && h > 0.4) {
      c.save(); c.translate(PIVOT.x, py);
      c.strokeStyle = '#ffe066'; c.lineWidth = 6;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * 6.28, r1 = 80, r2 = 80 + 60 * h;
        c.beginPath(); c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); c.stroke();
      }
      c.fillStyle = '#ffe066'; c.font = '900 46px sans-serif';
      c.fillText('POW!', 0, -100 - 20 * (1 - h));
      c.restore();
    }

    // 날아가는 글러브
    if (live && (state === 'punch' || (state === 'counting' && t < 0.35))) {
      const k = state === 'punch' ? t / 0.22 : 1 - t / 0.35;
      drawGlove(c, PIVOT.x + 30 * (1 - k), 680 - (680 - py - 20) * k, 110 - 40 * k);
    }

    // 하단 코인 투입구
    c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, 130, 500, 120, 44, 10); c.fill();
    c.fillStyle = '#ffe066'; c.font = 'bold 16px sans-serif'; c.fillText(`${m.price || 1} COIN`, 190, 522);
    // 삼연타: 친 점수 표시
    if (m.gimmick === 'combo') {
      for (let i = 0; i < 3; i++) {
        const done = live && i < hits.length, cur = live && i === hits.length && state !== 'idle' && state !== 'result';
        c.fillStyle = done ? '#ffe066' : cur ? 'rgba(255,224,102,.35)' : 'rgba(0,0,0,.35)';
        rr(c, 86 + i * 72, 563, 64, 30, 10); c.fill();
        c.fillStyle = done ? '#3b2300' : '#fff'; c.font = '900 15px sans-serif';
        c.fillText(done ? String(hits[i]) : `${i + 1}타`, 118 + i * 72, 578);
      }
    }
    c.restore();

    // 힘 게이지
    c.fillStyle = 'rgba(0,0,0,.45)'; rr(c, GAUGE.x - 8, GAUGE.y - 12, GAUGE.w + 16, GAUGE.h + 24, 12); c.fill();
    const gg = c.createLinearGradient(0, GAUGE.y + GAUGE.h, 0, GAUGE.y);
    gg.addColorStop(0, '#3ddc84'); gg.addColorStop(0.55, '#ffe066'); gg.addColorStop(0.85, '#ff8c42'); gg.addColorStop(1, '#ff2d55');
    c.fillStyle = gg; rr(c, GAUGE.x, GAUGE.y, GAUGE.w, GAUGE.h, 8); c.fill();
    c.font = '900 12px sans-serif';
    for (const [g, s] of THRESH) {
      const y = gaugeY(vForScore(s));
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(GAUGE.x, y, GAUGE.w, 2);
      c.fillStyle = GRADES[g].color; c.fillText(g, GAUGE.x - 16, y + 1);
    }
    const iv = live ? v : 0.9;
    const iy = gaugeY(iv);
    c.fillStyle = '#fff'; c.beginPath();
    c.moveTo(GAUGE.x + GAUGE.w + 2, iy); c.lineTo(GAUGE.x + GAUGE.w + 16, iy - 9); c.lineTo(GAUGE.x + GAUGE.w + 16, iy + 9); c.fill();
    c.fillRect(GAUGE.x - 2, iy - 2, GAUGE.w + 4, 4);
  }

  function drawGlove(c, x, y, r) {
    c.save(); c.translate(x, y);
    c.fillStyle = '#fff'; c.fillRect(-r * 0.55, r * 0.55, r * 1.1, r * 0.5);
    const g = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#ff7a6b'); g.addColorStop(1, '#b0101a');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 6.28); c.fill();
    c.lineWidth = 5; c.strokeStyle = '#6d0a0f'; c.stroke();
    c.beginPath(); c.ellipse(-r * 0.75, r * 0.15, r * 0.35, r * 0.5, 0.3, 0, 6.28); c.fill(); c.stroke();
    c.restore();
  }

  function draw() { drawScene(ctx, machine, true); }

  // ---------- 입력 / UI ----------
  function setUI() {
    const map = {
      idle: ['🪙 코인 넣기', hooks.coins() > 0 ? '코인을 넣어주세요' : '코인이 부족해요! 인형을 팔거나 교환기로'],
      ready: [isCombo() ? `펀치! (${hits.length + 1}/3)` : '펀치!', isCombo() ? `${hits.length + 1}번째 펀치! 게이지가 점점 빨라져요` : '게이지 꼭대기에서 펀치!'],
      punch: ['...', '으랏차!'],
      counting: ['...', '점수 측정 중...'],
      result: ['...', (isCombo() ? '평균 ' : '') + (grade ? `${score}점! ${grade}등급 인형 획득` : `${score}점… 300점 이상이면 인형을 받아요`)],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'ready' || (state === 'idle' && hooks.coins() > 0));
    els.status.textContent = msg;
  }

  function action() {
    if (state === 'idle') {
      if (hooks.spendCoin()) {
        state = 'ready'; t = 0; shown = 0; grade = null; hits = [];
        p = Math.random() * 2; v = 1 - Math.abs(p - 1); speed = newSpeed();
        setUI();
      }
    } else if (state === 'ready') {
      score = scoreOf(v); state = 'punch'; t = 0; setUI();
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); draw();
    raf = requestAnimationFrame(frame);
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.addEventListener('pointerdown', () => { if (state === 'ready') action(); });
      machine = MACHINES.find(m => m.type === 'punch');
    },
    open(m) {
      if (machine !== m) {
        if (state === 'ready') hooks.refund(machine.price || 1, '다른 기계로 옮겨서 넣어둔 코인을 돌려받았어요');
        if (state === 'ready') state = 'idle';
        hits = [];
      }
      machine = m;
      const b = hooks.best(bestKey());
      els.extra.textContent = b ? `최고 ${b}점` : '';
      setUI(); draw();
    },
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    action,
    get state() { return state; },
    refresh() { if (els) setUI(); },
    preview(m) {
      const S = 240, cv = document.createElement('canvas');
      cv.width = cv.height = S * 2;
      const c = cv.getContext('2d');
      c.scale(2, 2);
      const g = c.createLinearGradient(0, 0, 0, S);
      g.addColorStop(0, m.theme.inside[0]); g.addColorStop(1, m.theme.inside[1]);
      c.fillStyle = g; c.fillRect(0, 0, S, S);
      c.translate((S - W * 0.4) / 2, 0); c.scale(0.4, 0.4);
      drawScene(c, m, false);
      return cv.toDataURL();
    },
  };
})();
