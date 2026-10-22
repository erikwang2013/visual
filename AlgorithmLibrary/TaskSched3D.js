// AlgorithmLibrary/TaskSched3D.js — 任务调度：按收益降序，并查集 find 到最晚空槽，任务块滑入截止槽，总收益最大。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, tubeBetween } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
applyTheme('TaskSched3D');

const scene = new Scene3D('scene', { cameraPos: [470, 680, 920], lookAt: [320, 440, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const BASE = 0x60a5fa, DIM = 0x475569, GOLD = 0xfde047, ROSE = 0xfb7185, CYAN = 0x22d3ee, GREEN = 0x4ade80, ORANGE = 0xfb923c;
const PRESETS = {
  '经典 4 任务': [{ p: 25, d: 1 }, { p: 40, d: 3 }, { p: 35, d: 3 }, { p: 20, d: 2 }],
  '5 任务满排': [{ p: 50, d: 1 }, { p: 40, d: 2 }, { p: 30, d: 3 }, { p: 20, d: 4 }, { p: 10, d: 5 }],
  '5 任务拥挤': [{ p: 30, d: 2 }, { p: 50, d: 1 }, { p: 20, d: 3 }, { p: 40, d: 2 }, { p: 10, d: 3 }],
};
let TASKS = PRESETS['经典 4 任务'].map((t, i) => ({ id: 'ABCDE'[i], p: t.p, d: t.d }));
let sorted = [];
let m = 3;
let taskViews = [];
let slotBoxes = [];
let extras = [];
let total = 0;
let parent = [];
let cur = null;
let scheduled = [];
let pointer = null;
let resultText = null;
let homeY = [];

const director = new StoryDirector(scene, {
  title: '任务调度 · 截止槽',
  total: 8,
  legend: [
    { label: '任务', color: '#60a5fa' },
    { label: '已排槽', color: '#fde047' },
    { label: 'find 指针', color: '#22d3ee' },
    { label: '放弃', color: '#fb7185' },
  ],
  onReplay: () => restart(true),
});

function slotX(i) { return 420 + (i - (m - 1) / 2 - 1) * 120; }
function slotY() { return 410; }

function state() {
  return {
    blocks: [
      { type: 'kv', label: '当前任务', items: cur
        ? [{ k: '任务', v: cur.id + '（p' + cur.p + ' d' + cur.d + '）' }, { k: 'find', v: cur.path || '—' }, { k: '结果', v: cur.verdict }]
        : [{ k: '任务', v: '—' }, { k: 'find', v: '—' }, { k: '结果', v: '—' }] },
      { type: 'chips', label: '并查集 parent', items: parent.map((v, i) => ({ text: i + '→' + v, cls: i === 0 ? 'closed' : i === (cur ? Number(cur.root) : -1) ? 'current' : '' })) },
      { type: 'chips', label: '已排任务', items: scheduled.map((s) => ({ text: '槽' + s.slot + ':' + s.task.id + '(' + s.task.p + ')', cls: 'done' })), empty: '—' },
      { type: 'text', label: '总收益', value: String(total) },
    ],
    footer: 'find(d)：d 被占用就向更早的 parent 跳，槽 0 表示没有空位',
  };
}

const SHOT_ESTABLISH = { pos: [490, 710, 950], target: [320, 440, 0], ms: 900 };
const SHOT_SORT = { pos: [260, 790, 720], target: [180, 470, 0], ms: 850 };
const SHOT_SLOTS = { pos: [470, 610, 760], target: [400, 410, 0], ms: 800 };
const SHOT_FINAL = { pos: [420, 560, 980], target: [320, 420, 0], ms: 950 };
const ease = (p) => p * p * (3 - 2 * p);

function release(obj) {
  if (!obj) return;
  const root = obj.mesh || obj.sprite || obj;
  obj.remove?.();
  scene.remove(root);
  root.traverse?.((o) => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mat) => mat.dispose());
  });
}

function clearBuild() {
  [...taskViews, ...slotBoxes, ...extras, pointer, resultText].forEach(release);
  taskViews = []; slotBoxes = []; extras = []; pointer = null; resultText = null;
}

