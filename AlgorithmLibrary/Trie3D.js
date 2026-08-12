// AlgorithmLibrary/Trie3D.js — 字典树：白色曲线边 + 新节点生长 + 金色查找路径 + 词尾脉动光圈（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Trie3D');

const scene = new Scene3D('scene', { cameraPos: [260, 500, 900], lookAt: [260, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, GREEN = 0x4ade80, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('');
const outT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });

const WORDS = ['cat', 'car', 'card', 'do', 'dog'];
const SEARCH = 'car', MISS = 'cap', DEL = 'cat';
const SP = 88, ROOT_Y = 620, STEP_Y = 72;

// ---- 纯数据 Trie ----
const root = { ch: '', next: {}, end: false, depth: 0, children: [] };
function insert(word) {
  let cur = root;
  for (const ch of word) {
    if (!cur.next[ch]) {
      const n = { ch, next: {}, end: false, depth: cur.depth + 1, children: [] };
      cur.next[ch] = n; cur.children.push(n);
    }
    cur = cur.next[ch];
  }
  cur.end = true;
}
WORDS.forEach(insert);

// leafCount 布局：x 居中于叶子区间，y 按深度
function leafCount(n) { return n.children.length ? n.children.reduce((s, c) => s + leafCount(c), 0) : 1; }
const pos = new Map();
function place(n, lo, hi) {
  pos.set(n, { x: ((lo + hi) / 2 - (WORDS.length - 1) / 2) * SP + 260, y: ROOT_Y - n.depth * STEP_Y });
  let acc = lo;
  n.children.forEach(c => { place(c, acc, acc + leafCount(c)); acc += leafCount(c); });
}
place(root, 0, WORDS.length);

// ---- 视觉：球形节点 + 白色曲线边 ----
const nodeView = new Map();
const edgeView = new Map();
function curveEdge(a, b) {
  const A = new THREE.Vector3(a.x, a.y, 0);
  const B = new THREE.Vector3(b.x, b.y, 0);
  const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, 26);
  const curve = new THREE.CatmullRomCurve3([A, mid, B]);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 2.2, 6),
    new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.85 }));
  scene.add(mesh);
  return mesh;
}
const rootNode = new VNode(scene, { radius: 24, x: pos.get(root).x, y: ROOT_Y, label: '根', color: GOLD, emissive: GOLD });
(function buildView(n) {
  n.children.forEach(c => {
    if (c !== root) {
      const p = pos.get(c);
      const vn = new VNode(scene, { radius: 20, x: p.x, y: p.y, label: c.ch, color: BLUE, emissive: BLUE });
      vn.mesh.scale.setScalar(0.05);
      nodeView.set(c, vn);
      edgeView.set(c, curveEdge(pos.get(n), p));
    }
    buildView(c);
  });
})(root);

// 词尾：脉动光圈 + ★
const ring = new Map(), star = new Map();
(function buildEndViews(n) {
  if (n.end) {
    const p = pos.get(n);
    const r = new VTorus(scene, { radius: 34, x: p.x, y: p.y, color: GOLD });
    r.mesh.visible = false;
    const s = new VText(scene, { text: '★', x: p.x, y: p.y + 48, z: 0, color: GOLD, scale: 0.9 });
    s.sprite.visible = false;
    ring.set(n, r); star.set(n, s);
  }
  n.children.forEach(buildEndViews);
})(root);

const resetPath = () => {
  nodeView.forEach(vn => vn.setColor(BLUE, BLUE));
  edgeView.forEach(e => e.material.color.setHex(WHITE));
};
function resetAll() {
  resetPath();
  nodeView.forEach(vn => vn.mesh.scale.setScalar(1));
  ring.forEach(r => { r.mesh.visible = false; r.mesh.scale.setScalar(1); });
  star.forEach(s => s.sprite.visible = false);
  outT.setText('');
}

const growNode = (n, p) => nodeView.get(n).mesh.scale.setScalar(0.05 + 0.95 * p);
const pulseRing = (n) => A(500, p => { const r = ring.get(n).mesh; r.scale.setScalar(1 + 0.25 * Math.sin(p * Math.PI * 2)); });

