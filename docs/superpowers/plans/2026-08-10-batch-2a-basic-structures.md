# 批次 2a：基础结构（栈/队列）3D 化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 4 个基础结构页面（SimpleStack / StackLL / QueueArray / QueueLL）从 2D 重写为 three.js 3D，并新增 LinkedList3D 渲染模式。

**Architecture:** 复用阶段 0+1 已建基础设施：`Scene3D`（深空背景 + 星尘 + 网格地面 + OrbitControls）、`AnimationEngine`（串行命令队列，`C = (duration, fn, undo) => engine.addCommand(...)`）、`ControlPanel`（播放/暂停/撤销/重做/清空 + 控件注入）。LinkedList3D 采用**状态驱动重绘**：节点/指针的几何位置由页面脚本通过 cmd 动画，箭头（节点→节点、指针→节点）由 `redraw()` 依据 `nextMap`/`pointers` 状态整体重建；删除采用**隐藏而非 dispose**（`mesh.visible = false`），保证撤销可恢复。

**Tech Stack:** three.js r160（本地化 importmap）、原生 JS 模块、Playwright 冒烟测试（Python）。

**通用约定（所有任务遵守）：**
- 每页布局常量：链表 `NODE_X(i) = -350 + i*100`，`MAX = 8`（相机 `cameraPos:[0,220,640], fov:55` 可视范围约 ±450，10 槽最右 x=350 安全）。
- 按钮文案统一中文：入栈/出栈/入队/出队/清空。
- 页面脚本首行 `// AlgorithmLibrary/XXX3D.js` 注释，复用 StackArray3D.js 的样板（imports、C 定义、status、addLabel 拖拽提示）。
- 旧 2D 文件（SimpleStack.js / StackLL.js / QueueArray.js / QueueLL.js 及 Algorithm.js 引用）**保持不动**，仅在 html 中改挂 3D 脚本。

---

### Task 1: LinkedList3D 渲染模式

**Files:**
- Create: `3D/modes/LinkedList3D.js`

- [ ] **Step 1: 创建 `3D/modes/LinkedList3D.js`**（完整代码）：

