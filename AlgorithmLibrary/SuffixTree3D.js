// AlgorithmLibrary/SuffixTree3D.js — 后缀树：压缩边胶囊体 + 逐后缀生长 + 后缀链接虚线光带 + 起点旋转圆环（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SuffixTree3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 800], fov: 60 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('');
const outT = new VText(scene, { text: '', x: 0, y: 40, z: 0, color: PALETTE.textGlow, scale: 0.75 });

const TXT = 'banana';
const T = TXT + '$';
const SP = 100, ROOT_Y = 620, STEP_Y = 80;
const lerp = (a, b, p) => a + (b - a) * p;

// ---- 构建正确后缀树：插入每个后缀，边冲突时拆边并转移旧子树 ----
const root = { ch: '', label: '', children: [], parent: null, pos: 0, id: 0 };
const allNodes = [root];
let nextId = 1;
function insertSuffixData(text, start) {
  let cur = root, rest = text;
  while (rest.length) {
    const child = cur.children.find(c => c.label[0] === rest[0]);
    if (!child) {
      const leaf = { ch: rest[0], label: rest, children: [], parent: cur, pos: start, id: nextId++ };
      cur.children.push(leaf); allNodes.push(leaf);
      return;
    }
    let k = 0;
    while (k < child.label.length && k < rest.length && child.label[k] === rest[k]) k++;
    if (k < child.label.length) {
      const split = { ch: rest[0], label: child.label.slice(0, k), children: [], parent: cur, pos: child.pos, id: nextId++ };
      child.label = child.label.slice(k); child.parent = split;
      split.children.push(child);
      cur.children.splice(cur.children.indexOf(child), 1);
      cur.children.push(split);
      allNodes.push(split);
      cur = split; rest = rest.slice(k);
      continue;
    }
    cur = child; rest = rest.slice(k);
  }
}
const suffixStarts = [...T].map((_, i) => i);
suffixStarts.forEach(i => insertSuffixData(T.slice(i), i));

// 每个后缀的根→叶路径（最终树）
function pathOf(suffixText) {
  const path = [root];
  let cur = root, rest = suffixText;
  while (rest.length) {
    const child = cur.children.find(c => c.label[0] === rest[0]);
    path.push(child);
    cur = child; rest = rest.slice(child.label.length);
  }
  return path;
}
const suffixPaths = suffixStarts.map(i => pathOf(T.slice(i)));

// 路径文本（根→节点拼接）
function pathText(n) { return n === root ? '' : pathText(n.parent) + n.label; }

// ---- leafCount 布局 ----
function leafCount(n) { return n.children.length ? n.children.reduce((s, c) => s + leafCount(c), 0) : 1; }
const pos = new Map();
const depth = new Map();
function depthOf(n) { return n === root ? 0 : (depth.get(n) ?? (depth.set(n, depthOf(n.parent) + 1), depth.get(n))); }
function place(n, lo, hi) {
  pos.set(n, { x: ((lo + hi) / 2 - (suffixStarts.length - 1) / 2) * SP, y: ROOT_Y - (n === root ? 0 : depthOf(n)) * STEP_Y });
  let acc = lo;
  n.children.forEach(c => { place(c, acc, acc + leafCount(c)); acc += leafCount(c); });
}
place(root, 0, suffixStarts.length);

// ---- 视觉：胶囊体边 + 球形节点 ----
function makeCapsule(a, b) {
  const A = new THREE.Vector3(a.x, a.y, 0), B = new THREE.Vector3(b.x, b.y, 0);
  const dir = B.clone().sub(A), len = dir.length(), norm = dir.clone().normalize();
  const mat = new THREE.MeshStandardMaterial({ color: WHITE, emissive: WHITE, emissiveIntensity: 0.25, transparent: true, opacity: 0.85 });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, len, 10), mat);
  const cap1 = new THREE.Mesh(new THREE.SphereGeometry(7, 10, 8), mat);
  const cap2 = cap1.clone();
  cap1.position.y = len / 2; cap2.position.y = -len / 2;
  cyl.add(cap1, cap2);
  cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
  cyl.position.copy(A).addScaledVector(norm, len / 2);
  scene.add(cyl);
  return { mesh: cyl, A, B, norm, len };
}
const setFrac = (ec, f) => {
  const h = Math.max(ec.len * f, 0.1);
  ec.mesh.scale.y = f;
  ec.mesh.position.copy(ec.A).addScaledVector(ec.norm, h / 2);
};

