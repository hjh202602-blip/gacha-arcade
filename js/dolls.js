// 인형 데이터 + 직접 그리는 인형 렌더러 (이모지/외부 이미지 없음)

// 입수 난이도 등급: 높을수록 잘 안 나오고(weight), 잘 안 잡히고(hold), 잘 미끄러짐(slip)
const GRADES = {
  S: { name: '전설',       color: '#ffd23f', sell: 50, weight: 1.5, hold: 0.45, slip: 0.85, r: 28 },
  A: { name: '매우 어려움', color: '#ff8c42', sell: 15, weight: 5,   hold: 0.6,  slip: 0.7,  r: 27 },
  B: { name: '어려움',     color: '#c77dff', sell: 6, weight: 14,  hold: 0.75, slip: 0.55, r: 26 },
  C: { name: '보통',       color: '#5bc0eb', sell: 3, weight: 30,  hold: 0.9,  slip: 0.4,  r: 25 },
  D: { name: '쉬움',       color: '#8bd17c', sell: 1, weight: 50,  hold: 1.0,  slip: 0.25, r: 24 },
};
const GRADE_ORDER = ['S', 'A', 'B', 'C', 'D'];

// 매장에 있는 뽑기 기계들. power가 낮을수록 집게 힘이 약함
const MACHINES = [
  { id: 'animal', type: 'claw', price: 2, name: '몽글 동물원', level: 1, power: 1.0,
    desc: '처음이라면 여기부터! 말랑한 동물 친구들',
    theme: { cab: '#ff7eb3', cab2: '#c94f86', inside: ['#ffd6e7', '#f2a3c4'], floor: '#b8487c' } },
  { id: 'dessert', type: 'claw', unlock: 20, price: 2, name: '달콤 디저트', level: 2, power: 0.9,
    desc: '보기만 해도 달달한 디저트 인형',
    theme: { cab: '#ffb347', cab2: '#d17d22', inside: ['#fff1d6', '#ffd08a'], floor: '#b9732a' } },
  { id: 'space', type: 'claw', unlock: 60, name: '우주 몬스터', level: 3, power: 0.8,
    desc: '먼 은하에서 온 이상하고 귀여운 몬스터',
    theme: { cab: '#6a6ff0', cab2: '#3b34a8', inside: ['#1b1645', '#3d2e80'], floor: '#2a2266' } },
  { id: 'treasure', type: 'claw', unlock: 150, name: '전설의 보물섬', level: 4, power: 0.65,
    desc: '집게 힘이 약하다는 소문… 전설 인형이 잠든 곳',
    theme: { cab: '#e8b33a', cab2: '#9c6c10', inside: ['#3a2812', '#6b4a1e'], floor: '#4a3010' } },

  // ---- 인형뽑기가 아닌 기계들 ----
  { id: 'capsule', type: 'capsule', price: 3, name: '캡슐 토이', level: 2, levelText: '운에 맡기기',
    desc: '레버를 돌리면 캡슐이 데구루루. 황금 캡슐이 나오면 대박!',
    theme: { cab: '#ff6b6b', cab2: '#b83a4a', inside: ['#ffe8e0', '#ffc9bd'], floor: '#a83246' } },
  { id: 'punch', type: 'punch', price: 2, name: '펀치 챔피언', level: 3, levelText: '타이밍',
    desc: '게이지가 꼭대기에 닿는 순간 펀치! 점수가 높을수록 좋은 인형',
    theme: { cab: '#ff5a36', cab2: '#a8321b', inside: ['#2b1a1a', '#4a2424'], floor: '#3a1a12' },
    rules: { S: '950점 이상', A: '850점 이상', B: '700점 이상', C: '500점 이상', D: '300점 이상' } },
  { id: 'timer', type: 'timer', unlock: 25, name: '10초 챌린지', level: 3, levelText: '집중력',
    desc: '3초 뒤 숫자가 사라진다. 정확히 10초에 멈춰라!',
    theme: { cab: '#2ec4b6', cab2: '#167a72', inside: ['#d9fffa', '#9fe8df'], floor: '#11635c' },
    rules: { S: '정확히 10.00초', A: '오차 0.05초 이내', B: '오차 0.12초 이내', C: '오차 0.25초 이내', D: '오차 0.50초 이내' } },
  { id: 'keyring', type: 'keyring', unlock: 40, price: 2, name: '열쇠고리 걸기', level: 2, levelText: '타이밍 · 고리 걸기',
    desc: '지나가는 열쇠고리의 고리에 갈고리를 쏙! 고리가 작을수록 귀한 키링',
    theme: { cab: '#7c5cff', cab2: '#4a32b8', inside: ['#efe9ff', '#cbbdff'], floor: '#3a2690' },
    rules: { S: '고리 아주아주 작음', A: '고리 아주 작음', B: '고리 작음', C: '고리 보통', D: '고리 큼' } },
  { id: 'keymaster', type: 'keymaster', unlock: 80, name: '키 마스터', level: 4, levelText: '정밀 조준',
    desc: '열쇠를 가로·세로로 멈춰 사물함 열쇠구멍에 꽂아라',
    theme: { cab: '#3a3f58', cab2: '#1e2133', inside: ['#1b1d2c', '#2e3352'], floor: '#111320' },
    rules: { S: '열쇠구멍 9×14', A: '열쇠구멍 13×18', B: '열쇠구멍 17×22', C: '열쇠구멍 22×26', D: '열쇠구멍 28×32' } },
  { id: 'scissors', type: 'scissors', unlock: 50, name: '싹둑 가위', level: 3, levelText: '누르고 떼기',
    desc: '꾹 누르면 가위가 가고, 떼면 싹둑! 흔들리는 실을 잘라라',
    theme: { cab: '#4cc9f0', cab2: '#1f7fa3', inside: ['#e8fbff', '#b3ecff'], floor: '#176b8a' },
    rules: { S: '실이 아주 심하게 흔들림', A: '많이 흔들림', B: '흔들림', C: '살짝 흔들림', D: '거의 안 흔들림' } },
  { id: 'stacker', type: 'stacker', unlock: 100, name: '스태커', level: 4, levelText: '타이밍 · 쌓기',
    desc: '블록을 멈춰 한 층씩 쌓기. 꼭대기 12층이면 전설!',
    theme: { cab: '#ff4fa0', cab2: '#a3195e', inside: ['#160a1e', '#2a1236'], floor: '#0b0510' },
    rules: { S: '꼭대기 12층', A: '10층', B: '8층', C: '6층', D: '4층' } },
  // weights: 이 기계만의 등급 출현 가중치 (없으면 GRADES의 weight)
  { id: 'pusher', type: 'pusher', unlock: 30, name: '코인 푸셔', level: 2, levelText: '밀어내기',
    weights: { S: 6, A: 14, B: 24, C: 30, D: 26 },
    desc: '코인을 떨어뜨려 밀어내기! 앞으로 떨어진 코인은 내 것, 인형도 밀어서 떨어뜨려요',
    theme: { cab: '#ffb000', cab2: '#b86e00', inside: ['#2b1f3a', '#3d2a55'], floor: '#1a1124' } },

  // ---- 새 기계: 반응속도 · 암기 ----
  { id: 'flash', type: 'reaction', unlock: 35, price: 2, gimmick: 'fake', name: '번개 반응', level: 3, levelText: '반응속도',
    desc: '빨간불이 초록불로 바뀌는 순간 탭! 가짜 노란 번쩍임에 속지 마세요',
    theme: { cab: '#ffd60a', cab2: '#b38f00', inside: ['#16161f', '#24243a'], floor: '#0b0b12' },
    rules: { S: '0.19초 이내', A: '0.23초 이내', B: '0.28초 이내', C: '0.34초 이내', D: '0.45초 이내' } },
  { id: 'mole', type: 'mole', unlock: 45, price: 2, name: '쏙쏙 터치', level: 3, levelText: '반응속도 · 터치',
    desc: '구멍에서 쏙 나오는 인형을 재빨리 콕! 폭탄은 누르면 감점',
    theme: { cab: '#8bd17c', cab2: '#4f8f42', inside: ['#bfe8a8', '#7fbf63'], floor: '#3f7a33' },
    rules: { S: '24개 중 22개 이상', A: '19개 이상', B: '15개 이상', C: '11개 이상', D: '7개 이상' } },
  { id: 'melody', type: 'memory', unlock: 70, price: 2, name: '따라해 멜로디', level: 3, levelText: '암기력',
    desc: '빛나는 순서를 기억해서 똑같이 눌러요. 한 판마다 하나씩 길어져요',
    theme: { cab: '#b28dff', cab2: '#6f4fd1', inside: ['#1d1638', '#2f2458'], floor: '#140f28' },
    rules: { S: '12단계 성공', A: '9단계', B: '7단계', C: '5단계', D: '3단계' } },

  // ---- 새 기계: 기존 기계에 기믹을 더한 버전 ----
  { id: 'randtimer', type: 'timer', unlock: 60, gimmick: 'random', name: '럭키 타이머', level: 4, levelText: '집중력 · 랜덤 목표',
    desc: '목표 시간이 매번 바뀌고, 1.5초 만에 숫자가 사라져요',
    theme: { cab: '#ff8fab', cab2: '#c2476a', inside: ['#ffe3ec', '#ffb8cb'], floor: '#9e3554' },
    rules: { S: '목표와 정확히 같게', A: '오차 0.05초 이내', B: '오차 0.12초 이내', C: '오차 0.25초 이내', D: '오차 0.50초 이내' } },
  { id: 'zigzag', type: 'keyring', unlock: 55, gimmick: 'zigzag', name: '지그재그 키링', level: 3, levelText: '타이밍 · 왔다 갔다',
    desc: '벨트가 빨라졌다 느려졌다, 거꾸로도 가요. 흐름을 읽어야 걸려요',
    theme: { cab: '#00c2a8', cab2: '#00806f', inside: ['#e0fffa', '#a8f0e4'], floor: '#006b5d' },
    rules: { S: '고리 아주아주 작음', A: '고리 아주 작음', B: '고리 작음', C: '고리 보통', D: '고리 큼' } },
  { id: 'pingpong', type: 'scissors', unlock: 65, gimmick: 'pingpong', name: '왕복 가위', level: 3, levelText: '탭 타이밍',
    desc: '가위가 혼자 왔다 갔다! 한 번 탭하면 출발, 다시 탭하면 싹둑. 갈수록 빨라져요',
    theme: { cab: '#ff9f1c', cab2: '#c46a00', inside: ['#fff4e0', '#ffd9a0'], floor: '#a85a00' },
    rules: { S: '실이 아주 심하게 흔들림', A: '많이 흔들림', B: '흔들림', C: '살짝 흔들림', D: '거의 안 흔들림' } },
  { id: 'slidekey', type: 'keymaster', unlock: 120, gimmick: 'slide', name: '미끄럼 키 마스터', level: 4, levelText: '정밀 조준 · 움직이는 구멍',
    desc: '열쇠구멍이 좌우로 스르륵 움직여요. 구멍이 올 자리를 예측하세요',
    theme: { cab: '#5a3d8a', cab2: '#2e1d52', inside: ['#1a1230', '#2c2050'], floor: '#110b20' },
    rules: { S: '열쇠구멍 9×14', A: '열쇠구멍 13×18', B: '열쇠구멍 17×22', C: '열쇠구멍 22×26', D: '열쇠구멍 28×32' } },
  { id: 'luckycap', type: 'capsule', unlock: 50, price: 3, gimmick: 'lucky', name: '골든 레버 캡슐', level: 3, levelText: '운 + 타이밍',
    desc: '빙글빙글 도는 레버를 금색 칸에서 멈추면 황금 캡슐이 잘 나와요',
    theme: { cab: '#e8b33a', cab2: '#a8740c', inside: ['#fff6dc', '#ffe3a0'], floor: '#8a5c08' } },
  { id: 'combopunch', type: 'punch', unlock: 75, price: 2, gimmick: 'combo', name: '삼연타 펀치', level: 4, levelText: '타이밍 × 3',
    desc: '세 번 연속 펀치! 칠 때마다 게이지가 빨라지고, 세 번의 평균 점수로 결정',
    theme: { cab: '#3d7bff', cab2: '#1f4bb8', inside: ['#141a33', '#1f2a52'], floor: '#0d1226' },
    rules: { S: '평균 950점 이상', A: '평균 850점 이상', B: '평균 700점 이상', C: '평균 500점 이상', D: '평균 300점 이상' } },
];

