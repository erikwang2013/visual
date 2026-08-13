// AlgorithmLibrary/Fenwick3D.js — 树状数组 BIT：lowbit 连线 + 点更新自底向上累加 + 前缀查询自右向左累加（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('Fenwick3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, WHITE = 0xffffff, GOLD = 0xfcd34d, RED = 0xfb7185;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：建 BIT → 前缀查询 → 更新', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
const result = new VText(scene, { text: '前缀和: —', x: 320, y: 555, z: 0, color: PALETTE.yellow, scale: 0.72, wrapChars: 7 });

const N = 12;
const lowbit = i => i & -i;
const ARR = [5, 3, 8, 1, 9, 4, 7, 2, 6, 3, 9, 5];  // arrVals[i-1] 对应下标 i
const bitVals = new Array(N + 1).fill(0);

const bars = [];   // i(0..N-1) -> { mesh, lbl }
const boxes = [];  // i(1..N) -> { mesh, lbl }
const edges = new Map();  // 'i-j' -> tube
function boxX(i) { const half = (N - 1) / 2; return 340 + (i - 1 - half) * 48; }
function barPos(i) { const half = (N - 1) / 2; return new THREE.Vector3(340 + (i - half) * 48, 0, 0); }

function rebuildModel() {
  bitVals.fill(0);
  for (let i = 1; i <= N; i++) {
    let j = i;
    while (j <= N) { bitVals[j] += ARR[i - 1]; j += lowbit(j); }
  }
}
function clearView() {
  bars.forEach(o => { scene.remove(o.mesh); scene.remove(o.lbl.sprite); });
  boxes.forEach(o => { scene.remove(o.mesh); scene.remove(o.lbl.sprite); scene.remove(o.idxLbl.sprite); });
  edges.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  bars.length = 0; boxes.length = 0; edges.clear();
}
function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.45 }));
  scene.add(m);
  return m;
}

