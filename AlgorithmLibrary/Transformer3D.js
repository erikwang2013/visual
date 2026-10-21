// AlgorithmLibrary/Transformer3D.js — Transformer 自注意力：词向量 → Q/K/V → QKᵀ/√d → softmax → 加权 V；多头与 O(1) 路径。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
applyTheme('Transformer3D');

const scene = new Scene3D('scene', { cameraPos: [430, 760, 1150], lookAt: [430, 480, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const C = {
  tok: 0xc084fc, x: 0x60a5fa, q: 0xfcd34d, k: 0x67e8f9, v: 0x4ade80,
  s: 0xfacc15, a: 0xfb923c, out: 0x4ade80, dim: 0x334155,
};
const HEAD_NAMES = ['指代头', '句法头'];
const HEAD_OPTS = ['头 1 · 指代', '头 2 · 句法'];
const LAYER_OPTS = ['第 1 层', '第 2 层'];
const mob = matchMedia('(max-width: 900px)').matches;

const PRESETS = [
  {
    tokens: ['小猫', '追', '老鼠', '因为', '它'],
    query: 4,
    x: [[2.0, 1.5], [0.5, 2.5], [1.8, 0.2], [0.3, 0.8], [1.6, 1.2]],
  },
  {
    tokens: ['我', '爱', '学习', '人工', '智能'],
    query: 4,
    x: [[1.8, 0.4], [1.0, 1.8], [1.9, 1.2], [1.4, 0.8], [2.0, 1.0]],
  },
];

// 每层 × 每头一套投影；第 2 层输入是第一层的上下文输出（带残差）。
const PROJECTIONS = [
  [
    { Wq: [[1.2, 0], [0, 0.6]], Wk: [[1, 0], [0, 0.3]], Wv: [[1, 0], [0, 1]] },
    { Wq: [[0.3, 0], [0, 1.4]], Wk: [[0.4, 0], [0, 1.2]], Wv: [[1, 0], [0, 1]] },
  ],
  [
    { Wq: [[1.0, 0.35], [0.15, 1.0]], Wk: [[1.1, 0], [0.1, 0.8]], Wv: [[0.9, 0.1], [0.1, 1.0]] },
    { Wq: [[0.5, 0.6], [0.1, 1.1]], Wk: [[0.7, 0.15], [0.1, 1.0]], Wv: [[1.0, 0], [0, 0.95]] },
  ],
];

const project = (W, v) => [W[0][0] * v[0] + W[0][1] * v[1], W[1][0] * v[0] + W[1][1] * v[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
function softmax(values) {
  const m = Math.max(...values);
  const exps = values.map(v => Math.exp(v - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}
function attentionRow(X, qi, P) {
  const Qs = X.map(x => project(P.Wq, x));
  const K = X.map(x => project(P.Wk, x));
  const V = X.map(x => project(P.Wv, x));
  const scores = K.map(k => dot(Qs[qi], k) / Math.SQRT2);
  const weights = softmax(scores);
  const out = [0, 0];
  weights.forEach((a, i) => { out[0] += a * V[i][0]; out[1] += a * V[i][1]; });
  return { q: Qs[qi], Qs, K, V, scores, weights, out };
}
function layerForward(X, P) {
  const rows = X.map((_, i) => attentionRow(X, i, P));
  return rows.map((r, i) => [X[i][0] + r.out[0], X[i][1] + r.out[1]]);
}

let presetIdx = 0;
let headIdx = 0;
let layerIdx = 0;
function computeData() {
  const preset = PRESETS[presetIdx];
  let X = preset.x.map(v => v.slice());
  for (let l = 0; l < layerIdx; l++) X = layerForward(X, PROJECTIONS[l][headIdx]);
  const row = attentionRow(X, preset.query, PROJECTIONS[layerIdx][headIdx]);
  return { preset, X, row, qi: preset.query, tokens: preset.tokens, headIdx, layerIdx };
}

const director = new StoryDirector(scene, {
  title: 'Transformer',
  total: 8,
  legend: [
    { label: '词向量', color: '#c084fc' },
    { label: 'Q 查询', color: '#fcd34d' },
    { label: 'K 键', color: '#67e8f9' },
    { label: 'V 值', color: '#4ade80' },
    { label: '强注意力', color: '#fb923c' },
  ],
  onReplay: () => restart(true),
});

// ---- 舞台：5 个词列 ----
const TX = [110, 260, 410, 560, 710];
const TOK_Y = 620;
const tokenNodes = TX.map((x, i) => new VNode(scene, {
  radius: 22, x, y: TOK_Y, z: 0, label: PRESETS[0].tokens[i], color: C.tok, emissive: C.tok,
}));

const xBoxes = TX.map((x, i) => new VBox(scene, { w: 104, h: 32, d: 18, x, y: 540, z: 0, color: C.x, emissive: 0, label: '' }));
const qBoxes = TX.map((x, i) => new VBox(scene, { w: 108, h: 36, d: 20, x, y: 465, z: 0, color: C.dim, emissive: 0, label: '?' }));
const kBoxes = TX.map((x, i) => new VBox(scene, { w: 108, h: 36, d: 20, x, y: 395, z: 0, color: C.dim, emissive: 0, label: '?' }));
const vBoxes = TX.map((x, i) => new VBox(scene, { w: 108, h: 36, d: 20, x, y: 325, z: 0, color: C.dim, emissive: 0, label: '?' }));
const sBoxes = TX.map((x, i) => new VBox(scene, { w: 108, h: 36, d: 20, x, y: 245, z: 0, color: C.dim, emissive: 0, label: '?' }));
const aBoxes = TX.map((x, i) => new VBox(scene, { w: 108, h: 36, d: 20, x, y: 175, z: 0, color: C.dim, emissive: 0, label: '?' }));
const outBox = new VBox(scene, { w: 250, h: 46, d: 24, x: 410, y: 90, z: 0, color: C.out, emissive: C.out, label: '输出' });
outBox.mesh.visible = false;

const sumText = new VText(scene, { text: 'Σα = 1.000', x: 410, y: 130, z: 0, color: '#fde68a', scale: 0.52 });
sumText.sprite.visible = false;
[['词向量 x', 540], ['Q 查询', 465], ['K 键', 395], ['V 值', 325], ['得分 s', 245], ['权重 α', 175], ['输出', 90]].forEach(([text, y]) => {
  new VText(scene, { text, x: 812, y, z: 0, color: PALETTE.textDim, scale: 0.5 });
});

// ---- 注意力光束 ----
const beamGroup = new THREE.Group();
scene.add(beamGroup);
const beamMeshes = [];
const LOW = new THREE.Color(0x3b82f6);
const HIGH = new THREE.Color(0xfcd34d);
const HEAT_LOW = new THREE.Color(0x1e3a8a);
const tmpColor = new THREE.Color();
const ring = new VTorus(scene, { radius: 28, x: TX[0], y: TOK_Y, z: 0, color: C.q });
ring.mesh.visible = false;

const heat = (v, max) => tmpColor.copy(HEAT_LOW).lerp(HIGH, Math.max(0, Math.min(1, v / Math.max(max, 1e-6)))).getHex();
const fv = v => `(${v[0].toFixed(2)}, ${v[1].toFixed(2)})`;
const fv1 = v => `(${v[0].toFixed(1)},${v[1].toFixed(1)})`;
const fv2 = v => `${v[0].toFixed(1)},${v[1].toFixed(1)}`;

function clearBeams() {
  for (const m of beamMeshes) {
    beamGroup.remove(m);
    m.geometry.dispose();
    m.material.dispose();
  }
  beamMeshes.length = 0;
}
function addBeam(x1, x2, w, mode, opts = {}) {
  const z = opts.z || 0;
  const start = new THREE.Vector3(x1, TOK_Y + 24, 0);
  const end = new THREE.Vector3(x2, TOK_Y + 24, 0);
  const ctrl = new THREE.Vector3((x1 + x2) / 2, TOK_Y + 130 + 110 * w, z);
  const curve = new THREE.QuadraticBezierCurve3(start, ctrl, end);
  let radius, color, opacity;
  if (mode === 'score') {
    radius = 1 + 2.5 * w;
    color = 0x60a5fa;
    opacity = 0.35 + 0.5 * w;
  } else if (mode === 'weight') {
    radius = 1.4 + 7 * Math.pow(w, 1.5);
    color = tmpColor.copy(LOW).lerp(HIGH, w).getHex();
    opacity = 0.3 + 0.7 * w;
  } else {
    radius = opts.focus ? 1.2 + 5 * w : 0.5 + 1.5 * w;
    color = tmpColor.copy(LOW).lerp(HIGH, w).getHex();
    opacity = opts.focus ? 0.2 + 0.5 * w : 0.04 + 0.22 * w;
  }
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 24, radius, 8, false),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  mesh.userData.base = opacity;
  beamGroup.add(mesh);
  beamMeshes.push(mesh);
}
function renderBeams(values, mode, qi) {
  clearBeams();
  const max = Math.max(1e-6, ...values.map((v, i) => (i === qi ? 0 : Math.max(0, v))));
  values.forEach((v, i) => { if (i !== qi) addBeam(TX[qi], TX[i], Math.max(0, v) / max, mode); });
  ring.mesh.visible = true;
  ring.mesh.position.set(TX[qi], TOK_Y, 0);
  ring.mesh.scale.setScalar(1 + 1.4 * Math.max(0, values[qi]) / max);
}
function renderAllPairs(rows, qi) {
  clearBeams();
  rows.forEach((row, i) => {
    const max = Math.max(1e-6, ...row.weights);
    row.weights.forEach((w, j) => {
      if (i === j) return;
      addBeam(TX[i], TX[j], w / max, 'graph', { focus: i === qi, z: (i - 2) * 26 });
    });
  });
  ring.mesh.visible = true;
  ring.mesh.position.set(TX[qi], TOK_Y, 0);
  ring.mesh.scale.setScalar(1.3);
}
function* growBeams() {
  yield A(450, p => beamMeshes.forEach(m => { m.material.opacity = m.userData.base * p; }));
}

function stateInfo(data, row, { head = data.headIdx, layer = data.layerIdx, phase = '' } = {}) {
  const { tokens, qi, X } = data;
  const maxW = Math.max(...row.weights);
  return {
    blocks: [
      { type: 'chips', label: `词向量 x（${layer === 0 ? '第 1 层输入' : '第 ' + (layer + 1) + ' 层输入'}）`, items: tokens.map((t, i) => ({ text: `${t} ${fv(X[i])}` })) },
      { type: 'text', label: `Q 查询 · ${tokens[qi]}`, value: `q = W_Q·x = ${fv(row.q)}` },
      { type: 'chips', label: 'K 键 / V 值', items: tokens.flatMap((t, i) => [{ text: `${t} k${fv(row.K[i])}` }, { text: `${t} v${fv(row.V[i])}`, cls: 'visited' }]) },
      { type: 'kv', label: '得分 s = q·kᵀ/√d', items: tokens.map((t, i) => ({ k: t, v: row.scores[i].toFixed(2) })) },
      { type: 'chips', label: `注意力权重 α · 头 ${head + 1}`, items: tokens.map((t, i) => ({ text: `${t} ${row.weights[i].toFixed(3)}`, cls: row.weights[i] === maxW ? 'head' : '' })) },
      { type: 'text', label: '输出 · 层 / 头', value: `Σαᵢvᵢ = ${fv(row.out)} · 第 ${layer + 1} 层 · 头 ${head + 1}（${HEAD_NAMES[head]}）` },
    ],
    footer: `Σα = ${row.weights.reduce((a, b) => a + b, 0).toFixed(3)} · d_k = 2 · 缩放 √d = 1.414${phase ? ' · ' + phase : ''}`,
  };
}

function resetScene(data) {
  tokenNodes.forEach((n, i) => {
    n.setText(data.tokens[i]);
    const c = i === data.qi ? C.q : C.tok;
    n.setColor(c, c);
  });
  xBoxes.forEach((b, i) => { b.setText('x' + fv2(data.X[i])); b.setColor(C.x, 0); });
  [qBoxes, kBoxes, vBoxes, sBoxes, aBoxes].forEach(row => row.forEach(b => { b.setText('?'); b.setColor(C.dim, 0); }));
  outBox.mesh.visible = false;
  outBox.setColor(C.out, C.out);
  outBox.mesh.scale.setScalar(1);
  sumText.sprite.visible = false;
  clearBeams();
  ring.mesh.visible = false;
  ring.mesh.scale.setScalar(1);
}

const SHOT_HOOK = { pos: [430, 760, 1150], target: [430, 480, 0], ms: 900 };
const SHOT_QKV = { pos: [430, 640, 820], target: [430, 430, 0], ms: 750 };
const SHOT_SCORE = { pos: [430, 880, 980], target: [430, 500, 0], ms: 800 };
const SHOT_SOFTMAX = { pos: [430, 500, 720], target: [430, 250, 0], ms: 750 };
const SHOT_WEIGHTED = { pos: [430, 950, 850], target: [430, 500, 0], ms: 800 };
const SHOT_MULTI = { pos: [-160, 780, 900], target: [430, 460, 0], ms: 900 };
const SHOT_SIDE = { pos: [-480, 620, 760], target: [430, 460, 0], ms: 900 };
const SHOT_FINAL = { pos: [430, 930, 1250], target: [430, 480, 0], ms: 900 };

function* runAttention(data) {
  director.reset();
  resetScene(data);
  const { tokens, qi, row, X } = data;
  const queryWord = tokens[qi];
  const otherHead = 1 - data.headIdx;

  director.chapter('输入');
  yield S(() => director.beat({
    title: '一句话，5 个词',
    why: '每个词先变成向量 x；处理查询词「' + queryWord + '」时，它该把注意力分给哪些词？',
    stateText: tokens.join(' · ') + ' · 查询：' + queryWord,
    progress: 1,
    camera: SHOT_HOOK,
    annotations: [{ id: 'hook', text: '每个词该看谁？', anchor: () => tokenNodes[qi].mesh.position.clone().add(new THREE.Vector3(0, 70, 0)), offset: mob ? [100, -30] : [0, -34], className: 'gold' }],
  }));
  director.stateUpdate(stateInfo(data, row, { phase: '词向量就位' }));
  yield W(700);

  director.chapter('Q/K/V');
  yield S(() => director.beat({
    title: '同一词生成 Q / K / V',
    why: 'x 乘三个权重矩阵：Q 表示「我在找什么」，K 表示「我能提供什么」，V 是真正被汇总的信息。',
    stateText: `q(${fv1(row.q)}) · K / V 就位`,
    progress: 2,
    camera: SHOT_QKV,
    annotations: [{ id: 'qkv', text: '同一词 → Q / K / V 三个角色', anchor: () => qBoxes[qi].mesh.position.clone().add(new THREE.Vector3(0, 26, 0)), offset: [0, -26], className: 'gold' }],
  }));
  yield S(() => qBoxes.forEach((b, i) => {
    b.setText('q' + fv2(row.Qs[i]));
    b.setColor(i === qi ? C.q : C.dim, i === qi ? C.q : 0);
  }));
  yield W(380);
  yield S(() => kBoxes.forEach((b, i) => { b.setText('k' + fv2(row.K[i])); b.setColor(C.k, C.k); }));
  yield W(320);
  yield S(() => vBoxes.forEach((b, i) => { b.setText('v' + fv2(row.V[i])); b.setColor(C.v, C.v); }));
  director.stateUpdate(stateInfo(data, row, { phase: 'Q/K/V 就位' }));
  yield W(750);

  director.chapter('打分');
  yield S(() => director.beat({
    title: 'Q·K 相似度打分',
    why: 'q 与每个 k 做点积再除以 √d：分数越高，说明这个词提供的信息越相关。',
    stateText: 's = qKᵀ / √d',
    progress: 3,
    camera: SHOT_SCORE,
    annotations: [{ id: 'score', text: 'q·k 越大 → 越相关', anchor: () => new THREE.Vector3(410, 700, 0), offset: mob ? [100, -28] : [0, -30] }],
  }));
  renderBeams(row.scores, 'score', qi);
  yield* growBeams();
  for (let i = 0; i < tokens.length; i++) {
    yield S(() => {
      const v = row.scores[i];
      sBoxes[i].setText(v.toFixed(2));
      sBoxes[i].setColor(heat(v, Math.max(...row.scores)), heat(v, Math.max(...row.scores)));
    });
    yield W(110);
  }
  director.stateUpdate(stateInfo(data, row, { phase: '打分' }));
  yield W(550);

  director.chapter('Softmax');
  yield S(() => director.beat({
    title: 'Softmax 归一化为权重',
    why: 'e^{sᵢ}/Σe^{sⱼ} 把所有分数变成和为 1 的注意力权重；光束越亮越粗，表示权重越大。',
    stateText: 'Σα = 1.000',
    progress: 4,
    camera: SHOT_SOFTMAX,
    annotations: [{ id: 'soft', text: '权重和 = 1', anchor: () => new THREE.Vector3(410, 210, 0), offset: [0, -28], className: 'gold' }],
  }));
  renderBeams(row.weights, 'weight', qi);
  yield* growBeams();
  const maxW = Math.max(...row.weights);
  for (let i = 0; i < tokens.length; i++) {
    yield S(() => {
      aBoxes[i].setText(row.weights[i].toFixed(3));
      aBoxes[i].setColor(heat(row.weights[i], maxW), heat(row.weights[i], maxW));
    });
    yield W(100);
  }
  sumText.sprite.visible = true;
  director.stateUpdate(stateInfo(data, row, { phase: 'softmax' }));
  yield W(800);

  director.chapter('聚合');
  yield S(() => director.beat({
    title: '按权重聚合 V',
    why: '输出 = Σ αᵢ·vᵢ：权重决定每个词的信息混入多少，注意力强的词贡献更大。',
    stateText: `输出 ${fv(row.out)}`,
    progress: 5,
    camera: SHOT_WEIGHTED,
    annotations: [{ id: 'out', text: 'Σ αᵢ·vᵢ = 上下文向量', anchor: () => new THREE.Vector3(410, 140, 0), offset: [0, -26], className: 'final' }],
  }));
  outBox.mesh.visible = true;
  sumText.sprite.visible = false;
  outBox.setText(fv2(row.out));
  const top = row.weights.indexOf(maxW);
  yield S(() => { tokenNodes[top].pulse(0.3); director.setBeatState(`最大权重 ${row.weights[top].toFixed(3)} → ${tokens[top]}`); });
  yield A(450, p => outBox.mesh.scale.setScalar(1 + 0.16 * Math.sin(p * Math.PI)));
  yield S(() => outBox.mesh.scale.setScalar(1));
  director.stateUpdate(stateInfo(data, row, { phase: '加权聚合' }));
  yield W(750);

  director.chapter('多头');
  const other = attentionRow(X, qi, PROJECTIONS[data.layerIdx][otherHead]);
  yield S(() => director.beat({
    title: `另一个头：${HEAD_NAMES[otherHead]}`,
    why: '每个头有自己的 W_Q/W_K/W_V：同一个词被投影到不同子空间，关注不同的关系。',
    stateText: `头 ${otherHead + 1} · ${HEAD_NAMES[otherHead]} 权重就位`,
    progress: 6,
    camera: SHOT_MULTI,
    annotations: [{ id: 'multi', text: `头 ${otherHead + 1} 看的是另一种关系`, anchor: () => new THREE.Vector3(410, 700, 0), offset: mob ? [100, -28] : [0, -30], className: 'gold' }],
  }));
  yield S(() => {
    qBoxes.forEach((b, i) => { b.setText('q' + fv2(other.Qs[i])); b.setColor(i === qi ? C.q : C.dim, i === qi ? C.q : 0); });
    kBoxes.forEach((b, i) => { b.setText('k' + fv2(other.K[i])); b.setColor(C.k, C.k); });
    vBoxes.forEach((b, i) => { b.setText('v' + fv2(other.V[i])); b.setColor(C.v, C.v); });
    const m = Math.max(...other.scores);
    sBoxes.forEach((b, i) => { b.setText(other.scores[i].toFixed(2)); b.setColor(heat(other.scores[i], m), heat(other.scores[i], m)); });
    const mw = Math.max(...other.weights);
    aBoxes.forEach((b, i) => { b.setText(other.weights[i].toFixed(3)); b.setColor(heat(other.weights[i], mw), heat(other.weights[i], mw)); });
    renderBeams(other.weights, 'weight', qi);
  });
  yield* growBeams();
  director.stateUpdate(stateInfo(data, other, { head: otherHead, phase: '多头对比' }));
  yield W(950);

  const merged = [(row.out[0] + other.out[0]) / 2, (row.out[1] + other.out[1]) / 2];
  yield S(() => director.beat({
    title: '多头合并',
    why: '两个头的输出拼接后经线性层融合：指代关系和句法关系同时被保留下来。',
    stateText: `头1 ${fv(row.out)} + 头2 ${fv(other.out)} → 合并 ${fv(merged)}`,
    progress: 6,
    camera: SHOT_MULTI,
    annotations: [{ id: 'merge', text: '多头拼接 → 线性层', anchor: () => new THREE.Vector3(410, 140, 0), offset: [0, -26], className: 'final' }],
  }));
  sumText.sprite.visible = false;
  outBox.setText(fv2(merged));
  outBox.setColor(C.q, C.q);
  yield S(() => {
    qBoxes.forEach((b, i) => { b.setText('q' + fv2(row.Qs[i])); b.setColor(i === qi ? C.q : C.dim, i === qi ? C.q : 0); });
    kBoxes.forEach((b, i) => { b.setText('k' + fv2(row.K[i])); b.setColor(C.k, C.k); });
    vBoxes.forEach((b, i) => { b.setText('v' + fv2(row.V[i])); b.setColor(C.v, C.v); });
    const m = Math.max(...row.scores);
    sBoxes.forEach((b, i) => { b.setText(row.scores[i].toFixed(2)); b.setColor(heat(row.scores[i], m), heat(row.scores[i], m)); });
    aBoxes.forEach((b, i) => { b.setText(row.weights[i].toFixed(3)); b.setColor(heat(row.weights[i], maxW), heat(row.weights[i], maxW)); });
    renderBeams(row.weights, 'weight', qi);
    director.stateUpdate(stateInfo(data, row, { phase: '多头合并' }));
  });
  yield W(850);

  director.chapter('任意词直达');
  const graphRows = X.map((_, i) => attentionRow(X, i, PROJECTIONS[data.layerIdx][data.headIdx]));
  yield S(() => director.beat({
    title: '任意两词 1 跳可达',
    why: '自注意力让每个词直接和所有词交互，路径长度 O(1)；RNN 要沿链走 O(n) 步，长程依赖会衰减。',
    stateText: '路径长度 O(1) · 所有词并行计算',
    progress: 7,
    camera: SHOT_SIDE,
    annotations: [
      { id: 'path', text: '任意两词：1 跳', anchor: () => new THREE.Vector3(410, 760, 0), offset: mob ? [100, -26] : [0, -28], className: 'final' },
      { id: 'rn', text: 'RNN 需要 O(n) 步', anchor: () => new THREE.Vector3(410, 860, 0), offset: mob ? [100, -22] : [0, -24] },
    ],
  }));
  renderAllPairs(graphRows, qi);
  yield W(900);

  director.chapter('复盘');
  yield S(() => {
    outBox.mesh.visible = true;
    outBox.setText(fv2(row.out));
    outBox.setColor(C.out, C.out);
    director.beat({
      title: '并行 + 长程依赖',
      why: '5×5 注意力矩阵一次算完，可并行；头与层可堆叠。代价是 O(n²·d) 计算量，句子越长越明显。',
      stateText: 'O(n²·d) · 路径 O(1) · 可堆叠层/头',
      progress: 8,
      camera: SHOT_FINAL,
      annotations: [{ id: 'final', text: 'Attention = softmax(QKᵀ/√d)V', anchor: () => new THREE.Vector3(410, 905, 0), offset: mob ? [100, -26] : [0, -26], className: 'final' }],
    });
    director.setProgress(8);
  });
  status.textContent = 'Transformer 完成 · 1 跳路径 · O(n²·d)';
  director.stateUpdate(stateInfo(data, row, { phase: '复盘' }));
  yield W(900);
}

function restart(autoPlay = true) {
  engine.clear();
  director.reset();
  status.textContent = '';
  const data = computeData();
  resetScene(data);
  engine.queue(() => runAttention(data));
  if (autoPlay) engine.toggle();
}

const presetVal = p => p.tokens.join(' ');
input.addSelect('句子', PRESETS.map(presetVal), presetVal(PRESETS[0]), (v) => {
  presetIdx = PRESETS.findIndex(p => presetVal(p) === v);
  restart(true);
});
input.addSelect('头', HEAD_OPTS, HEAD_OPTS[0], (v) => {
  headIdx = HEAD_OPTS.indexOf(v);
  restart(true);
});
input.addSelect('层', LAYER_OPTS, LAYER_OPTS[0], (v) => {
  layerIdx = LAYER_OPTS.indexOf(v);
  restart(true);
});
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  const data = computeData();
  resetScene(data);
  outBox.mesh.visible = false;
  status.textContent = '';
});

restart(false);
scene.start(engine);