const BASE_DOLLS = [
  // 몽글 동물원
  { id: 'mongsil', machine: 'animal', grade: 'D', name: '몽실곰', desc: '안으면 몽실몽실. 매장의 터줏대감.',
    shape: 'round', color: '#c8956b', belly: '#f1d3b3', ears: 'round', eyes: 'dot', mouth: 'smile', cheeks: true },
  { id: 'torang', machine: 'animal', grade: 'D', name: '토랑이', desc: '리본을 제일 아끼는 하얀 토끼.',
    shape: 'tall', color: '#f6f2ee', inner: '#ffc1d3', ears: 'bunny', eyes: 'dot', mouth: 'w', cheeks: true, extras: ['bow'], accent: '#ff5c8a' },
  { id: 'nyang', machine: 'animal', grade: 'C', name: '냥냥치즈', desc: '이마 무늬가 매력 포인트인 치즈냥.',
    shape: 'round', color: '#f6a04d', belly: '#fff1dc', ears: 'cat', eyes: 'happy', mouth: 'cat', cheeks: true, extras: ['stripes'] },
  { id: 'bbang', machine: 'animal', grade: 'C', name: '볼빵햄찌', desc: '볼에 해바라기씨를 잔뜩 숨겼다.',
    shape: 'wide', color: '#f3c58a', belly: '#fffaf0', ears: 'smallround', eyes: 'sparkle', mouth: 'o', cheeks: true },
  { id: 'cloud', machine: 'animal', grade: 'B', name: '구름양', desc: '늘 졸린 양. 털이 미끄러워 잘 빠진다.',
    shape: 'wide', color: '#fbfbff', ears: 'none', eyes: 'sleepy', mouth: 'smile', cheeks: true, extras: ['fluff'] },

  // 달콤 디저트
  { id: 'pudding', machine: 'dessert', grade: 'D', name: '푸딩푸', desc: '흔들흔들 캐러멜 모자를 썼다.',
    shape: 'round', color: '#ffd36b', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['cream'], cream: '#9b5a2b' },
  { id: 'macaron', machine: 'dessert', grade: 'C', name: '마카롱롱', desc: '가운데 크림이 제일 자신 있다.',
    shape: 'wide', color: '#ffb3c7', ears: 'none', eyes: 'happy', mouth: 'w', cheeks: true, extras: ['macaron'] },
  { id: 'donut', machine: 'dessert', grade: 'C', name: '도넛츠', desc: '스프링클을 뿌리면 기분이 좋아진다.',
    shape: 'round', color: '#e9a35f', ears: 'none', eyes: 'dot', mouth: 'o', cheeks: true, extras: ['cream', 'sprinkles'], cream: '#ff8fb8' },
  { id: 'berry', machine: 'dessert', grade: 'B', name: '딸기모찌', desc: '새콤달콤. 씨앗 하나하나가 소중하다.',
    shape: 'round', color: '#ff5c74', ears: 'none', eyes: 'sparkle', mouth: 'smile', cheeks: true, extras: ['seeds', 'leaf'] },
  { id: 'cake', machine: 'dessert', grade: 'A', name: '케이크공주', desc: '체리 왕관을 쓴 디저트 왕국의 공주.',
    shape: 'tall', color: '#fff5e1', ears: 'none', eyes: 'sparkle', mouth: 'smile', cheeks: true, extras: ['cream', 'cherry', 'bow'], cream: '#ffffff', accent: '#ff7aa8' },

  // 우주 몬스터
  { id: 'oneye', machine: 'space', grade: 'C', name: '외눈별이', desc: '눈이 하나라 윙크를 못 한다.',
    shape: 'round', color: '#7ee0b5', ears: 'antenna', accent: '#ffe66d', eyes: 'one', mouth: 'smile', cheeks: false },
  { id: 'ppul', machine: 'space', grade: 'B', name: '뿔뿔이', desc: '무서워 보이지만 겁이 많다.',
    shape: 'round', color: '#9b7bff', ears: 'horns', eyes: 'dot', mouth: 'fang', cheeks: true, extras: ['spots'] },
  { id: 'octo', machine: 'space', grade: 'B', name: '문어별', desc: '다리가 다섯 개라 늘 한 개가 남는다.',
    shape: 'round', color: '#ff7aa8', ears: 'none', eyes: 'happy', mouth: 'o', cheeks: true, extras: ['tentacles'] },
  { id: 'comet', machine: 'space', grade: 'A', name: '혜성냥', desc: '이마의 별로 밤하늘을 날아다닌다.',
    shape: 'round', color: '#4a478f', inner: '#9c8cff', belly: '#6b66b8', ears: 'cat', eyes: 'sparkle', mouth: 'cat', cheeks: true, extras: ['starmark', 'sparkles'] },
  { id: 'galaxy', machine: 'space', grade: 'S', name: '은하고래', desc: '몸속에 작은 은하가 흐르는 전설의 고래.',
    shape: 'wide', color: 'galaxy', ears: 'none', eyes: 'happy', mouth: 'smile', cheeks: true, extras: ['galaxystars', 'spout', 'sparkles'] },

  // 전설의 보물섬
  { id: 'pirate', machine: 'treasure', grade: 'B', name: '해적곰', desc: '보물 지도를 잃어버린 지 3년째.',
    shape: 'round', color: '#8a5a3b', belly: '#d9b38c', ears: 'round', eyes: 'dot', mouth: 'smile', cheeks: false, extras: ['hat', 'eyepatch'] },
  { id: 'jelly', machine: 'treasure', grade: 'A', name: '진주해파리', desc: '반짝이는 진주를 품고 둥실둥실.',
    shape: 'round', color: '#cfe9ff', ears: 'none', eyes: 'sleepy', mouth: 'smile', cheeks: true, extras: ['tentacles', 'pearl', 'sparkles'] },
  { id: 'kingbear', machine: 'treasure', grade: 'A', name: '황금왕관곰', desc: '몽실곰이 보물섬에서 왕이 되었다.',
    shape: 'round', color: '#ffcc33', belly: '#fff0b3', ears: 'round', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['crown', 'sparkles'] },
  { id: 'rainbow', machine: 'treasure', grade: 'S', name: '무지개룡', desc: '비 온 뒤에만 모습을 드러낸다는 아기 용.',
    shape: 'tall', color: 'rainbow', ears: 'horns', eyes: 'sparkle', mouth: 'fang', cheeks: true, extras: ['wings', 'sparkles'] },
  { id: 'guardian', machine: 'treasure', grade: 'S', name: '별빛수호자', desc: '보물섬을 지키는 별빛 천사. 뽑으면 행운이!',
    shape: 'round', color: '#fff8d6', ears: 'none', eyes: 'happy', mouth: 'w', cheeks: true, extras: ['halo', 'wings', 'starmark', 'sparkles'] },

  // 캡슐 토이 (순수 운)
  { id: 'kongtteok', machine: 'capsule', grade: 'D', name: '콩떡이', desc: '캡슐 속에서 낮잠 자던 완두콩 떡.',
    shape: 'round', color: '#b8e6a0', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true },
  { id: 'jellybear', machine: 'capsule', grade: 'D', name: '젤리곰', desc: '말랑말랑 딸기맛. 먹으면 안 돼요.',
    shape: 'round', color: '#ff9ecb', ears: 'round', eyes: 'dot', mouth: 'w', cheeks: true },
  { id: 'mushroom', machine: 'capsule', grade: 'C', name: '버섯돌이', desc: '비 오는 날 쑥쑥 자라는 꼬마 버섯.',
    shape: 'round', color: '#fff2e0', ears: 'none', eyes: 'sparkle', mouth: 'smile', cheeks: true, extras: ['cream', 'capdots'], cream: '#e8304a' },
  { id: 'penggle', machine: 'capsule', grade: 'C', name: '펭글이', desc: '뒤뚱뒤뚱. 캡슐이 제일 시원하다.',
    shape: 'tall', color: '#3a4a6b', belly: '#ffffff', ears: 'none', eyes: 'sparkle', mouth: 'beak', cheeks: true },
  { id: 'ghost', machine: 'capsule', grade: 'B', name: '꼬마유령', desc: '놀래키려다 늘 먼저 놀란다.',
    shape: 'tall', color: '#f4f4ff', ears: 'none', eyes: 'happy', mouth: 'o', cheeks: true, extras: ['tentacles'] },
  { id: 'watermelon', machine: 'capsule', grade: 'A', name: '수박냥', desc: '여름에만 나온다는 시원한 고양이.',
    shape: 'round', color: '#5cbf60', belly: '#ff6b7a', ears: 'cat', eyes: 'happy', mouth: 'cat', cheeks: true, extras: ['melonstripes'] },
  { id: 'golddragon', machine: 'capsule', grade: 'S', name: '황금아기용', desc: '황금 캡슐에서만 태어나는 행운의 용.',
    shape: 'round', color: '#ffd23f', ears: 'horns', eyes: 'sparkle', mouth: 'fang', cheeks: true, extras: ['wings', 'crown', 'sparkles'] },

  // 펀치 챔피언 (점수)
  { id: 'softpunch', machine: 'punch', grade: 'D', name: '말랑펀치', desc: '펀치보다 하이파이브를 좋아한다.',
    shape: 'round', color: '#ffd0b0', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['gloves'], accent: '#e8304a' },
  { id: 'boxham', machine: 'punch', grade: 'C', name: '복싱햄찌', desc: '해바라기씨를 걸고 매일 연습 중.',
    shape: 'wide', color: '#f3c58a', belly: '#fffaf0', ears: 'smallround', eyes: 'sparkle', mouth: 'fang', cheeks: true, extras: ['headband', 'gloves'], accent: '#e8304a' },
  { id: 'musclebear', machine: 'punch', grade: 'B', name: '근육곰', desc: '팔굽혀펴기 1000개가 하루 일과.',
    shape: 'wide', color: '#9c6b4a', belly: '#d9b38c', ears: 'round', eyes: 'happy', mouth: 'fang', cheeks: false, extras: ['headband', 'gloves'], accent: '#3d7bff' },
  { id: 'fireFist', machine: 'punch', grade: 'A', name: '불꽃주먹', desc: '주먹을 쥐면 몸이 뜨거워진다.',
    shape: 'round', color: '#ff6b3d', belly: '#ffd36b', ears: 'cat', eyes: 'sparkle', mouth: 'fang', cheeks: false, extras: ['headband', 'gloves', 'sparkles'], accent: '#ffd23f' },
  { id: 'champion', machine: 'punch', grade: 'S', name: '전설의챔피언', desc: '999점을 찍은 자만이 만날 수 있다.',
    shape: 'round', color: '#5a5470', belly: '#8a84a8', ears: 'round', eyes: 'happy', mouth: 'smile', cheeks: true, extras: ['crown', 'belt', 'gloves', 'sparkles'], accent: '#ffd23f' },

  // 10초 챌린지 (정확도)
  { id: 'tiktok', machine: 'timer', grade: 'D', name: '째깍이', desc: '배 속 시계가 늘 조금 느리다.',
    shape: 'round', color: '#bfe3ff', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['clock'] },
  { id: 'sandcat', machine: 'timer', grade: 'C', name: '모래시계냥', desc: '모래가 다 떨어질 때까지 잔다.',
    shape: 'round', color: '#f2d39b', ears: 'cat', eyes: 'sleepy', mouth: 'cat', cheeks: true, extras: ['stripes'] },
  { id: 'owl', machine: 'timer', grade: 'B', name: '부엉박사', desc: '1초를 1000조각으로 나눠 본다.',
    shape: 'round', color: '#a77b5a', belly: '#f0dcc0', ears: 'cat', eyes: 'dot', mouth: 'beak', cheeks: false, extras: ['glasses'] },
  { id: 'secbunny', machine: 'timer', grade: 'A', name: '초침토끼', desc: '한 번도 지각한 적이 없는 토끼.',
    shape: 'tall', color: '#ffffff', inner: '#bde7ff', ears: 'bunny', eyes: 'sparkle', mouth: 'w', cheeks: true, extras: ['clock', 'bow'], accent: '#2ec4b6' },
  { id: 'chronos', machine: 'timer', grade: 'S', name: '시간수호자', desc: '정확히 10.00초에 멈춘 사람에게만 나타난다.',
    shape: 'round', color: 'galaxy', ears: 'none', eyes: 'happy', mouth: 'smile', cheeks: true, extras: ['galaxystars', 'halo', 'clock', 'wings', 'sparkles'] },

  // 열쇠고리 걸기 (고리 크기)
  { id: 'kr_star', machine: 'keyring', grade: 'D', name: '별똥키링', desc: '가방에 달면 소원이 하나 이뤄진대요.',
    shape: 'round', color: '#ffe066', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['keyring', 'starmark'] },
  { id: 'kr_cloud', machine: 'keyring', grade: 'D', name: '뭉게키링', desc: '만지면 폭신. 비 오는 날엔 조금 무거워진다.',
    shape: 'wide', color: '#f7f9ff', ears: 'none', eyes: 'sleepy', mouth: 'w', cheeks: true, extras: ['keyring'] },
  { id: 'kr_peach', machine: 'keyring', grade: 'C', name: '말랑복숭', desc: '달콤한 냄새가 날 것 같은 복숭아.',
    shape: 'round', color: '#ffb3a7', belly: '#ffd6cc', ears: 'none', eyes: 'happy', mouth: 'smile', cheeks: true, extras: ['keyring'] },
  { id: 'kr_frog', machine: 'keyring', grade: 'C', name: '개굴키링', desc: '열쇠를 잃어버리면 개굴 하고 알려준다.',
    shape: 'wide', color: '#7ed957', belly: '#d9f7c4', ears: 'smallround', inner: '#ffffff', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['keyring'] },
  { id: 'kr_cat', machine: 'keyring', grade: 'B', name: '밤냥키링', desc: '밤이 되면 눈이 반짝인다는 소문.',
    shape: 'round', color: '#8a86a8', inner: '#ffb3c7', ears: 'cat', eyes: 'sparkle', mouth: 'cat', cheeks: true, extras: ['keyring'] },
  { id: 'kr_heart', machine: 'keyring', grade: 'A', name: '하트곰키링', desc: '선물하면 꼭 마음이 전해진다.',
    shape: 'round', color: '#ff5c8a', belly: '#ffc2d4', ears: 'round', eyes: 'sparkle', mouth: 'w', cheeks: true, extras: ['keyring', 'sparkles'] },
  { id: 'kr_moon', machine: 'keyring', grade: 'S', name: '달토끼키링', desc: '보름달에서 떨어진 단 하나의 키링.',
    shape: 'tall', color: '#fff6c8', inner: '#ffe066', ears: 'bunny', eyes: 'happy', mouth: 'w', cheeks: true, extras: ['keyring', 'halo', 'sparkles'] },

  // 키 마스터 (열쇠구멍 크기)
  { id: 'km_bear', machine: 'keymaster', grade: 'D', name: '열쇠곰', desc: '사물함 지킴이. 열쇠를 목에 걸고 산다.',
    shape: 'round', color: '#d4a373', belly: '#f3dcc0', ears: 'round', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['keyring'] },
  { id: 'km_bunny', machine: 'keymaster', grade: 'D', name: '금고토끼', desc: '당근을 금고에 숨겨둔다.',
    shape: 'tall', color: '#e6e1ff', inner: '#c7b8ff', ears: 'bunny', eyes: 'happy', mouth: 'w', cheeks: true },
  { id: 'km_robot', machine: 'keymaster', grade: 'C', name: '로봇군', desc: '삐빅. 열쇠구멍 측정 완료.',
    shape: 'round', color: '#a8b5c8', ears: 'antenna', accent: '#ff5c8a', eyes: 'one', mouth: 'smile', cheeks: false, extras: ['spots'] },
  { id: 'km_pig', machine: 'keymaster', grade: 'B', name: '저금돼지', desc: '동전을 먹을수록 행복해진다.',
    shape: 'wide', color: '#ffb6c9', ears: 'cat', inner: '#ff8fab', eyes: 'dot', mouth: 'o', cheeks: true, extras: ['starmark'] },
  { id: 'km_lion', machine: 'keymaster', grade: 'A', name: '사자왕', desc: '갈기 속에 황금 열쇠를 숨겼다.',
    shape: 'round', color: '#f4b942', ears: 'none', eyes: 'sparkle', mouth: 'cat', cheeks: true, extras: ['fluff', 'crown'] },
  { id: 'km_diamond', machine: 'keymaster', grade: 'S', name: '다이아펭', desc: '가장 작은 열쇠구멍 너머의 보물.',
    shape: 'tall', color: '#9fd8ff', belly: '#ffffff', ears: 'none', eyes: 'sparkle', mouth: 'beak', cheeks: true, extras: ['crown', 'sparkles'] },

  // 싹둑 가위 (흔들림)
  { id: 'sc_apple', machine: 'scissors', grade: 'D', name: '사과콩', desc: '실에 매달려 그네 타는 게 취미.',
    shape: 'round', color: '#ff6b6b', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['leaf'] },
  { id: 'sc_banana', machine: 'scissors', grade: 'C', name: '바나냥', desc: '노랗게 익으면 더 귀여워진다.',
    shape: 'tall', color: '#ffe066', inner: '#fff3b0', ears: 'cat', eyes: 'happy', mouth: 'cat', cheeks: true },
  { id: 'sc_grape', machine: 'scissors', grade: 'B', name: '포도방울', desc: '흔들릴 때마다 포도알이 반짝.',
    shape: 'round', color: '#9b6bd1', ears: 'none', eyes: 'sparkle', mouth: 'o', cheeks: true, extras: ['spots', 'leaf'] },
  { id: 'sc_cherry', machine: 'scissors', grade: 'A', name: '체리방울', desc: '바람만 불어도 데굴데굴 흔들린다.',
    shape: 'round', color: '#e8304a', ears: 'none', eyes: 'sparkle', mouth: 'w', cheeks: true, extras: ['cherry', 'sparkles'] },
  { id: 'sc_jelly', machine: 'scissors', grade: 'S', name: '무지개젤리', desc: '가장 가는 실에 매달린 전설의 젤리.',
    shape: 'round', color: 'rainbow', ears: 'none', eyes: 'happy', mouth: 'smile', cheeks: true, extras: ['halo', 'sparkles'] },

  // 스태커 (쌓은 층수)
  { id: 'st_block', machine: 'stacker', grade: 'D', name: '블록이', desc: '네모나게 살고 싶은 동그라미.',
    shape: 'wide', color: '#5bc0eb', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true },
  { id: 'st_bear', machine: 'stacker', grade: 'C', name: '탑쌓곰', desc: '블록 6층까지는 눈 감고도 쌓는다.',
    shape: 'round', color: '#c8956b', belly: '#f1d3b3', ears: 'round', eyes: 'happy', mouth: 'smile', cheeks: true, extras: ['headband'], accent: '#ffd23f' },
  { id: 'st_crane', machine: 'stacker', grade: 'B', name: '기중기냥', desc: '안경을 쓰면 블록이 두 배로 잘 보인다.',
    shape: 'round', color: '#ffb347', ears: 'cat', eyes: 'dot', mouth: 'cat', cheeks: true, extras: ['glasses'] },
  { id: 'st_sky', machine: 'stacker', grade: 'A', name: '하늘고래', desc: '10층 높이 구름 위를 헤엄친다.',
    shape: 'wide', color: '#7ec8ff', belly: '#e3f4ff', ears: 'none', eyes: 'happy', mouth: 'smile', cheeks: true, extras: ['spout'] },
  { id: 'st_king', machine: 'stacker', grade: 'S', name: '꼭대기왕', desc: '12층 꼭대기에 오른 자만 만나는 왕.',
    shape: 'round', color: '#ffd23f', ears: 'horns', eyes: 'sparkle', mouth: 'fang', cheeks: true, extras: ['crown', 'wings', 'sparkles'] },

  // 코인 푸셔 (출현 확률)
  { id: 'pu_bun', machine: 'pusher', grade: 'D', name: '동전빵', desc: '동전 모양 붕어빵. 따끈따끈하다.',
    shape: 'wide', color: '#f2b45a', belly: '#ffd98a', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['starmark'] },
  { id: 'pu_mouse', machine: 'pusher', grade: 'C', name: '짤랑쥐', desc: '주머니에서 늘 동전 소리가 난다.',
    shape: 'round', color: '#c9c9d6', inner: '#ffb3c7', ears: 'round', eyes: 'sparkle', mouth: 'w', cheeks: true },
  { id: 'pu_chick', machine: 'pusher', grade: 'B', name: '금병아리', desc: '황금알을 낳을 꿈을 꾸는 병아리.',
    shape: 'round', color: '#ffe680', ears: 'none', eyes: 'dot', mouth: 'beak', cheeks: true, extras: ['wings'] },
  { id: 'pu_dragon', machine: 'pusher', grade: 'A', name: '보물지킴용', desc: '동전 더미 위에서 낮잠 자는 용.',
    shape: 'wide', color: '#5cbf60', belly: '#ffe9a8', ears: 'horns', eyes: 'happy', mouth: 'fang', cheeks: true, extras: ['spots'] },
  { id: 'pu_king', machine: 'pusher', grade: 'S', name: '동전왕', desc: '세상 모든 동전의 주인. 벨트도 순금.',
    shape: 'round', color: '#ffd23f', belly: '#fff0b3', ears: 'round', eyes: 'sparkle', mouth: 'smile', cheeks: true, extras: ['crown', 'belt', 'sparkles'] },
  // 번개 반응
  { id: 'fl_spark', machine: 'flash', grade: 'D', name: '찌릿콩', desc: '만지면 살짝 찌릿. 정전기를 모으는 중.',
    shape: 'round', color: '#ffe45c', ears: 'antenna', accent: '#5ee6ff', eyes: 'dot', mouth: 'smile', cheeks: true },
  { id: 'fl_bolt', machine: 'flash', grade: 'C', name: '번개토끼', desc: '번개처럼 뛰지만 금방 지친다.',
    shape: 'tall', color: '#fff6c8', inner: '#ffd60a', ears: 'bunny', eyes: 'sparkle', mouth: 'w', cheeks: true, extras: ['starmark'] },
  { id: 'fl_owl', machine: 'flash', grade: 'B', name: '눈번쩍부엉', desc: '밤에도 눈 한 번 깜빡이지 않는다.',
    shape: 'round', color: '#7a6a8f', belly: '#d9cfe8', ears: 'cat', eyes: 'sparkle', mouth: 'beak', cheeks: false, extras: ['glasses'] },
  { id: 'fl_cheetah', machine: 'flash', grade: 'A', name: '치타번개', desc: '0.2초면 매장 끝까지 달린다.',
    shape: 'round', color: '#f4b942', belly: '#fff0c8', ears: 'cat', eyes: 'happy', mouth: 'cat', cheeks: true, extras: ['spots', 'sparkles'] },
  { id: 'fl_thunder', machine: 'flash', grade: 'S', name: '천둥용', desc: '번개보다 먼저 도착하는 전설의 용.',
    shape: 'tall', color: 'galaxy', ears: 'horns', eyes: 'sparkle', mouth: 'fang', cheeks: true, extras: ['wings', 'galaxystars', 'sparkles'] },

  // 쏙쏙 터치
  { id: 'ml_sprout', machine: 'mole', grade: 'D', name: '새싹콩', desc: '땅속에서 쏙 올라온 새싹.',
    shape: 'round', color: '#b8e6a0', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['leaf'] },
  { id: 'ml_digger', machine: 'mole', grade: 'C', name: '땅콩굴이', desc: '굴 파기 선수. 코가 늘 흙투성이.',
    shape: 'wide', color: '#a77b5a', belly: '#e8cfb0', ears: 'smallround', eyes: 'sleepy', mouth: 'o', cheeks: true },
  { id: 'ml_carrot', machine: 'mole', grade: 'B', name: '당근토끼', desc: '당근밭 아래에 비밀 굴이 있다.',
    shape: 'tall', color: '#ff9a3c', inner: '#ffd0a8', ears: 'bunny', eyes: 'happy', mouth: 'w', cheeks: true, extras: ['leaf'] },
  { id: 'ml_worm', machine: 'mole', grade: 'A', name: '꿈틀애벌레', desc: '나비가 되는 꿈을 꾸며 꿈틀꿈틀.',
    shape: 'tall', color: '#9be36b', belly: '#e6ffd0', ears: 'antenna', accent: '#ff8fc0', eyes: 'sparkle', mouth: 'smile', cheeks: true, extras: ['spots', 'sparkles'] },
  { id: 'ml_king', machine: 'mole', grade: 'S', name: '흙의왕', desc: '모든 굴은 이 왕의 궁전으로 통한다.',
    shape: 'wide', color: '#8a5a3b', belly: '#ffe9a8', ears: 'round', eyes: 'happy', mouth: 'smile', cheeks: true, extras: ['crown', 'belt', 'sparkles'] },

  // 따라해 멜로디
  { id: 'me_note', machine: 'melody', grade: 'D', name: '음표콩', desc: '도레미 중에 도를 제일 좋아한다.',
    shape: 'round', color: '#c9b6ff', ears: 'none', eyes: 'dot', mouth: 'o', cheeks: true, extras: ['starmark'] },
  { id: 'me_bird', machine: 'melody', grade: 'C', name: '노래새', desc: '한 번 들은 노래는 다 따라 부른다.',
    shape: 'round', color: '#7ec8ff', belly: '#e3f4ff', ears: 'none', eyes: 'happy', mouth: 'beak', cheeks: true, extras: ['wings'] },
  { id: 'me_drum', machine: 'melody', grade: 'B', name: '북치는곰', desc: '박자가 틀리면 처음부터 다시 친다.',
    shape: 'wide', color: '#c8956b', belly: '#f1d3b3', ears: 'round', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['headband'], accent: '#b28dff' },
  { id: 'me_piano', machine: 'melody', grade: 'A', name: '건반고래', desc: '헤엄칠 때마다 등에서 건반 소리가 난다.',
    shape: 'wide', color: '#3a4a6b', belly: '#ffffff', ears: 'none', eyes: 'sparkle', mouth: 'smile', cheeks: true, extras: ['stripes', 'spout'] },
  { id: 'me_maestro', machine: 'melody', grade: 'S', name: '지휘자냥', desc: '12마디를 외운 자에게만 지휘봉을 건넨다.',
    shape: 'round', color: '#2b2b38', belly: '#ffffff', ears: 'cat', eyes: 'sparkle', mouth: 'cat', cheeks: true, extras: ['crown', 'sparkles'] },

  // 럭키 타이머
  { id: 'rt_dice', machine: 'randtimer', grade: 'D', name: '주사위콩', desc: '굴릴 때마다 기분이 바뀐다.',
    shape: 'round', color: '#ffffff', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['spots'] },
  { id: 'rt_clover', machine: 'randtimer', grade: 'C', name: '네잎냥', desc: '머리 위 잎이 네 장이면 행운.',
    shape: 'round', color: '#a8e6a0', ears: 'cat', eyes: 'happy', mouth: 'cat', cheeks: true, extras: ['leaf'] },
  { id: 'rt_sand', machine: 'randtimer', grade: 'B', name: '모래토끼', desc: '모래시계를 뒤집는 게 하루 일과.',
    shape: 'tall', color: '#f2d39b', inner: '#ffb3a7', ears: 'bunny', eyes: 'sleepy', mouth: 'w', cheeks: true, extras: ['clock'] },
  { id: 'rt_fox', machine: 'randtimer', grade: 'A', name: '럭키여우', desc: '시간을 맞히면 꼬리를 흔들어 준다.',
    shape: 'round', color: '#ff8c42', belly: '#fff1dc', ears: 'cat', eyes: 'sparkle', mouth: 'cat', cheeks: true, extras: ['sparkles'] },
  { id: 'rt_seven', machine: 'randtimer', grade: 'S', name: '세븐드래곤', desc: '7이 세 번 겹친 날에만 깨어난다.',
    shape: 'round', color: 'rainbow', ears: 'horns', eyes: 'sparkle', mouth: 'fang', cheeks: true, extras: ['wings', 'crown', 'sparkles'] },

  // 지그재그 키링
  { id: 'zz_bean', machine: 'zigzag', grade: 'D', name: '젤리콩키링', desc: '말랑말랑 젤리콩. 가방에서 통통 튄다.',
    shape: 'round', color: '#ff9ecb', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['keyring'] },
  { id: 'zz_duck', machine: 'zigzag', grade: 'C', name: '오리키링', desc: '꽥 소리는 안 나지만 마음으로 꽥.',
    shape: 'round', color: '#ffe066', ears: 'none', eyes: 'dot', mouth: 'beak', cheeks: true, extras: ['keyring'] },
  { id: 'zz_candy', machine: 'zigzag', grade: 'B', name: '별사탕키링', desc: '흔들면 별 가루가 떨어진다는 소문.',
    shape: 'round', color: '#b8f2ff', ears: 'none', eyes: 'happy', mouth: 'w', cheeks: true, extras: ['keyring', 'starmark', 'sparkles'] },
  { id: 'zz_panda', machine: 'zigzag', grade: 'A', name: '판다키링', desc: '대나무 대신 열쇠를 꼭 쥐고 있다.',
    shape: 'round', color: '#ffffff', inner: '#2b2b38', ears: 'round', eyes: 'sparkle', mouth: 'smile', cheeks: true, extras: ['keyring', 'eyepatch'] },
  { id: 'zz_unicorn', machine: 'zigzag', grade: 'S', name: '유니콘키링', desc: '무지개 위를 지그재그로 달린다.',
    shape: 'tall', color: 'rainbow', ears: 'horns', eyes: 'happy', mouth: 'w', cheeks: true, extras: ['keyring', 'halo', 'sparkles'] },

  // 왕복 가위
  { id: 'pp_lemon', machine: 'pingpong', grade: 'D', name: '레몬방울', desc: '새콤해서 늘 눈을 찡그린다.',
    shape: 'round', color: '#fff08a', ears: 'none', eyes: 'happy', mouth: 'o', cheeks: true, extras: ['leaf'] },
  { id: 'pp_plum', machine: 'pingpong', grade: 'C', name: '자두콩', desc: '실에 매달려 그네 타기 장인.',
    shape: 'round', color: '#b05cc8', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['leaf'] },
  { id: 'pp_kiwi', machine: 'pingpong', grade: 'B', name: '키위콩', desc: '겉은 털복숭이, 속은 상큼.',
    shape: 'wide', color: '#9c7a4a', belly: '#9be36b', ears: 'none', eyes: 'sparkle', mouth: 'w', cheeks: true, extras: ['seeds'] },
  { id: 'pp_mango', machine: 'pingpong', grade: 'A', name: '망고냥', desc: '여름 햇살을 가득 머금은 고양이.',
    shape: 'round', color: '#ffb347', belly: '#ffe08a', ears: 'cat', eyes: 'sparkle', mouth: 'cat', cheeks: true, extras: ['sparkles'] },
  { id: 'pp_starcandy', machine: 'pingpong', grade: 'S', name: '별빛사탕', desc: '가장 빠른 가위만 닿을 수 있는 사탕.',
    shape: 'round', color: 'galaxy', ears: 'none', eyes: 'happy', mouth: 'smile', cheeks: true, extras: ['galaxystars', 'halo', 'sparkles'] },

  // 미끄럼 키 마스터
  { id: 'sk_lock', machine: 'slidekey', grade: 'D', name: '자물쇠콩', desc: '딸깍 소리를 들으면 기분이 좋다.',
    shape: 'round', color: '#c0c6d4', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['keyring'] },
  { id: 'sk_mouse', machine: 'slidekey', grade: 'C', name: '열쇠쥐', desc: '작은 구멍이라면 어디든 들어간다.',
    shape: 'round', color: '#d6d0e6', inner: '#ffb3c7', ears: 'round', eyes: 'sparkle', mouth: 'w', cheeks: true },
  { id: 'sk_bat', machine: 'slidekey', grade: 'B', name: '금고박쥐', desc: '거꾸로 매달려 금고를 지킨다.',
    shape: 'round', color: '#4a3d6b', belly: '#8a7ab0', ears: 'cat', eyes: 'happy', mouth: 'fang', cheeks: true, extras: ['wings'] },
  { id: 'sk_owl', machine: 'slidekey', grade: 'A', name: '보안부엉', desc: '움직이는 열쇠구멍도 한눈에 꿰뚫어 본다.',
    shape: 'round', color: '#5a5470', belly: '#c9c0e6', ears: 'cat', eyes: 'dot', mouth: 'beak', cheeks: false, extras: ['glasses', 'sparkles'] },
  { id: 'sk_ruby', machine: 'slidekey', grade: 'S', name: '루비냥', desc: '가장 깊은 금고 속 붉은 보석 고양이.',
    shape: 'round', color: '#e8304a', belly: '#ffc2d4', ears: 'cat', eyes: 'sparkle', mouth: 'cat', cheeks: true, extras: ['crown', 'sparkles'] },

  // 골든 레버 캡슐
  { id: 'lc_egg', machine: 'luckycap', grade: 'D', name: '달걀콩', desc: '언젠가 무언가로 깨어날 예정.',
    shape: 'tall', color: '#fff8e8', ears: 'none', eyes: 'sleepy', mouth: 'smile', cheeks: true },
  { id: 'lc_chick', machine: 'luckycap', grade: 'C', name: '삐약이', desc: '캡슐 껍질을 모자처럼 쓰고 다닌다.',
    shape: 'round', color: '#ffe680', ears: 'none', eyes: 'dot', mouth: 'beak', cheeks: true, extras: ['cream'], cream: '#ffffff' },
  { id: 'lc_lamb', machine: 'luckycap', grade: 'B', name: '꼬마양', desc: '레버를 돌리면 털이 더 복슬해진다.',
    shape: 'wide', color: '#fffaf0', ears: 'smallround', inner: '#ffc1d3', eyes: 'happy', mouth: 'w', cheeks: true, extras: ['fluff'] },
  { id: 'lc_silverfox', machine: 'luckycap', grade: 'A', name: '은여우', desc: '은색 캡슐에서만 나오는 신비한 여우.',
    shape: 'round', color: '#dfe4ef', belly: '#ffffff', ears: 'cat', inner: '#b8c4dc', eyes: 'sparkle', mouth: 'cat', cheeks: true, extras: ['sparkles'] },
  { id: 'lc_phoenix', machine: 'luckycap', grade: 'S', name: '황금불사조', desc: '금색 칸에 멈춘 레버에 응답하는 불새.',
    shape: 'tall', color: '#ff9f1c', belly: '#ffe066', ears: 'horns', eyes: 'sparkle', mouth: 'beak', cheeks: true, extras: ['wings', 'crown', 'sparkles'] },

  // 삼연타 펀치
  { id: 'cp_tofu', machine: 'combopunch', grade: 'D', name: '두부펀치', desc: '맞아도 말랑, 때려도 말랑.',
    shape: 'wide', color: '#fffaf0', ears: 'none', eyes: 'dot', mouth: 'smile', cheeks: true, extras: ['gloves'], accent: '#3d7bff' },
  { id: 'cp_rhino', machine: 'combopunch', grade: 'C', name: '코뿔펀치', desc: '박치기도 펀치로 쳐 준다.',
    shape: 'wide', color: '#a8b5c8', ears: 'horns', eyes: 'dot', mouth: 'fang', cheeks: false, extras: ['gloves'], accent: '#3d7bff' },
  { id: 'cp_kanga', machine: 'combopunch', grade: 'B', name: '캥거루복서', desc: '주머니에 여분 글러브를 넣고 다닌다.',
    shape: 'tall', color: '#c89a6b', belly: '#f0dcc0', ears: 'bunny', inner: '#e8b48a', eyes: 'happy', mouth: 'smile', cheeks: true, extras: ['gloves'], accent: '#ffd23f' },
  { id: 'cp_tiger', machine: 'combopunch', grade: 'A', name: '호랑권투', desc: '세 번 연속 999점이 목표.',
    shape: 'round', color: '#ff9f40', belly: '#fff1dc', ears: 'round', eyes: 'sparkle', mouth: 'fang', cheeks: false, extras: ['stripes', 'headband', 'gloves'], accent: '#3d7bff' },
  { id: 'cp_legend', machine: 'combopunch', grade: 'S', name: '삼연타왕', desc: '세 주먹이 모두 전설이었던 단 한 명.',
    shape: 'round', color: '#3d7bff', belly: '#bcd2ff', ears: 'round', eyes: 'happy', mouth: 'smile', cheeks: true, extras: ['crown', 'belt', 'gloves', 'sparkles'], accent: '#ffd23f' },
];