```js
// 3D/modes/LinkedList3D.js
// 链表模式：节点盒子 + 指针盒子 + 状态驱动箭头重绘（redraw）。
// 删除用隐藏而非 dispose（mesh.visible=false），保证撤销可恢复。
import * as THREE from 'three';
import { VBox } from '../VisualObject3D.js';
import { makeTextSprite, PALETTE } from '../Glow.js';

function arrowBetween(scene, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 4) return new THREE.Group();
  const dirN = dir.clone().normalize();
  const group = new THREE.Group();
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, b]), 2, 2.5, 6, false),
    new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.55 }));
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(6, 14, 10),
    new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.75 }));
  cone.position.copy(b).addScaledVector(dirN, -7);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirN);
  group.add(tube, cone);
  scene.add(group);
  return group;
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  g.removeFromParent();
}

export class LinkedList3D {
  constructor(scene) {
    this.scene = scene;
    this.nodes = new Map();       // id -> { box, nullText }
    this.pointers = new Map();    // name -> { box, nameLabel, nullText, targetId }
    this.nextMap = new Map();     // id -> nextId | null
    this.arrowGroups = [];
  }

  // 新节点：数据盒（52x46）+ 右侧 NULL 文字（mesh 子对象，随盒移动）
  addNode(id, x, y, z = 0) {
    const box = new VBox(this.scene, { w: 52, h: 46, d: 28, x, y, z, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
    const nullText = makeTextSprite('NULL', { color: PALETTE.textDim, scale: 0.55 });
    nullText.position.set(44, 0, 30);
    nullText.visible = false;
    box.mesh.add(nullText);
    this.nodes.set(id, { box, nullText });
    return { box, nullText };
  }

  moveNode(id, x, y, cmd, duration = 400) {
    const node = this.nodes.get(id);
    const sx = node.box.mesh.position.x, sy = node.box.mesh.position.y;
    cmd({
      duration,
      fn: (p) => {
        node.box.mesh.position.x = sx + (x - sx) * p;
        node.box.mesh.position.y = sy + (y - sy) * p;
        if (p >= 1) this.redraw();
      },
      undo: () => { node.box.mesh.position.x = sx; node.box.mesh.position.y = sy; this.redraw(); },
    });
  }

  setNodeValue(id, value, cmd) {
    const node = this.nodes.get(id);
    const prev = node.box.text;
    cmd({ duration: 200, fn: () => node.box.setText(String(value)), undo: () => node.box.setText(prev) });
  }

  highlightNode(id, cmd, color) {
    const node = this.nodes.get(id);
    const c = color || PALETTE.highlight;
    cmd({
      duration: 250,
      fn: (p) => { node.box.mesh.material.emissiveIntensity = 0.35 + p * 0.55; node.box.mesh.material.color.setHex(c); },
      undo: () => { node.box.mesh.material.emissiveIntensity = 0.35; node.box.mesh.material.color.setHex(PALETTE.node); },
    });
  }

  setNext(from, to, cmd) {
    const prev = this.nextMap.get(from) ?? null;
    cmd({
      duration: 250,
      fn: (p) => { if (p >= 1) { this.nextMap.set(from, to); this.redraw(); } },
      undo: () => {
        if (prev === null) this.nextMap.delete(from); else this.nextMap.set(from, prev);
        this.redraw();
      },
    });
  }

  // 隐藏式删除：记录 prevNext（自身指向）与 prevOf（谁指向自己），撤销时恢复
  deleteNode(id, cmd) {
    const node = this.nodes.get(id);
    if (!node) return;
    const prevNext = this.nextMap.get(id) ?? null;
    let prevOf = null;
    for (const [k, v] of this.nextMap) if (v === id) { prevOf = k; break; }
    cmd({
      duration: 1,
      fn: (p) => {
        if (p >= 1) {
          node.box.mesh.visible = false;
          node.nullText.visible = false;
          this.nextMap.delete(id);
          if (prevOf !== null) this.nextMap.delete(prevOf);
          this.redraw();
        }
      },
      undo: () => {
        if (prevOf !== null) this.nextMap.set(prevOf, id);
        this.nextMap.set(id, prevNext);
        node.box.mesh.visible = true;
        this.redraw();
      },
    });
  }

  // 立即隐藏并清理 nextMap（创建类操作首个 cmd 的 undo，撤销时移除新节点）
  forceDeleteNode(id) {
    const node = this.nodes.get(id);
    if (!node) return;
    node.box.mesh.visible = false;
    node.nullText.visible = false;
    this.nextMap.delete(id);
    this.redraw();
  }

  // 指针盒子：46x46 蓝色，名称文字在盒上方，NULL 文字在盒下方
  addPointer(name, label, x, y) {
    const box = new VBox(this.scene, { w: 46, h: 46, d: 20, x, y, z: 0, label: '', color: PALETTE.blue, emissive: PALETTE.blueEmissive });
    const nameLabel = makeTextSprite(label, { color: PALETTE.textGlow, scale: 0.7 });
    nameLabel.position.set(0, 40, 24);
    box.mesh.add(nameLabel);
    const nullText = makeTextSprite('NULL', { color: PALETTE.textDim, scale: 0.55 });
    nullText.position.set(0, -40, 24);
    nullText.visible = false;
    box.mesh.add(nullText);
    this.pointers.set(name, { box, nameLabel, nullText, targetId: null });
  }

  movePointer(name, x, y, cmd, duration = 400) {
    const p = this.pointers.get(name);
    const sx = p.box.mesh.position.x, sy = p.box.mesh.position.y;
    cmd({
      duration,
      fn: (t) => { p.box.mesh.position.x = sx + (x - sx) * t; p.box.mesh.position.y = sy + (y - sy) * t; },
      undo: () => { p.box.mesh.position.x = sx; p.box.mesh.position.y = sy; this.redraw(); },
    });
  }

  pointTo(name, id, cmd) {
    const p = this.pointers.get(name);
    const prev = p.targetId ?? null;
    cmd({
      duration: 300,
      fn: (t) => { if (t >= 1) { p.targetId = id; this.redraw(); } },
      undo: () => { p.targetId = prev; this.redraw(); },
    });
  }

  // 依据 nextMap 与指针 targetId 重建全部箭头
  redraw() {
    for (const g of this.arrowGroups) disposeGroup(g);
    this.arrowGroups = [];
    for (const [id, node] of this.nodes) {
      if (!node.box.mesh.visible) continue;
      const to = this.nextMap.get(id) ?? null;
      node.nullText.visible = to === null;
      if (to === null) continue;
      const other = this.nodes.get(to);
      if (!other || !other.box.mesh.visible) continue;
      const a = node.box.mesh.position, b = other.box.mesh.position;
      this.arrowGroups.push(arrowBetween(this.scene,
        new THREE.Vector3(a.x + 34, a.y, a.z), new THREE.Vector3(b.x - 34, b.y, b.z)));
    }
    for (const p of this.pointers.values()) {
      const a = p.box.mesh.position;
      const t = (p.targetId !== null && p.targetId !== undefined) ? this.nodes.get(p.targetId) : null;
      if (t && t.box.mesh.visible) {
        const b = t.box.mesh.position;
        this.arrowGroups.push(arrowBetween(this.scene,
          new THREE.Vector3(a.x, a.y - 25, a.z), new THREE.Vector3(b.x, b.y + 25, b.z)));
        p.nullText.visible = false;
      } else {
        this.arrowGroups.push(arrowBetween(this.scene,
          new THREE.Vector3(a.x, a.y - 25, a.z), new THREE.Vector3(a.x, a.y - 40, a.z)));
        p.nullText.visible = true;
      }
    }
  }
}
```