const nodeView = new Map();
const edgeOf = new Map();
const edgeLabel = new Map();
allNodes.forEach(n => {
  if (n === root) {
    nodeView.set(n, new VNode(scene, { radius: 24, x: pos.get(n).x, y: pos.get(n).y, label: '根', color: GOLD, emissive: GOLD }));
    return;
  }
  const p = pos.get(n);
  const isLeaf = n.children.length === 0;
  const label = isLeaf ? T.slice(n.pos) : pathText(n);
  const vn = new VNode(scene, { radius: isLeaf ? 15 : 19, x: p.x, y: p.y, label, color: isLeaf ? GOLD : VIOLET, emissive: isLeaf ? GOLD : VIOLET });
  vn.mesh.visible = false;
  nodeView.set(n, vn);
  const ec = makeCapsule(pos.get(n.parent), p);
  ec.mesh.visible = false;
  edgeOf.set(n, ec);
  const pp = pos.get(n.parent);
  const mid = { x: (pp.x + p.x) / 2, y: (pp.y + p.y) / 2 };
  const dx = p.x - pp.x, dy = p.y - pp.y, d = Math.hypot(dx, dy) || 1;
  const lbl = new VText(scene, { text: n.label, x: mid.x + (-dy / d) * 26, y: mid.y + (dx / d) * 26, z: 0, color: PALETTE.textDim, scale: 0.42 });
  lbl.sprite.visible = false;
  edgeLabel.set(n, lbl);
});

// 字符行 + 起点旋转圆环
const chRow = [...T].map((ch, k) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(28, 28, 28),
    new THREE.MeshStandardMaterial({ color: 0x334155, emissive: 0x334155, emissiveIntensity: 0.4 }));
  b.position.set((k - (T.length - 1) / 2) * 60, 150, 0);
  scene.add(b);
  return b;
});
[...T].forEach((ch, k) => {
  const t = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, depthTest: false }));
  t.position.set((k - (T.length - 1) / 2) * 60, 150, 16);
  t.scale.set(22, 22, 1);
  scene.add(t);
});
const ring = new VTorus(scene, { radius: 26, x: 0, y: 150, color: GOLD });
ring.mesh.visible = false;
const marker = (k) => { ring.mesh.position.set((k - (T.length - 1) / 2) * 60, 150, 0); };

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

const created = new Set();
function resetAll() {
  clearFx();
  created.clear();
  allNodes.forEach(n => {
    if (n === root) return;
    nodeView.get(n).mesh.visible = false;
    edgeOf.get(n).mesh.visible = false;
    edgeOf.get(n).mesh.material.color.setHex(WHITE);
    edgeLabel.get(n).sprite.visible = false;
  });
  ring.mesh.visible = false;
  outT.setText('');
}

// 粒子沿胶囊体轴向流动
function flowAlong(ec, count = 3, ms = 400) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const v = new THREE.Mesh(new THREE.SphereGeometry(3.4, 8, 8),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
    parts.push(v); fxGroup.add(v);
  }
  return A(ms, p => parts.forEach((v, i) => {
    const t = (p + i * 0.18) % 1;
    v.position.copy(ec.A).lerp(ec.B, t);
  }));
}

function* walkEdge(to) {
  const ec = edgeOf.get(to);
  if (!created.has(to)) {
    created.add(to);
    ec.mesh.visible = true;
    yield A(400, p => setFrac(ec, p));
    yield S(() => {
      nodeView.get(to).mesh.visible = true;
      nodeView.get(to).mesh.scale.setScalar(0.01);
    });
    yield A(300, p => nodeView.get(to).mesh.scale.setScalar(0.01 + 0.99 * p));
    yield S(() => edgeLabel.get(to).sprite.visible = true);
    yield W(120);
  }
  yield S(() => {
    ec.mesh.material.color.setHex(GOLD);
    nodeView.get(to).setColor(GOLD, GOLD);
    outT.setText(`沿边「${edgeLabel.get(to).text}」下钻（边 = 一段压缩的字符）`);
  });
  yield* flowAlong(ec);
  yield W(250);
}

