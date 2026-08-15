// AlgorithmLibrary/Fenwick3D.js — 树状数组 BIT：lowbit 连线 + 点更新自底向上累加 + 前缀查询自右向左累加（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('Fenwick3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, WHITE = 0xffffff, GOLD = 0xfcd34d, RED = 0xfb7185;
const status = panel.addStatus('就绪');

const N = 12;
const lowbit = i => i & -i;
const DEFAULT_ARR = [5, 3, 8, 1, 9, 4, 7, 2, 6, 3, 9, 5];  // arrVals[i-1] 对应下标 i
const ARR = DEFAULT_ARR.slice();
const bitVals = new Array(N + 1).fill(0);
const BAR_Y = 600, BOX_Y = 430;
function rebuildModel() {
  bitVals.fill(0);
  for (let i = 1; i <= N; i++) {
    let j = i;
    while (j <= N) { bitVals[j] += ARR[i - 1]; j += lowbit(j); }
  }
}

// ---- 模块级预建全部演示体：柱状 arr + BIT 盒子 + lowbit 连线 ----
const bars = [];   // i(0..N-1) -> { mesh, lbl }
const boxes = [];  // i(1..N) -> { mesh, lbl, idxLbl }
const edges = new Map();  // 'i-j' -> tube
function boxX(i) { const half = (N - 1) / 2; return 320 + (i - 1 - half) * 48; }
function barPos(i) { const half = (N - 1) / 2; return new THREE.Vector3(320 + (i - half) * 48, 0, 0); }
function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.45 }));
  scene.add(m);
  return m;
}
rebuildModel();
for (let i = 0; i < N; i++) {
  const v = ARR[i];
  const h = v * 6;
  const p = barPos(i);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(34, 60, 10), glowMaterial(BLUE, { emissive: BLUE }));
  mesh.position.set(p.x, BAR_Y + h / 2, -40);
  mesh.scale.set(0.01, 0.01, 0.01);
  const lbl = new VText(scene, { text: String(v), x: p.x, y: BAR_Y + 16 + h, z: -40, color: '#ffffff', scale: 0.6 });
  scene.add(mesh);
  bars.push({ mesh, lbl });
}
for (let i = 1; i <= N; i++) {
  const x = boxX(i);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(46, 46, 30), glowMaterial(WHITE, { emissive: WHITE }));
  mesh.position.set(x, BOX_Y, 0);
  mesh.scale.setScalar(0.01);
  const lbl = new VText(scene, { text: String(bitVals[i]), x, y: BOX_Y + 18, z: 18, color: '#ffffff', scale: 0.62 });
  const idxLbl = new VText(scene, { text: String(i), x, y: BOX_Y - 42, z: 0, color: PALETTE.textDim, scale: 0.55 });
  scene.add(mesh);
  boxes.push({ mesh, lbl, idxLbl });
}
for (let i = 1; i <= N; i++) {
  const j = i + lowbit(i);
  if (j <= N) edges.set(i + '-' + j, tube(new THREE.Vector3(boxX(i), BOX_Y, 0), new THREE.Vector3(boxX(j), BOX_Y, 0)));
}

function clearView() {
  bars.forEach((o, i) => {
    const h = ARR[i] * 6;
    o.mesh.scale.set(0.01, 0.01, 0.01);
    o.mesh.position.y = BAR_Y + h / 2;
    o.mesh.material.color.setHex(BLUE); o.mesh.material.emissive.setHex(BLUE);
    o.lbl.setText(String(ARR[i]));
    o.lbl.sprite.position.y = BAR_Y + 16 + h;
  });
  boxes.forEach((o, i) => {
    o.mesh.scale.setScalar(0.01);
    o.mesh.material.color.setHex(WHITE); o.mesh.material.emissive.setHex(WHITE);
    o.lbl.setText(String(bitVals[i + 1]));
  });
  edges.forEach(m => { m.material.color.setHex(WHITE); m.material.opacity = 0.45; });
}
function resetBoxColors() {
  boxes.forEach(o => { o.mesh.material.color.setHex(WHITE); o.mesh.material.emissive.setHex(WHITE); });
}
function* pulse(i, c) {
  const o = boxes[i - 1];
  const base = o.mesh.position.y;
  yield A(260, p => { o.mesh.position.y = base + 14 * Math.sin(p * Math.PI); o.mesh.material.color.setHex(c); o.mesh.material.emissive.setHex(c); });
  o.mesh.position.y = base;
}