- [ ] **Step 2: 语法校验**

Run: `node --check 3D/modes/LinkedList3D.js`
Expected: 无输出，退出码 0（`node --check` 对 ES module 语法有效）。

- [ ] **Step 3: 提交**

```bash
git add 3D/modes/LinkedList3D.js
git commit -m "feat: 添加 LinkedList3D 链表渲染模式（状态驱动箭头重绘 + 隐藏式删除）"
```

---

### Task 2: SimpleStack（堆栈，数组实现，无 top 指示器）

**Files:**
- Rewrite: `SimpleStack.html`
- Create: `AlgorithmLibrary/SimpleStack3D.js`

- [ ] **Step 1: 重写 `SimpleStack.html`**（整文件替换）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="renderer" content="webkit">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="keywords" content="算法可视化,堆栈,索引,visual.erik.xyz">
<title>堆栈</title>
<link rel="shortcut icon" href="favicon.ico">
<link rel="stylesheet" href="visualizationPageStyle3d.css">
<script type="importmap">
{ "imports": { "three": "./ThirdParty/three/build/three.module.js" } }
</script>
</head>
<body>
<div id="app">
  <header id="header">
    <h1>堆栈</h1>
    <a href="Algorithms.html" class="home-link">← 返回目录</a>
  </header>
  <div id="controls"></div>
  <div id="scene"></div>
  <div id="playbar"></div>
</div>
<footer>
  <a href="Algorithms.html" style="color:#64748b;">算法可视化</a>
  <script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
  <span id="busuanzi_container_page_pv"> | 本文总阅读量 <span id="busuanzi_value_page_pv">0</span> 次</span>
</footer>
<script type="module" src="AlgorithmLibrary/SimpleStack3D.js"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 `AlgorithmLibrary/SimpleStack3D.js`**（完整代码）：

