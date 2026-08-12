// AlgorithmLibrary/ACAutomaton3D.js — AC 自动机：Trie 白曲线边 + BFS fail 红色锯齿虚线 + 主串逐字符跳转 + 命中星爆（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ACAutomaton3D');

const scene = new Scene3D('scene', { cameraPos: [260, 500, 900], lookAt: [260, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, GREEN = 0x4ade80, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('');
const outT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });

const WORDS = ['he', 'she', 'his', 'hers'];
const TEXT = 'ushers';
const SP = 100, ROOT_Y = 620, STEP_Y = 80;

// ---- 纯数据：Trie ----
const root = { ch: '', next: {}, fail: null, end: false, depth: 0, children: [], word: null };
const allNodes = [root];
function trieInsert(w) {
  let cur = root;
  for (const ch of w) {
    if (!cur.next[ch]) {
      const n = { ch, next: {}, fail: null, end: false, depth: cur.depth + 1, children: [], word: null };
      cur.next[ch] = n; cur.children.push(n); allNodes.push(n);
    }
    cur = cur.next[ch];
  }
  cur.end = true; cur.word = w;
}
WORDS.forEach(trieInsert);

// BFS 构建 fail
const failEdges = [];
const queue = [];
allNodes.forEach(n => { if (n !== root && n.depth === 1) { n.fail = root; failEdges.push([n, root]); queue.push(n); } });
while (queue.length) {
  const v = queue.shift();
  for (const c of v.children) {
    let f = v.fail;
    while (f !== root && !f.next[c.ch]) f = f.fail;
    c.fail = f.next[c.ch] || root;
    failEdges.push([c, c.fail]);
    queue.push(c);
  }
}

// ---- leafCount 布局 ----
function leafCount(n) { return n.children.length ? n.children.reduce((s, c) => s + leafCount(c), 0) : 1; }
const pos = new Map();
function place(n, lo, hi) {
  pos.set(n, { x: ((lo + hi) / 2 - 1.5) * SP + 260, y: ROOT_Y - n.depth * STEP_Y });
  let acc = lo;
  n.children.forEach(c => { place(c, acc, acc + leafCount(c)); acc += leafCount(c); });
}
place(root, 0, allNodes.filter(n => n.end).length);

// ---- 视觉：球体节点 + 白色曲线边 ----
const nodeView = new Map();
const edgeView = new Map();
const curves = new Map();
function curveEdge(a, b) {
  const A = new THREE.Vector3(a.x, a.y, 0);
  const B = new THREE.Vector3(b.x, b.y, 0);
  const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, 26);
  const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 2.2, 6),
    new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.85 }));
  scene.add(mesh);
  curves.set(mesh, curve);
  return mesh;
}
new VNode(scene, { radius: 24, x: pos.get(root).x, y: ROOT_Y, label: '根', color: GOLD, emissive: GOLD });
(function buildView(n) {
  n.children.forEach(c => {
    const p = pos.get(c);
    const vn = new VNode(scene, { radius: 18, x: p.x, y: p.y, label: c.ch, color: BLUE, emissive: BLUE });
    vn.mesh.scale.setScalar(0.05);
    nodeView.set(c, vn);
    edgeView.set(c, curveEdge(pos.get(n), p));
    buildView(c);
  });
})(root);

// 词尾：★ + 光圈（构建后常显，命中时脉动）
const ring = new Map(), star = new Map();
allNodes.forEach(n => {
  if (!n.end) return;
  const p = pos.get(n);
  const r = new VTorus(scene, { radius: 27, x: p.x, y: p.y, color: GOLD });
  r.mesh.visible = false;
  const s = new VText(scene, { text: '★', x: p.x, y: p.y + 36, z: 0, color: GOLD, scale: 0.8 });
  s.sprite.visible = false;
  ring.set(n, r); star.set(n, s);
});

// fail 边：红色锯齿虚线（垂直于方向交替偏移）
const failView = new Map();
failEdges.forEach(([a, b]) => {
  const A = new THREE.Vector3(pos.get(a).x, pos.get(a).y, -30);
  const B = new THREE.Vector3(pos.get(b).x, pos.get(b).y, -30);
  const dir = B.clone().sub(A), len = dir.length();
  const pts = [A];
  const segs = Math.max(2, Math.round(len / 34));
  for (let s = 1; s < segs; s++) {
    const t = s / segs;
    const midp = A.clone().lerp(B, t);
    const off = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar((s % 2 ? 1 : -1) * 14);
    pts.push(midp.add(off));
  }
  pts.push(B);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineDashedMaterial({ color: RED, dashSize: 5, gapSize: 3, transparent: true, opacity: 0.9 }));
  line.computeLineDistances();
  line.visible = false;
  scene.add(line);
  failView.set(a, line);
});

