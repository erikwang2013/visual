// AlgorithmLibrary/AES3D.js — AES-128 加密：S 盒/密钥扩展运行时生成；4×4 状态方阵逐层演示 AddRoundKey/SubBytes/ShiftRows/MixColumns，
// 右侧面板实时读出状态矩阵、轮密钥、轮次与扩散率；另跑一条「翻转 1 字节」的加密路径做扩散热图，密文与 FIPS-197 C.1 运行时比对。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { StateMatrix, KeyCrystal } from '../3D/director/CipherStage.js';
applyTheme('AES3D');

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, DIM = 0x334155;
const FIPS_PT = [0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff];
const FIPS_CT = '69C4E0D86A7B0430D8CDB78070B4C55A';
const KEY = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f];

// —— AES 核心：GF(2⁸) 乘法 / S 盒 / 密钥扩展 / 四层变换（全部运行时计算）——
function gfMul(a, b) {
  let r = 0, x = a;
  while (b > 0) { if (b & 1) r ^= x; x = (x << 1) ^ ((x & 0x80) ? 0x11b : 0); b >>= 1; }
  return r & 0xff;
}
const SBOX = new Array(256);
(function () {
  const log = new Array(256), alog = new Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) { log[x] = i; alog[i] = x; x = gfMul(x, 3); }
  const rol = (a, k) => ((a << k) | (a >>> (8 - k))) & 0xff;
  for (let i = 0; i < 256; i++) {
    const v = i === 0 ? 0 : alog[(255 - log[i]) % 255];
    SBOX[i] = (v ^ rol(v, 1) ^ rol(v, 2) ^ rol(v, 3) ^ rol(v, 4) ^ 0x63) & 0xff;
  }
})();
const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
function keyExpand(key) {
  const w = key.slice();
  for (let i = 4; i < 44; i++) {
    let t = w.slice((i - 1) * 4, i * 4);
    if (i % 4 === 0) {
      t = [SBOX[t[1]], SBOX[t[2]], SBOX[t[3]], SBOX[t[0]]];
      t[0] ^= RCON[i / 4 - 1];
    }
    for (let j = 0; j < 4; j++) w.push(w[(i - 4) * 4 + j] ^ t[j]);
  }
  return w;
}
const KEY_EXP = keyExpand(KEY);
const st = (c, r) => c * 4 + r;
function doSub(s) { for (let i = 0; i < 16; i++) s[i] = SBOX[s[i]]; }
function doShift(s) {
  const t = s.slice();
  for (let r = 1; r < 4; r++) for (let c = 0; c < 4; c++) s[st(c, r)] = t[st((c + r) % 4, r)];
}
function doMix(s) {
  for (let c = 0; c < 4; c++) {
    const a = s[st(c, 0)], b = s[st(c, 1)], d = s[st(c, 2)], e = s[st(c, 3)];
    s[st(c, 0)] = gfMul(a, 2) ^ gfMul(b, 3) ^ d ^ e;
    s[st(c, 1)] = a ^ gfMul(b, 2) ^ gfMul(d, 3) ^ e;
    s[st(c, 2)] = a ^ b ^ gfMul(d, 2) ^ gfMul(e, 3);
    s[st(c, 3)] = gfMul(a, 3) ^ b ^ d ^ gfMul(e, 2);
  }
}
function doKey(s, round) {
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) s[st(c, r)] ^= KEY_EXP[st(c, r) + round * 16];
}
const h2 = (b) => b.toString(16).padStart(2, '0').toUpperCase();
const hx = (arr) => arr.map(h2).join('');
const keySlice = (round) => KEY_EXP.slice(round * 16, round * 16 + 16);
const diffMask = (a, b) => a.map((v, i) => v !== b[i]);
const countDiff = (mask) => mask.filter(Boolean).length;