```js
// AlgorithmLibrary/SimpleStack3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const SIZE = 15;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand({ duration, fn, undo: undo || (() => {}) });

const array = new Array3D(scene, { count: SIZE, startY: -40, w: 46, h: 46, spacing: 50 });
array.create();
const status = panel.addStatus('');
const state = { top: 0, data: new Array(SIZE) };

function push(value) {
  if (state.top >= SIZE) { status.textContent = '栈已满'; return; }
  status.textContent = '入栈: ' + value;
  const targetX = array.xOf(state.top);
  array.highlight(state.top, C);
  // 值标签从顶部中央飞入槽位
  const tmp = new VText(scene, { text: value, x: 0, y: 200, z: 0, color: PALETTE.text, scale: 1 });
  C(450, (p) => {
    tmp.sprite.position.x = 0 + (targetX - 0) * p;
    tmp.sprite.position.y = 200 + (-40 - 200) * p;
  }, () => { tmp.remove(); });
  state.data[state.top] = value;
  array.setValue(state.top, value, C);
  C(60, () => tmp.remove(), () => {});
  state.top++;
  array.unhighlight(state.top - 1, C);
  status.textContent = '';
}

function pop() {
  if (state.top <= 0) { status.textContent = '栈为空'; return; }
  const value = state.data[state.top - 1];
  status.textContent = '出栈: ' + value;
  state.top--;
  const x = array.xOf(state.top);
  array.highlight(state.top, C);
  // 值标签飞出到底部中央
  const tmp = new VText(scene, { text: value, x, y: -40, z: 0, color: PALETTE.text, scale: 1 });
  C(450, (p) => {
    tmp.sprite.position.x = x + (0 - x) * p;
    tmp.sprite.position.y = -40 + (-230 - -40) * p;
  }, () => { tmp.remove(); });
  state.data[state.top] = '';
  array.setValue(state.top, '', C);
  array.unhighlight(state.top, C);
  C(60, () => tmp.remove(), () => {});
  status.textContent = '';
}

function clear() {
  for (let i = 0; i < state.top; i++) array.setValue(i, '', C);
  state.top = 0;
}

let pushInput = panel.addInput('输入数字', (v) => { if (v) push(v.trim()); }, 6);
panel.addButton('入栈', () => { if (pushInput.value) push(pushInput.value.trim()); });
panel.addButton('出栈', pop);
panel.addButton('清空', clear);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
```

- [ ] **Step 3: 校验 + 提交**

Run: `node --check AlgorithmLibrary/SimpleStack3D.js`

```bash
git add SimpleStack.html AlgorithmLibrary/SimpleStack3D.js
git commit -m "feat: SimpleStack 3D 化（值标签飞入/飞出动画）"
```

---

### Task 3: StackLL（堆栈，链表实现）

**Files:**
- Rewrite: `StackLL.html`
- Create: `AlgorithmLibrary/StackLL3D.js`

- [ ] **Step 1: 重写 `StackLL.html`**：与 Task 2 的 html 相同模板，仅改两处：`<title>堆栈（链表实现）</title>`、`<script type="module" src="AlgorithmLibrary/StackLL3D.js"></script>`。

- [ ] **Step 2: 创建 `AlgorithmLibrary/StackLL3D.js`**（完整代码）：

```js
// AlgorithmLibrary/StackLL3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { LinkedList3D } from '../3D/modes/LinkedList3D.js';
import { PALETTE } from '../3D/Glow.js';

const MAX = 8;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand({ duration, fn, undo: undo || (() => {}) });

const ll = new LinkedList3D(scene);
const NODE_X = (i) => -350 + i * 100;
ll.addPointer('Top', 'top', NODE_X(0), 105);
const status = panel.addStatus('');
const state = { order: [], nextId: 0, values: {} };

function push(value) {
  if (state.order.length >= MAX) { status.textContent = '栈已满'; return; }
  const id = state.nextId++;
  status.textContent = '入栈: ' + value;
  // 撤销锚点：整个 push 被撤销时移除新节点
  C(1, () => {}, () => ll.forceDeleteNode(id));
  ll.addNode(id, 0, 190, 0);
  // 现有节点右移一格，新节点从顶部飞入 0 号位
  for (let j = 0; j < state.order.length; j++) ll.moveNode(state.order[j], NODE_X(j + 1), 0, C, 350);
  ll.moveNode(id, NODE_X(0), 0, C, 500);
  ll.setNodeValue(id, value, C);
  ll.highlightNode(id, C);
  if (state.order.length > 0) ll.setNext(id, state.order[0], C);
  state.values[id] = value;
  state.order.unshift(id);
  ll.pointTo('Top', id, C);
  status.textContent = '';
}

function pop() {
  if (state.order.length === 0) { status.textContent = '栈为空'; return; }
  const id = state.order[0];
  status.textContent = '出栈: ' + state.values[id];
  ll.highlightNode(id, C);
  // 头节点飞出到底部，其余节点级联左移
  ll.moveNode(id, 0, -190, C, 600);
  for (let j = 1; j < state.order.length; j++) ll.moveNode(state.order[j], NODE_X(j - 1), 0, C, 350);
  state.order.shift();
  ll.pointTo('Top', state.order.length ? state.order[0] : null, C);
  ll.deleteNode(id, C);
  status.textContent = '';
}

function clear() {
  if (state.order.length === 0) return;
  status.textContent = '清空';
  for (const id of [...state.order]) ll.deleteNode(id, C);
  state.order = [];
  ll.pointTo('Top', null, C);
  status.textContent = '';
}

let pushInput = panel.addInput('输入数字', (v) => { if (v) push(v.trim()); }, 6);
panel.addButton('入栈', () => { if (pushInput.value) push(pushInput.value.trim()); });
panel.addButton('出栈', pop);
panel.addButton('清空', clear);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
```

