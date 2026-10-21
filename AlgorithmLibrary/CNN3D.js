// AlgorithmLibrary/CNN3D.js — CNN：3×3 卷积核滑过 6×6 输入 → ReLU → 2×2 最大池化；平移不变性与堆叠复盘。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, makeTextSprite } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
applyTheme('CNN3D');

const scene = new Scene3D('scene', { cameraPos: [420, 780, 1280], lookAt: [400, 520, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const C = {
  on: 0x2dd4bf, off: 0x1e293b, pos: 0x4ade80, neg: 0xf87171, zero: 0x334155,
  kerPos: 0xfbbf24, kerNeg: 0xfb7185, frame: 0xfacc15, pool: 0x38bdf8,
};
const KERNELS = {
  '垂直边缘': [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
  '水平边缘': [[-1, -1, -1], [0, 0, 0], [1, 1, 1]],
  '拉普拉斯': [[0, -1, 0], [-1, 4, -1], [0, -1, 0]],
};
const EDGE_CN = {
  '垂直边缘': '绿色 = 正响应（亮块左边缘），红色 = 负响应（右边缘）',
  '水平边缘': '绿色 = 正响应（亮块上边缘），红色 = 负响应（下边缘）',
  '拉普拉斯': '绿色 = 正响应（亮区边缘/角点），红色 = 负响应（暗侧边缘）',
};
const IMG_A = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => (r >= 2 && r <= 3 && c >= 2 && c <= 3 ? 1 : 0)));
const IMG_B = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => (r >= 2 && r <= 3 && c >= 1 && c <= 2 ? 1 : 0)));

const LAY = {
  inX: 150, inY: 470, inPitch: 54, inSize: 46,
  ftX: 480, ftY: 470, ftPitch: 62, ftSize: 52,
  plX: 760, plY: 470, plPitch: 76, plSize: 64,
  krX: 150, krY: 760, krPitch: 44, krSize: 36,
};
const mob = matchMedia('(max-width: 900px)').matches;

const convolve = (mat, ker) => {
  const n = mat.length, k = ker.length, out = [];
  for (let i = 0; i + k <= n; i++) {
    const row = [];
    for (let j = 0; j + k <= n; j++) {
      let sum = 0;
      for (let r = 0; r < k; r++) for (let c = 0; c < k; c++) sum += mat[i + r][j + c] * ker[r][c];
      row.push(sum);
    }
    out.push(row);
  }
  return out;
};
const reluOf = mat => mat.map(row => row.map(v => Math.max(0, v)));
const maxPool2 = mat => {
  const h = mat.length >> 1, w = mat[0].length >> 1, out = [];
  for (let i = 0; i < h; i++) {
    const row = [];
    for (let j = 0; j < w; j++) {
      row.push(Math.max(mat[2 * i][2 * j], mat[2 * i][2 * j + 1], mat[2 * i + 1][2 * j], mat[2 * i + 1][2 * j + 1]));
    }
    out.push(row);
  }
  return out;
};

let kerName = '垂直边缘';
let img = IMG_A;
let conv = convolve(img, KERNELS[kerName]);
let relu = reluOf(conv);
let poolMap = maxPool2(relu);

const director = new StoryDirector(scene, {
  title: 'CNN · 卷积网络',
  total: 8,
  legend: [
    { label: '亮像素', color: '#2dd4bf' },
    { label: '核权重', color: '#fbbf24' },
    { label: '正响应', color: '#4ade80' },
    { label: '负响应', color: '#f87171' },
    { label: '池化', color: '#38bdf8' },
  ],
  onReplay: () => restart(true),
});