// ================= 조합 인형 =================
// 기본 인형 + (색 바꾸기 | 옷·모자 입히기)로 데이터 몇 줄만으로 인형 수를 늘린다
const PALETTES = [
  { name: '민트',   color: '#8fe3c8', belly: '#e9fff7', inner: '#5cc9a7' },
  { name: '라벤더', color: '#c9b6ff', belly: '#f3eeff', inner: '#9f86f0' },
  { name: '초코',   color: '#9a6a4a', belly: '#e2c3a3', inner: '#d9a07a' },
  { name: '하늘',   color: '#9fd4ff', belly: '#eaf6ff', inner: '#6fb6f0' },
  { name: '복숭아', color: '#ffc0a8', belly: '#fff0e8', inner: '#ff9a8a' },
  { name: '레몬',   color: '#fff08a', belly: '#fffbe0', inner: '#ffd23f' },
  { name: '밤하늘', color: '#5a5aa8', belly: '#8a88cc', inner: '#b2a8ff' },
];
// block: 이미 그 자리에 장식이 있으면 겹치지 않게 다른 옷을 고른다
const OUTFITS = [
  { key: 'beanie', name: '털모자',     color: '#ff6b6b', desc: '방울 달린 털모자를 쓰고 외출했다.', block: ['hat', 'crown', 'cream', 'halo', 'cherry', 'leaf', 'spout', 'keyring'] },
  { key: 'scarf',  name: '목도리',     color: '#4dc9ff', desc: '줄무늬 목도리를 둘둘 감았다.',     block: ['belt', 'macaron', 'pearl'] },
  { key: 'overall',name: '멜빵',       color: '#5b7bd5', desc: '주머니 달린 멜빵바지를 입었다.',   block: ['belt', 'melonstripes', 'macaron', 'clock', 'pearl', 'tentacles'] },
  { key: 'cape',   name: '망토',       color: '#c0304a', desc: '펄럭이는 영웅 망토를 둘렀다.',     block: ['wings', 'tentacles', 'fluff'] },
  { key: 'flower', name: '꽃핀',       color: '#ff8fc0', desc: '머리에 꽃핀을 꽂고 한껏 멋을 냈다.', block: ['hat', 'crown', 'bow'] },
  { key: 'bowtie', name: '나비넥타이', color: '#e8304a', desc: '나비넥타이를 매고 파티에 간다.',   block: ['belt', 'clock', 'pearl'] },
  { key: 'shades', name: '선글라스',   color: '#222233', desc: '선글라스를 쓰면 조금 강해진 기분.', block: ['glasses', 'eyepatch'] },
];
const fitOutfit = (base, i) => {
  const ex = base.extras || [];
  for (let k = 0; k < OUTFITS.length; k++) {
    const o = OUTFITS[(i * 3 + k) % OUTFITS.length];
    if (o.key === 'shades' && base.eyes === 'one') continue;
    if (!o.block.some(b => ex.includes(b))) return o;
  }
  return OUTFITS[3];
};
const recolor = (base, p) => ({
  color: p.color, inner: p.inner, ...(base.belly ? { belly: p.belly } : {}),
});