- [ ] **Step 3: 校验 + 提交**

Run: `node --check AlgorithmLibrary/StackLL3D.js`

```bash
git add StackLL.html AlgorithmLibrary/StackLL3D.js
git commit -m "feat: StackLL 3D 化（节点级联移位 + Top 指针）"
```

---

### Task 4: QueueArray（队列，数组实现，环形）

**Files:**
- Rewrite: `QueueArray.html`
- Create: `AlgorithmLibrary/QueueArray3D.js`

- [ ] **Step 1: 重写 `QueueArray.html`**：同 Task 2 模板，改 `<title>队列（数组实现）</title>`、script 为 `AlgorithmLibrary/QueueArray3D.js`。

- [ ] **Step 2: 创建 `AlgorithmLibrary/QueueArray3D.js`**（完整代码）：

```js
// AlgorithmLibrary/QueueArray3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText, VBox, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const SIZE = 15;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand({ duration, fn, undo: undo || (() => {}) });

const array = new Array3D(scene, { count: SIZE, startY: -40, w: 46, h: 46, spacing: 50 });
array.create();
const status = panel.addStatus('');
const state = { head: 0, tail: 0, data: new Array(SIZE) };

// head 在上方（箭头向下），tail 在下方（箭头向上），避免空队列时重叠
function makeIndicator(label, color, emissive, boxY, arrowY, arrowDown) {
  const box = new VBox(scene, { w: 46, h: 46, d: 28, x: 0, y: boxY, z: 0, label: '0', color, emissive });
  const text = new VText(scene, { text: label, x: 0, y: boxY + 48, z: 0, color: PALETTE.textGlow, scale: 0.7 });
  const arrow = new VArrow(scene, { x: 0, y: arrowY, z: 0, down: arrowDown });
  return { box, text, arrow };
}
const headInd = makeIndicator('head', PALETTE.blue, PALETTE.blueEmissive, 60, 12, true);
const tailInd = makeIndicator('tail', PALETTE.orange, PALETTE.orangeEmissive, -115, -105, false);

function placeIndicator(ind, x, duration) {
  C(duration, (p) => {
    const bx = ind.box.mesh.position.x, tx = ind.text.sprite.position.x, ax = ind.arrow.group.position.x;
    ind.box.mesh.position.x = bx + (x - bx) * p;
    ind.text.sprite.position.x = tx + (x - tx) * p;
    ind.arrow.group.position.x = ax + (x - ax) * p;
  });
}

function enqueue(value) {
  if ((state.tail + 1) % SIZE === state.head) { status.textContent = '队列已满'; return; }
  status.textContent = '入队: ' + value;
  const x = array.xOf(state.tail);
  array.highlight(state.tail, C, PALETTE.orange);
  placeIndicator(tailInd, x, 400);
  const tmp = new VText(scene, { text: value, x: 0, y: 200, z: 0, color: PALETTE.text, scale: 1 });
  C(450, (p) => {
    tmp.sprite.position.x = 0 + (x - 0) * p;
    tmp.sprite.position.y = 200 + (-40 - 200) * p;
  }, () => { tmp.remove(); });
  state.data[state.tail] = value;
  array.setValue(state.tail, value, C);
  C(60, () => tmp.remove(), () => {});
  state.tail = (state.tail + 1) % SIZE;
  C(150, () => tailInd.box.setText(String(state.tail)));
  array.unhighlight((state.tail + SIZE - 1) % SIZE, C);
  status.textContent = '';
}

function dequeue() {
  if (state.head === state.tail) { status.textContent = '队列为空'; return; }
  const value = state.data[state.head];
  status.textContent = '出队: ' + value;
  const x = array.xOf(state.head);
  array.highlight(state.head, C, PALETTE.blue);
  const tmp = new VText(scene, { text: value, x, y: -40, z: 0, color: PALETTE.text, scale: 1 });
  C(450, (p) => {
    tmp.sprite.position.x = x + (0 - x) * p;
    tmp.sprite.position.y = -40 + (-230 - -40) * p;
  }, () => { tmp.remove(); });
  state.data[state.head] = '';
  array.setValue(state.head, '', C);
  state.head = (state.head + 1) % SIZE;
  placeIndicator(headInd, array.xOf(state.head), 400);
  C(150, () => headInd.box.setText(String(state.head)));
  array.unhighlight((state.head + SIZE - 1) % SIZE, C);
  C(60, () => tmp.remove(), () => {});
  status.textContent = '';
}

function clear() {
  let i = state.head;
  while (i !== state.tail) { array.setValue(i, '', C); state.data[i] = ''; i = (i + 1) % SIZE; }
  state.head = 0; state.tail = 0;
  placeIndicator(headInd, array.xOf(0), 350);
  placeIndicator(tailInd, array.xOf(0), 350);
  C(150, () => { headInd.box.setText('0'); tailInd.box.setText('0'); });
}

let enqueueInput = panel.addInput('输入数字', (v) => { if (v) enqueue(v.trim()); }, 6);
panel.addButton('入队', () => { if (enqueueInput.value) enqueue(enqueueInput.value.trim()); });
panel.addButton('出队', dequeue);
panel.addButton('清空', clear);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

// 初始位置：head/tail 均指向 0 号槽
const initX = array.xOf(0);
headInd.box.mesh.position.x = initX; headInd.text.sprite.position.x = initX; headInd.arrow.group.position.x = initX;
tailInd.box.mesh.position.x = initX; tailInd.text.sprite.position.x = initX; tailInd.arrow.group.position.x = initX;

scene.start(engine);
```

