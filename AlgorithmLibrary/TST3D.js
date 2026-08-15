// AlgorithmLibrary/TST3D.js — 三叉搜索树：左/中/右三叉 + 流动粒子流 + 词尾光圈（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('TST3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, CYAN = 0x67e8f9, ORANGE = 0xfb923c, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const WORDS = ['sea', 'seat', 'see', 'sock'];
const SEARCH = 'see', MISS = 'set';
const SP = 90, ROOT_Y = 620, STEP_Y = 72;
const edgeColor = { left: CYAN, mid: WHITE, right: ORANGE };

// ---- 纯数据 TST ----
const root = { ch: '', left: null, mid: null, right: null, end: false, depth: 0 };
function insert(word) {
  let cur = root;
  for (const ch of word) {
    if (!cur.mid) {
      cur.mid = { ch, left: null, mid: null, right: null, end: false, depth: cur.depth + 1 };
      cur = cur.mid; continue;
    }
    cur = cur.mid;
    while (cur.ch !== ch) {
      if (ch < cur.ch) {
        if (!cur.left) cur.left = { ch, left: null, mid: null, right: null, end: false, depth: cur.depth + 1 };
        cur = cur.left;
      } else {
        if (!cur.right) cur.right = { ch, left: null, mid: null, right: null, end: false, depth: cur.depth + 1 };
        cur = cur.right;
      }
    }
  }
  cur.end = true;
}
WORDS.forEach(insert);

// leafCount 布局：左/中/右按叶子区间排列，区间互不重叠
function leafCount(n) {
  return (n.end ? 1 : 0) + (n.left ? leafCount(n.left) : 0) + (n.mid ? leafCount(n.mid) : 0) + (n.right ? leafCount(n.right) : 0);
}
const pos = new Map();
function place(n, lo, hi) {
  pos.set(n, { x: ((lo + hi) / 2 - (WORDS.length - 1) / 2) * SP + 320, y: ROOT_Y - n.depth * STEP_Y });
  const lc = n.left ? leafCount(n.left) : 0, mc = n.mid ? leafCount(n.mid) : 0;
  let acc = lo;
  if (n.left) { place(n.left, acc, acc + lc); acc += lc; }
  if (n.mid) { place(n.mid, acc, acc + mc); acc += mc; }
  if (n.right) place(n.right, acc, hi);
}
place(root, 0, WORDS.length);

// ---- 视觉：球形节点 + 曲线边（青=左 白=中 橙=右） ----
const nodeView = new Map();
const edgeView = new Map();
const curves = new Map();
const edgeKind = new Map();
function curveEdge(a, b, color) {
  const A = new THREE.Vector3(a.x, a.y, 0);
  const B = new THREE.Vector3(b.x, b.y, 0);
  const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, 26);
  const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 2.2, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
  scene.add(mesh);
  curves.set(mesh, curve);
  return mesh;
}
new VNode(scene, { radius: 24, x: pos.get(root).x, y: ROOT_Y, label: '根', color: GOLD, emissive: GOLD });
(function buildView(n) {
  if (n !== root) {
    const p = pos.get(n);
    const vn = new VNode(scene, { radius: 18, x: p.x, y: p.y, label: n.ch, color: BLUE, emissive: BLUE });
    vn.mesh.scale.setScalar(0.05);
    nodeView.set(n, vn);
  }
  const kinds = [['left', n.left], ['mid', n.mid], ['right', n.right]];
  for (const [kind, c] of kinds) {
    if (!c) continue;
    edgeView.set(c, curveEdge(pos.get(n), pos.get(c), edgeColor[kind]));
    edgeKind.set(c, kind);
    buildView(c);
  }
})(root);

// 词尾：脉动光圈 + ★
const ring = new Map(), star = new Map();
(function buildEndViews(n) {
  if (n.end) {
    const p = pos.get(n);
    const r = new VTorus(scene, { radius: 30, x: p.x, y: p.y, color: GOLD });
    r.mesh.visible = false;
    const s = new VText(scene, { text: '★', x: p.x, y: p.y + 42, z: 0, color: GOLD, scale: 0.85 });
    s.sprite.visible = false;
    ring.set(n, r); star.set(n, s);
  }
  if (n.left) buildEndViews(n.left);
  if (n.mid) buildEndViews(n.mid);
  if (n.right) buildEndViews(n.right);
})(root);

// 流动粒子流：预建 3 个金球，运行期只改位置（scratch 向量池避免逐帧分配）
const flowParts = [];
const partSV = [];
for (let i = 0; i < 3; i++) {
  const v = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8),
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
  v.visible = false;
  scene.add(v);
  flowParts.push(v);
  partSV.push(new THREE.Vector3());
}
const clearFx = () => flowParts.forEach(v => { v.visible = false; });

function resetPath() {
  nodeView.forEach(vn => vn.setColor(BLUE, BLUE));
  edgeView.forEach((e, n) => e.material.color.setHex(edgeColor[edgeKind.get(n)]));
}
function resetAll() {
  clearFx();
  resetPath();
  nodeView.forEach(vn => vn.mesh.scale.setScalar(1));
  ring.forEach(r => { r.mesh.visible = false; r.mesh.scale.setScalar(1); });
  star.forEach(s => s.sprite.visible = false);
}

