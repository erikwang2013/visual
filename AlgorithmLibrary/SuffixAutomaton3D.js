// AlgorithmLibrary/SuffixAutomaton3D.js — 后缀自动机：六边形状态逐一生长 + 蓝色转移曲线粒子流 + 橙色后缀链接虚线（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SuffixAutomaton3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, CYAN = 0x67e8f9, ORANGE = 0xfb923c;
const status = panel.addStatus('就绪');
const E = p => p * p * (3 - 2 * p);

const TXT = 'abab';

// ---- 构建 SAM：每字符一个新状态，沿后缀链接补转移，必要时克隆（'abab' 无克隆） ----
const states = [{ len: 0, link: -1, next: {} }];
const steps = [];
let last = 0;
for (const ch of TXT) {
  const cur = states.length;
  states.push({ len: states[last].len + 1, link: -1, next: {} });
  const op = { ch, cur, trans1: [], linkChg: [] };
  let p = last;
  while (p !== -1 && !(ch in states[p].next)) { states[p].next[ch] = cur; op.trans1.push(p); p = states[p].link; }
  if (p === -1) { states[cur].link = 0; op.linkChg.push([cur, 0]); }
  else {
    const q = states[p].next[ch];
    if (states[p].len + 1 === states[q].len) { states[cur].link = q; op.linkChg.push([cur, q]); }
    else {
      const clone = states.length;
      states.push({ len: states[p].len + 1, link: states[q].link, next: { ...states[q].next } });
      while (p !== -1 && states[p].next[ch] === q) { states[p].next[ch] = clone; op.trans1.push(p); p = states[p].link; }
      states[q].link = clone; states[cur].link = clone;
      op.linkChg.push([q, clone], [cur, clone]);
    }
  }
  last = cur;
  steps.push(op);
}
const TRANS_COUNT = states.reduce((s, st) => s + Object.keys(st.next).length, 0);
const LINK_COUNT = steps.reduce((s, op) => s + op.linkChg.length, 0);

// ---- 之字形布局 ----
const posX = states.map((_, i) => -300 + i * 150 + 320);
const posY = states.map((_, i) => 560 - (i % 2) * 140);

// ---- 六边形状态节点（CylinderGeometry 6 段，旋转后六边形面朝相机） ----
const hexes = states.map((s, i) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 14, 6),
    new THREE.MeshStandardMaterial({ color: i === 0 ? GOLD : CYAN, emissive: i === 0 ? GOLD : CYAN, emissiveIntensity: 0.5 }));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(posX[i], posY[i], 0);
  mesh.visible = i === 0;
  scene.add(mesh);
  const lbl = new VText(scene, { text: String(i), x: posX[i], y: posY[i] + 44, z: 0, color: i === 0 ? GOLD : PALETTE.textGlow, scale: 0.5 });
  lbl.sprite.visible = i === 0;
  return { mesh, lbl };
});
const hexColor = (hx, c) => { hx.mesh.material.color.setHex(c); hx.mesh.material.emissive.setHex(c); };

// 蓝色转移曲线边 + 字符标签
function curveEdge(a, b, label) {
  const A = new THREE.Vector3(a.x, a.y, 0);
  const B = new THREE.Vector3(b.x, b.y, 0);
  const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, 22);
  const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 2, 6),
    new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.85 }));
  mesh.visible = false;
  scene.add(mesh);
  const lbl = new VText(scene, { text: label, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 20, z: 10, color: PALETTE.textGlow, scale: 0.5 });
  lbl.sprite.visible = false;
  return { mesh, curve, lbl };
}
const nextEdge = new Map();
steps.forEach(op => op.trans1.forEach(p => nextEdge.set(`${p}->${op.cur}`, curveEdge({ x: posX[p], y: posY[p] }, { x: posX[op.cur], y: posY[op.cur] }, op.ch))));

// 橙色后缀链接虚线
const linkLine = new Map();
steps.forEach(op => op.linkChg.forEach(([from, to]) => {
  const A = new THREE.Vector3(posX[from], posY[from], 34);
  const B = new THREE.Vector3(posX[to], posY[to], 34);
  const mat = new THREE.LineDashedMaterial({ color: ORANGE, dashSize: 6, gapSize: 4, transparent: true, opacity: 0 });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([A, B]), mat);
  line.computeLineDistances();
  line.visible = false;
  scene.add(line);
  linkLine.set(`${from}->${to}`, line);
}));

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