- [ ] **Step 3: 校验 + 提交**

Run: `node --check AlgorithmLibrary/QueueArray3D.js`

```bash
git add QueueArray.html AlgorithmLibrary/QueueArray3D.js
git commit -m "feat: QueueArray 3D 化（环形队列 + head/tail 指示器）"
```

---

### Task 5: QueueLL（队列，链表实现）

**Files:**
- Rewrite: `QueueLL.html`
- Create: `AlgorithmLibrary/QueueLL3D.js`

- [ ] **Step 1: 重写 `QueueLL.html`**：同 Task 2 模板，改 `<title>队列（链表实现）</title>`、script 为 `AlgorithmLibrary/QueueLL3D.js`。

- [ ] **Step 2: 创建 `AlgorithmLibrary/QueueLL3D.js`**（完整代码）：

```js
// AlgorithmLibrary/QueueLL3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { LinkedList3D } from '../3D/modes/LinkedList3D.js';
import { PALETTE } from '../3D/Glow.js';

const MAX = 8;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand({ duration, fn, undo: undo || (() => {}) });

const ll = new LinkedList3D(scene);
const NODE_X = (i) => -350 + i * 100;
ll.addPointer('Head', 'head', NODE_X(0), 105);
ll.addPointer('Tail', 'tail', NODE_X(0) + 60, 105);
const status = panel.addStatus('');
const state = { order: [], nextId: 0, values: {} };

// Tail 指针 x：空队列或单节点时与 Head 并排（右移 60），否则落在尾节点上方
const tailX = () => (state.order.length <= 1 ? NODE_X(0) + 60 : NODE_X(state.order.length - 1));

function enqueue(value) {
  if (state.order.length >= MAX) { status.textContent = '队列已满'; return; }
  const id = state.nextId++;
  status.textContent = '入队: ' + value;
  C(1, () => {}, () => ll.forceDeleteNode(id));
  const x = NODE_X(state.order.length);
  ll.addNode(id, x, 190, 0);
  ll.moveNode(id, x, 0, C, 500);
  ll.setNodeValue(id, value, C);
  ll.highlightNode(id, C, PALETTE.orange);
  if (state.order.length > 0) ll.setNext(state.order[state.order.length - 1], id, C);
  state.values[id] = value;
  state.order.push(id);
  ll.movePointer('Tail', tailX(), 105, C);
  ll.pointTo('Tail', id, C);
  if (state.order.length === 1) ll.pointTo('Head', id, C);
  status.textContent = '';
}

function dequeue() {
  if (state.order.length === 0) { status.textContent = '队列为空'; return; }
  const id = state.order[0];
  status.textContent = '出队: ' + state.values[id];
  ll.highlightNode(id, C);
  ll.moveNode(id, 0, -190, C, 600);
  for (let j = 1; j < state.order.length; j++) ll.moveNode(state.order[j], NODE_X(j - 1), 0, C, 350);
  state.order.shift();
  ll.movePointer('Tail', tailX(), 105, C);
  ll.pointTo('Tail', state.order.length ? state.order[state.order.length - 1] : null, C);
  ll.pointTo('Head', state.order.length ? state.order[0] : null, C);
  ll.deleteNode(id, C);
  status.textContent = '';
}

function clear() {
  if (state.order.length === 0) return;
  status.textContent = '清空';
  for (const id of [...state.order]) ll.deleteNode(id, C);
  state.order = [];
  ll.movePointer('Tail', tailX(), 105, C);
  ll.pointTo('Tail', null, C);
  ll.pointTo('Head', null, C);
  status.textContent = '';
}

let enqueueInput = panel.addInput('输入数字', (v) => { if (v) enqueue(v.trim()); }, 6);
panel.addButton('入队', () => { if (enqueueInput.value) enqueue(enqueueInput.value.trim()); });
panel.addButton('出队', dequeue);
panel.addButton('清空', clear);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
```