// 主串字符行
const textBoxes = [...TEXT].map((ch, i) => {
  const b = new VBox(scene, { w: 40, h: 40, d: 26, x: (i - (TEXT.length - 1) / 2) * 70 + 300, y: 140, label: ch, color: BLUE, emissive: BLUE });
  const idx = new VText(scene, { text: String(i), x: (i - (TEXT.length - 1) / 2) * 70 + 300, y: 96, z: 0, color: PALETTE.textDim, scale: 0.45 });
  return { box: b, idx };
});
new VText(scene, { text: '主串', x: 70, y: 140, z: 0, color: PALETTE.textDim, scale: 0.6 });

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

function resetAll() {
  clearFx();
  nodeView.forEach(vn => { vn.setColor(BLUE, BLUE); vn.mesh.scale.setScalar(1); });
  edgeView.forEach(e => e.material.color.setHex(WHITE));
  failView.forEach(l => l.visible = false);
  ring.forEach(r => { r.mesh.visible = false; r.mesh.scale.setScalar(1); });
  star.forEach(s => s.sprite.visible = false);
  textBoxes.forEach(tb => tb.box.setColor(BLUE, BLUE));
  outT.setText('');
}
const resetPath = () => {
  nodeView.forEach(vn => vn.setColor(BLUE, BLUE));
  edgeView.forEach(e => e.material.color.setHex(WHITE));
};
const growNode = (n, p) => nodeView.get(n).mesh.scale.setScalar(0.05 + 0.95 * p);
const pulseRing = (n) => A(500, p => { const r = ring.get(n).mesh; r.scale.setScalar(1 + 0.25 * Math.sin(p * Math.PI * 2)); });

// 金色粒子沿曲线流动
function flowAlong(edgeMesh, count = 3, ms = 420) {
  const curve = curves.get(edgeMesh);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const v = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
    parts.push(v); fxGroup.add(v);
  }
  return A(ms, p => parts.forEach((v, i) => v.position.copy(curve.getPoint((p + i * 0.18) % 1))));
}

// 星爆：8 条金色放射线从命中字符向外生长
function starburst(x, y) {
  const lines = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, 20), new THREE.Vector3(x, y, 20)]),
      new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.95 }));
    fxGroup.add(line);
    lines.push({ line, dir });
  }
  return A(600, p => lines.forEach(({ line, dir }) => {
    line.geometry.attributes.position.setXYZ(1, x + dir.x * 95 * p, y + dir.y * 95 * p, 20);
    line.geometry.attributes.position.needsUpdate = true;
  }));
}

// 主串匹配步骤预计算
const matchSteps = [];
{
  let cur = root;
  for (let i = 0; i < TEXT.length; i++) {
    const ch = TEXT[i];
    if (!cur.next[ch]) {
      while (cur !== root && !cur.next[ch]) { matchSteps.push({ t: 'fail', node: cur, i }); cur = cur.fail; }
    }
    if (cur.next[ch]) { matchSteps.push({ t: 'go', node: cur, ch, i }); cur = cur.next[ch]; }
    else matchSteps.push({ t: 'stay', ch, i });
    let f = cur;
    while (f !== root) { if (f.end) matchSteps.push({ t: 'hit', node: f, i }); f = f.fail; }
  }
}

function* buildTriePhase() {
  for (const w of WORDS) {
    let cur = root;
    for (const ch of w) {
      const n = cur.next[ch];
      if (nodeView.get(n).mesh.scale.x < 0.5) {
        yield S(() => outT.setText(`插入 "${w}"：新节点 '${ch}' 从父节点生长`));
        yield A(400, p => growNode(n, p));
        yield W(100);
      }
      yield S(() => {
        nodeView.get(n).setColor(GOLD, GOLD);
        edgeView.get(n).material.color.setHex(GOLD);
      });
      yield* flowAlong(edgeView.get(n));
      yield W(250);
      cur = n;
    }
    yield S(() => {
      ring.get(cur).mesh.position.set(pos.get(cur).x, pos.get(cur).y, 0);
      ring.get(cur).mesh.visible = true;
      star.get(cur).sprite.visible = true;
      outT.setText(`"${w}" 插入完成：词尾 ★`);
    });
    yield* pulseRing(cur);
    yield W(200);
    yield S(resetPath);
    yield W(120);
  }
}