// ---- 输入 6×6 ----
const imgCells = [];
for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
  imgCells.push(new VBox(scene, {
    w: LAY.inSize, h: LAY.inSize, d: 24,
    x: LAY.inX + (c - 2.5) * LAY.inPitch, y: LAY.inY - (r - 2.5) * LAY.inPitch, z: 0,
    color: C.off, emissive: 0,
  }));
}
const imgLabel = (text, x, y) => new VText(scene, { text, x, y, z: 0, color: PALETTE.textDim, scale: 0.55 });
imgLabel('输入 6×6', LAY.inX, 300);
imgLabel('特征图 4×4', LAY.ftX, 300);
imgLabel('最大池化 2×2', LAY.plX, 300);
const kerLabel = imgLabel('卷积核 3×3 · 权重共享', LAY.krX, 862);

// ---- 卷积核 3×3 ----
const kerCells = [];
for (let r = 0; r < 3; r++) {
  kerCells.push([]);
  for (let c = 0; c < 3; c++) {
    kerCells[r].push(new VBox(scene, {
      w: LAY.krSize, h: LAY.krSize, d: 18,
      x: LAY.krX + (c - 1) * LAY.krPitch, y: LAY.krY - (r - 1) * LAY.krPitch, z: 0,
      color: C.zero, emissive: 0, label: '0',
    }));
  }
}

// ---- 特征图 4×4 + 池化 2×2 ----
const featCells = [];
for (let r = 0; r < 4; r++) {
  featCells.push([]);
  for (let c = 0; c < 4; c++) {
    featCells[r].push(new VBox(scene, {
      w: LAY.ftSize, h: LAY.ftSize, d: 22,
      x: LAY.ftX + (c - 1.5) * LAY.ftPitch, y: LAY.ftY - (r - 1.5) * LAY.ftPitch, z: 0,
      color: C.zero, emissive: 0, label: '?',
    }));
  }
}
const poolCells = [];
for (let r = 0; r < 2; r++) {
  poolCells.push([]);
  for (let c = 0; c < 2; c++) {
    poolCells[r].push(new VBox(scene, {
      w: LAY.plSize, h: LAY.plSize, d: 24,
      x: LAY.plX + (c - 0.5) * LAY.plPitch, y: LAY.plY - (r - 0.5) * LAY.plPitch, z: 0,
      color: C.zero, emissive: 0, label: '?',
    }));
  }
}

// 窗口 / 池化窗口高亮（背面发光框，透过格子间隙可见）
const winBox = new VBox(scene, { w: 166, h: 166, d: 4, x: LAY.inX, y: LAY.inY, z: -24, color: C.frame, emissive: C.frame });
winBox.mesh.visible = false;
const poolFrame = new VBox(scene, { w: 136, h: 136, d: 4, x: LAY.ftX, y: LAY.ftY, z: -24, color: C.pool, emissive: C.pool });
poolFrame.mesh.visible = false;

// 管线箭头
tubeBetween(scene, [LAY.inX + 3 * 27, LAY.inY, 0], [LAY.ftX - 2 * 31, LAY.ftY, 0], { color: PALETTE.edge, radius: 2, opacity: 0.35 });
tubeBetween(scene, [LAY.ftX + 2 * 31, LAY.ftY, 0], [LAY.plX - 38, LAY.plY, 0], { color: PALETTE.edge, radius: 2, opacity: 0.35 });
const kerArrow = tubeBetween(scene, [LAY.krX, LAY.krY - 58, 0], [LAY.krX, 608, 0], { color: C.frame, radius: 1.6, opacity: 0.4 });
new VText(scene, { text: 'ReLU: max(0, x)', x: LAY.ftX, y: 640, z: 0, color: PALETTE.textDim, scale: 0.52 });

// 复盘：堆叠层
const layerGroup = new THREE.Group();
[[-190, '第 2 层', 710], [-320, '第 3 层', 630], [-450, '更深层 · 物体', 550]].forEach(([z, label, y], i) => {
  const color = [0x2dd4bf, 0x4ade80, 0x38bdf8][i];
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(860, 560),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }),
  );
  plane.position.set(400, 520, z);
  const sprite = makeTextSprite(label, { scale: 0.7, color: '#9db8d9' });
  sprite.position.set(730, y, z);
  layerGroup.add(plane, sprite);
});
layerGroup.visible = false;
scene.add(layerGroup);