- [ ] **Step 3: 校验 + 提交**

Run: `node --check AlgorithmLibrary/QueueLL3D.js`

```bash
git add QueueLL.html AlgorithmLibrary/QueueLL3D.js
git commit -m "feat: QueueLL 3D 化（尾部入队 + 头部出队级联左移）"
```

---

### Task 6: Playwright 冒烟验证

**Files:**
- Create: `/tmp/3d_smoke/smoke2a.py`（仓库外，不提交）

- [ ] **Step 1: 确保本地服务器运行**

Run: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8001/StackArray.html`
Expected: `200`（若无则后台启动：`cd /home/project/visual && python3 -m http.server 8001`）

- [ ] **Step 2: 创建 `/tmp/3d_smoke/smoke2a.py`**（完整代码）：

```python
#!/usr/bin/env python3
"""Playwright smoke test for batch 2a pages (SimpleStack/StackLL/QueueArray/QueueLL)."""
import asyncio, pathlib
from playwright.async_api import async_playwright

BASE = "http://localhost:8001"
OUT = pathlib.Path("/tmp/3d_smoke")
OUT.mkdir(exist_ok=True)

async def run():
    results = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--enable-unsafe-swiftshader", "--use-angle=swiftshader-webgl", "--disable-gpu-sandbox"],
        )
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        play = page.locator("button.play-btn").nth(0)

        async def snap(name):
            await page.screenshot(path=str(OUT / name), full_page=False)

        async def run_anim(ms):
            await play.click()
            await page.wait_for_timeout(ms)

        async def check(errors):
            page.on("console", lambda m: errors.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
            page.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))

        async def fill_and_click(label, value):
            await page.locator("input.algo-input").first.fill(value)
            await page.get_by_role("button", name=label).click()

        # ---- SimpleStack ----
        errors = []
        await check(errors)
        await page.goto(f"{BASE}/SimpleStack.html", wait_until="networkidle")
        await page.wait_for_timeout(2500)
        await snap("ss-1-initial.png")
        for v in ("5", "9", "2"):
            await fill_and_click("入栈", v)
            await run_anim(2000)
        await snap("ss-2-after-push3.png")
        await page.get_by_role("button", name="出栈").click()
        await run_anim(2000)
        await page.get_by_role("button", name="清空").click()
        await run_anim(1500)
        results["SimpleStack"] = {"errors": errors, "canvas": await page.locator("#scene canvas").count()}

        # ---- StackLL ----
        errors = []
        await check(errors)
        await page.goto(f"{BASE}/StackLL.html", wait_until="networkidle")
        await page.wait_for_timeout(2500)
        await snap("sll-1-initial.png")
        for v in ("5", "9", "2"):
            await fill_and_click("入栈", v)
            await run_anim(4000)
        await snap("sll-2-after-push3.png")
        await page.get_by_role("button", name="出栈").click()
        await run_anim(4000)
        await page.get_by_role("button", name="清空").click()
        await run_anim(4000)
        results["StackLL"] = {"errors": errors, "canvas": await page.locator("#scene canvas").count()}

        # ---- QueueArray ----
        errors = []
        await check(errors)
        await page.goto(f"{BASE}/QueueArray.html", wait_until="networkidle")
        await page.wait_for_timeout(2500)
        await snap("qa-1-initial.png")
        for v in ("3", "7", "1"):
            await fill_and_click("入队", v)
            await run_anim(2000)
        await snap("qa-2-after-enq3.png")
        await page.get_by_role("button", name="出队").click()
        await run_anim(2000)
        await page.get_by_role("button", name="清空").click()
        await run_anim(1500)
        results["QueueArray"] = {"errors": errors, "canvas": await page.locator("#scene canvas").count()}

        # ---- QueueLL ----
        errors = []
        await check(errors)
        await page.goto(f"{BASE}/QueueLL.html", wait_until="networkidle")
        await page.wait_for_timeout(2500)
        await snap("qll-1-initial.png")
        for v in ("3", "7", "1"):
            await fill_and_click("入队", v)
            await run_anim(3500)
        await snap("qll-2-after-enq3.png")
        await page.get_by_role("button", name="出队").click()
        await run_anim(4000)
        await page.get_by_role("button", name="清空").click()
        await run_anim(4000)
        results["QueueLL"] = {"errors": errors, "canvas": await page.locator("#scene canvas").count()}

        await browser.close()

    for name, r in results.items():
        errs = [e for e in r["errors"] if "favicon" not in e and "GPU stall" not in e]
        status = "PASS" if not errs and r["canvas"] > 0 else "FAIL"
        print(f"{status} {name}: canvas={r['canvas']} errors={len(errs)}")
        for e in errs[:6]:
            print("   ", e[:160])