// ---- 建树：放置结构 → 逐个 i 沿 lowbit 链累加 ----
function* buildGen() {
  yield S(() => outT.setText('建树：上方柱状数组 arr[1..12]，下方 BIT 盒子 + lowbit 连线'));
  const todo = [];
  for (let i = 0; i < N; i++) {
    const v = ARR[i];
    const h = v * 6;
    const p = barPos(i);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(34, 60, 10), glowMaterial(BLUE, { emissive: BLUE }));
    mesh.scale.y = h / 60;
    mesh.position.set(p.x, 240 + h / 2, -40);
    mesh.scale.setScalar(0.01);
    const lbl = new VText(scene, { text: String(v), x: p.x, y: 256 + h, z: -40, color: '#ffffff', scale: 0.6 });
    scene.add(mesh);
    bars.push({ mesh, lbl });
    todo.push({ mesh, sx: 1, sy: h / 60, sz: 1 });
  }
  for (let i = 1; i <= N; i++) {
    const x = boxX(i);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(46, 46, 30), glowMaterial(WHITE, { emissive: WHITE }));
    mesh.position.set(x, 380, 0);
    mesh.scale.setScalar(0.01);
    const lbl = new VText(scene, { text: String(bitVals[i]), x, y: 380, z: 18, color: '#ffffff', scale: 0.62 });
    const idxLbl = new VText(scene, { text: String(i), x, y: 338, z: 0, color: PALETTE.textDim, scale: 0.55 });
    scene.add(mesh);
    boxes.push({ mesh, lbl, idxLbl });
    todo.push({ mesh, sx: 1, sy: 1, sz: 1 });
  }
  yield A(420, p => todo.forEach(t => t.mesh.scale.setScalar(0.01 + 0.99 * p)));
  for (let i = 1; i <= N; i++) {
    const j = i + lowbit(i);
    if (j <= N) edges.set(i + '-' + j, tube(new THREE.Vector3(boxX(i), 380, 0), new THREE.Vector3(boxX(j), 380, 0)));
  }
  yield W(300);
  for (let i = 1; i <= N; i++) {
    const chain = [];
    let j = i;
    while (j <= N) { chain.push(j); j += lowbit(j); }
    bars[i - 1].mesh.material.color.setHex(GOLD); bars[i - 1].mesh.material.emissive.setHex(GOLD);
    yield S(() => outT.setText('arr[' + i + '] = ' + ARR[i - 1] + ' 沿 lowbit 链累加：' + chain.join(' → ')));
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
  yield S(() => {
    outT.setText('建树完成：bit[i] = arr[i-lowbit(i)+1 .. i] 之和');
    status.textContent = 'BIT 构建完成：12 个盒子 + 8 条 lowbit 连线';
  });
  yield W(400);
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

// ---- 点更新：arr[idx] += delta，自底向上逐层累加 ----
function* updateGen(idx, delta) {
  yield S(() => outT.setText('点更新：arr[' + idx + '] ' + ARR[idx - 1] + ' + ' + delta + '（柱红闪）'));
  ARR[idx - 1] += delta;
  const bar = bars[idx - 1];
  const oldH = bar.mesh.scale.y, newH = (ARR[idx - 1] * 6) / 60;
  const oldY = bar.mesh.position.y, newY = 240 + (ARR[idx - 1] * 6) / 2;
  bar.mesh.material.color.setHex(RED); bar.mesh.material.emissive.setHex(RED);
  yield A(360, p => {
    bar.mesh.scale.y = oldH + (newH - oldH) * p;
    bar.mesh.position.y = oldY + (newY - oldY) * p;
  });
  bar.lbl.setText(String(ARR[idx - 1]));
  bar.lbl.sprite.position.y = 256 + ARR[idx - 1] * 6;
  bar.mesh.material.color.setHex(BLUE); bar.mesh.material.emissive.setHex(BLUE);
  yield W(300);
  let j = idx;
  while (j <= N) {
    boxes[j - 1].mesh.material.color.setHex(GOLD); boxes[j - 1].mesh.material.emissive.setHex(GOLD);
    bitVals[j] += delta;
    boxes[j - 1].lbl.setText(String(bitVals[j]));
    const e = edges.get(j + '-' + (j + lowbit(j)));
    if (e) { e.material.color.setHex(GOLD); e.material.opacity = 0.95; }
    yield S(() => outT.setText('更新 bit[' + j + '] += ' + delta + '（金色脉冲，沿 lowbit 上跳）'));
    yield* pulse(j, GOLD);
    yield W(350);
    if (e) { e.material.color.setHex(WHITE); e.material.opacity = 0.45; }
    j += lowbit(j);
  }
  resetBoxColors();
  yield S(() => {
    let j = idx, s = [];
    while (j <= N) { s.push(j); j += lowbit(j); }
    outT.setText('点更新完成：受影响链 ' + s.join(' → '));
  });
  yield W(450);
}

// ---- 前缀查询：自右向左逐段累加 ----
function* queryGen(idx) {
  let sum = 0;
  const chain = [];
  let j = idx;
  while (j > 0) { chain.push(j); j -= lowbit(j); }
  yield S(() => outT.setText('前缀查询 sum(1..' + idx + ')：自右向左 ' + chain.join(' → ')));
  yield W(450);
  for (const k of chain) {
    sum += bitVals[k];
    boxes[k - 1].mesh.material.color.setHex(GOLD); boxes[k - 1].mesh.material.emissive.setHex(GOLD);
    yield S(() => result.setText('前缀和 sum(1..' + idx + ') = ' + sum));
    yield* pulse(k, GOLD);
    yield S(() => outT.setText('累加 bit[' + k + '] = ' + bitVals[k] + '，当前和 ' + sum));
    yield W(400);
  }
  resetBoxColors();
  yield S(() => {
    outT.setText('查询完成：sum(1..' + idx + ') = ' + sum);
    status.textContent = '前缀和 sum(1..' + idx + ') = ' + sum;
  });
  yield W(500);
}

function* runFenwick() {
  clearView();
  ARR.splice(0, ARR.length, 5, 3, 8, 1, 9, 4, 7, 2, 6, 3, 9, 5);
  rebuildModel();
  hint.setText('树状数组 BIT：bit[i] 覆盖 arr[i-lowbit(i)+1..i]，i 与 i+lowbit(i) 连线');
  result.setText('前缀和: —');
  yield W(300);
  yield* buildGen();
  yield* queryGen(6);
  yield* updateGen(3, 2);
  yield* queryGen(6);
  yield S(() => {
    outT.setText('');
    hint.setText('BIT 完成：更新/查询均 O(log n)，lowbit 决定跳转步长');
    status.textContent = 'BIT 演示完成：建树 12 节点，sum(1..6)=30，arr[3]+=2 后 sum(1..6)=32';
  });
}

engine.queue(() => runFenwick());
panel.addButton('清空', () => { engine.clear(); clearView(); ARR.splice(0, ARR.length, 5, 3, 8, 1, 9, 4, 7, 2, 6, 3, 9, 5); rebuildModel(); result.setText('前缀和: —'); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 累加链，红 = 更新点，连线 = lowbit 关系）');

scene.start(engine);