function build() {
  clearBuild();
  sorted = TASKS.slice().sort((a, b) => b.p - a.p || a.d - b.d);
  m = Math.max(...TASKS.map((t) => t.d), 1);
  parent = Array.from({ length: m + 1 }, (_, i) => i);
  total = 0; scheduled = []; cur = null;

  extras.push(new VText(scene, { text: '任务（收益/截止）', x: 105, y: 630, z: 0, color: '#94a3b8', scale: 0.44 }));
  extras.push(new VText(scene, { text: '截止槽（槽 i = 截止 i）', x: 420, y: 510, z: 0, color: '#94a3b8', scale: 0.44 }));
  extras.push(new VText(scene, { text: '按收益降序贪心', x: 105, y: 200, z: 0, color: '#fde047', scale: 0.44 }));
  extras.push(tubeBetween(scene, { x: 170, y: 190, z: 0 }, { x: 600, y: 190, z: 0 }, { color: 0x60a5fa, opacity: 0.4, radius: 1.5 }));

  homeY = TASKS.map((_, i) => 565 - i * 76);
  taskViews = TASKS.map((t, i) => {
    const b = new VBox(scene, {
      w: 124, h: 54, d: 34, x: 105, y: homeY[i], z: 0,
      label: t.id + ' ' + t.p + '/' + t.d, color: BASE, emissive: BASE,
    });
    b.label.scale.multiplyScalar(0.52);
    return b;
  });
  slotBoxes = Array.from({ length: m }, (_, i) => new VBox(scene, {
    w: 100, h: 68, d: 48, x: slotX(i + 1), y: slotY(), z: 0,
    label: '槽' + (i + 1), color: DIM, emissive: DIM,
  }));
  slotBoxes.forEach((b) => b.label.scale.multiplyScalar(0.58));
  pointer = new VNode(scene, { radius: 8, x: slotX(m), y: slotY() + 74, z: 0, color: CYAN, emissive: CYAN });
  resultText = new VText(scene, { text: '总收益 = —', x: 320, y: 150, z: 0, color: '#fde047', scale: 0.62 });
  director.stateUpdate(state());
}

function viewOf(id) { return taskViews[TASKS.findIndex((t) => t.id === id)]; }

function find(x) {
  const path = [];
  let r = x;
  while (parent[r] !== r) { path.push(r); r = parent[r]; }
  path.push(r);
  for (const v of path) parent[v] = r;
  return { root: r, path };
}

function* moveBox(box, x, y, ms = 480) {
  const fx = box.mesh.position.x, fy = box.mesh.position.y;
  yield A(ms, (p) => { box.mesh.position.set(fx + (x - fx) * ease(p), fy + (y - fy) * ease(p), 0); });
  box.mesh.position.set(x, y, 0);
}

function* scheduleTask(t) {
  const box = viewOf(t.id);
  const d = Math.min(t.d, m);
  const res = find(d);
  cur = { id: t.id, p: t.p, d: t.d, path: res.path.join('→'), root: res.root, verdict: '查找中' };
  pointer.mesh.position.set(slotX(d), slotY() + 74, 0);
  director.stateUpdate(state());
  director.setBeatState('find(' + d + ') → 路径 ' + res.path.join('→') + ' · 空位 = ' + res.root);
  yield W(320);
  box.setColor(CYAN, CYAN);
  if (res.root > 0) {
    const slot = res.root;
    pointer.mesh.position.set(slotX(slot), slotY() + 74, 0);
    yield S(() => {
      cur.verdict = '空槽 ' + slot + ' → 排入';
      director.stateUpdate(state());
    });
    yield* moveBox(box, slotX(slot), slotY(), 620);
    parent[slot] = find(slot - 1).root;
    box.setColor(GOLD, GOLD);
    box.setText(t.id + ' ' + t.p);
    slotBoxes[slot - 1].setColor(GOLD, GOLD);
    slotBoxes[slot - 1].setText(t.id + ' ' + t.p);
    scheduled.push({ slot, task: t });
    total += t.p;
    cur = { id: t.id, p: t.p, d: t.d, path: res.path.join('→'), root: res.root, verdict: '排入槽 ' + slot };
    director.stateUpdate(state());
    director.camera.shot([slotX(slot) + 230, slotY() + 240, 560], [slotX(slot), slotY(), 0], { ms: 500 });
    director.setBeatState(t.id + ' 排入槽 ' + slot + ' · 总收益 ' + total);
  } else {
    box.setColor(ROSE, ROSE);
    box.setText(t.id + ' ✗');
    cur = { id: t.id, p: t.p, d: t.d, path: res.path.join('→'), root: 0, verdict: '没有空槽 → 放弃' };
    director.stateUpdate(state());
    director.setBeatState(t.id + ' 截止 ' + t.d + ' 及更早全满 · 放弃');
    yield W(300);
  }
}