asyncio.run(run())
```

- [ ] **Step 3: 运行冒烟测试**

Run: `python3 /tmp/3d_smoke/smoke2a.py`
Expected: 4 行全部 `PASS ...: canvas=1 errors=0`（允许 benign SwiftShader 警告被过滤）。若有 FAIL：阅读截图（`/tmp/3d_smoke/*.png`）与错误行，修复对应页面脚本后重跑，直至全 PASS。

- [ ] **Step 4: 最终状态确认**

Run: `git status --short`（确认仅有 4 个 html + 4 个 js 修改/新增，均已提交）+ `git log --oneline -6`
Expected: 干净工作区，5 个新提交（LinkedList3D + 4 页面）。

---

**Self-review 记录（controller 已做）：**
- 几何一致性：NODE_X 槽位 ±350 在相机 ±450 可视范围内；节点盒 52 宽 + 100 间距 → 箭头段长 32，可见。
- 撤销链：push 的 `C(1, noop, forceDeleteNode)` 锚点使撤销最后隐藏新节点；deleteNode 双向记录 prevNext/prevOf 保证 pop/clear 可逆。
- 指针重叠：QueueLL 空/单节点时 Tail 偏移 +60；QueueArray head 上/tail 下分层。
- 类型一致：LinkedList3D 方法名（addNode/moveNode/setNodeValue/highlightNode/setNext/deleteNode/forceDeleteNode/addPointer/movePointer/pointTo/redraw）在 Task 3/5 中一致使用。
- 无占位符：所有文件均为完整代码。