const ease = p => p * p * (3 - 2 * p);
const convColor = v => (v > 0 ? C.pos : v < 0 ? C.neg : C.zero);
const kerColor = v => (v > 0 ? C.kerPos : v < 0 ? C.kerNeg : C.zero);
const fmtRows = mat => mat.map(row => row.map(String).join(' ')).join('  /  ');
const poolStr = mat => '[' + mat.map(row => '[' + row.join(',') + ']').join(', ') + ']';
const brightDesc = mat => {
  let n = 0, r0 = 9, c0 = 9, r1 = -1, c1 = -1;
  mat.forEach((row, r) => row.forEach((v, c) => {
    if (!v) return;
    n++; r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c);
  }));
  return `${n} 个亮像素 @ 行 ${r0}-${r1} · 列 ${c0}-${c1}`;
};

function paintImgCell(box, v) {
  box.setText(v ? '1' : '');
  box.setColor(v ? C.on : C.off, v ? C.on : 0);
}
function paintImage(mat) { imgCells.forEach((b, i) => paintImgCell(b, mat[Math.floor(i / 6)][i % 6])); }
function paintKernel() {
  kerCells.forEach((row, r) => row.forEach((b, c) => {
    const v = KERNELS[kerName][r][c];
    b.setText(String(v));
    b.setColor(kerColor(v), v === 0 ? 0 : kerColor(v));
  }));
}
function resetFeature() { featCells.forEach(row => row.forEach(b => { b.setText('?'); b.setColor(C.zero, 0); })); }
function resetPool() { poolCells.forEach(row => row.forEach(b => { b.setText('?'); b.setColor(C.zero, 0); })); }
function setFeat(i, j, v) { featCells[i][j].setText(String(v)); featCells[i][j].setColor(convColor(v), convColor(v)); }
function showKernel(on) {
  kerCells.flat().forEach(b => { b.mesh.visible = on; });
  kerLabel.sprite.visible = on;
  kerArrow.visible = on;
}

function resetAll() {
  img = IMG_A;
  conv = convolve(img, KERNELS[kerName]);
  relu = reluOf(conv);
  poolMap = maxPool2(relu);
  paintImage(img);
  paintKernel();
  showKernel(true);
  resetFeature();
  resetPool();
  winBox.mesh.visible = false;
  poolFrame.mesh.visible = false;
  poolFrame.mesh.scale.setScalar(1);
  layerGroup.visible = false;
  poolCells.forEach(row => row.forEach(b => b.mesh.scale.setScalar(1)));
}

function stateInfo(winText = '—', phase = '') {
  return {
    blocks: [
      { type: 'text', label: '输入 6×6', value: brightDesc(img) },
      { type: 'text', label: '卷积核 3×3 · ' + kerName, value: fmtRows(KERNELS[kerName]) },
      { type: 'text', label: '窗口 / 加权和', value: winText },
      { type: 'text', label: '卷积输出 4×4', value: fmtRows(conv) },
      { type: 'text', label: 'ReLU 输出', value: fmtRows(relu) },
      { type: 'text', label: '最大池化 2×2', value: poolStr(poolMap) },
    ],
    footer: `参数共享：9 个权重滑过 16 个窗口 · 池化无参数 · O(n²k²)${phase ? ' · ' + phase : ''}`,
  };
}

const SHOT_HOME = { pos: [420, 780, 1280], target: [400, 520, 0], ms: 900 };
const SHOT_KERNEL = { pos: [170, 900, 520], target: [150, 760, 0], ms: 750 };
const SHOT_SLIDE = { pos: [140, 760, 830], target: [150, 460, 0], ms: 750 };
const SHOT_FEATURE = { pos: [480, 650, 620], target: [480, 470, 0], ms: 750 };
const SHOT_RELU = { pos: [480, 570, 520], target: [480, 470, 0], ms: 700 };
const SHOT_POOL = { pos: [660, 690, 860], target: [650, 470, 0], ms: 800 };
const SHOT_SIDE = { pos: [-360, 640, 880], target: [420, 470, 0], ms: 900 };
const SHOT_FINAL = { pos: [420, 860, 1460], target: [420, 520, 0], ms: 900 };