function* insertSuffix(i) {
  const path = suffixPaths[i];
  yield S(() => {
    marker(i);
    ring.mesh.visible = true;
    outT.setText(`插入后缀 #${i}：「${T.slice(i)}」—— 金环标记起点，从根沿匹配边走`);
  });
  yield A(500, p => { ring.mesh.rotation.z = p * Math.PI * 2; });
  yield W(250);
  for (let e = 1; e < path.length; e++) yield* walkEdge(path[e]);
  const leaf = path[path.length - 1];
  yield S(() => {
    clearFx();
    nodeView.get(leaf).setColor(GOLD, GOLD);
    const p = pos.get(leaf);
    const pr = new VTorus(scene, { radius: 30, x: p.x, y: p.y, color: GREEN });
    fxGroup.add(pr.mesh);
    outT.setText(`后缀 #${i} 归位：叶子「${T.slice(i)}」（根到叶路径 = 完整后缀）`);
  });
  yield W(550);
  yield S(() => {
    clearFx();
    allNodes.forEach(n => {
      if (n === root || !created.has(n)) return;
      edgeOf.get(n).mesh.material.color.setHex(WHITE);
      if (n.children.length) nodeView.get(n).setColor(VIOLET, VIOLET);
    });
  });
  yield W(200);
}

function* runSuffixTree() {
  yield S(resetAll);
  yield S(() => { hint.setText('后缀树：所有后缀共用一个根，压缩边 = 无分叉的连续字符段。每次插入沿匹配边下钻，首次走过的边从父节点生长出胶囊体'); });
  yield W(500);
  for (let i = 0; i < suffixStarts.length; i++) yield* insertSuffix(i);
  // 后缀链接：虚线光带
  const links = [];
  allNodes.forEach(n => {
    if (n === root || n.children.length === 0) return;
    const pt = pathText(n);
    const target = allNodes.find(m => m !== n && pathText(m) === pt.slice(1));
    if (target) links.push([n, target]);
  });
  yield S(() => outT.setText(`构建完成：${allNodes.length} 节点。现在点亮 ${links.length} 条后缀链接（虚线段 = 去掉首字符后的最长真后缀位置）`));
  yield W(500);
  for (const [from, to] of links) {
    const pA = pos.get(from), pB = pos.get(to);
    const pts = [new THREE.Vector3(pA.x, pA.y, 30), new THREE.Vector3(pB.x, pB.y, 30)];
    const mat = new THREE.LineDashedMaterial({ color: CYAN, dashSize: 7, gapSize: 4, transparent: true, opacity: 0 });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    line.computeLineDistances();
    scene.add(line);
    yield A(450, p => { mat.opacity = 0.9 * p; });
    yield S(() => {
      nodeView.get(from).setColor(CYAN, CYAN);
      nodeView.get(to).setColor(CYAN, CYAN);
      outT.setText(`后缀链接：${pathText(from) || '根'} → ${pathText(to) || '根'}（'${pathText(from)}' 去掉首字符 = '${pathText(to)}'）`);
    });
    yield W(500);
    yield S(() => {
      nodeView.get(from).setColor(VIOLET, VIOLET);
      if (to !== root) nodeView.get(to).setColor(VIOLET, VIOLET);
    });
    yield W(200);
  }
  yield S(() => {
    outT.setText(`最长重复子串：「ana」（节点 a→na 路径，深度 = 公共前缀长度）`);
    hint.setText('Ukkonen 算法 O(n) 在线构建；后缀链接让「插入新后缀」时只需从上一位置继续。应用：基因重复检测、全文索引');
    status.textContent = `后缀树构建完成："banana$" 共 ${allNodes.length} 节点（7 叶子、3 内部节点），${links.length} 条后缀链接`;
  });
}

panel.addButton('运行演示', () => engine.start(runSuffixTree()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；胶囊体 = 压缩边，紫球 = 内部节点，金球 = 叶子，青虚线 = 后缀链接，金环 = 当前后缀起点）');

scene.start(engine);