const VARIANT_DOLLS = BASE_DOLLS.flatMap((b, i) => {
  const p = PALETTES[(i * 2 + 1) % PALETTES.length];
  const o = fitOutfit(b, i);
  return [
    { ...b, ...recolor(b, p), id: `${b.id}__c`, base: b.id, variant: 'color',
      name: `${p.name} ${b.name}`, desc: `${p.name}빛으로 물든 ${b.name}. ${b.desc}` },
    { ...b, id: `${b.id}__o`, base: b.id, variant: 'outfit', outfit: o.key, outfitColor: o.color,
      name: `${o.name} ${b.name}`, desc: `${o.desc} ${b.desc}` },
  ];
});

// 특별 뽑기 전용: 오로라 색 + 반짝이 (평소에는 안 나옴)
const SPECIAL_DOLLS = BASE_DOLLS.map((b, i) => {
  const o = fitOutfit(b, i + 2);
  return {
    ...b, id: `${b.id}__sp`, base: b.id, special: true, variant: 'special',
    color: 'aurora', ...(b.belly ? { belly: '#f6f0ff' } : {}), inner: '#ffd1f0',
    outfit: o.key, outfitColor: '#ffd23f',
    extras: [...new Set([...(b.extras || []), 'sparkles'])],
    name: `오로라 ${b.name}`, desc: `특별 뽑기 때만 나타나는 오로라빛 ${b.name}.`,
  };
});