const scene = new Scene3D('scene', { cameraPos: [500, 600, 1050], lookAt: [480, 430, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const matrix = new StateMatrix(scene, { x: 320, y: 420, z: 0, sx: 120, sy: 78, size: 62 });
const crystal = new KeyCrystal(scene, { x: 770, y: 430, z: -40, radius: 135 });

const director = new StoryDirector(scene, {
  title: 'AES · 状态方阵',
  total: 9,
  legend: [
    { label: '状态字节', color: '#60a5fa' },
    { label: 'SubBytes', color: '#fb923c' },
    { label: 'ShiftRows', color: '#22d3ee' },
    { label: 'MixColumns', color: '#c4b5fd' },
    { label: '轮密钥', color: '#fcd34d' },
    { label: '扩散差异', color: '#fb7185' },
    { label: '密文', color: '#4ade80' },
  ],
  onReplay: () => restart(currentPT, true),
});

const SHOT_ESTABLISH = { pos: [500, 600, 1050], target: [480, 430, 0], ms: 900 };
const SHOT_MATRIX = { pos: [420, 540, 780], target: [320, 430, 0], ms: 720 };
const SHOT_KEY = { pos: [820, 580, 760], target: [700, 430, -20], ms: 720 };
const SHOT_COLS = { pos: [320, 780, 720], target: [320, 440, 0], ms: 720 };
const SHOT_WIDE = { pos: [560, 720, 1160], target: [500, 430, 0], ms: 900 };
const SHOT_FINAL = { pos: [480, 560, 900], target: [440, 430, 0], ms: 820 };

let currentPT = FIPS_PT.slice();

function blocks({ round = 0, stateBytes, keyBytes = keySlice(0), heat = null, note = '—' } = {}) {
  const stateItems = stateBytes.map((b, i) => ({
    text: h2(b),
    cls: heat && heat[i] ? 'reject' : '',
  }));
  return {
    blocks: [
      { type: 'chips', label: '状态矩阵（列主序）', items: stateItems },
      { type: 'chips', label: '轮密钥', items: keyBytes.map((b) => ({ text: h2(b) })) },
      {
        type: 'kv',
        label: '轮次 / 扩散',
        items: [
          { k: '轮次', v: round + ' / 10' },
          { k: '扩散', v: (heat ? countDiff(heat) : 0) + ' / 16 字节' },
        ],
      },
      { type: 'text', label: '当前', value: note },
    ],
    footer: 'AES-128 · 16 字节块 · 10 轮 × 4 层',
  };
}

function resetVisual() {
  matrix.resetPositions();
  matrix.setValues(currentPT);
  matrix.setAll(BLUE);
  matrix.setCaption('状态方阵 4×4 · 明文');
  crystal.resetHome();
  crystal.setRound(0, keySlice(0));
  director.stateUpdate(blocks({ stateBytes: currentPT, note: '明文就位' }));
  director.setProgress(0);
  status.textContent = '';
}

const PRESETS = {
  'FIPS 向量': FIPS_PT,
  '全零': Array(16).fill(0),
  '递增': Array.from({ length: 16 }, (_, i) => i),
};
const ptSelect = input.addSelect('明文', [...Object.keys(PRESETS), '随机'], 'FIPS 向量', (name) => {
  const pt = name === '随机'
    ? Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))
    : PRESETS[name].slice();
  restart(pt, true);
});
panel.addInput('自定义明文 hex', (v) => {
  const s = v.trim();
  if (!/^[0-9a-fA-F]{32}$/.test(s)) {
    status.textContent = '明文需为 32 位十六进制（16 字节）';
    return;
  }
  restart(Array.from({ length: 16 }, (_, i) => parseInt(s.slice(i * 2, i * 2 + 2), 16)), true);
}, 32);

function* runAES(pt) {
  director.reset();
  resetVisual();
  const state = pt.slice();
  const alt = pt.slice();
  alt[0] ^= 0x01; // 对照路径：只翻转 1 个明文字节

  // Hook
  director.chapter('建立');
  yield S(() => director.beat({
    title: '16 字节 = 4×4 状态方阵',
    why: 'AES 把 128 位明文按列主序放进 4×4 方阵；改 1 个字节，密文会怎样？',
    stateText: '明文 ' + hx(pt) + ' · 密钥 ' + hx(KEY),
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'pt', text: '改 1 字节，整块密文都会变', anchor: () => new THREE.Vector3(320, 600, 0), offset: [0, -54] },
      { id: 'key', text: '轮密钥晶体：每轮注入 16 字节', anchor: () => new THREE.Vector3(770, 560, -40), offset: [0, -54], className: 'gold' },
    ],
  }));
  yield W(800);

  // 预白化 AddRoundKey(0)
  director.chapter('预白化');
  yield S(() => {
    crystal.setRound(0, keySlice(0));
    crystal.emitTo(matrix, 520);
    director.beat({
      title: 'AddRoundKey：先混入轮密钥',
      why: '状态 ⊕ 轮密钥 0；之后每一轮末尾再注入下一段轮密钥。',
      stateText: '轮密钥 r0 = ' + hx(keySlice(0)),
      progress: 1,
      camera: SHOT_KEY,
      annotations: [{ id: 'emit', text: '密钥晶体分出 16 字节注入方阵', anchor: () => new THREE.Vector3(600, 470, 0), offset: [0, -52], className: 'gold' }],
    });
    director.stateUpdate(blocks({ stateBytes: state, heat: diffMask(state, alt), note: '准备 AddRoundKey' }));
  });
  yield W(560);
  yield S(() => {
    doKey(state, 0); doKey(alt, 0);
    matrix.setValues(state);
    matrix.setAll(GOLD);
    matrix.setCaption('预白化 · 明文 ⊕ r0');
    crystal.returnHome();
    director.setBeatState('状态 = 明文 ⊕ 轮密钥 0');
    director.stateUpdate(blocks({ stateBytes: state, heat: diffMask(state, alt), note: '预白化完成' }));
  });
  yield W(520);

  // 第 1 轮四层
  director.chapter('第 1 轮');
  yield S(() => director.beat({
    title: '① SubBytes：S 盒非线性替换',
    why: '每字节先求 GF(2⁸) 逆再做仿射变换：打掉线性关系，是抗差分攻击的核心。',
    stateText: '例：' + h2(state[0]) + ' → ' + h2(SBOX[state[0]]),
    progress: 2,
    camera: SHOT_MATRIX,
    annotations: [{ id: 'sbox', text: 'S 盒：16 字节逐个替换', anchor: () => new THREE.Vector3(320, 545, 0), offset: [0, -52] }],
  }));
  for (let r = 0; r < 4; r++) { matrix.setRow(r, ORANGE); yield W(150); }
  yield S(() => {
    doSub(state); doSub(alt);
    matrix.setValues(state);
    matrix.setAll(ORANGE);
    matrix.setCaption('第 1 轮 · SubBytes');
    director.setBeatState('SubBytes 完成 · 差异 ' + countDiff(diffMask(state, alt)) + '/16');
    director.stateUpdate(blocks({ round: 1, stateBytes: state, keyBytes: keySlice(1), heat: diffMask(state, alt), note: '① SubBytes 完成' }));
  });
  yield W(440);

  yield S(() => director.beat({
    title: '② ShiftRows：行循环左移',
    why: '第 r 行左移 r 格，把一列里的字节拆到四列——这是跨列扩散的第一步。',
    stateText: '行 0/1/2/3 左移 0/1/2/3 格',
    progress: 3,
    camera: SHOT_MATRIX,
    annotations: [{ id: 'shift', text: '四行像抽屉一样错位滑动', anchor: () => new THREE.Vector3(320, 545, 0), offset: [0, -52], className: 'gold' }],
  }));
  yield S(() => { matrix.setAll(CYAN); matrix.slideRows(540); });
  yield W(560);
  yield S(() => {
    doShift(state); doShift(alt);
    matrix.setValues(state);
    matrix.resetPositions();
    matrix.setAll(CYAN);
    matrix.setCaption('第 1 轮 · ShiftRows');
    director.setBeatState('ShiftRows 完成 · 差异 ' + countDiff(diffMask(state, alt)) + '/16');
    director.stateUpdate(blocks({ round: 1, stateBytes: state, keyBytes: keySlice(1), heat: diffMask(state, alt), note: '② ShiftRows 完成' }));
  });
  yield W(420);

  yield S(() => director.beat({
    title: '③ MixColumns：列内混合',
    why: '每列与固定矩阵在 GF(2⁸) 中相乘：一个字节的变化会传到整列 4 个字节。',
    stateText: '1 字节 → 整列',
    progress: 4,
    camera: SHOT_COLS,
    annotations: [{ id: 'mix', text: '四列依次混合', anchor: () => new THREE.Vector3(320, 545, 0), offset: [0, -52], className: 'gold' }],
  }));
  for (let c = 0; c < 4; c++) { matrix.setCol(c, PUR); yield W(150); }
  yield S(() => {
    doMix(state); doMix(alt);
    matrix.setValues(state);
    matrix.setAll(PUR);
    matrix.setCaption('第 1 轮 · MixColumns');
    director.stateUpdate(blocks({ round: 1, stateBytes: state, keyBytes: keySlice(1), heat: diffMask(state, alt), note: '③ MixColumns 完成' }));
  });
  yield W(360);
  yield S(() => {
    crystal.setRound(1, keySlice(1));
    crystal.emitTo(matrix, 420);
    director.setBeatState('④ AddRoundKey：⊕ 轮密钥 1');
  });
  yield W(440);
  const heat1 = diffMask(state, alt);
  yield S(() => {
    doKey(state, 1); doKey(alt, 1);
    crystal.returnHome();
    matrix.setValues(state);
    matrix.setHeat(heat1);
    matrix.setCaption('第 1 轮 / 10 · 扩散热图');
    director.beat({
      title: '扩散热图：1 → 4 字节',
      why: 'ShiftRows 把差异拆到不同列，MixColumns 再把每列染遍；一轮后 1 字节差异扩散到 4 字节。',
      stateText: '差异 ' + countDiff(heat1) + ' / 16 字节',
      progress: 4,
      camera: SHOT_COLS,
      annotations: [{ id: 'heat', text: '1 字节差异 → ' + countDiff(heat1) + ' 字节', anchor: () => new THREE.Vector3(320, 545, 0), offset: [0, -52], className: 'warn' }],
    });
    director.stateUpdate(blocks({ round: 1, stateBytes: state, keyBytes: keySlice(1), heat: heat1, note: '第 1 轮完成 · 热图 = 与翻转 1 字节副本的差异' }));
  });
  yield W(620);

  // 第 2–9 轮蒙太奇
  director.chapter('第 2–9 轮');
  yield S(() => director.beat({
    title: '九轮蒙太奇：重复四层',
    why: '每轮 SubBytes → ShiftRows → MixColumns → AddRoundKey；差异按 4 倍扩张，两轮后染遍 16 字节。',
    stateText: '差异 ' + countDiff(heat1) + '/16 → 16/16',
    progress: 5,
    camera: SHOT_WIDE,
    annotations: [{ id: 'montage', text: '每轮扩散 4 倍', anchor: () => new THREE.Vector3(320, 620, 0), offset: [0, -52], className: 'gold' }],
  }));
  yield W(420);
  for (let round = 2; round <= 9; round++) {
    doSub(state); doSub(alt);
    doShift(state); doShift(alt);
    doMix(state); doMix(alt);
    doKey(state, round); doKey(alt, round);
    const dm = diffMask(state, alt);
    crystal.setRound(round, keySlice(round));
    yield S(() => {
      matrix.setValues(state);
      matrix.setHeat(dm);
      matrix.setCaption('第 ' + round + ' 轮 / 10 · 扩散热图');
      director.setBeatState('第 ' + round + ' 轮 · 差异 ' + countDiff(dm) + ' / 16 字节');
      director.stateUpdate(blocks({ round, stateBytes: state, keyBytes: keySlice(round), heat: dm, note: '第 ' + round + ' 轮完成' }));
      director.setProgress(5);
    });
    yield W(240);
  }

  // 第 10 轮：无 MixColumns
  director.chapter('第 10 轮');
  yield S(() => director.beat({
    title: '最后一轮：没有 MixColumns',
    why: 'AES-128 共 10 轮；末轮只做 SubBytes → ShiftRows → AddRoundKey，省去列混合让解密结构对称可逆。',
    stateText: 'SubBytes → ShiftRows → AddRoundKey',
    progress: 6,
    camera: SHOT_MATRIX,
    annotations: [{ id: 'final', text: '末轮少一层：无列混合', anchor: () => new THREE.Vector3(320, 545, 0), offset: [0, -52], className: 'warn' }],
  }));
  yield W(480);
  yield S(() => {
    doSub(state); doSub(alt);
    matrix.setValues(state); matrix.setAll(ORANGE);
    matrix.setCaption('末轮 · SubBytes');
    director.setBeatState('末轮 ① SubBytes');
  });
  yield W(400);
  yield S(() => {
    doShift(state); doShift(alt);
    matrix.setValues(state); matrix.setAll(CYAN);
    matrix.setCaption('末轮 · ShiftRows');
    director.setBeatState('末轮 ② ShiftRows');
  });
  yield W(400);
  yield S(() => {
    crystal.setRound(10, keySlice(10));
    crystal.emitTo(matrix, 420);
    director.setBeatState('末轮 ③ AddRoundKey：注入轮密钥 10');
  });
  yield W(460);
  yield S(() => {
    doKey(state, 10); doKey(alt, 10);
    crystal.returnHome();
    matrix.setValues(state); matrix.setAll(GREEN);
    matrix.setCaption('末轮 · AddRoundKey');
  });
  yield W(380);

  // 结算：密文 + FIPS 向量 + 雪崩
  const ct = state.slice();
  const ctHex = hx(ct);
  const ctHeat = diffMask(ct, alt);
  const fipsOk = ctHex === FIPS_CT;
  director.chapter('密文');
  yield S(() => {
    matrix.setValues(ct);
    matrix.setHeat(ctHeat, GREEN, 0x14532d);
    matrix.setCaption('密文 · ' + ctHex.slice(0, 8) + '…');
    director.beat({
      title: '密文：1 字节差异染遍整块',
      why: '翻转 1 个明文字节，10 轮后 16/16 密文字节全部不同——这就是雪崩效应。',
      stateText: (fipsOk ? '✓ FIPS-197 C.1 向量一致' : '自定义明文（无对应 FIPS 向量）') + ' · 差异 ' + countDiff(ctHeat) + '/16',
      progress: 7,
      camera: SHOT_FINAL,
      annotations: [
        { id: 'ct', text: 'CT ' + ctHex.slice(0, 8) + '… · ' + countDiff(ctHeat) + '/16 字节不同', anchor: () => new THREE.Vector3(320, 545, 0), offset: [0, -52], className: 'final' },
      ],
    });
    director.stateUpdate(blocks({ round: 10, stateBytes: ct, keyBytes: keySlice(10), heat: ctHeat, note: '密文完成' }));
    director.setProgress(7);
    status.textContent = 'AES-128 完成：' + (fipsOk ? 'FIPS-197 C.1 ✓ · ' : '') +
      'CT ' + ctHex + ' · 1 字节差异 → ' + countDiff(ctHeat) + '/16 密文字节不同';
  });
  yield W(1000);

  // 复盘
  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'AES = 代换 + 置换 + 混合',
    why: 'SubBytes 混淆、ShiftRows/MixColumns 扩散、AddRoundKey 注入密钥；10 轮后雪崩。AES-128 密钥空间 2¹²⁸，AES-NI 一轮一条指令。',
    stateText: 'O(轮数 × 块大小) · 10 轮 × 16 字节',
    progress: 9,
    camera: SHOT_WIDE,
    annotations: [],
  }));
  director.setProgress(9);
  yield W(800);
}

function restart(pt, autoPlay = true) {
  currentPT = pt.slice();
  engine.clear();
  director.reset();
  resetVisual();
  engine.queue(() => runAES(currentPT));
  if (autoPlay) engine.toggle();
}

input.addButton('重播', () => restart(currentPT, true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  currentPT = FIPS_PT.slice();
  ptSelect.value = 'FIPS 向量';
  resetVisual();
});

resetVisual();
engine.queue(() => runAES(currentPT));
scene.start(engine);
