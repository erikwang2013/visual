// AlgorithmLibrary/BucketSort3D.js — 桶排序：悬浮半透明桶 + 小球飞入桶内自动排队 + 桶内插入排序 + 按序倒出（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('BucketSort3D');

const scene = new Scene3D('scene', { cameraPos: [260, 500, 900], lookAt: [260, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BASE = 0x60a5fa, GOLD = 0xfcd34d, OK = 0x4ade80, CYAN = 0x22d3ee, RED = 0xef4444, WHITE = 0xf8fafc;

const hint = new VText(scene, { text: '桶排序：球按值域飞入悬浮桶（桶内自动排队），桶内插入排序，再按序倒出', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');

const N = 16, BUCKETS = 5, MAXV = 20;
const SP = 44, X0 = 35;
const slotX = i => X0 + i * SP;
const BX = b => -224 + b * 112 + 310;
const bucketOf = v => Math.floor((v - 1) / (MAXV / BUCKETS));

const spheres = [];
for (let i = 0; i < N; i++) {
  const v = 1 + Math.floor(Math.random() * MAXV);
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.SphereGeometry(15, 20, 20), glowMaterial(BASE, { emissive: BASE }));
  g.add(s);
  const lbl = new VText(scene, { text: String(v), x: 0, y: 0, z: 0, color: '#ffffff', scale: 0.6 });
  scene.remove(lbl.sprite); g.add(lbl.sprite);
  g.position.set(slotX(i), 250, 0);
  scene.add(g);
  spheres.push({ g, s, lbl, value: v });
}
const setSphColor = (p, c) => { p.s.material.color.setHex(c); p.s.material.emissive.setHex(c); };

const buckets = [];
for (let b = 0; b < BUCKETS; b++) {
  const lo = b * 4 + 1, hi = Math.min((b + 1) * 4, MAXV);
  const box = new THREE.Mesh(new THREE.BoxGeometry(104, 215, 104), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.13 }));
  box.position.set(BX(b), 380, -10);
  scene.add(box);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(106, 5, 106), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.6 }));
  lid.position.set(BX(b), 490, -10);
  scene.add(lid);
  new VText(scene, { text: '桶 ' + (b + 1) + '：' + lo + '..' + hi, x: BX(b), y: 202, z: -10, color: PALETTE.textDim, scale: 0.6 });
  buckets.push({ b, box, stack: [] });
}

function* fly(sph, from, to, opts = {}) {
  const lift = opts.lift ?? 70, ms = opts.ms ?? 420;
  yield A(ms, p => {
    sph.g.position.set(
      from.x + (to.x - from.x) * p,
      from.y + (to.y - from.y) * p + lift * Math.sin(Math.PI * p),
      from.z + (to.z - from.z) * p);
  });
}
function resetAll() {
  for (let i = 0; i < N; i++) {
    const p = spheres[i];
    p.g.position.set(slotX(i), 250, 0);
    p.g.rotation.set(0, 0, 0);
    setSphColor(p, BASE);
  }
  buckets.forEach(b => { b.stack = []; });
}
function* doneMsg() {
  yield S(() => { hint.setText('桶排序完成：数据均匀时 O(n)，桶内用插入排序'); status.textContent = '桶排序完成：O(n) 期望'; spheres.forEach(p => setSphColor(p, OK)); });
  yield W(700);
}

// 桶内相邻交换（排队调整）
function* swapInBucket(b, aIdx, bIdx) {
  const pa = b.stack[aIdx], pb = b.stack[bIdx];
  const ya = pa.g.position.y, yb = pb.g.position.y;
  yield A(340, p => {
    pa.g.position.y = ya + (yb - ya) * p + 45 * Math.sin(Math.PI * p);
    pb.g.position.y = yb + (ya - yb) * p + 45 * Math.sin(Math.PI * p);
  });
  b.stack[aIdx] = pb; b.stack[bIdx] = pa;
}

// 桶内插入排序（自动排队后整理）
function* sortBucket(b) {
  if (b.stack.length < 2) return;
  for (let i = 1; i < b.stack.length; i++) {
    const key = b.stack[i];
    setSphColor(key, RED);
    yield A(220, p => { key.g.position.y += 38 * p; });
    let j = i - 1;
    while (j >= 0 && b.stack[j].value > key.value) {
      setSphColor(b.stack[j], WHITE);
      yield S(() => hint.setText('桶 ' + (b.b + 1) + ' 内排序：' + b.stack[j].value + ' > ' + key.value + '，后移'));
      yield W(170);
      yield* swapInBucket(b, j, j + 1);
      setSphColor(b.stack[j + 1], BASE);
      j--;
    }
    b.stack[j + 1] = key;
    yield A(220, p => { key.g.position.y -= 38 * p; });
    setSphColor(key, BASE);
    yield W(90);
  }
}

function* bucketSort() {
  yield S(resetAll);
  hint.setText('阶段 1：按值域分桶（球飞入悬浮桶，桶内自动排队）');
  yield W(400);
  for (let i = 0; i < N; i++) {
    const p = spheres[i];
    const b = buckets[bucketOf(p.value)];
    setSphColor(p, GOLD);
    yield S(() => hint.setText('a[' + i + ']=' + p.value + ' → 桶 ' + (b.b + 1) + '（第 ' + (b.stack.length + 1) + ' 个）'));
    yield* fly(p, { x: p.g.position.x, y: p.g.position.y, z: p.g.position.z }, { x: BX(b.b), y: 275 + b.stack.length * 30, z: -10 }, { lift: 95 });
    b.stack.push(p);
    yield W(110);
  }
  yield S(() => { hint.setText('分桶完成：' + buckets.map((b, k) => (k + 1) + ':' + b.stack.length + '个').join(' ')); status.textContent = '分桶完成'; });
  yield W(450);
  hint.setText('阶段 2：桶内插入排序（红=待插入，白=比较）');
  yield W(350);
  for (const b of buckets) yield* sortBucket(b);
  yield S(() => { hint.setText('桶内全部有序'); status.textContent = '桶内排序完成'; });
  yield W(400);
  hint.setText('阶段 3：按序倒出（桶 1 → 5）');
  yield W(350);
  let outIdx = 0;
  for (const b of buckets) {
    while (b.stack.length) {
      const p = b.stack.shift();
      yield S(() => hint.setText('倒出 ' + p.value + ' → 输出 [' + outIdx + ']'));
      yield* fly(p, { x: p.g.position.x, y: p.g.position.y, z: p.g.position.z }, { x: slotX(outIdx), y: 90, z: 0 }, { lift: 55, ms: 380 });
      setSphColor(p, OK);
      outIdx++;
      yield W(90);
    }
  }
  yield* doneMsg();
}

function* randomizeGen() {
  yield S(resetAll);
  hint.setText('随机打乱数组');
  for (let i = 0; i < N; i++) {
    const v = 1 + Math.floor(Math.random() * MAXV);
    spheres[i].value = v;
    spheres[i].lbl.setText(String(v));
    yield W(60);
  }
  yield S(() => hint.setText('已随机化，可点击「▶ 演示」'));
}

panel.addButton('随机化', () => engine.start(randomizeGen()));
engine.queue(() => bucketSort());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；5 个悬浮桶按值域均分 1..20）');

scene.start(engine);