function* failPhase() {
  yield S(() => outT.setText('BFS 构建 fail 指针：逐节点脉冲，红色锯齿虚线 = 失配跳转目标'));
  yield W(400);
  for (const [n, f] of failEdges) {
    const line = failView.get(n);
    yield S(() => {
      nodeView.get(n).setColor(RED, RED);
      outT.setText(`fail('${n.ch}') → ${f === root ? '根' : f.ch}：失配时沿此跳转`);
    });
    yield A(400, p => { line.visible = true; line.material.opacity = 0.35 + 0.55 * p; });
    yield W(350);
    yield S(() => nodeView.get(n).setColor(BLUE, BLUE));
    yield W(100);
  }
  yield S(() => outT.setText('fail 构建完成：失配指针全部就位（红色锯齿虚线）'));
  yield W(350);
}

function* matchPhase() {
  yield S(() => outT.setText(`扫描主串 "${TEXT}"：逐字符沿自动机跳转`));
  yield W(350);
  for (const st of matchSteps) {
    if (st.t === 'go') {
      const n = st.node.next[st.ch];
      yield S(() => {
        textBoxes[st.i].box.setColor(GOLD, GOLD);
        nodeView.get(n).setColor(GOLD, GOLD);
        edgeView.get(n).material.color.setHex(GOLD);
        outT.setText(`T[${st.i}]='${st.ch}'：转移 → '${n.ch}'`);
      });
      yield* flowAlong(edgeView.get(n));
      yield W(300);
    } else if (st.t === 'fail') {
      const n = st.node;
      const line = failView.get(n);
      yield S(() => {
        textBoxes[st.i].box.setColor(RED, RED);
        nodeView.get(n).setColor(RED, RED);
        line.material.opacity = 1;
        outT.setText(`失配：'${n.ch}' 无出边 '${TEXT[st.i]}'，沿 fail 跳转`);
      });
      yield W(500);
      yield S(() => { line.material.opacity = 0.9; nodeView.get(n).setColor(BLUE, BLUE); });
    } else if (st.t === 'stay') {
      yield S(() => {
        textBoxes[st.i].box.setColor(GOLD, GOLD);
        outT.setText(`T[${st.i}]='${TEXT[st.i]}'：根无此出边，停留根节点`);
      });
      yield W(350);
      yield S(() => textBoxes[st.i].box.setColor(BLUE, BLUE));
    } else {
      const word = st.node.word, start = st.i - word.length + 1;
      const bx = textBoxes[st.i].box.mesh.position.x;
      yield S(() => {
        outT.setText(`命中 "${word}" @${start}！星爆特效 + 命中区间变绿`);
      });
      yield* starburst(bx, 140);
      yield S(() => {
        for (let k = start; k <= st.i; k++) textBoxes[k].box.setColor(GREEN, GREEN);
        ring.get(st.node).mesh.visible = true;
        star.get(st.node).sprite.visible = true;
      });
      yield* pulseRing(st.node);
      yield W(350);
      yield S(() => { nodeView.get(st.node).setColor(GOLD, GOLD); });
      yield W(150);
    }
  }
  yield S(() => outT.setText(`扫描结束："she"@1、"hers"@2 命中`));
  yield W(400);
}

function* runAC() {
  yield S(resetAll);
  yield S(() => { hint.setText('AC 自动机：模式串建 Trie（白曲线边），BFS 建 fail 指针（红锯齿虚线），主串逐字符跳转，命中星爆'); });
  yield W(500);
  yield* buildTriePhase();
  yield* failPhase();
  yield* matchPhase();
  yield S(() => {
    outT.setText('复杂度 O(n + m + k)：主串线性扫描，fail 指针保证不回退');
    hint.setText('多模式匹配三阶段：建 Trie → BFS 补 fail → 扫描主串。失配跳转复用已匹配前缀，是 KMP 思想的多模式版');
    status.textContent = `AC 结果：主串 "ushers" 中 "she"@1、"hers"@2 命中（星爆）`;
  });
}

engine.queue(() => runAC());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；白边 = Trie 转移，红锯齿 = fail 指针，金球 = 当前节点，星爆 = 命中）');

scene.start(engine);