const DOLLS = [...BASE_DOLLS, ...VARIANT_DOLLS, ...SPECIAL_DOLLS];
const DOLL_BY_ID = Object.fromEntries(DOLLS.map(d => [d.id, d]));
const MACHINE_BY_ID = Object.fromEntries(MACHINES.map(m => [m.id, m]));
const REGULAR_POOL = Object.fromEntries(MACHINES.map(m => [m.id, DOLLS.filter(d => d.machine === m.id && !d.special)]));
const SPECIAL_POOL = Object.fromEntries(MACHINES.map(m => [m.id, SPECIAL_DOLLS.filter(d => d.machine === m.id)]));

// 지금 특별 뽑기 중인 기계 (app.js가 시간표에 맞춰 바꿈)
const SpecialState = (() => {
  let ids = [];
  return {
    set(list) { ids = list.filter(id => MACHINE_BY_ID[id]).slice(0, 2); },
    has: id => ids.includes(id),
    get ids() { return ids.slice(); },
  };
})();

// 기계에 지금 들어 있는 인형들 (특별 뽑기 중이면 특별 인형)
const dollsOf = machineId => (SpecialState.has(machineId) ? SPECIAL_POOL[machineId] : REGULAR_POOL[machineId] || []).slice();

// 등급 출현 가중치 (기계마다 따로 정할 수 있음)
const gradeWeight = (machineId, g) => {
  const w = MACHINE_BY_ID[machineId] && MACHINE_BY_ID[machineId].weights;
  return w && w[g] != null ? w[g] : GRADES[g].weight;
};
// 기계 안에서 등급 가중치로 하나 뽑기
const pickDoll = machineId => {
  const pool = dollsOf(machineId);
  const total = pool.reduce((s, d) => s + gradeWeight(machineId, d.grade), 0);
  let roll = Math.random() * total;
  for (const d of pool) if ((roll -= gradeWeight(machineId, d.grade)) < 0) return d;
  return pool[pool.length - 1];
};
// 정해진 등급 안에서 무작위로 하나
const pickOfGrade = (machineId, grade, exclude) => {
  const all = dollsOf(machineId).filter(d => d.grade === grade);
  const left = exclude ? all.filter(d => !exclude.has(d.id)) : all;
  const pool = left.length ? left : all;
  return pool[Math.floor(Math.random() * pool.length)];
};