// ---- 建树：生长进场 → 逐个 i 沿 lowbit 链累加 ----
function* buildGen() {
  yield S(() => { status.textContent = '建树：上方柱状数组 arr[1..12]，下方 BIT 盒子 + lowbit 连线'; });
  yield W(300);
  const barTy = bars.map((o, i) => (ARR[i] * 6) / 60);
  yield A(420, p => {
    const e = p * p * (3 - 2 * p);
    bars.forEach((o, i) => o.mesh.scale.set(0.01 + 0.99 * e, 0.01 + 0.99 * barTy[i] * e, 0.01 + 0.99 * e));
    boxes.forEach(o => o.mesh.scale.setScalar(0.01 + 0.99 * e));
  });
  yield W(300);
  for (let i = 1; i <= N; i++) {
    const chain = [];
    let j = i;
    while (j <= N) { chain.push(j); j += lowbit(j); }
    bars[i - 1].mesh.material.color.setHex(GOLD); bars[i - 1].mesh.material.emissive.setHex(GOLD);
    yield S(() => { status.textContent = 'arr[' + i + '] = ' + ARR[i - 1] + ' 沿 lowbit 链累加：' + chain.join(' → '); });
    yield W(420);
    for (const k of chain) {
      boxes[k - 1].mesh.material.color.setHex(GOLD); boxes[k - 1].mesh.material.emissive.setHex(GOLD);
      boxes[k - 1].lbl.setText(String(bitVals[k]));
      yield* pulse(k, GOLD);
      yield W(220);
    }
    bars[i - 1].mesh.material.color.setHex(BLUE); bars[i - 1].mesh.material.emissive.setHex(BLUE);
    resetBoxColors();
  }
  yield S(() => { status.textContent = '建树完成：bit[i] = arr[i-lowbit(i)+1 .. i] 之和'; });
  yield W(400);
}

// ---- 点更新：arr[idx] += delta，自底向上逐层累加 ----
function* updateGen(idx, delta) {
  yield S(() => { status.textContent = '点更新：arr[' + idx + '] ' + ARR[idx - 1] + ' + ' + delta + '（柱红闪）'; });
  ARR[idx - 1] += delta;
  const bar = bars[idx - 1];
  const oldH = bar.mesh.scale.y, newH = (ARR[idx - 1] * 6) / 60;
  const oldY = bar.mesh.position.y, newY = BAR_Y + (ARR[idx - 1] * 6) / 2;
  bar.mesh.material.color.setHex(RED); bar.mesh.material.emissive.setHex(RED);
  yield A(360, p => {
    const e = p * p * (3 - 2 * p);
    bar.mesh.scale.y = oldH + (newH - oldH) * e;
    bar.mesh.position.y = oldY + (newY - oldY) * e;
  });
  bar.lbl.setText(String(ARR[idx - 1]));
  bar.lbl.sprite.position.y = BAR_Y + 16 + ARR[idx - 1] * 6;
  bar.mesh.material.color.setHex(BLUE); bar.mesh.material.emissive.setHex(BLUE);
  yield W(300);
  let j = idx;
  while (j <= N) {
    boxes[j - 1].mesh.material.color.setHex(GOLD); boxes[j - 1].mesh.material.emissive.setHex(GOLD);
    bitVals[j] += delta;
    boxes[j - 1].lbl.setText(String(bitVals[j]));
    const e = edges.get(j + '-' + (j + lowbit(j)));
    if (e) { e.material.color.setHex(GOLD); e.material.opacity = 0.95; }
    yield S(() => { status.textContent = '更新 bit[' + j + '] += ' + delta + '（金色脉冲，沿 lowbit 上跳）'; });
    yield* pulse(j, GOLD);
    yield W(350);
    if (e) { e.material.color.setHex(WHITE); e.material.opacity = 0.45; }
    j += lowbit(j);
  }
  resetBoxColors();
  yield S(() => {
    let t = idx; const s = [];
    while (t <= N) { s.push(t); t += lowbit(t); }
    status.textContent = '点更新完成：受影响链 ' + s.join(' → ');
  });
  yield W(450);
}

// ---- 前缀查询：自右向左逐段累加 ----
function* queryGen(idx) {
  let sum = 0;
  const chain = [];
  let j = idx;
  while (j > 0) { chain.push(j); j -= lowbit(j); }
  yield S(() => { status.textContent = '前缀查询 sum(1..' + idx + ')：自右向左 ' + chain.join(' → '); });
  yield W(450);
  for (const k of chain) {
    sum += bitVals[k];
    boxes[k - 1].mesh.material.color.setHex(GOLD); boxes[k - 1].mesh.material.emissive.setHex(GOLD);
    yield S(() => { status.textContent = '累加 bit[' + k + '] = ' + bitVals[k] + ' → 前缀和 sum(1..' + idx + ') = ' + sum; });
    yield* pulse(k, GOLD);
    yield W(400);
  }
  resetBoxColors();
  yield S(() => { status.textContent = '查询完成：sum(1..' + idx + ') = ' + sum; });
  yield W(500);
}

function* runFenwick() {
  ARR.splice(0, ARR.length, ...DEFAULT_ARR);
  rebuildModel();
  clearView();
  yield W(300);
  yield* buildGen();
  yield* queryGen(6);
  yield* updateGen(3, 2);
  yield* queryGen(6);
  yield S(() => { status.textContent = 'BIT 演示完成：建树 12 节点，sum(1..6)=30，arr[3]+=2 后 sum(1..6)=32'; });
  yield W(400);
}

engine.queue(() => runFenwick());
panel.addButton('清空', () => { engine.clear(); ARR.splice(0, ARR.length, ...DEFAULT_ARR); rebuildModel(); clearView(); status.textContent = ''; });

scene.start(engine);