// 金色粒子对象池（模块级预建，运行期复用）
const PARTS = Array.from({ length: 6 }, () => {
  const v = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8),
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
  v.visible = false;
  fxGroup.add(v);
  return v;
});
let partIdx = 0;
function* flowAlong(e, count = 3, ms = 420) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const v = PARTS[partIdx++ % PARTS.length];
    v.visible = true; fxGroup.add(v);
    parts.push(v);
  }
  yield A(ms, p => parts.forEach((v, i) => v.position.copy(e.curve.getPoint((p + i * 0.18) % 1))));
  parts.forEach(v => { v.visible = false; });
}

const pulseHex = (hx) => A(500, p => { hx.mesh.scale.setScalar(1 + 0.2 * Math.sin(p * Math.PI * 2)); });

function blankAll() {
  clearFx();
  hexes.forEach((hx, i) => { hx.mesh.visible = i === 0; hx.mesh.scale.setScalar(1); hexColor(hx, i === 0 ? GOLD : CYAN); hx.lbl.sprite.visible = i === 0; });
  nextEdge.forEach(e => { e.mesh.visible = false; e.lbl.sprite.visible = false; });
  linkLine.forEach(l => { l.visible = false; l.material.opacity = 0; });
}
function resetAll() {
  blankAll();
  hexes.forEach(hx => { hx.mesh.visible = true; hx.lbl.sprite.visible = true; });
  nextEdge.forEach(e => { e.mesh.visible = true; e.lbl.sprite.visible = true; });
  linkLine.forEach(l => { l.visible = true; l.material.opacity = 0.9; });
}

function* runSAM() {
  yield S(blankAll);
  yield W(200);
  yield S(() => { status.textContent = '后缀自动机：在线逐字符构建 "abab"。六边形状态逐一生长 → 沿后缀链补转移（蓝曲线+金粒子）→ 设新后缀链接（橙虚线）'; });
  yield W(500);
  for (const op of steps) {
    const hx = hexes[op.cur];
    yield S(() => { status.textContent = `第 ${op.cur} 个字符 '${op.ch}'：新状态 ${op.cur} 诞生（len = ${states[op.cur].len}）`; });
    yield A(400, p => { hx.mesh.visible = true; hx.mesh.scale.setScalar(0.05 + 0.95 * E(p)); });
    yield S(() => { hexColor(hx, GOLD); hx.lbl.sprite.visible = true; });
    yield* pulseHex(hx);
    yield W(150);
    for (const p of op.trans1) {
      const e = nextEdge.get(`${p}->${op.cur}`);
      yield S(() => {
        e.mesh.visible = true;
        e.lbl.sprite.visible = true;
        hexColor(hexes[p], GOLD);
        status.textContent = `状态 ${p} 缺 '${op.ch}' 转移 → 补边 ${p}→${op.cur}`;
      });
      yield* flowAlong(e);
      yield W(280);
      yield S(() => hexColor(hexes[p], CYAN));
      yield W(150);
    }
    for (const [from, to] of op.linkChg) {
      const l = linkLine.get(`${from}->${to}`);
      yield S(() => { status.textContent = `后缀链接：${from} → ${to}（指向最长真后缀所在状态）`; });
      yield A(400, p => { l.visible = true; l.material.opacity = 0.9 * E(p); });
      yield W(300);
    }
    yield S(() => hexColor(hx, CYAN));
    yield W(250);
  }
  yield S(() => { status.textContent = `后缀自动机演示完成：SAM("abab") 共 ${states.length} 状态、${TRANS_COUNT} 条转移（蓝曲线）、${LINK_COUNT} 条后缀链接（橙虚线）；状态数 ≤ 2n−1，可索引全部子串`; });
  yield W(600);
}

resetAll(); // 加载即见完整 SAM 演示体（播放时 blankAll 回初始态并重放构建）
engine.queue(() => runSAM());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