// 기계별 출현 확률(%)
const dollOdds = machineId => {
  const pool = dollsOf(machineId);
  const total = pool.reduce((s, d) => s + gradeWeight(machineId, d.grade), 0);
  return Object.fromEntries(pool.map(d => [d.id, (gradeWeight(machineId, d.grade) / total) * 100]));
};

// ================= 인형 그리기 =================
// 128x128 좌표계에 그린다. 몸통 중심 (64,70), 몸통 반지름 약 42
const DollArt = (() => {
  const SPR = 128, CX = 64, CY = 70;
  const SHAPES = { round: [42, 38], tall: [36, 44], wide: [47, 34] };
  const INK = '#2b1d2a';
  const TAU = Math.PI * 2;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const f = v => Math.round(v + (t - v) * p);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }
  const baseColor = d => (d.color === 'rainbow' ? '#b28dff' : d.color === 'galaxy' ? '#4b3bb0' : d.color === 'aurora' ? '#9fc8ff' : d.color);

  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
  function ellipse(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); }

  function star(c, x, y, r, pts = 5, inner = 0.45) {
    c.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / pts, rr = i % 2 ? r * inner : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }

  function bodyFill(c, d, rx, ry) {
    if (d.color === 'rainbow') {
      const g = c.createLinearGradient(CX, CY - ry, CX, CY + ry);
      ['#ff6b6b', '#ffb347', '#ffe66d', '#7ee081', '#5bc0eb', '#b28dff'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
      return g;
    }
    if (d.color === 'aurora') {
      const g = c.createLinearGradient(CX - rx, CY - ry, CX + rx, CY + ry);
      ['#ffb8e6', '#c7b8ff', '#9fe8ff', '#b8ffd9'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
      return g;
    }
    if (d.color === 'galaxy') {
      const g = c.createRadialGradient(CX - 12, CY - 10, 4, CX, CY, rx + 6);
      g.addColorStop(0, '#9a6cff'); g.addColorStop(1, '#221d66');
      return g;
    }
    return d.color;
  }

  function drawEars(c, d, rx, ry, top, base, line) {
    const inner = d.inner || shade(base, 0.45);
    c.strokeStyle = line;
    for (const s of [-1, 1]) {
      switch (d.ears) {
        case 'round':
          circle(c, CX + s * rx * 0.66, top + 8, 12); c.fillStyle = base; c.fill(); c.stroke();
          circle(c, CX + s * rx * 0.66, top + 8, 6.5); c.fillStyle = inner; c.fill();
          break;
        case 'smallround':
          circle(c, CX + s * rx * 0.55, top + 5, 8); c.fillStyle = base; c.fill(); c.stroke();
          circle(c, CX + s * rx * 0.55, top + 5, 4); c.fillStyle = inner; c.fill();
          break;
        case 'bunny':
          c.save(); c.translate(CX + s * 13, top - 12); c.rotate(s * 0.15);
          ellipse(c, 0, 0, 9, 24); c.fillStyle = base; c.fill(); c.stroke();
          ellipse(c, 0, 3, 4.5, 16); c.fillStyle = inner; c.fill();
          c.restore();
          break;
        case 'cat':
          c.beginPath();
          c.moveTo(CX + s * (rx - 4), top + 18); c.lineTo(CX + s * (rx - 8), top - 12); c.lineTo(CX + s * 10, top + 4);
          c.closePath(); c.fillStyle = base; c.fill(); c.stroke();
          c.beginPath();
          c.moveTo(CX + s * (rx - 9), top + 12); c.lineTo(CX + s * (rx - 11), top - 4); c.lineTo(CX + s * 16, top + 5);
          c.closePath(); c.fillStyle = inner; c.fill();
          break;
        case 'horns':
          c.beginPath();
          c.moveTo(CX + s * 10, top + 8);
          c.quadraticCurveTo(CX + s * 14, top - 8, CX + s * 24, top - 18);
          c.quadraticCurveTo(CX + s * 28, top - 2, CX + s * 24, top + 10);
          c.closePath(); c.fillStyle = '#fff1b8'; c.strokeStyle = '#b8964a'; c.fill(); c.stroke();
          c.strokeStyle = line;
          break;
        case 'antenna':
          c.beginPath(); c.moveTo(CX + s * 10, top + 6); c.lineTo(CX + s * 20, top - 16); c.stroke();
          circle(c, CX + s * 20, top - 18, 5.5); c.fillStyle = d.accent || '#ffe66d'; c.fill(); c.stroke();
          break;
      }
    }
  }

  function drawFace(c, d) {
    const ey = CY - 4, dx = 14;
    c.fillStyle = INK; c.strokeStyle = INK; c.lineWidth = 3;
    for (const s of d.eyes === 'one' ? [0] : [-1, 1]) {
      const x = CX + s * dx;
      switch (d.eyes) {
        case 'dot':
          circle(c, x, ey, 4.5); c.fillStyle = INK; c.fill();
          circle(c, x - 1.5, ey - 1.6, 1.6); c.fillStyle = '#fff'; c.fill();
          break;
        case 'sparkle':
          circle(c, x, ey, 6.5); c.fillStyle = INK; c.fill();
          circle(c, x - 2.2, ey - 2.2, 2.4); c.fillStyle = '#fff'; c.fill();
          circle(c, x + 2.2, ey + 2.4, 1.2); c.fill();
          break;
        case 'happy':
          c.beginPath(); c.arc(x, ey + 2, 5, Math.PI, 0); c.stroke();
          break;
        case 'sleepy':
          c.beginPath(); c.arc(x, ey - 2, 5, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
          break;
        case 'one':
          circle(c, CX, ey - 6, 12); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2.5; c.stroke();
          circle(c, CX + 1, ey - 5, 6.5); c.fillStyle = INK; c.fill();
          circle(c, CX - 1.5, ey - 8, 2.2); c.fillStyle = '#fff'; c.fill();
          c.lineWidth = 3;
          break;
      }
    }
    const my = CY + 9;
    c.lineWidth = 2.5; c.strokeStyle = INK; c.fillStyle = INK;
    switch (d.mouth) {
      case 'smile':
        c.beginPath(); c.arc(CX, my - 4, 5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); break;
      case 'fang':
        c.beginPath(); c.arc(CX, my - 4, 6, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
        c.beginPath(); c.moveTo(CX + 1, my + 1); c.lineTo(CX + 5, my); c.lineTo(CX + 3.5, my + 5); c.closePath();
        c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.2; c.stroke();
        break;
      case 'w':
      case 'cat':
        if (d.mouth === 'cat') {
          c.beginPath(); c.moveTo(CX - 3, my - 6); c.lineTo(CX + 3, my - 6); c.lineTo(CX, my - 3); c.closePath();
          c.fillStyle = '#ff8fa8'; c.fill();
        }
        c.beginPath(); c.arc(CX - 3.5, my - 2, 3.5, 0, Math.PI); c.stroke();
        c.beginPath(); c.arc(CX + 3.5, my - 2, 3.5, 0, Math.PI); c.stroke();
        break;
      case 'o':
        ellipse(c, CX, my, 3.5, 4.5); c.fillStyle = '#8a2d3b'; c.fill(); break;
      case 'beak':
        c.beginPath(); c.moveTo(CX - 6, my - 4); c.lineTo(CX + 6, my - 4); c.lineTo(CX, my + 3); c.closePath();
        c.fillStyle = '#ffa53d'; c.fill(); c.strokeStyle = '#c66f12'; c.lineWidth = 1.5; c.stroke();
        break;
    }
    if (d.cheeks) {
      c.fillStyle = 'rgba(255,110,150,0.45)';
      for (const s of [-1, 1]) { ellipse(c, CX + s * 25, CY + 6, 6, 4); c.fill(); }
    }
  }

  function bow(c, x, y, col) {
    c.fillStyle = col; c.strokeStyle = shade(col, -0.35); c.lineWidth = 2;
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + s * 13, y - 8); c.lineTo(x + s * 13, y + 8); c.closePath();
      c.fill(); c.stroke();
    }
    circle(c, x, y, 4); c.fill(); c.stroke();
  }

  function sparkle(c, x, y, r) {
    star(c, x, y, r, 4, 0.3); c.fillStyle = '#fff6a8'; c.fill();
  }

  // 몸 앞에 입히는 옷·모자
  function drawOutfitFront(c, d, rx, ry, top) {
    const col = d.outfitColor || '#ff6b6b', dark = shade(col, -0.4);
    c.lineWidth = 2; c.strokeStyle = dark;
    switch (d.outfit) {
      case 'beanie': {
        const r = rx * 0.8;
        c.beginPath(); c.arc(CX, top + 12, r, Math.PI, 0); c.closePath();
        c.fillStyle = col; c.fill(); c.stroke();
        c.fillStyle = shade(col, 0.55); c.beginPath(); c.roundRect(CX - r - 3, top + 6, r * 2 + 6, 10, 5); c.fill(); c.stroke();
        circle(c, CX, top + 12 - r - 2, 7); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#d9d9e8'; c.stroke();
        break;
      }
      case 'scarf': {
        const y = CY + ry * 0.4;
        c.save(); ellipse(c, CX, CY, rx + 3, ry + 3); c.clip();
        c.fillStyle = col; c.fillRect(CX - rx - 3, y, rx * 2 + 6, 10);
        c.fillStyle = 'rgba(255,255,255,.55)';
        for (let x = -rx; x < rx; x += 12) c.fillRect(CX + x, y, 5, 10);
        c.restore();
        c.fillStyle = col; c.beginPath(); c.roundRect(CX + rx * 0.3, y + 6, 10, 20, 3); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(CX + rx * 0.3, y + 14, 10, 4);
        break;
      }
      case 'bowtie': {
        const y = CY + 19;
        c.fillStyle = col;
        for (const s of [-1, 1]) {
          c.beginPath(); c.moveTo(CX, y); c.lineTo(CX + s * 11, y - 7); c.lineTo(CX + s * 11, y + 7); c.closePath(); c.fill(); c.stroke();
        }
        circle(c, CX, y, 3.5); c.fill(); c.stroke();
        break;
      }
      case 'flower': {
        const fx = CX - rx * 0.62, fy = top + 9;
        c.fillStyle = col;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          circle(c, fx + Math.cos(a) * 6, fy + Math.sin(a) * 6, 5); c.fill();
        }
        circle(c, fx, fy, 4); c.fillStyle = '#ffe066'; c.fill();
        break;
      }
      case 'shades': {
        c.fillStyle = col; c.strokeStyle = '#000';
        for (const s of [-1, 1]) { c.beginPath(); c.roundRect(CX + s * 14 - 10, CY - 10, 20, 12, 5); c.fill(); }
        c.lineWidth = 2.5; c.beginPath(); c.moveTo(CX - 4, CY - 6); c.lineTo(CX + 4, CY - 6); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.6)';
        for (const s of [-1, 1]) { c.fillRect(CX + s * 14 - 6, CY - 8, 4, 2); }
        break;
      }
    }
  }

  function draw(c, d) {
    const [rx, ry] = SHAPES[d.shape || 'round'];
    const top = CY - ry, base = baseColor(d), line = shade(base, -0.4);
    const ex = new Set(d.extras || []);
    c.save();
    c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 3; c.strokeStyle = line;

    // ---- 몸 뒤쪽 ----
    if (ex.has('wings')) {
      for (const s of [-1, 1]) {
        c.save(); c.translate(CX + s * (rx - 2), CY - 6); c.scale(s, 1);
        c.fillStyle = '#ffffff'; c.strokeStyle = '#b9c7e0'; c.lineWidth = 2.5;
        ellipse(c, 14, -8, 16, 9, -0.5); c.fill(); c.stroke();
        ellipse(c, 12, 4, 12, 6, -0.15); c.fill(); c.stroke();
        c.restore();
      }
      c.strokeStyle = line; c.lineWidth = 3;
    }
    if (d.outfit === 'cape') {
      const col = d.outfitColor;
      c.beginPath();
      c.moveTo(CX - rx * 0.55, CY - ry * 0.35);
      c.lineTo(CX - rx - 9, CY + ry + 4);
      c.quadraticCurveTo(CX, CY + ry + 14, CX + rx + 9, CY + ry + 4);
      c.lineTo(CX + rx * 0.55, CY - ry * 0.35); c.closePath();
      c.fillStyle = col; c.fill(); c.strokeStyle = shade(col, -0.4); c.stroke();
      c.strokeStyle = line;
    }
    if (ex.has('tentacles')) {
      for (let i = 0; i < 5; i++) {
        const x = CX - rx * 0.7 + i * (rx * 1.4 / 4);
        ellipse(c, x, CY + ry - 4, 6.5, 13); c.fillStyle = base; c.fill(); c.stroke();
      }
    }
    if (ex.has('fluff')) {
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        circle(c, CX + Math.cos(a) * rx, CY + Math.sin(a) * ry, 10);
        c.fillStyle = base; c.fill(); c.stroke();
      }
    }
    drawEars(c, d, rx, ry, top, base, line);

    // ---- 몸통 ----
    c.lineWidth = 3; c.strokeStyle = line;
    ellipse(c, CX, CY, rx, ry); c.fillStyle = bodyFill(c, d, rx, ry); c.fill(); c.stroke();

    // ---- 몸통 안쪽 무늬 (몸 모양으로 잘라냄) ----
    c.save();
    ellipse(c, CX, CY, rx - 1.5, ry - 1.5); c.clip();
    if (ex.has('melonstripes')) {
      c.strokeStyle = shade(base, -0.35); c.lineWidth = 4;
      for (const x of [-30, -15, 0, 15, 30]) {
        c.beginPath(); c.moveTo(CX + x * 0.7, top); c.quadraticCurveTo(CX + x * 1.25, CY, CX + x * 0.7, CY + ry); c.stroke();
      }
      c.strokeStyle = line; c.lineWidth = 3;
    }
    if (d.belly) { ellipse(c, CX, CY + ry * 0.55, rx * 0.62, ry * 0.5); c.fillStyle = d.belly; c.fill(); }
    if (ex.has('headband')) {
      c.fillStyle = d.accent || '#e8304a'; c.fillRect(CX - rx, CY - ry * 0.62, rx * 2, 8);
    }
    if (d.outfit === 'overall') {
      const col = d.outfitColor, y0 = CY + ry * 0.42;
      c.fillStyle = col; c.fillRect(CX - rx, y0, rx * 2, ry);
      c.fillStyle = shade(col, 0.25); c.beginPath(); c.roundRect(CX - 8, y0 + 5, 16, 10, 3); c.fill();
      c.fillStyle = '#ffe680';
      for (const s of [-1, 1]) { circle(c, CX + s * 16, y0 + 3, 3); c.fill(); }
    }
    if (ex.has('belt')) {
      c.fillStyle = '#ffd23f'; c.fillRect(CX - rx, CY + 17, rx * 2, 11);
      c.fillStyle = '#d9a400'; c.fillRect(CX - rx, CY + 26, rx * 2, 2);
    }
    if (ex.has('stripes')) {
      c.fillStyle = shade(base, -0.22);
      for (const x of [-8, 0, 8]) { c.beginPath(); c.roundRect(CX + x - 2, top - 2, 4, 14, 2); c.fill(); }
    }
    if (ex.has('spots')) {
      c.fillStyle = shade(base, -0.2);
      for (const [x, y, r] of [[-27, 16, 6], [28, 12, 5], [12, 28, 4], [-30, -12, 4], [24, -22, 3.5]]) { circle(c, CX + x, CY + y, r); c.fill(); }
    }
    if (ex.has('seeds')) {
      c.fillStyle = '#ffe9a8';
      for (const [x, y] of [[-28, -14], [-20, 20], [-6, 28], [10, 24], [26, 16], [30, -10], [-32, 4], [20, -26], [-16, -28]]) {
        ellipse(c, CX + x, CY + y, 1.8, 3); c.fill();
      }
    }
    if (ex.has('macaron')) {
      c.fillStyle = '#fff6f0'; c.fillRect(CX - rx, CY + 18, rx * 2, 7);
      c.strokeStyle = shade(base, -0.2); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(CX - rx, CY + 18); c.lineTo(CX + rx, CY + 18); c.moveTo(CX - rx, CY + 25); c.lineTo(CX + rx, CY + 25); c.stroke();
    }
    if (ex.has('cream')) {
      const yb = CY - ry * 0.32;
      c.fillStyle = d.cream || '#fff';
      c.beginPath(); c.moveTo(CX - rx - 2, top - 2); c.lineTo(CX + rx + 2, top - 2); c.lineTo(CX + rx + 2, yb);
      const n = 6, w = (rx * 2 + 4) / n;
      for (let i = 0; i < n; i++) {
        const x0 = CX + rx + 2 - i * w;
        c.quadraticCurveTo(x0 - w / 2, yb + (i % 2 ? 6 : 12), x0 - w, yb);
      }
      c.closePath(); c.fill();
      if (ex.has('capdots')) {
        c.fillStyle = '#fff';
        for (const [x, y, r] of [[-22, -24, 5], [3, -31, 6], [24, -22, 4.5], [-34, -12, 3]]) { circle(c, CX + x, CY + y, r); c.fill(); }
      }
      if (ex.has('sprinkles')) {
        const cols = ['#fff', '#7ee0ff', '#ffe66d', '#8bd17c'];
        [[-22, -26, 0.5], [-8, -32, -0.6], [6, -27, 0.9], [20, -30, -0.3], [-30, -16, 1.2], [30, -18, 0.2], [0, -20, -1]].forEach(([x, y, a], i) => {
          c.save(); c.translate(CX + x, CY + y); c.rotate(a);
          c.fillStyle = cols[i % cols.length]; c.fillRect(-3, -1, 6, 2.4); c.restore();
        });
      }
    }
    if (ex.has('galaxystars')) {
      c.fillStyle = '#fff';
      for (const [x, y, r] of [[-30, -10, 1.5], [-20, 18, 1.2], [26, -14, 1.6], [34, 8, 1.1], [8, 24, 1.4], [-36, 6, 1], [16, -24, 1.2]]) { circle(c, CX + x, CY + y, r); c.fill(); }
      star(c, CX - 26, CY + 4, 4, 4, 0.35); c.fill();
      star(c, CX + 30, CY - 2, 3.5, 4, 0.35); c.fill();
    }
    // 하이라이트
    c.fillStyle = 'rgba(255,255,255,0.35)';
    ellipse(c, CX - rx * 0.45, CY - ry * 0.55, rx * 0.22, ry * 0.12, -0.6); c.fill();
    c.restore();

    // ---- 얼굴 ----
    drawFace(c, d);

    // ---- 앞쪽 장식 ----
    c.lineWidth = 2.5;
    if (ex.has('keyring')) {
      c.strokeStyle = '#c0c6d4'; c.lineWidth = 3;
      const ry = Math.max(top - 19, 11);
      c.beginPath(); c.arc(CX, ry + 13, 4, 0, TAU); c.stroke();
      c.beginPath(); c.arc(CX, ry, 9, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(CX, ry, 9, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
    }
    if (ex.has('glasses')) {
      c.strokeStyle = INK; c.lineWidth = 2.5;
      for (const s of [-1, 1]) { circle(c, CX + s * 14, CY - 4, 9.5); c.stroke(); }
      c.beginPath(); c.moveTo(CX - 4.5, CY - 5); c.lineTo(CX + 4.5, CY - 5); c.stroke();
    }
    if (ex.has('headband')) {
      const col = d.accent || '#e8304a';
      c.fillStyle = col;
      const kx = CX + rx * 0.86, ky = CY - ry * 0.55;
      c.beginPath(); c.moveTo(kx, ky); c.lineTo(kx + 14, ky - 8); c.lineTo(kx + 11, ky + 2); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(kx, ky + 2); c.lineTo(kx + 13, ky + 10); c.lineTo(kx + 5, ky + 12); c.closePath(); c.fill();
    }
    if (ex.has('belt')) {
      c.fillStyle = '#ffe680'; c.strokeStyle = '#b8860b'; c.lineWidth = 2;
      c.beginPath(); c.roundRect(CX - 9, CY + 14, 18, 17, 4); c.fill(); c.stroke();
      star(c, CX, CY + 22.5, 5); c.fillStyle = '#e8304a'; c.fill();
    }
    if (ex.has('clock')) {
      const y = ex.has('belt') ? CY + 34 : CY + 25;
      circle(c, CX, y, 9.5); c.fillStyle = '#fffdf5'; c.fill(); c.strokeStyle = '#c9a227'; c.lineWidth = 2.5; c.stroke();
      c.strokeStyle = INK; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(CX, y); c.lineTo(CX, y - 6); c.moveTo(CX, y); c.lineTo(CX + 4.5, y + 1.5); c.stroke();
    }
    if (ex.has('gloves')) {
      const col = d.accent || '#e8304a';
      for (const s of [-1, 1]) {
        const gx = CX + s * (rx - 2), gy = CY + 14;
        c.fillStyle = '#fff'; c.fillRect(gx - 7, gy + 8, 14, 6);
        circle(c, gx, gy, 11.5); c.fillStyle = col; c.fill(); c.strokeStyle = shade(col, -0.4); c.lineWidth = 2; c.stroke();
        circle(c, gx - s * 8, gy + 2, 5); c.fill(); c.stroke();
        ellipse(c, gx - 3, gy - 4, 3.5, 2, -0.5); c.fillStyle = 'rgba(255,255,255,.5)'; c.fill();
      }
    }
    if (ex.has('eyepatch')) {
      c.strokeStyle = INK; c.lineWidth = 2;
      c.beginPath(); c.moveTo(CX - rx + 6, CY - 20); c.lineTo(CX + rx - 4, CY + 4); c.stroke();
      circle(c, CX + 14, CY - 4, 7.5); c.fillStyle = INK; c.fill();
    }
    if (ex.has('pearl')) {
      circle(c, CX, CY + 22, 6.5); c.fillStyle = '#fffdf7'; c.fill(); c.strokeStyle = '#d8c9b8'; c.lineWidth = 1.5; c.stroke();
      circle(c, CX - 2, CY + 20, 2); c.fillStyle = '#fff'; c.fill();
    }
    if (ex.has('starmark')) {
      star(c, CX, CY - 22, 6.5); c.fillStyle = '#ffe066'; c.fill(); c.strokeStyle = '#d9a400'; c.lineWidth = 1.5; c.stroke();
    }
    if (ex.has('leaf')) {
      c.fillStyle = '#5cbf60'; c.strokeStyle = '#2f8a3a'; c.lineWidth = 2;
      for (const a of [-0.9, 0, 0.9]) {
        c.save(); c.translate(CX, top + 2); c.rotate(a);
        ellipse(c, 0, -8, 5, 10); c.fill(); c.stroke(); c.restore();
      }
    }
    if (ex.has('cherry')) {
      c.strokeStyle = '#3c8a3a'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(CX, top - 2); c.quadraticCurveTo(CX + 2, top - 14, CX + 9, top - 18); c.stroke();
      circle(c, CX, top + 1, 7.5); c.fillStyle = '#e8304a'; c.fill(); c.strokeStyle = '#a0182c'; c.lineWidth = 2; c.stroke();
      circle(c, CX - 2.5, top - 1.5, 2); c.fillStyle = '#fff'; c.fill();
    }
    if (ex.has('bow')) bow(c, CX + rx * 0.62, top + (ex.has('cream') ? 10 : 6), d.accent || '#ff5c8a');
    if (ex.has('hat')) {
      c.fillStyle = '#2b2b38'; c.strokeStyle = '#111';
      c.beginPath(); c.arc(CX, top + 6, 20, Math.PI, 0); c.closePath(); c.fill();
      ellipse(c, CX, top + 6, 34, 7); c.fill(); c.lineWidth = 1.5; c.stroke();
      circle(c, CX, top - 4, 4); c.fillStyle = '#fff'; c.fill();
      c.fillStyle = INK; circle(c, CX - 1.4, top - 4.5, 0.9); c.fill(); circle(c, CX + 1.4, top - 4.5, 0.9); c.fill();
    }
    if (ex.has('crown')) {
      c.beginPath();
      c.moveTo(CX - 16, top + 5); c.lineTo(CX - 17, top - 10); c.lineTo(CX - 8, top - 2); c.lineTo(CX, top - 15);
      c.lineTo(CX + 8, top - 2); c.lineTo(CX + 17, top - 10); c.lineTo(CX + 16, top + 5); c.closePath();
      c.fillStyle = '#ffd23f'; c.fill(); c.strokeStyle = '#b8860b'; c.lineWidth = 2; c.stroke();
      circle(c, CX, top - 1, 3); c.fillStyle = '#ff3d6e'; c.fill();
      circle(c, CX - 10, top + 1, 2); c.fillStyle = '#4dc9ff'; c.fill();
      circle(c, CX + 10, top + 1, 2); c.fill();
    }
    if (ex.has('halo')) {
      c.strokeStyle = '#ffe066'; c.lineWidth = 4;
      c.beginPath(); c.ellipse(CX, top - 10, 18, 5, 0, 0, TAU); c.stroke();
    }
    if (ex.has('spout')) {
      c.strokeStyle = '#9be7ff'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(CX, top + 2); c.lineTo(CX, top - 12); c.stroke();
      c.fillStyle = '#9be7ff';
      for (const s of [-1, 1]) { ellipse(c, CX + s * 9, top - 15, 3.5, 5, s * 0.5); c.fill(); }
      circle(c, CX, top - 16, 4); c.fill();
    }
    drawOutfitFront(c, d, rx, ry, top);
    if (ex.has('sparkles')) {
      sparkle(c, CX - rx - 4, top + 4, 7);
      sparkle(c, CX + rx + 6, CY - 4, 6);
      sparkle(c, CX + rx - 4, CY + ry + 2, 5);
    }
    c.restore();
  }

  const spriteCache = {}, urlCache = {};
  function sprite(d) {
    if (!spriteCache[d.id]) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = SPR * 2;
      const c = cv.getContext('2d');
      c.scale(2, 2);
      draw(c, d);
      spriteCache[d.id] = cv;
    }
    return spriteCache[d.id];
  }
  function url(d) {
    return urlCache[d.id] || (urlCache[d.id] = sprite(d).toDataURL());
  }

  // 게임 화면에 그리기: 몸통 반지름이 r이 되도록 크기 조절
  function drawAt(c, d, x, y, r, angle = 0) {
    const size = SPR * (r / 40);
    c.save(); c.translate(x, y); c.rotate(angle);
    c.drawImage(sprite(d), -size / 2, -size * (CY / SPR), size, size);
    c.restore();
  }

  return { sprite, url, drawAt, SPR };
})();