function* insertWord(word) {
  yield S(() => outT.setText(`插入 "${word}"：逐字符下钻，新节点从父节点生长（缩放动画）`));
  yield W(400);
  let cur = root;
  for (const ch of word) {
    const isNew = !cur.next[ch];
    cur = cur.next[ch];
    if (isNew) {
      yield A(450, p => growNode(cur, p));
      yield W(120);
    }
    yield S(() => {
      nodeView.get(cur).setColor(GOLD, GOLD);
      edgeView.get(cur).material.color.setHex(GOLD);
      outT.setText(`插入 "${word}"：→ '${ch}'（深度 ${cur.depth}）`);
    });
    yield W(320);
  }
  yield S(() => {
    ring.get(cur).mesh.position.set(pos.get(cur).x, pos.get(cur).y, 0);
    ring.get(cur).mesh.visible = true;
    star.get(cur).sprite.visible = true;
    outT.setText(`"${word}" 词尾节点出现脉动光圈 ★`);
  });
  yield* pulseRing(cur);
  yield W(250);
  yield S(resetPath);
}

function* walkPath(word, color, revealMissing) {
  let cur = root;
  for (const ch of word) {
    if (!cur.next[ch]) {
      if (revealMissing) {
        yield S(() => {
          nodeView.get(cur).setColor(RED, RED);
          outT.setText(`查找 "${word}"：字符 '${ch}' 在节点 '${cur.ch || '根'}' 下不存在 —— 路径中断`);
        });
        yield W(600);
        yield S(() => nodeView.get(cur).setColor(BLUE, BLUE));
      }
      return null;
    }
    cur = cur.next[ch];
    yield S(() => {
      nodeView.get(cur).setColor(color, color);
      edgeView.get(cur).material.color.setHex(color);
      outT.setText(`查找 "${word}"：→ '${ch}'`);
    });
    yield W(380);
  }
  return cur;
}

function* searchWord(word) {
  yield S(() => outT.setText(`查找 "${word}"：沿金色路径下钻`));
  yield W(300);
  const end = yield* walkPath(word, GOLD, true);
  if (!end) {
    yield S(() => outT.setText(`查找 "${word}"：未命中（路径中断，红闪 = 缺失处）`));
    yield W(500);
  } else if (!end.end) {
    yield S(() => outT.setText(`查找 "${word}"：前缀存在但非完整单词 —— 未命中`));
    yield W(500);
  } else {
    yield S(() => {
      ring.get(end).mesh.visible = true;
      star.get(end).sprite.visible = true;
      outT.setText(`查找 "${word}"：命中！词尾光圈脉动`);
    });
    yield* pulseRing(end);
    yield W(250);
    yield S(() => { ring.get(end).mesh.visible = false; star.get(end).sprite.visible = false; });
  }
  yield S(resetPath);
}

function* deleteWord(word) {
  yield S(() => outT.setText(`删除 "${word}"：移除词尾标记`));
  yield W(300);
  const end = yield* walkPath(word, RED, false);
  if (end) {
    yield S(() => {
      ring.get(end).mesh.visible = false;
      star.get(end).sprite.visible = false;
      nodeView.get(end).setColor(RED, RED);
      outT.setText(`已删除 "${word}"：★ 与光圈消失（节点保留供复用）`);
    });
    yield W(600);
    yield S(() => nodeView.get(end).setColor(BLUE, BLUE));
  }
  yield S(resetPath);
}

function* runTrie() {
  yield S(resetAll);
  yield S(() => { hint.setText('字典树：白色曲线边 = 字符转移。插入时新节点从父节点生长；查找时路径变金色；词尾节点脉动光圈 ★'); });
  yield W(500);
  for (const w of WORDS) yield* insertWord(w);
  yield* searchWord(SEARCH);
  yield* searchWord(MISS);
  yield* deleteWord(DEL);
  yield S(() => {
    outT.setText(`剩余单词：car, card, do, dog（共 4 个）`);
    hint.setText('复杂度 O(L)：L 为单词长度；插入/查找/删除都只沿一条路径下钻');
    status.textContent = 'Trie 演示完成：5 词插入，查找 "car" 命中、"cap" 未命中，删除 "cat" 后剩余 4 词';
  });
}

engine.queue(() => runTrie());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金球 = 根，蓝球 = 字母节点，金环 = 词尾脉动光圈）');

scene.start(engine);