function* runTask() {
  director.reset();
  taskViews.forEach((b, i) => {
    b.mesh.position.set(105, homeY[i], 0);
    b.setColor(BASE, BASE);
    b.setText(TASKS[i].id + ' ' + TASKS[i].p + '/' + TASKS[i].d);
  });
  slotBoxes.forEach((b, i) => { b.setColor(DIM, DIM); b.setText('槽' + (i + 1)); });
  parent = Array.from({ length: m + 1 }, (_, i) => i);
  total = 0; scheduled = []; cur = null;
  pointer.mesh.position.set(slotX(m), slotY() + 74, 0);
  resultText.setText('总收益 = —', { color: '#fde047' });
  director.stateUpdate(state());

  director.chapter('建立');
  yield S(() => director.beat({
    title: '任务与截止槽',
    why: '每项任务占一个时间单位，必须在截止 d 之前完成才有收益；槽 i 代表截止时间 i 的可用位置。',
    stateText: TASKS.length + ' 个任务 · ' + m + ' 个截止槽',
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'tasks', text: '任务带收益与截止', anchor: () => new THREE.Vector3(105, 600, 0), offset: [0, -20], className: 'gold' },
      { id: 'hook', text: '怎样排收益最大？', anchor: () => new THREE.Vector3(420, 460, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  yield W(750);

  director.chapter('排序');
  yield S(() => director.beat({
    title: '按收益降序',
    why: '高收益任务优先占位；把更早的槽留给截止更早的任务，这是贪心的交换论证。',
    stateText: sorted.map((t) => t.id + '(' + t.p + ')').join(' → '),
    progress: 1,
    camera: SHOT_SORT,
    annotations: [{ id: 'sort', text: '收益从高到低', anchor: () => new THREE.Vector3(105, 610, 0), offset: [0, -18], className: 'gold' }],
  }));
  yield W(350);
  for (let k = 0; k < sorted.length; k++) {
    const b = viewOf(sorted[k].id);
    const targetY = 565 - k * 76;
    if (Math.abs(b.mesh.position.y - targetY) > 1) yield* moveBox(b, 105, targetY, 280);
  }
  yield W(500);

  director.chapter('安排高收益');
  yield S(() => director.beat({
    title: '先排 ' + sorted[0].id + '（收益 ' + sorted[0].p + '）',
    why: 'find(截止) 找到不晚于截止的最晚空槽；并查集把已占槽的 parent 指向更早位置，下一次可以一次跳过整段占用。',
    stateText: sorted[0].id + ' · 截止 ' + sorted[0].d,
    progress: 2,
    camera: SHOT_SLOTS,
    annotations: [{ id: 'slot', text: '最晚空槽', anchor: () => new THREE.Vector3(slotX(m), slotY(), 0), offset: [0, -20], className: 'gold' }],
  }));
  yield W(300);
  yield* scheduleTask(sorted[0]);
  yield W(650);

  if (sorted[1]) {
    const d1 = Math.min(sorted[1].d, m);
    const path1 = [d1];
    let root1 = d1;
    while (parent[root1] !== root1) { root1 = parent[root1]; path1.push(root1); }
    const skip1 = root1 > 0 && path1.length > 1;
    director.chapter(root1 === 0 ? '找不到空槽' : skip1 ? '跳过占用' : '直接命中空槽');
    yield S(() => director.beat({
      title: root1 === 0 ? 'find 到 0：没有空槽' : skip1 ? 'find 跳过已占槽' : 'find 直接命中空槽',
      why: root1 === 0
        ? '截止及更早的槽全部被占，find 一路回到 0；' + sorted[1].id + ' 没有可排的位置，只能放弃。'
        : skip1
          ? '槽 ' + d1 + ' 已被占，parent 链指向更早槽位；' + sorted[1].id + ' 截止 ' + d1 + '，find 沿 ' + path1.join('→') + ' 找到空槽 ' + root1 + '，无需逐格扫描。'
          : 'find(' + d1 + ') 直接命中空槽 ' + root1 + '；' + sorted[1].id + ' 截止前仍有空位，直接排入。',
      stateText: sorted[1].id + ' · 截止 ' + sorted[1].d + ' · find ' + path1.join('→'),
      progress: 3,
      camera: SHOT_SLOTS,
      annotations: [{ id: 'find', text: root1 > 0 ? 'find → 槽 ' + root1 : '槽 0 = 无空位', anchor: () => new THREE.Vector3(root1 > 0 ? slotX(root1) : 200, slotY() + 74, 0), offset: [0, -18], className: root1 > 0 ? 'final' : 'warn' }],
    }));
    yield W(300);
    yield* scheduleTask(sorted[1]);
    yield W(650);
  } else {
    director.chapter('任务不足');
    yield S(() => director.beat({ title: '没有第二个任务', why: '任务已全部处理。', stateText: '已排 ' + scheduled.length, progress: 3, camera: SHOT_SLOTS, annotations: [] }));
    yield W(650);
  }

  director.chapter('继续占槽');
  if (sorted[2]) {
    const d2 = Math.min(sorted[2].d, m);
    let root2 = d2;
    while (parent[root2] !== root2) root2 = parent[root2];
    const fits2 = root2 > 0;
    yield S(() => director.beat({
      title: fits2 ? '填最晚可用槽' : '截止前已满 · 放弃',
      why: fits2
        ? 'find(' + d2 + ') 命中空槽 ' + root2 + '；每个任务只占一格，并查集保证不重复占槽，也不会把任务排到截止之后。'
        : 'find(' + d2 + ') 回到 0，截止及更早的槽全部被占；' + sorted[2].id + ' 无法在截止前完成，直接放弃。',
      stateText: sorted[2].id + ' · 截止 ' + sorted[2].d + (fits2 ? ' · 空槽 ' + root2 : ' · 无空槽'),
      progress: 4,
      camera: SHOT_SLOTS,
      annotations: [{ id: 'fill', text: fits2 ? 'find → 槽 ' + root2 : '槽 0 = 无空位', anchor: () => new THREE.Vector3(fits2 ? slotX(root2) : 200, slotY() + 74, 0), offset: [0, -18], className: fits2 ? 'gold' : 'warn' }],
    }));
    yield W(250);
    yield* scheduleTask(sorted[2]);
    yield W(600);
  } else {
    yield S(() => director.beat({ title: '处理完毕', why: '任务数不足 3 个。', stateText: '已排 ' + scheduled.length, progress: 4, camera: SHOT_SLOTS, annotations: [] }));
    yield W(600);
  }

  director.chapter('低收益任务');
  if (sorted[3]) {
    let root4 = Math.min(sorted[3].d, m);
    while (parent[root4] !== root4) root4 = parent[root4];
    const fits = root4 > 0;
    yield S(() => director.beat({
      title: fits ? '低收益任务：仍有空槽' : '低收益任务：没有空槽就放弃',
      why: fits
        ? 'find(' + Math.min(sorted[3].d, m) + ') 仍有空槽 ' + root4 + '；任务只占一格，直接排入不会挤掉已排任务，也不会超过截止。'
        : '若 find 到 0，说明截止及更早的槽全部被占；此时替换已排任务只会降低总收益，贪心直接放弃。',
      stateText: sorted[3].id + ' · 截止 ' + sorted[3].d + (fits ? ' · 空槽 ' + root4 : ' · 无空槽'),
      progress: 5,
      camera: SHOT_SLOTS,
      annotations: [{ id: 'reject', text: fits ? 'find → 槽 ' + root4 : '槽 0 = 无空位', anchor: () => new THREE.Vector3(fits ? slotX(root4) : 200, slotY() + 74, 0), offset: [0, -18], className: fits ? 'gold' : 'warn' }],
    }));
    yield W(250);
    yield* scheduleTask(sorted[3]);
    yield W(600);
  } else {
    yield S(() => director.beat({ title: '没有更多任务', why: '所有任务已检查完。', stateText: '已排 ' + scheduled.length, progress: 5, camera: SHOT_SLOTS, annotations: [] }));
    yield W(600);
  }

  director.chapter('收尾');
  for (let k = 4; k < sorted.length; k++) {
    yield* scheduleTask(sorted[k]);
    yield W(300);
  }
  slotBoxes.forEach((b, i) => { if (scheduled.some((s) => s.slot === i + 1)) b.setColor(GREEN, GREEN); });
  resultText.setText('总收益 = ' + total, { color: '#fde047' });
  yield S(() => director.beat({
    title: '最大总收益 = ' + total,
    why: '按收益降序安排，每个任务都进入截止前最晚的空槽；没有两个任务共享槽位，也没有任务超过截止。',
    stateText: '已排 ' + scheduled.length + ' 个 · 总收益 ' + total,
    progress: 6,
    camera: SHOT_FINAL,
    annotations: [{ id: 'res', text: '总收益 ' + total, anchor: () => new THREE.Vector3(320, 178, 0), offset: [0, -20], className: 'final' }],
  }));
  status.textContent = '任务调度演示完成：' + TASKS.length + ' 个任务，排入 ' + scheduled.length +
    ' 个，总收益 ' + total + '（' + scheduled.map((s) => s.task.id + '→槽' + s.slot).join('，') + '） · O(n log n + n α(n))';
  yield W(1000);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: '贪心排序 + 并查集跳槽',
    why: '收益降序保证优先拿高价值任务，最晚空槽给截止更早的任务留出空间；并查集把寻找空槽从 O(n) 降到近似 O(α(n))。',
    stateText: 'O(n log n + n α(n)) · ' + TASKS.length + ' 个任务',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function parseTasks(text) {
  return text.split(/[;；,，]/).filter(Boolean).map((part) => {
    const mm = part.trim().match(/^(\d+)\s*[:@]\s*(\d+)$/);
    return mm ? { p: Number(mm[1]), d: Number(mm[2]) } : null;
  });
}

function applyInputs() {
  const raw = parseTasks(taskInput.value);
  if (raw.length < 3 || raw.length > 5 || raw.some((t) => !t || t.p < 1 || t.p > 999 || t.d < 1 || t.d > 5)) {
    status.textContent = '请输入 3–5 个任务，格式 25:1,40:3（收益 1–999，截止 1–5）';
    return;
  }
  TASKS = raw.map((t, i) => ({ id: 'ABCDE'[i], p: t.p, d: t.d }));
  taskInput.value = TASKS.map((t) => t.p + ':' + t.d).join(',');
  restart(true);
}

const preset = input.addSelect('预设', Object.keys(PRESETS), '经典 4 任务', (v) => {
  const list = PRESETS[v];
  if (!list) return;
  TASKS = list.map((t, i) => ({ id: 'ABCDE'[i], p: t.p, d: t.d }));
  taskInput.value = TASKS.map((t) => t.p + ':' + t.d).join(',');
  restart(true);
});
const taskInput = panel.addInput('任务 25:1,40:3,35:3,20:2', applyInputs, 90);
taskInput.value = TASKS.map((t) => t.p + ':' + t.d).join(',');

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  build();
  engine.queue(() => runTask());
  if (auto) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => { engine.clear(); director.reset(); build(); status.textContent = ''; });

build();
engine.queue(() => runTask());
scene.start(engine);
