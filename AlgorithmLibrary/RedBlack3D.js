// AlgorithmLibrary/RedBlack3D.js — 红黑树：插入叔红变色/叔黑旋转，删除双黑修复，黑高刻度。
// 颜色即交通灯：红=橙、黑=蓝；节点上方常驻 bh（黑高）标签，右侧面板列出五条性质。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { land } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TreeStage } from '../3D/director/TreeStage.js';
applyTheme('RedBlack3D');

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const SC = isMobile ? 0.76 : 1;
const scene = new Scene3D('scene', { cameraPos: [320, 720, 1120], lookAt: [320, 440, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new TreeStage(scene, { center: [320, 470, 0], scale: SC, radius: 22, islandRadius: 620 });

const C = { red: 0xfb923c, black: 0x60a5fa, path: 0xfcd34d, current: 0x22d3ee, ok: 0x4ade80, bad: 0xfb7185 };
const DEMO_KEYS = [50, 30, 70, 20, 40, 60, 80];
let root = null;
let rotations = 0;
const col = (n) => (n ? n.color : 'B');
const nodeColor = (n) => (n.color === 'R' ? C.red : C.black);

const director = new StoryDirector(scene, {
  title: '红黑树 · 交通灯',
  total: 8,
  legend: [
    { label: '红节点', color: '#fb923c' },
    { label: '黑节点', color: '#60a5fa' },
    { label: '搜索路径', color: '#fcd34d' },
    { label: '修复中', color: '#22d3ee' },
    { label: '回正', color: '#4ade80' },
  ],
  onReplay: () => restart(),
});

// ---- 纯数据红黑树 ----
function findNode(key) {
  let cur = root;
  while (cur) {
    if (key === cur.key) return cur;
    cur = key < cur.key ? cur.left : cur.right;
  }
  return null;
}
const minNode = (n) => { while (n && n.left) n = n.left; return n; };
function transplant(u, v) {
  if (!u.parent) root = v;
  else if (u.parent.left === u) u.parent.left = v;
  else u.parent.right = v;
  if (v) v.parent = u.parent;
}
function rotateLeft(x) {
  const y = x.right; x.right = y.left; if (y.left) y.left.parent = x; y.parent = x.parent;
  if (!x.parent) root = y; else if (x.parent.left === x) x.parent.left = y; else x.parent.right = y;
  y.left = x; x.parent = y; rotations++; return y;
}
function rotateRight(x) {
  const y = x.left; x.left = y.right; if (y.right) y.right.parent = x; y.parent = x.parent;
  if (!x.parent) root = y; else if (x.parent.right === x) x.parent.right = y; else x.parent.left = y;
  y.right = x; x.parent = y; rotations++; return y;
}
function insertModel(key) {
  if (findNode(key)) return null;
  const n = { key, left: null, right: null, parent: null, color: 'R' };
  if (!root) { root = n; root.color = 'B'; return n; }
  let cur = root;
  while (true) {
    const side = key < cur.key ? 'left' : 'right';
    if (!cur[side]) { cur[side] = n; n.parent = cur; break; }
    cur = cur[side];
  }
  let z = n;
  while (z.parent && z.parent.color === 'R') {
    const p = z.parent, g = p.parent;
    if (!g) break;
    const u = g.left === p ? g.right : g.left;
    if (col(u) === 'R') { p.color = 'B'; u.color = 'B'; g.color = 'R'; z = g; }
    else {
      if (p === g.left && z === p.right) { z = p; rotateLeft(p); }
      else if (p === g.right && z === p.left) { z = p; rotateRight(p); }
      const p2 = z.parent, g2 = p2.parent;
      p2.color = 'B'; g2.color = 'R';
      if (p2 === g2.left) rotateRight(g2); else rotateLeft(g2);
    }
  }
  root.color = 'B';
  return n;
}
function rbDeleteStart(z) {
  let y = z, yColor = y.color, x = null, xp = null;
  if (!z.left) { x = z.right; xp = z.parent; transplant(z, z.right); }
  else if (!z.right) { x = z.left; xp = z.parent; transplant(z, z.left); }
  else {
    y = minNode(z.right); yColor = y.color; x = y.right;
    if (y.parent === z) { xp = y; if (x) x.parent = y; }
    else { xp = y.parent; transplant(y, y.right); y.right = z.right; y.right.parent = y; }
    transplant(z, y); y.left = z.left; y.left.parent = y; y.color = z.color;
  }
  return { x, xp, yColor, succKey: y !== z ? y.key : null };
}
function rbDeleteFix(x, p, log) {
  while (x !== root && col(x) === 'B') {
    if (!p) break;
    if (x === p.left) {
      let w = p.right;
      if (col(w) === 'R') { log.push('兄弟红 → 兄弟染黑、父染红，左旋父'); w.color = 'B'; p.color = 'R'; rotateLeft(p); w = p.right; }
      if (col(w && w.left) === 'B' && col(w && w.right) === 'B') {
        log.push('兄弟黑、两侄子黑 → 兄弟染红，双黑上移'); if (w) w.color = 'R'; x = p; p = x.parent;
      } else {
        if (col(w && w.right) === 'B') { log.push('侄子内侧红 → 先右旋兄弟'); if (w.left) w.left.color = 'B'; w.color = 'R'; rotateRight(w); w = p.right; }
        log.push('侄子外侧红 → 兄弟接父色，旋转父节点');
        w.color = p.color; p.color = 'B'; if (w.right) w.right.color = 'B'; rotateLeft(p); x = root; p = null;
      }
    } else {
      let w = p.left;
      if (col(w) === 'R') { log.push('兄弟红 → 兄弟染黑、父染红，右旋父'); w.color = 'B'; p.color = 'R'; rotateRight(p); w = p.left; }
      if (col(w && w.left) === 'B' && col(w && w.right) === 'B') {
        log.push('兄弟黑、两侄子黑 → 兄弟染红，双黑上移'); if (w) w.color = 'R'; x = p; p = x.parent;
      } else {
        if (col(w && w.left) === 'B') { log.push('侄子内侧红 → 先左旋兄弟'); if (w.right) w.right.color = 'B'; w.color = 'R'; rotateLeft(w); w = p.left; }
        log.push('侄子外侧红 → 兄弟接父色，旋转父节点');
        w.color = p.color; p.color = 'B'; if (w.left) w.left.color = 'B'; rotateRight(p); x = root; p = null;
      }
    }
  }
  if (x) x.color = 'B';
  if (root) root.color = 'B';
}
function walk(n = root, out = []) {
  if (!n) return out;
  walk(n.left, out);
  out.push(n);
  walk(n.right, out);
  return out;
}
const inorder = () => walk().map((n) => n.key);
function bh(n) {
  if (!n) return 0;
  return (n.color === 'B' ? 1 : 0) + Math.max(bh(n.left), bh(n.right));
}
function blackHeights() {
  const out = [];
  (function go(n, c) {
    if (!n) { out.push(c); return; }
    const nc = c + (n.color === 'B' ? 1 : 0);
    if (!n.left && !n.right) { out.push(nc); return; }
    go(n.left, nc);
    go(n.right, nc);
  })(root, 0);
  return out;
}
function uniqueBH() { return [...new Set(blackHeights())].sort((a, b) => a - b); }

const sync = (opts = {}) => {
  stage.syncTree(root, {
    id: (n) => n.key, label: (n) => String(n.key), color: nodeColor,
    layout: { stepX: 90, stepY: 108, topY: 780 }, ms: opts.ms || 0, spawn: opts.spawn || 0,
  });
  updateInfos();
};
function updateInfos() { walk().forEach((n) => stage.setInfo(n.key, 'bh' + bh(n), { scale: 0.45 })); }
function renderState(path = []) {
  const nodes = walk();
  director.stateUpdate({
    blocks: [
      { type: 'kv', label: '红黑树', items: [
        { k: '节点数', v: nodes.length },
        { k: '根色', v: root ? root.color : '—' },
        { k: '黑高', v: uniqueBH().join(' / ') || '—' },
        { k: '旋转次数', v: rotations },
      ] },
      { type: 'chips', label: '搜索路径', items: path.map((k, i) => ({ text: k, cls: i === path.length - 1 ? 'current' : '' })), empty: '—' },
      { type: 'chips', label: '颜色（中序）', items: nodes.map((n) => ({ text: n.key + n.color, cls: n.color === 'R' ? 'open' : 'closed' })) },
      { type: 'text', label: '五条性质', value: '根黑 · 红节点孩子黑 · 每条路径黑高相同 → 最长 ≤ 2×最短' },
    ],
  });
}
const at = (k) => () => stage.vpos(k);

// ---- 查找 ----
function* searchFlow(key) {
  director.chapter('查找');
  const path = [];
  for (let n = root; n; n = key === n.key ? null : key < n.key ? n.left : n.right) {
    path.push(n.key);
    stage.setNodeColor(n.key, key === n.key ? C.ok : C.path);
    stage.setActive(n.key, key === n.key ? C.ok : C.path);
    director.annotations.set('cur', {
      text: key === n.key ? '命中 ' + key + ' · bh' + bh(n) : key + (key < n.key ? ' < ' : ' > ') + n.key + ' → 走' + (key < n.key ? '左' : '右'),
      anchor: at(n.key), offset: [0, -50], className: key === n.key ? 'final' : 'gold',
    });
    renderState(path);
    if (key === n.key) break;
    yield W(300);
  }
  const pos = path[path.length - 1], hit = findNode(key);
  if (!hit && pos) {
    stage.setNodeColor(pos, C.bad); stage.setActive(pos, C.bad);
    director.annotations.set('cur', { text: '空指针 → ' + key + ' 不存在', anchor: at(pos), offset: [0, -50], className: 'warn' });
  }
  status.textContent = '查找 ' + key + '：' + (hit ? '命中' : '不存在') + ' · 比较 ' + path.length + ' 次' + (hit ? ' · 黑高 ' + uniqueBH().join('/') : '');
  renderState(path);
  yield W(700);
  walk().forEach((n) => stage.setNodeColor(n.key, nodeColor(n)));
  stage.setActive(null);
}

// ---- 插入 ----
function* insertFlow(key) {
  if (findNode(key)) {
    status.textContent = '插入 ' + key + '：键已存在';
    yield W(300);
    return;
  }
  director.chapter('插入');
  yield S(() => director.beat({
    title: '插入 ' + key,
    why: '新节点先染红；只有“父红”才违反性质，需要修复。',
    stateText: '节点 ' + walk().length + ' · 黑高 ' + uniqueBH().join('/'),
    progress: 1,
    camera: stage.overview(),
    annotations: [{ id: 'head', text: '新节点先红', anchor: at(root ? root.key : key), offset: [0, -50], className: 'gold' }],
  }));
  const path = [];
  let cur = root;
  while (cur) {
    path.push(cur.key);
    stage.setNodeColor(cur.key, C.path);
    stage.setActive(cur.key, C.path);
    director.annotations.set('cur', {
      text: key + (key < cur.key ? ' < ' : ' > ') + cur.key + ' → ' + (key < cur.key ? '左' : '右'),
      anchor: at(cur.key),
      offset: [0, -50],
      className: 'gold',
    });
    renderState(path);
    yield W(280);
    const next = key < cur.key ? cur.left : cur.right;
    if (!next) break;
    cur = next;
  }
  const n = { key, left: null, right: null, parent: cur, color: 'R' };
  if (!root) root = n;
  else if (key < cur.key) cur.left = n;
  else cur.right = n;
  sync({ ms: 460, spawn: 230 });
  const vn = stage.nodes.get(key);
  if (vn) land(scene, vn.mesh);
  director.annotations.set('new', { text: '新节点 ' + key + ' 染红', anchor: at(key), offset: [0, -50], className: 'warn' });
  renderState([...path, key]);
  yield W(550);
  path.forEach((k) => stage.setNodeColor(k, nodeColor(findNode(k))));
  let z = n;
  let guard = 0;
  while (z.parent && z.parent.color === 'R' && guard++ < 20) {
    const p = z.parent;
    const g = p.parent;
    if (!g) break;
    const u = g.left === p ? g.right : g.left;
    if (col(u) === 'R') {
      yield S(() => director.beat({
        title: '叔红：变色上移',
        why: '父亲和叔叔都红 → 父/叔染黑、祖父染红，冲突上移到祖父继续检查。',
        stateText: '叔 ' + u.key + ' 红 · 变色不旋转',
        progress: 2,
        camera: stage.focus(g.key),
        annotations: [
          { id: 'p', text: '父 ' + p.key + ' → 黑', anchor: at(p.key), offset: [0, -50], className: 'final' },
          { id: 'u', text: '叔 ' + u.key + ' → 黑', anchor: at(u.key), offset: [0, -50], className: 'final' },
          { id: 'g', text: '祖父 ' + g.key + ' → 红', anchor: at(g.key), offset: [0, -50], className: 'warn' },
        ],
      }));
      p.color = 'B';
      u.color = 'B';
      g.color = 'R';
      sync();
      stage.nodes.get(p.key)?.pulse(0.18);
      stage.nodes.get(u.key)?.pulse(0.18);
      stage.nodes.get(g.key)?.pulse(0.22);
      z = g;
      renderState();
      yield W(750);
    } else {
      if ((p === g.left && z === p.right) || (p === g.right && z === p.left)) {
        yield S(() => director.beat({
          title: '叔黑：先转成直线',
          why: '之字形（LR/RL）先旋转孩子，把红红冲突拉成一条直线。',
          stateText: '叔黑 · 内侧插入',
          progress: 3,
          camera: stage.focus(p.key),
          annotations: [{ id: 'z', text: '之字形 → 先转孩子', anchor: at(z.key), offset: [0, -50], className: 'gold' }],
        }));
        const oldP = p;
        if (p === g.left) rotateLeft(p);
        else rotateRight(p);
        z = oldP;
        sync({ ms: 480 });
        yield W(600);
      }
      const p2 = z.parent;
      const g2 = p2 ? p2.parent : null;
      if (!p2 || !g2) break;
      yield S(() => director.beat({
        title: '叔黑：旋转 + 变色',
        why: '父染黑、祖染红，再绕祖父旋转；红红冲突消除，黑高不变。',
        stateText: '叔黑 · 旋转 ' + rotations + ' 次',
        progress: 3,
        camera: stage.focus(g2.key, { dist: 370 }),
        annotations: [
          { id: 'p', text: '父 ' + p2.key + ' → 黑', anchor: at(p2.key), offset: [0, -50], className: 'final' },
          { id: 'g', text: '祖父 ' + g2.key + ' → 红后旋转', anchor: at(g2.key), offset: [0, -50], className: 'gold' },
        ],
      }));
      p2.color = 'B';
      g2.color = 'R';
      const nr = p2 === g2.left ? rotateRight(g2) : rotateLeft(g2);
      sync({ ms: 500 });
      stage.nodes.get(nr.key)?.pulse(0.22);
      stage.setActive(nr.key, C.ok);
      yield W(700);
      break;
    }
  }
  if (root.color !== 'B') {
    const rootKey = root.key;
    root.color = 'B';
    yield S(() => director.beat({
      title: '根必须黑',
      why: '根染黑不会破坏其他性质，却保证每条路径黑高从同一起点计数。',
      stateText: '根 ' + rootKey + ' → 黑',
      progress: 4,
      camera: stage.focus(rootKey),
      annotations: [{ id: 'root', text: '根 ' + rootKey + ' → 黑', anchor: at(rootKey), offset: [0, -50], className: 'final' }],
    }));
    sync();
    yield W(600);
  }
  sync();
  renderState(inorder());
  status.textContent = '插入 ' + key + ' 完成：节点 ' + walk().length + ' · 黑高 ' + uniqueBH().join('/');
  yield W(350);
}

// ---- 删除 ----
function* deleteFlow(key) {
  const z = findNode(key);
  if (!z) {
    status.textContent = '删除 ' + key + '：键不存在';
    yield W(300);
    return;
  }
  director.chapter('删除修复');
  yield S(() => director.beat({
    title: '删除 ' + key,
    why: '删除一个黑节点会让路径黑高少 1，出现“双黑”；需要向兄弟借或旋转。',
    stateText: '节点 ' + walk().length + ' · 黑高 ' + uniqueBH().join('/'),
    progress: 6,
    camera: stage.focus(key),
    annotations: [{ id: 'target', text: '删除 ' + key + '（' + z.color + '）', anchor: at(key), offset: [0, -50], className: 'warn' }],
  }));
  stage.setNodeColor(key, C.bad);
  stage.setActive(key, C.bad);
  yield W(550);
  const info = rbDeleteStart(z);
  sync({ ms: 500 });
  renderState();
  yield W(450);
  if (info.yColor === 'B') {
    const anchorKey = info.x ? info.x.key : (info.xp ? info.xp.key : root ? root.key : null);
    yield S(() => director.beat({
      title: '双黑修复',
      why: '被删的是黑节点：以空位/孩子为“双黑”，看兄弟颜色和侄子颜色决定变色或旋转。',
      stateText: '双黑位置' + (info.x ? ' ' + info.x.key : '（空叶）') + ' · 兄弟 ' + (info.xp && (info.xp.left || info.xp.right) ? (info.xp.left === info.x ? info.xp.right : info.xp.left)?.key ?? '—' : '—'),
      progress: 6,
      camera: stage.overview(),
      annotations: anchorKey ? [{ id: 'x', text: '双黑从这里开始', anchor: at(anchorKey), offset: [0, -50], className: 'warn' }] : [],
    }));
    yield W(400);
    const log = [];
    rbDeleteFix(info.x, info.xp, log);
    sync({ ms: 520 });
    renderState();
    const text = log.slice(-2).join(' → ') || '兄弟与侄子全黑：双黑上移到根';
    if (anchorKey) director.annotations.set('fix', { text, anchor: at(anchorKey), offset: [0, -50], className: 'final' });
    yield W(750);
  }
  sync();
  renderState(inorder());
  status.textContent = '删除 ' + key + ' 完成：节点 ' + walk().length + ' · 黑高 ' + uniqueBH().join('/') + ' ✓';
  stage.setActive(null); walk().forEach((n) => stage.setNodeColor(n.key, nodeColor(n)));
  yield W(400);
}

// ---- 不变量 ----
function* invariantFlow() {
  const hs = uniqueBH();
  director.chapter('不变量');
  yield S(() => director.beat({
    title: '黑高一致',
    why: '从根到每个空叶经过的黑节点数相同；红节点不能相邻，所以最长路径 ≤ 2×最短路径。',
    stateText: '所有路径黑高：' + hs.join(' / '),
    progress: 5,
    camera: stage.wide(),
    annotations: walk().filter((n) => !n.left && !n.right).slice(0, 3).map((n, i) => ({
      id: 'leaf' + i,
      text: '黑高 ' + bh(n),
      anchor: at(n.key),
      offset: [0, -50],
      className: 'final',
    })),
  }));
  yield W(900);
}

function* runRB() {
  director.reset();
  stage.clear();
  root = null;
  rotations = 0;
  DEMO_KEYS.forEach(insertModel);
  sync();
  renderState();
  director.chapter('交通灯');
  yield S(() => director.beat({
    title: '红黑树就位',
    why: '颜色就是平衡信号：根黑、红节点孩子黑、每条路径黑高相同。',
    stateText: '节点 ' + walk().length + ' · 根黑 · 黑高 ' + uniqueBH().join('/'),
    progress: 0,
    camera: stage.overview(),
    annotations: [
      { id: 'root', text: '根 ' + root.key + ' 必须黑', anchor: at(root.key), offset: [0, -50], className: 'gold' },
      { id: 'bh', text: 'bh = 黑高刻度', anchor: at(20), offset: [0, -50] },
    ],
  }));
  yield W(800);
  yield* insertFlow(90);
  yield* insertFlow(5);
  yield* invariantFlow();
  yield* deleteFlow(60);
  director.chapter('结算');
  yield S(() => director.beat({
    title: '宽松平衡也够快',
    why: '红黑树旋转比 AVL 少，插入/删除更稳；最长路径 ≤ 2×最短，仍是 O(log n)。',
    stateText: '中序 ' + inorder().join(' → ') + ' · 黑高 ' + uniqueBH().join('/'),
    progress: 8,
    camera: stage.wide(),
    annotations: [
      { id: 'in', text: '中序：' + inorder().join(' → '), anchor: () => new THREE.Vector3(stage.center.x, 700 * SC, 0), offset: [0, -24], className: 'final' },
      { id: 'bh', text: '黑高一致 ✓', anchor: at(root.key), offset: [0, -50], className: 'final' },
    ],
  }));
  status.textContent = '红黑树演示完成：中序 ' + inorder().join(' → ') + ' · 黑高 ' + uniqueBH().join('/') + ' ✓ · 旋转 ' + rotations + ' 次';
  yield W(850);
}

function resetAll() { engine.clear(); director.reset(); status.textContent = ''; stage.clear(); root = null; rotations = 0; }
function restart() { resetAll(); engine.start(runRB()); }
function clearAll() { resetAll(); status.textContent = ''; }
function randomTree() {
  resetAll();
  const keys = [];
  while (keys.length < 8) { const k = 10 + Math.floor(Math.random() * 90); if (!keys.includes(k)) keys.push(k); }
  keys.forEach(insertModel);
  sync(); renderState();
  status.textContent = '随机红黑树：' + keys.join(', ') + ' · 黑高 ' + uniqueBH().join('/');
}
function runOp(kind, raw) {
  status.textContent = '';
  const key = parseInt(raw, 10);
  if (!Number.isInteger(key) || key < 1 || key > 99) {
    status.textContent = '请输入 1-99 的整数';
    return;
  }
  engine.clear();
  director.reset();
  engine.start(kind === 'insert' ? insertFlow(key) : kind === 'search' ? searchFlow(key) : deleteFlow(key));
}

const keyInput = panel.addInput('键 1-99', (v) => runOp('insert', v), 3);
input.addButton('插入', () => runOp('insert', keyInput.value));
input.addButton('删除', () => runOp('delete', keyInput.value));
input.addButton('查找', () => runOp('search', keyInput.value));
input.addButton('随机', randomTree);
input.addButton('清空', clearAll);

DEMO_KEYS.forEach(insertModel);
sync();
renderState();
engine.queue(() => runRB());
scene.start(engine);
