// 10초 맞추기: 코인 → START → 3초 뒤 숫자가 숨겨짐 → 10.00초에 STOP
const TimerGame = (() => {
  const TARGET = 1000;  // 1/100초 단위
  const HIDE_AT = 3;    // 초
  const LIMIT = 20;     // 이 시간이 지나면 자동 실패
  const TIERS = [['S', 0], ['A', 5], ['B', 12], ['C', 25], ['D', 50]]; // 허용 오차 (1/100초)

  let els, hooks, machine;
  let state = 'idle', t0 = 0, raf = 0;

  const fmt = sec => sec.toFixed(2).padStart(5, '0');

  function tick() {
    if (state !== 'running') return;
    const sec = (performance.now() - t0) / 1000;
    if (sec >= LIMIT) { finish(sec); return; }
    if (sec < HIDE_AT) {
      els.digits.textContent = fmt(sec);
    } else if (!els.screen.classList.contains('hidden')) {
      els.screen.classList.add('hidden');
      els.digits.textContent = '??.??';
      els.sub.textContent = '마음속으로 세어보세요...';
    }
    raf = requestAnimationFrame(tick);
  }

  function finish(sec) {
    cancelAnimationFrame(raf);
    const cs = Math.round(sec * 100);
    const off = cs - TARGET;
    const tier = TIERS.find(([, tol]) => Math.abs(off) <= tol);
    const grade = tier ? tier[0] : null;
    state = 'result';
    els.screen.classList.remove('hidden', 'running');
    els.screen.classList.add(grade ? 'win' : 'lose');
    els.digits.textContent = fmt(cs / 100);
    els.sub.textContent = off === 0 ? '완벽해요! 정확히 10.00초!' : `${off > 0 ? '+' : '−'}${(Math.abs(off) / 100).toFixed(2)}초 ${off > 0 ? '늦었어요' : '빨랐어요'}`;
    const best = hooks.best('timer', Math.abs(off), true);
    els.extra.textContent = `최고 오차 ${(best / 100).toFixed(2)}초`;
    setUI(grade, cs);
    if (grade) {
      const doll = dollsOf(machine.id).find(d => d.grade === grade);
      setTimeout(() => hooks.award(doll, `${fmt(cs / 100)}초! ${grade}등급 달성`), 700);
    }
    setTimeout(() => { if (state === 'result') { state = 'idle'; setUI(); } }, 1200);
  }

  function setUI(grade, cs) {
    const map = {
      idle: ['🪙 코인 넣기', hooks.coins() > 0 ? '코인을 넣어주세요' : '코인이 없어요! 매장의 교환기로'],
      ready: ['START', 'START를 누르면 시작!'],
      running: ['STOP', '정확히 10초에 STOP!'],
      result: ['...', grade ? `${grade}등급 인형 획득!` : cs !== undefined ? '아쉬워요! 오차 0.50초 이내면 인형을 받아요' : ''],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'ready' || state === 'running' || (state === 'idle' && hooks.coins() > 0));
    els.btn.classList.toggle('stop', state === 'running');
    els.status.textContent = msg;
  }

  function resetScreen() {
    els.screen.classList.remove('hidden', 'running', 'win', 'lose');
    els.digits.textContent = '00.00';
    els.sub.textContent = '정확히 10.00초에 멈춰라!';
  }

  function action() {
    if (state === 'idle') {
      if (hooks.spendCoin()) { state = 'ready'; resetScreen(); setUI(); }
    } else if (state === 'ready') {
      state = 'running'; t0 = performance.now();
      els.screen.classList.add('running');
      els.sub.textContent = '3초 뒤 숫자가 사라져요';
      setUI(); tick();
    } else if (state === 'running') {
      finish((performance.now() - t0) / 1000);
    }
  }

  return {
    init(e, h) { els = e; hooks = h; machine = MACHINES.find(m => m.type === 'timer'); },
    open(m) {
      machine = m;
      const b = hooks.best('timer');
      els.extra.textContent = b !== undefined ? `최고 오차 ${(b / 100).toFixed(2)}초` : '';
      if (state !== 'running') setUI();
    },
    start() {},
    // 다른 화면으로 나가면 진행 중인 도전은 취소
    stop() {
      if (state === 'running') { cancelAnimationFrame(raf); state = 'idle'; resetScreen(); setUI(); }
    },
    action,
    get state() { return state; },
    refresh() { if (els && state !== 'running') setUI(); },
    preview(m) {
      const S = 240, cv = document.createElement('canvas');
      cv.width = cv.height = S * 2;
      const c = cv.getContext('2d');
      c.scale(2, 2);
      const g = c.createLinearGradient(0, 0, 0, S);
      g.addColorStop(0, m.theme.inside[0]); g.addColorStop(1, m.theme.inside[1]);
      c.fillStyle = g; c.fillRect(0, 0, S, S);
      c.fillStyle = m.theme.cab2; c.beginPath(); c.roundRect(28, 40, 184, 110, 18); c.fill();
      c.fillStyle = '#071a17'; c.beginPath(); c.roundRect(40, 52, 160, 86, 12); c.fill();
      c.font = 'bold 52px Consolas, "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(80,255,200,.12)'; c.fillText('88.88', 120, 96);
      c.save(); c.shadowColor = '#5cffd0'; c.shadowBlur = 14; c.fillStyle = '#7dffd9'; c.fillText('10.00', 120, 96); c.restore();
      for (let i = 0; i < 9; i++) {
        c.fillStyle = ['#ff5fa2', '#ffd23f', '#4de8ff'][i % 3];
        c.beginPath(); c.arc(40 + i * 20, 34, 5, 0, 6.28); c.fill();
        c.beginPath(); c.arc(40 + i * 20, 158, 5, 0, 6.28); c.fill();
      }
      const bg = c.createRadialGradient(112, 186, 4, 120, 196, 36);
      bg.addColorStop(0, '#ff9a8a'); bg.addColorStop(1, '#d1202e');
      c.fillStyle = '#5a1015'; c.beginPath(); c.ellipse(120, 204, 40, 16, 0, 0, 6.28); c.fill();
      c.fillStyle = bg; c.beginPath(); c.ellipse(120, 194, 34, 22, 0, 0, 6.28); c.fill();
      c.fillStyle = '#fff'; c.font = '900 14px sans-serif'; c.fillText('STOP', 120, 194);
      const pool = dollsOf(m.id);
      DollArt.drawAt(c, pool[0], 34, 206, 16, -0.2);
      DollArt.drawAt(c, pool[2], 206, 206, 16, 0.2);
      return cv.toDataURL();
    },
  };
})();
