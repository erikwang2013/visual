// AlgorithmLibrary/TimSort3D.js — TimSort：4 个 Run 色块 + 组内插入排序青色微光 + 归并碰撞波纹（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('TimSort3D');

const scene = new Scene3D('scene', { cameraPos: [0, 120, 720], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BASE = 0x60a5fa, CYAN = 0x22d3ee, WHITE = 0xf8fafc, OK = 0x4ade80;
const RUN_COLORS = [0x38bdf8, 0xfb923c, 0x4ade80, 0xf472b6];
const RUN_NAMES = ['青', '橙', '绿', '粉'];
const blend = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), 0.5).getHex();
const c01 = blend(RUN_COLORS[0], RUN_COLORS[1]);
const c23 = blend(RUN_COLORS[2], RUN_COLORS[3]);

const hint = new VText(scene, { text: 'TimSort：4 个 Run 色块 + 组内插入排序微光 + 归并碰撞波纹', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('就绪');

const N = 24, RUNLEN = 6, RUNS = 4;
const DATA = [12, 4, 18, 7, 21, 3, 9, 16, 2, 14, 20, 5, 11, 8, 19, 6, 13, 1, 17, 10, 24, 15, 22, 23];
const SP = 38, X0 = -(N - 1) * SP / 2, H = v => v * 5;
const slotX = i => X0 + i * SP;

const bars = [];
for (let i = 0; i < N; i++) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(26, 1, 20), glowMaterial(BASE, { emissive: BASE }));
  mesh.scale.y = DATA[i] * H(1);
  mesh.position.y = DATA[i] * H(1) / 2;
  g.add(mesh);
  const lbl = new VText(scene, { text: String(DATA[i]), x: 0, y: 0, z: 0, color: '#ffffff', scale: 0.5 });
  scene.remove(lbl.sprite); g.add(lbl.sprite);
  lbl.sprite.position.y = DATA[i] * H(1) + 16;
  g.position.x = slotX(i);
  scene.add(g);
  bars.push({ g, mesh, lbl, value: DATA[i] });
}
const setBarColor = (b, c) => { b.mesh.material.color.setHex(c); b.mesh.material.emissive.setHex(c); };
function setV(i, v) {
  bars[i].value = v;
  bars[i].mesh.scale.y = v * H(1);
  bars[i].mesh.position.y = v * H(1) / 2;
  bars[i].lbl.sprite.position.y = v * H(1) + 16;
  bars[i].lbl.setText(String(v));
}

// ---- Run 色块底座（半透明地板，覆盖 Run 范围） ----
const slabs = [];
for (let k = 0; k < RUNS; k++) {
  const slab = new THREE.Mesh(new THREE.BoxGeometry(216, 210, 8), new THREE.MeshBasicMaterial({ color: RUN_COLORS[k], transparent: true, opacity: 0.09 }));
  slab.position.set(0, 110, -12);
  slab.visible = false;
  scene.add(slab);
  slabs.push(slab);
}
const setSlab = (k, lo, hi, color) => {
  const s = slabs[k];
  s.visible = true;
  s.scale.x = ((hi - lo + 1) * SP - 10) / 216;
  s.position.x = slotX((lo + hi) / 2);
  if (color) s.material.color.setHex(color);
};
const hideSlabs = () => slabs.forEach(s => { s.visible = false; });