const growNode = (n, p) => nodeView.get(n).mesh.scale.setScalar(0.05 + 0.95 * p);
function* pulseRing(n) {
  yield A(500, p => { const r = ring.get(n).mesh; r.scale.setScalar(1 + 0.25 * Math.sin(p * Math.PI * 2)); });
}
function* flowAlong(edgeMesh, ms = 420) {
  const curve = curves.get(edgeMesh);
  flowParts.forEach(v => { v.visible = true; });
  yield A(ms, p => flowParts.forEach((v, i) => v.position.copy(curve.getPoint((p + i * 0.18) % 1, partSV[i]))));
}

const edgeKindOf = (n, parent) => n === parent.mid ? '中' : n === parent.left ? '左' : '右';

function* insertWord(word) {
  yield S(() => { status.textContent = '插入 "' + word + '"：逐字符下钻，新节点从父节点生长'; });
  yield W(350);
  let cur = root;
  for (const ch of word) {
    const parent = cur;
    if (!cur.mid) cur.mid = { ch, left: null, mid: null, right: null, end: false, depth: cur.depth + 1 };
    cur = cur.mid;
    let guard = 0;
    while (cur.ch !== ch) {
      if (ch < cur.ch) { if (!cur.left) cur.left = { ch, left: null, mid: null, right: null, end: false, depth: cur.depth + 1 }; cur = cur.left; }
      else { if (!cur.right) cur.right = { ch, left: null, mid: null, right: null, end: false, depth: cur.depth + 1 }; cur = cur.right; }
      if (++guard > 8) break;
    }
    const edge = edgeView.get(cur);
    if (nodeView.get(cur).mesh.scale.x < 0.5) {
      yield A(400, p => growNode(cur, p));
      yield W(100);
    }
    yield S(() => {
      nodeView.get(cur).setColor(GOLD, GOLD);
      edge.material.color.setHex(GOLD);
      status.textContent = '插入 "' + word + '"：\'' + ch + '\' 走' + edgeKindOf(cur, parent) + ' → 第 ' + cur.depth + ' 层';
    });
    yield* flowAlong(edge);
    yield W(260);
  }
  yield S(() => {
    ring.get(cur).mesh.position.set(pos.get(cur).x, pos.get(cur).y, 0);
    ring.get(cur).mesh.visible = true;
    star.get(cur).sprite.visible = true;
    status.textContent = '"' + word + '" 插入完成：词尾光圈 ★';
  });
  yield* pulseRing(cur);
  yield W(200);
  yield S(resetPath);
  yield W(150);
}

function* searchWord(word) {
  yield S(() => { status.textContent = '查找 "' + word + '"：逐字符比较，字符 < 走左 / > 走右 / = 走中'; });
  yield W(350);
  let cur = root;
  for (const ch of word) {
    if (!cur.mid) { cur = null; break; }
    const parent = cur;
    cur = cur.mid;
    let guard = 0;
    while (cur.ch !== ch) {
      const cmp = ch < cur.ch ? '<' : '>';
      yield S(() => { status.textContent = '查找 "' + word + '"：\'' + ch + '\' ' + cmp + ' \'' + cur.ch + '\' → 走' + edgeKindOf(cur, parent); });
      yield W(300);
      const next = ch < cur.ch ? cur.left : cur.right;
      if (!next) { cur = null; break; }
      cur = next;
      if (++guard > 8) break;
    }
    if (!cur) break;
    yield S(() => {
      nodeView.get(cur).setColor(GOLD, GOLD);
      edgeView.get(cur).material.color.setHex(GOLD);
      status.textContent = '查找 "' + word + '"：\'' + ch + '\' = \'' + cur.ch + '\' → 走中，深度 ' + cur.depth;
    });
    yield* flowAlong(edgeView.get(cur));
    yield W(300);
  }
  if (cur && cur.end) {
    yield S(() => {
      ring.get(cur).mesh.visible = true;
      star.get(cur).sprite.visible = true;
      status.textContent = '查找 "' + word + '"：命中！词尾光圈脉动';
    });
    yield* pulseRing(cur);
    yield W(200);
    yield S(() => { ring.get(cur).mesh.visible = false; star.get(cur).sprite.visible = false; });
  } else {
    yield S(() => {
      if (cur) nodeView.get(cur).setColor(RED, RED);
      status.textContent = '查找 "' + word + '"：未命中（\'' + word[word.length - 1] + '\' 无对应子树，红闪 = 断点）';
    });
    yield W(550);
    if (cur) nodeView.get(cur).setColor(BLUE, BLUE);
  }
  yield S(resetPath);
  yield W(200);
}

function* runTST() {
  yield S(resetAll);
  yield W(200);
  yield S(() => { status.textContent = '三叉搜索树（TST）：每节点三指针，青边 = 字符 < 走左 / 白边 = = 走中 / 橙边 = > 走右；插入时新节点生长，查找成功路径金色，粒子流沿边流动'; });
  yield W(500);
  for (const w of WORDS) yield* insertWord(w);
  yield* searchWord(SEARCH);
  yield* searchWord(MISS);
  yield S(() => { status.textContent = '"see" 命中：路径 s→e→e，词尾 ★ 脉动；"set" 在 \'t\' > \'e\' 处无右子树 → 未命中；平均复杂度 O(L·logS)，TST 兼有 Trie 前缀共享与 BST 字符序分叉的优点'; });
  yield W(600);
  yield S(() => { status.textContent = 'TST 演示完成：插入 4 词（sea/seat/see/sock），查找 "see" 命中（s→e→e）、"set" 未命中，词尾 ★ 共 4 个'; });
  yield W(800);
}

engine.queue(() => runTST());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
