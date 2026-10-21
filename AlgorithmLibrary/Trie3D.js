// AlgorithmLibrary/Trie3D.js — 字典树：共享前缀、词尾 ★、前缀查询、删除剪枝。
// 字符节点按叶子序号布局，星标表示“某词在此结束”；前缀路径高亮 + 实时状态面板。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TreeStage } from '../3D/director/TreeStage.js';
applyTheme('Trie3D');

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const SC = isMobile ? 0.76 : 1;
const scene = new Scene3D('scene', { cameraPos: [320, 720, 1100], lookAt: [320, 430, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new TreeStage(scene, { center: [320, 470, 0], scale: SC, radius: 19, islandRadius: 620 });

const C = { base: 0x60a5fa, path: 0xfcd34d, current: 0x22d3ee, ok: 0x4ade80, bad: 0xfb7185 };
const SEEDS = ['cat', 'car', 'card', 'do', 'dog', 'dot'];
const POOL = ['ant', 'bee', 'cow', 'fox', 'owl', 'pig', 'ram', 'bat', 'hen', 'yak', 'elk', 'emu'];

const director = new StoryDirector(scene, {
  title: 'Trie · 前缀森林',
  total: 8,
  legend: [
    { label: '字符节点', color: '#60a5fa' },
    { label: '前缀路径', color: '#fcd34d' },
    { label: '单词结束 ★', color: '#4ade80' },
    { label: '不存在/删除', color: '#fb7185' },
    { label: '当前前缀', color: '#22d3ee' },
  ],
  onReplay: () => restart(),
});

// ---- 纯数据 Trie ----
let root = null;
let nextId = 0;
const newNode = (label) => ({ id: 't' + nextId++, label, children: new Map(), end: false });
function buildSeeds() { root = newNode('·'); nextId = 1; SEEDS.forEach(addWord); }
function addWord(word) {
  let n = root;
  for (const ch of word) {
    let c = n.children.get(ch);
    if (!c) { c = newNode(ch); n.children.set(ch, c); }
    n = c;
  }
  n.end = true;
  return n;
}
function getPath(word) {
  const path = [{ node: root, ch: '·', parent: null }];
  let n = root;
  for (const ch of word) {
    const c = n.children.get(ch);
    if (!c) return { path, missing: ch, at: n };
    path.push({ node: c, ch, parent: n });
    n = c;
  }
  return { path, node: n, missing: null };
}
const nodeFor = (word) => getPath(word).node || null;
function collect(n, prefix, out = []) {
  if (n.end) out.push(prefix);
  n.children.forEach((c, ch) => collect(c, prefix + ch, out));
  return out;
}
const allWords = () => collect(root, '');
function wordsWith(prefix) {
  let n = root;
  for (const ch of prefix) {
    n = n.children.get(ch);
    if (!n) return [];
  }
  return collect(n, prefix);
}
const countNodes = (n = root) => 1 + [...n.children.values()].reduce((s, c) => s + countNodes(c), 0);
function deleteWord(word) {
  const r = getPath(word);
  if (r.missing || !r.node.end) return null;
  r.node.end = false;
  const kept = r.node.children.size > 0;
  for (let i = r.path.length - 1; i > 0; i--) {
    const { node, parent, ch } = r.path[i];
    if (node.end || node.children.size) break;
    parent.children.delete(ch);
  }
  return { kept, node: r.node };
}
const lcp = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return a.slice(0, i); };

// ---- 布局 + 视觉 ----
function layoutT() {
  const xs = new Map();
  let leaf = 0;
  (function assign(n) {
    if (!n.children.size) { xs.set(n.id, leaf++); return xs.get(n.id); }
    const arr = [...n.children.values()].map(assign);
    xs.set(n.id, (arr[0] + arr[arr.length - 1]) / 2);
    return xs.get(n.id);
  })(root);
  const depth = new Map();
  (function d(n, dep) { depth.set(n.id, dep); n.children.forEach((c) => d(c, dep + 1)); })(root, 0);
  const maxX = Math.max(0, ...xs.values());
  const gap = 160 * SC;
  const pos = new Map();
  (function p(n) {
    pos.set(n.id, new THREE.Vector3(
      stage.center.x + (xs.get(n.id) - maxX / 2) * gap,
      780 - depth.get(n.id) * 112 * SC,
      0,
    ));
    n.children.forEach(p);
  })(root);
  return pos;
}
const stars = new Map();
const dropStar = (s) => { s.remove(); s.sprite.material.dispose(); };
const clearStars = () => { stars.forEach(dropStar); stars.clear(); };
function syncT(opts = {}) {
  const pos = layoutT();
  const entries = [];
  const links = [];
  const ends = [];
  (function walk(n, parent) {
    entries.push({ id: n.id, pos: pos.get(n.id), label: n.label, color: C.base, radius: (n === root ? 16 : 21) * SC, labelScale: 1 });
    if (n.end) ends.push(n);
    if (parent) links.push([parent.id, n.id]);
    n.children.forEach((c) => walk(c, n));
  })(root, null);
  stage.syncNodes(entries, links, { ms: opts.ms || 0, spawn: opts.spawn || 0 });
  const alive = new Set();
  for (const n of ends) {
    alive.add(n.id);
    const p = pos.get(n.id);
    const y = p.y + 54 * SC;
    let s = stars.get(n.id);
    if (!s) stars.set(n.id, s = new VText(scene, { text: '★', x: p.x, y, z: p.z + 20, color: C.ok, scale: 0.72 }));
    else s.sprite.position.set(p.x, y, p.z + 20);
  }
  for (const [id, s] of [...stars]) {
    if (alive.has(id)) continue;
    dropStar(s);
    stars.delete(id);
  }
}
const at = (word) => () => (nodeFor(word) ? stage.vpos(nodeFor(word).id) : null);
function paintPath(path, color) {
  path.forEach((p) => stage.setNodeColor(p.node.id, color));
}
function renderState(path = [], extra = {}) {
  const words = allWords();
  director.stateUpdate({
    blocks: [
      { type: 'kv', label: 'Trie 状态', items: [
        { k: '单词数', v: words.length },
        { k: '字符节点', v: countNodes() },
        { k: '当前深度', v: extra.depth ?? '—' },
      ] },
      { type: 'chips', label: '单词（★ = 词尾）', items: words.map((w) => ({ text: w + ' ★', cls: w === extra.current ? 'current' : '' })), empty: '空' },
      { type: 'chips', label: '字符路径', items: path.map((p, i) => ({ text: p.ch, cls: i === path.length - 1 ? 'current' : '' })), empty: '—' },
      { type: 'text', label: '前缀匹配', value: extra.matches ? (extra.matches.join(' · ') || '无') : '—' },
    ],
  });
}
// ---- 插入 ----
function* insertFlow(word) {
  const res = getPath(word);
  if (!res.missing && res.node.end) {
    status.textContent = '插入 ' + word + '：单词已存在';
    yield W(300);
    return;
  }
  director.chapter('插入');
  yield S(() => director.beat({
    title: '插入 ' + word,
    why: '沿已有字符走；缺哪个字符就长出新分支，最后在词尾点亮 ★。',
    stateText: '单词 ' + allWords().length + ' 个 · 字符节点 ' + countNodes(),
    progress: 1,
    camera: stage.overview(),
    annotations: [{ id: 'root', text: '每个节点 = 一个字符', anchor: () => stage.vpos(root.id), offset: [0, -50], className: 'gold' }],
  }));
  for (const p of res.path) {
    stage.setNodeColor(p.node.id, C.path);
    stage.setActive(p.node.id, C.path);
    renderState(res.path.slice(0, res.path.indexOf(p) + 1), { depth: res.path.indexOf(p) });
    yield W(180);
  }
  if (res.missing) {
    let n = res.at;
    const rest = word.slice(res.path.length - 1);
    for (const ch of rest) {
      const c = newNode(ch);
      n.children.set(ch, c);
      n = c;
    }
    n.end = true;
    syncT({ ms: 440, spawn: 150 });
    stage.setNodeColor(nodeFor(word).id, C.ok);
    stage.nodes.get(nodeFor(word).id)?.pulse(0.2);
    director.annotations.set('new', {
      text: '新增分支 ' + rest + ' → 词尾 ★',
      anchor: at(word),
      offset: [0, -50],
      className: 'final',
    });
    status.textContent = '插入 ' + word + '：新增 ' + rest.length + ' 个字符节点，词尾标记 ★';
    renderState(getPath(word).path, { current: word, depth: word.length });
    yield W(650);
  } else {
    res.node.end = true;
    syncT();
    stage.setNodeColor(res.node.id, C.ok);
    stage.setActive(res.node.id, C.ok);
    director.annotations.set('end', { text: word + ' 是已有前缀 → 只补 ★', anchor: at(word), offset: [0, -50], className: 'final' });
    status.textContent = '插入 ' + word + '：节点已存在，只点亮词尾 ★';
    renderState(res.path, { current: word, depth: word.length });
    yield W(600);
  }
  paintPath(getPath(word).path, C.base);
  stage.setActive(null);
}

// ---- 词尾标记 ----
function* wordEndFlow() {
  director.chapter('词尾标记');
  const car = nodeFor('car');
  const card = nodeFor('card');
  const care = nodeFor('care');
  [car, card, care].forEach((n) => {
    if (!n) return;
    stage.setNodeColor(n.id, C.ok);
    stage.nodes.get(n.id)?.pulse(0.18);
  });
  yield S(() => director.beat({
    title: '★ = 单词在此结束',
    why: '节点存在只说明有人共用这个前缀；只有 ★ 才代表一个完整单词。',
    stateText: 'car / card / care 都共享 ca，各自词尾亮 ★',
    progress: 2,
    camera: stage.focus(car ? car.id : root.id, { dist: 460 }),
    annotations: [
      { id: 'car', text: 'car ★', anchor: at('car'), offset: [0, -50], className: 'final' },
      { id: 'card', text: 'card ★', anchor: at('card'), offset: [0, -50], className: 'gold' },
      { id: 'care', text: 'care ★', anchor: at('care'), offset: [0, -50], className: 'gold' },
    ],
  }));
  renderState(getPath('care').path, { matches: ['car', 'card', 'care'], depth: 4 });
  status.textContent = '词尾 ★：car / card / care 是三个单词，但共享前缀 ca';
  yield W(750);
}

// ---- 前缀查询 ----
function* prefixFlow(prefix) {
  director.chapter('前缀查询');
  const res = getPath(prefix);
  if (res.missing) {
    stage.setNodeColor(res.at.id, C.bad);
    yield S(() => director.beat({
      title: '前缀 ' + prefix + ' 不存在',
      why: '前缀查询沿字符下钻；中途缺字符就直接返回空。',
      stateText: '缺字符 ' + res.missing,
      progress: 3,
      camera: stage.focus(res.at.id),
      annotations: [{ id: 'miss', text: '缺少字符 ' + res.missing, anchor: () => stage.vpos(res.at.id), offset: [0, -50], className: 'warn' }],
    }));
    status.textContent = '前缀 ' + prefix + '：无匹配（缺 ' + res.missing + '）';
    renderState(res.path, { matches: [] });
    yield W(650);
    return;
  }
  const matches = wordsWith(prefix);
  paintPath(res.path, C.path);
  (function collect(n) { stage.setNodeColor(n.id, C.ok); n.children.forEach(collect); })(res.node);
  stage.setNodeColor(res.node.id, C.current);
  stage.setActive(res.node.id, C.current);
  yield S(() => director.beat({
    title: '前缀 ' + prefix + ' → ' + matches.length + ' 个单词',
    why: '前缀命中的节点就是整个子树入口；子树里所有 ★ 都是答案。',
    stateText: '匹配：' + (matches.join(' · ') || '无'),
    progress: 3,
    camera: stage.focus(res.node.id, { dist: 470 }),
    annotations: [{ id: 'pre', text: '前缀 ' + prefix + ' 的子树 = ' + matches.length + ' 个词', anchor: () => stage.vpos(res.node.id), offset: [0, -50], className: 'final' }],
  }));
  status.textContent = '前缀 ' + prefix + '：' + (matches.join(' · ') || '无匹配');
  renderState(getPath(prefix).path, { matches, depth: prefix.length });
  yield W(800);
  paintPath(res.path, C.base);
  stage.setActive(null);
}

// ---- 完整单词查找 ----
function* findFlow(word) {
  director.chapter('查找');
  const res = getPath(word);
  if (res.missing) {
    stage.setNodeColor(res.at.id, C.bad);
    stage.setActive(res.at.id, C.bad);
    yield S(() => director.beat({
      title: '查找 ' + word + '：不存在',
      why: '字符走到一半就断了；前缀再像也不是单词。',
      stateText: '缺字符 ' + res.missing,
      progress: 4,
      camera: stage.focus(res.at.id),
      annotations: [{ id: 'miss', text: '缺 ' + res.missing + ' → 查不到', anchor: () => stage.vpos(res.at.id), offset: [0, -50], className: 'warn' }],
    }));
    status.textContent = '查找 ' + word + '：不存在';
    renderState(res.path, { depth: res.path.length - 1 });
    yield W(700);
    return;
  }
  paintPath(res.path, C.path);
  const isWord = res.node.end;
  stage.setNodeColor(res.node.id, isWord ? C.ok : C.current);
  stage.setActive(res.node.id, isWord ? C.ok : C.current);
  yield S(() => director.beat({
    title: '查找 ' + word + ' → ' + (isWord ? '完整单词 ✓' : '只是前缀'),
    why: '走完所有字符还不够，必须检查词尾 ★；否则 ca 也会被误判成单词。',
    stateText: '路径 ' + res.path.map((p) => p.ch).join(' → ') + ' · 词尾 ★ ' + (isWord ? '有' : '无'),
    progress: 4,
    camera: stage.focus(res.node.id),
    annotations: [{ id: 'end', text: isWord ? word + ' ★ 完整单词' : word + ' 只是前缀', anchor: () => stage.vpos(res.node.id), offset: [0, -50], className: isWord ? 'final' : 'gold' }],
  }));
  status.textContent = '查找 ' + word + '：' + (isWord ? '命中完整单词' : '仅前缀，不是单词');
  renderState(res.path, { current: isWord ? word : '', depth: word.length });
  yield W(800);
  paintPath(res.path, C.base);
  stage.setActive(null);
}

// ---- 删除 ----
function* deleteFlow(word) {
  const res = getPath(word);
  if (res.missing || !res.node.end) {
    status.textContent = '删除 ' + word + '：不是完整单词';
    yield W(300);
    return;
  }
  director.chapter('删除');
  yield S(() => director.beat({
    title: '删除 ' + word,
    why: '先摘掉词尾 ★；若节点没有子节点就向上剪枝，仍被别的词使用就保留。',
    stateText: word + ' 是完整单词 · 子树 ' + res.node.children.size + ' 个孩子',
    progress: 5,
    camera: stage.focus(res.node.id),
    annotations: [{ id: 'del', text: '摘掉 ' + word + ' 的 ★', anchor: () => stage.vpos(res.node.id), offset: [0, -50], className: 'warn' }],
  }));
  paintPath(res.path, C.bad);
  stage.setActive(res.node.id, C.bad);
  yield W(500);
  const result = deleteWord(word);
  syncT({ ms: 460 });
  const anchorWord = result.kept ? word : word.slice(0, -1);
  if (result.kept) stage.setNodeColor(result.node.id, C.path);
  director.annotations.set('keep', {
    text: result.kept ? '节点保留：仍是其他词的前缀' : '没有子节点 → 向上剪枝',
    anchor: at(anchorWord),
    offset: [0, -50],
    className: result.kept ? 'gold' : 'final',
  });
  status.textContent = '删除 ' + word + '：' + (result.kept ? '词尾 ★ 移除，但前缀节点仍被使用' : '词尾与独占路径已剪枝');
  renderState(getPath(anchorWord).path, { depth: anchorWord.length });
  yield W(800);
  paintPath(getPath(anchorWord).path, C.base);
  stage.setActive(null);
}

// ---- 共享前缀 ----
function* sharedFlow(a, b) {
  director.chapter('共享前缀');
  const p = lcp(a, b);
  const path = p ? getPath(p).path : [];
  paintPath(path, C.ok);
  if (p) stage.setActive(nodeFor(p).id, C.ok);
  yield S(() => director.beat({
    title: a + ' / ' + b + ' 共享 "' + (p || '∅') + '"',
    why: '共享前缀只存一份，单词数越多越省空间；删除一个词也不一定删节点。',
    stateText: '共享 ' + (p || '无') + ' · 匹配 ' + (p ? wordsWith(p).join(' · ') : '—'),
    progress: 6,
    camera: p ? stage.focus(nodeFor(p).id, { dist: 450 }) : stage.overview(),
    annotations: p ? [
      { id: 'lcp', text: '共享前缀 "' + p + '"', anchor: at(p), offset: [0, -50], className: 'final' },
      { id: 'words', text: a + ' · ' + b, anchor: () => new THREE.Vector3(stage.center.x, 690 * SC, 0), offset: [0, -24], className: 'gold' },
    ] : [],
  }));
  status.textContent = '共享前缀：' + a + ' / ' + b + ' → "' + (p || '无') + '"';
  renderState(path, { matches: p ? wordsWith(p) : [], depth: p.length, current: p });
  yield W(800);
  paintPath(path, C.base);
  stage.setActive(null);
}

function* runTrie() {
  director.reset();
  stage.clear();
  clearStars();
  root = null;
  buildSeeds();
  syncT();
  renderState();
  director.chapter('前缀森林');
  yield S(() => director.beat({
    title: 'Trie 前缀森林',
    why: '根到每个节点是一条字符路径；共享前缀共用同一条路，词尾用 ★ 标记。',
    stateText: allWords().length + ' 个单词 · ' + countNodes() + ' 个字符节点',
    progress: 0,
    camera: stage.overview(),
    annotations: [{ id: 'root', text: '共享前缀从这里分叉', anchor: () => stage.vpos(root.id), offset: [0, -50], className: 'gold' }],
  }));
  yield W(750);
  yield* insertFlow('care');
  yield* wordEndFlow();
  yield* prefixFlow('ca');
  yield* findFlow('card');
  yield* deleteFlow('car');
  yield* sharedFlow('card', 'care');
  director.chapter('结算');
  yield S(() => director.beat({
    title: '共享 = 省空间 + 快查询',
    why: '长度为 L 的单词查询只看 L 个节点；前缀查询直接拿到整棵子树。',
    stateText: allWords().length + ' 个单词 · ' + countNodes() + ' 节点 · 查询 O(L)',
    progress: 8,
    camera: stage.wide(),
    annotations: [
      { id: 'all', text: allWords().join(' · '), anchor: () => new THREE.Vector3(stage.center.x, 700 * SC, 0), offset: [0, -24], className: 'final' },
      { id: 'car', text: 'car 已删，路径仍共享', anchor: at('car'), offset: [0, -50], className: 'gold' },
    ],
  }));
  status.textContent = 'Trie 演示完成：' + allWords().length + ' 个单词 · 前缀共享 · 查询 O(L)';
  yield W(850);
}

function restart() {
  engine.clear(); director.reset(); status.textContent = ''; stage.clear(); clearStars(); root = null;
  engine.start(runTrie());
}
function clearAll() {
  engine.clear();
  director.reset();
  stage.clear();
  clearStars();
  root = newNode('·');
  nextId = 1;
  syncT();
  renderState();
  status.textContent = '';
}
function randomWords() {
  engine.clear();
  director.reset();
  stage.clear();
  clearStars();
  root = newNode('·');
  nextId = 1;
  const words = [];
  while (words.length < 6) {
    const w = POOL[Math.floor(Math.random() * POOL.length)];
    if (!words.includes(w)) words.push(w);
  }
  words.forEach(addWord);
  syncT();
  renderState();
  status.textContent = '随机 Trie：' + words.join(', ') + ' · ' + countNodes() + ' 节点';
}
function runOp(kind, raw) {
  status.textContent = '';
  const word = String(raw || '').trim().toLowerCase();
  if (!/^[a-z]{1,6}$/.test(word)) {
    status.textContent = '请输入 1-6 个小写字母';
    return;
  }
  if (kind !== 'insert' && countNodes() === 1) {
    status.textContent = 'Trie 为空：请先插入单词';
    return;
  }
  engine.clear();
  director.reset();
  const gen = kind === 'insert' ? insertFlow(word) : kind === 'delete' ? deleteFlow(word) : kind === 'prefix' ? prefixFlow(word) : findFlow(word);
  engine.start(gen);
}

const wordInput = panel.addInput('单词 a-z', (v) => runOp('insert', v), 6);
input.addButton('插入', () => runOp('insert', wordInput.value));
input.addButton('查找', () => runOp('find', wordInput.value));
input.addButton('前缀', () => runOp('prefix', wordInput.value));
input.addButton('删除', () => runOp('delete', wordInput.value));
input.addButton('随机', randomWords);
input.addButton('清空', clearAll);

buildSeeds();
syncT();
renderState();
engine.queue(() => runTrie());
scene.start(engine);