function* runCNN() {
  director.reset();
  resetAll();
  director.chapter('输入');
  yield S(() => director.beat({
    title: '卷积核对准图像',
    why: '输入是一张 6×6 灰度图；上方 3×3 卷积核将滑过每个局部窗口，提取边缘这类局部模式。',
    stateText: '6×6 输入 · 3×3 卷积核 · 输出 4×4',
    progress: 1,
    camera: SHOT_HOME,
    annotations: [{ id: 'hook', text: '卷积核在看什么？', anchor: () => new THREE.Vector3(150, 800, 0), offset: mob ? [120, -30] : [0, -34], className: 'gold' }],
  }));
  director.stateUpdate(stateInfo('尚未滑动', '就位'));
  yield W(650);

  director.chapter('卷积核');
  yield S(() => director.beat({
    title: '9 个权重',
    why: '每个输出 = 核与 3×3 窗口逐元素相乘再求和；同一个核滑过全图，这就是权重共享。',
    stateText: '卷积 = 局部加权和 Σ w·x',
    progress: 2,
    camera: SHOT_KERNEL,
    annotations: [{ id: 'ker', text: '局部加权求和 Σ w·x', anchor: () => new THREE.Vector3(150, 812, 0), offset: mob ? [110, -28] : [0, -30], className: 'gold' }],
  }));
  for (let k = 0; k < 9; k++) {
    const r = Math.floor(k / 3), c = k % 3;
    yield S(() => kerCells[r][c].setColor(0xffffff, 0xffffff));
    yield W(80);
    yield S(() => {
      const v = KERNELS[kerName][r][c];
      kerCells[r][c].setColor(kerColor(v), v === 0 ? 0 : kerColor(v));
    });
  }
  director.stateUpdate(stateInfo('9 个权重高亮', '核'));

  director.chapter('滑动');
  yield S(() => director.beat({
    title: '卷积核滑过全图',
    why: '窗口按行扫描 16 个位置，每个位置算一次加权和，写入特征图对应格子。',
    stateText: '窗口 (0,0) · 权重共享',
    progress: 3,
    camera: SHOT_SLIDE,
    annotations: [{ id: 'slide', text: '同一个核，滑过 16 个窗口', anchor: () => new THREE.Vector3(150, 620, 0), offset: mob ? [110, -26] : [0, -30] }],
  }));
  winBox.mesh.visible = true;
  winBox.mesh.position.set(LAY.inX - 1.5 * LAY.inPitch, LAY.inY + 1.5 * LAY.inPitch, -24);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const tx = LAY.inX + (j - 1.5) * LAY.inPitch;
      const ty = LAY.inY - (i - 1.5) * LAY.inPitch;
      const from = winBox.mesh.position.clone();
      const to = new THREE.Vector3(tx, ty, -24);
      yield A(140, p => { winBox.mesh.position.lerpVectors(from, to, ease(p)); });
      yield S(() => {
        setFeat(i, j, conv[i][j]);
        const s = `窗口 (${i},${j}) · Σ = ${conv[i][j]}`;
        director.setBeatState(s);
        director.stateUpdate(stateInfo(`窗口 (${i},${j}) · 加权和 ${conv[i][j]}`, '滑动'));
      });
      yield W(55);
    }
  }
  winBox.mesh.visible = false;

  director.chapter('特征图');
  yield S(() => director.beat({
    title: '特征图 4×4',
    why: '每格记录一个局部窗口的响应：' + EDGE_CN[kerName] + '。',
    stateText: '16 个窗口 → 4×4 特征图',
    progress: 4,
    camera: SHOT_FEATURE,
    annotations: [{ id: 'feat', text: '特征图记录局部模式', anchor: () => new THREE.Vector3(LAY.ftX, 610, 0), offset: mob ? [100, -24] : [0, -26], className: 'final' }],
  }));
  director.stateUpdate(stateInfo('16 个窗口完成', '特征图'));
  yield W(800);

  director.chapter('ReLU');
  yield S(() => director.beat({
    title: 'ReLU 非线性',
    why: 'max(0, x)：负响应清零，只保留正响应；没有它，多层卷积仍然只是线性变换。',
    stateText: '负数 → 0，正数保留',
    progress: 5,
    camera: SHOT_RELU,
    annotations: [{ id: 'relu', text: 'ReLU: 负数清零', anchor: () => new THREE.Vector3(LAY.ftX, 600, 0), offset: mob ? [100, -24] : [0, -26], className: 'warn' }],
  }));
  const negCells = [];
  featCells.forEach((row, i) => row.forEach((b, j) => { if (conv[i][j] < 0) negCells.push([i, j]); }));
  let reluDone = 0;
  yield A(700, p => {
    while (reluDone < negCells.length && p > reluDone / negCells.length) {
      const [i, j] = negCells[reluDone++];
      featCells[i][j].setText('0');
      featCells[i][j].setColor(C.zero, 0);
    }
  });
  director.stateUpdate(stateInfo('负响应已清零', 'ReLU'));
  yield W(550);

  director.chapter('池化');
  yield S(() => director.beat({
    title: '2×2 最大池化',
    why: '每 2×2 取最大值，4×4 → 2×2：降维、减少计算，并保留最强的局部响应。',
    stateText: 'max(2×2) · 输出 2×2',
    progress: 6,
    camera: SHOT_POOL,
    annotations: [{ id: 'pool', text: '降维保留最强响应', anchor: () => new THREE.Vector3(LAY.plX, 610, 0), offset: [0, -26], className: 'final' }],
  }));
  for (let q = 0; q < 4; q++) {
    const pr = Math.floor(q / 2), pc = q % 2;
    yield S(() => {
      poolFrame.mesh.visible = true;
      poolFrame.mesh.position.set(LAY.ftX + (2 * pc - 1) * LAY.ftPitch, LAY.ftY - (2 * pr - 1) * LAY.ftPitch, -24);
      director.setBeatState(`2×2 窗口 (${pr},${pc}) · max = ${poolMap[pr][pc]}`);
    });
    yield A(260, p => poolFrame.mesh.scale.setScalar(1 + 0.07 * Math.sin(p * Math.PI)));
    yield S(() => {
      poolFrame.mesh.scale.setScalar(1);
      poolCells[pr][pc].setText(String(poolMap[pr][pc]));
      poolCells[pr][pc].setColor(C.pool, C.pool);
    });
    yield A(220, p => poolCells[pr][pc].mesh.scale.setScalar(1 + 0.28 * Math.sin(p * Math.PI)));
    yield S(() => poolCells[pr][pc].mesh.scale.setScalar(1));
    yield W(90);
  }
  poolFrame.mesh.visible = false;
  director.stateUpdate(stateInfo('池化完成', '池化'));
  yield W(600);

  const poolA = poolMap.map((row) => row.slice());
  const convB = convolve(IMG_B, KERNELS[kerName]);
  const reluB = reluOf(convB);
  const poolB = maxPool2(reluB);
  const poolSame = poolStr(poolA) === poolStr(poolB);
  director.chapter(poolSame ? '平移不变' : '平移响应');
  yield S(() => director.beat({
    title: poolSame ? '平移不变性' : '平移后的池化响应',
    why: poolSame
      ? '把亮块左移 1 格：卷积响应跟着平移，但 2×2 池化后输出仍是 ' + poolStr(poolA) + '。'
      : '把亮块左移 1 格：卷积响应跟着平移，但当前核下池化输出从 ' + poolStr(poolA) + ' 变为 ' + poolStr(poolB) + '——这个核不具备严格的池化平移不变。',
    stateText: poolSame
      ? '输入平移 1 格 → 池化输出不变'
      : '输入平移 1 格 → ' + poolStr(poolA) + ' → ' + poolStr(poolB),
    progress: 7,
    camera: SHOT_SIDE,
    annotations: [
      { id: 'shift', text: '输入左移 1 格', anchor: () => new THREE.Vector3(LAY.inX, 620, 0), offset: mob ? [110, -26] : [0, -28] },
      { id: 'same', text: poolSame ? '池化输出不变 → 平移不变' : '池化输出随输入改变', anchor: () => new THREE.Vector3(LAY.plX, 560, 0), offset: [0, -26], className: 'final' },
    ],
  }));
  const shifted = new Set();
  yield A(650, p => {
    imgCells.forEach((b, idx) => {
      if (shifted.has(idx)) return;
      const r = Math.floor(idx / 6), c = idx % 6;
      if (p < (r + c) / 10) return;
      shifted.add(idx);
      paintImgCell(b, IMG_B[r][c]);
    });
  });
  const featDone = new Set();
  yield A(550, p => {
    featCells.forEach((row, i) => row.forEach((b, j) => {
      const idx = i * 4 + j;
      if (featDone.has(idx) || p < idx / 16) return;
      featDone.add(idx);
      b.setText(String(reluB[i][j]));
      b.setColor(convColor(reluB[i][j]), convColor(reluB[i][j]));
    }));
  });
  img = IMG_B; conv = convB; relu = reluB; poolMap = poolB;
  yield S(() => {
    poolCells.forEach((row, i) => row.forEach((b, j) => {
      b.setText(String(poolB[i][j]));
      b.setColor(C.pool, C.pool);
    }));
    director.setBeatState(poolSame ? '池化输出仍然 ' + poolStr(poolB) : '池化输出变为 ' + poolStr(poolB));
    director.stateUpdate(stateInfo(poolSame ? '输入平移后池化输出不变' : '输入平移后池化输出改变',
      poolSame ? '平移不变' : '平移响应'));
  });
  yield A(500, p => poolCells.forEach(row => row.forEach(b => b.mesh.scale.setScalar(1 + 0.22 * Math.sin(p * Math.PI)))));
  yield S(() => poolCells.forEach(row => row.forEach(b => b.mesh.scale.setScalar(1))));
  yield W(650);

  director.chapter('复盘');
  yield S(() => {
    layerGroup.visible = true;
    showKernel(false);
    director.beat({
      title: 'CNN = 卷积 + 激活 + 池化',
      why: '一层提取局部边缘，堆叠多层后组合出纹理和物体；权重共享让参数量远小于全连接层。',
      stateText: '卷积 O(n²k²) + ReLU O(n²) + 池化 O(n²)',
      progress: 8,
      camera: SHOT_FINAL,
      annotations: [{ id: 'stack', text: '堆叠 Conv → ReLU → Pool → …', anchor: () => new THREE.Vector3(420, 790, -190), offset: mob ? [140, -24] : [0, -26], className: 'gold' }],
    });
    director.setProgress(8);
    status.textContent = `CNN 完成 · 池化 ${poolStr(poolB)} · ${poolSame ? '平移不变' : '平移后响应改变'}`;
    director.stateUpdate(stateInfo('复盘', '复杂度 O(n²k²)'));
  });
  yield W(900);
}

function restart(autoPlay = true) {
  engine.clear();
  director.reset();
  status.textContent = '';
  resetAll();
  engine.queue(() => runCNN());
  if (autoPlay) engine.toggle();
}

const kerSelect = input.addSelect('卷积核', Object.keys(KERNELS), kerName, (v) => {
  kerName = v;
  kerSelect.value = v;
  restart(true);
});
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  resetAll();
  status.textContent = '';
});

resetAll();
engine.queue(() => runCNN());
scene.start(engine);