// ---- 归并碰撞波纹 ----
let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };
function* ripple(x, y, color, opts = {}) {
  const ms = opts.ms ?? 560, maxR = opts.maxR ?? 60;
  const ring = new THREE.Mesh(new THREE.RingGeometry(26, 30, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.position.set(x, y, -14);
  ring.rotation.x = -Math.PI / 2;
  fxGroup.add(ring);
  yield A(ms, p => {
    ring.scale.setScalar(1 + (maxR / 30 - 1) * p);
    ring.material.opacity = 0.8 * (1 - p);
  });
  fxGroup.remove(ring);
  ring.geometry.dispose(); ring.material.dispose();
}
function* dualRipple(x1, x2, color, ms = 560) {
  const mk = x => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(26, 30, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.position.set(x, -12, -14);
    ring.rotation.x = -Math.PI / 2;
    fxGroup.add(ring);
    return ring;
  };
  const r1 = mk(x1), r2 = mk(x2);
  yield A(ms, p => {
    r1.scale.setScalar(1 + p); r2.scale.setScalar(1 + p);
    r1.material.opacity = 0.8 * (1 - p); r2.material.opacity = 0.8 * (1 - p);
  });
  [r1, r2].forEach(r => { fxGroup.remove(r); r.geometry.dispose(); r.material.dispose(); });
}

// ---- Run 内插入排序（青色微光 = 提取待插入元素） ----
function* insertRun(lo, hi, runColor) {
  for (let i = lo + 1; i <= hi; i++) {
    const keyBar = bars[i];
    setBarColor(keyBar, CYAN);
    yield S(() => hint.setText('Run 内插入：a[' + i + ']=' + keyBar.value + ' 提取（青色微光）'));
    yield A(260, p => keyBar.g.position.y = 60 * p);
    let j = i - 1;
    while (j >= lo && bars[j].value > keyBar.value) {
      setBarColor(bars[j], WHITE);
      yield S(() => hint.setText('a[' + j + ']=' + bars[j].value + ' > ' + keyBar.value + '，右移一位'));
      yield W(160);
      const b = bars[j];
      yield A(240, p => b.g.position.x = slotX(j + 1) + (slotX(j) - slotX(j + 1)) * (1 - p));
      bars[j + 1] = b;
      setBarColor(b, runColor);
      j--;
    }
    bars[j + 1] = keyBar;
    yield A(260, p => keyBar.g.position.y = 60 * (1 - p));
    setBarColor(keyBar, runColor);
    yield W(90);
  }
  yield S(() => hint.setText('Run [' + lo + '..' + hi + '] 内部有序'));
  yield W(200);
}

// ---- 归并：元素落入临时区 → 碰撞波纹 → 弹回主行 ----
function* mergeGen(lo, mid, hi, cA, cB, cM) {
  const col = bars.slice();
  const picked = [];
  let li = lo, ri = mid + 1, k = lo;
  const pick = function* (src, kk) {
    const b = col[src];
    const x = b.g.position.x;
    yield S(() => hint.setText('取 a[' + src + ']=' + b.value + '，落入临时区 [' + kk + ']'));
    yield A(420, p => b.g.position.y = -150 * p + 90 * Math.sin(Math.PI * p));
    picked.push(src);
    if (kk === lo) yield* ripple(x, -160, cM, { ms: 300, maxR: 30 });
    yield W(70);
  };
  while (li <= mid && ri <= hi) {
    if (col[li].value <= col[ri].value) { yield* pick(li, k); li++; } else { yield* pick(ri, k); ri++; }
    k++;
  }
  while (li <= mid) { yield* pick(li, k); li++; k++; }
  while (ri <= hi) { yield* pick(ri, k); ri++; k++; }
  yield S(() => hint.setText('两 Run 相遇：碰撞波纹，临时区元素弹回主行'));
  yield* dualRipple(slotX(mid), slotX(mid + 1), cM);
  const col2 = bars.slice();
  picked.forEach((src, idx) => { bars[lo + idx] = col2[src]; });
  for (let idx = 0; idx < picked.length; idx++) {
    const b = bars[lo + idx];
    setBarColor(b, cM);
    yield S(() => hint.setText('弹回：' + b.value + ' → a[' + (lo + idx) + ']'));
    yield A(420, p => b.g.position.set(slotX(lo + idx), -150 + 150 * p + 60 * Math.sin(Math.PI * p), 0));
    yield W(70);
  }
}

function resetAll() {
  hideSlabs();
  clearFx();
  for (let i = 0; i < N; i++) {
    bars[i].g.position.set(slotX(i), 0, 0);
    bars[i].g.rotation.set(0, 0, 0);
    setV(i, bars[i].value);
    setBarColor(bars[i], BASE);
  }
}
function* doneMsg() {
  yield S(() => { hint.setText('TimSort 完成：Run 识别 + 插入排序 + 归并，最坏 O(n log n)'); status.textContent = 'TimSort 完成：O(n log n)'; bars.forEach(b => setBarColor(b, OK)); });
  yield W(700);
}

function* timSort() {
  yield S(resetAll);
  hint.setText('阶段 1：划分 4 个 Run（每段 6 个元素），Run 色块染色');
  yield W(400);
  for (let k = 0; k < RUNS; k++) {
    const lo = k * RUNLEN, hi = lo + RUNLEN - 1;
    yield S(() => setSlab(k, lo, hi));
    for (let i = lo; i <= hi; i++) setBarColor(bars[i], RUN_COLORS[k]);
    yield S(() => hint.setText('Run ' + (k + 1) + '：a[' + lo + '..' + hi + '] 染' + RUN_NAMES[k] + '色'));
    yield W(300);
  }
  yield S(() => { hint.setText('阶段 2：各 Run 内部插入排序（青色微光 = 提取待插入元素）'); status.textContent = 'Run 划分完成'; });
  yield W(450);
  for (let k = 0; k < RUNS; k++) yield* insertRun(k * RUNLEN, k * RUNLEN + RUNLEN - 1, RUN_COLORS[k]);
  yield S(() => { hint.setText('阶段 3：相邻 Run 归并（碰撞波纹 = 两列表相遇）'); status.textContent = 'Run 内有序'; });
  yield W(450);
  yield* mergeGen(0, 5, 11, RUN_COLORS[0], RUN_COLORS[1], c01);
  yield S(() => { setSlab(0, 0, 11, c01); slabs[1].visible = false; });
  yield W(300);
  yield* mergeGen(12, 17, 23, RUN_COLORS[2], RUN_COLORS[3], c23);
  yield S(() => { setSlab(2, 12, 23, c23); slabs[3].visible = false; });
  yield W(300);
  yield* mergeGen(0, 11, 23, c01, c23, OK);
  yield S(() => hideSlabs());
  yield* doneMsg();
}

function* randomizeGen() {
  yield S(resetAll);
  hint.setText('随机打乱数组');
  const a = bars.map(b => b.value);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  for (let i = 0; i < N; i++) {
    setV(i, a[i]);
    yield W(60);
  }
  yield S(() => hint.setText('已随机化，可点击「运行演示」'));
}

panel.addButton('随机化', () => engine.start(randomizeGen()));
panel.addButton('运行演示', () => engine.start(timSort()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；色块 = Run 范围，波纹 = 归并碰撞）');

scene.start(engine);
