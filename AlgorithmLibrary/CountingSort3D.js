// AlgorithmLibrary/CountingSort3D.js — 计数排序：半透明圆柱计数桶 + 小球飞入 + 桶高增长 + 按序弹出（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('CountingSort3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BASE = 0x60a5fa, GOLD = 0xfcd34d, OK = 0x4ade80, CYAN = 0x22d3ee;
const status = panel.addStatus('就绪');

const VALUES = 5, N = 16;
const SP = 46, X0 = 5;
const slotX = i => X0 + i * SP;
const BX = b => 50 + b * 150;

const spheres = [];
for (let i = 0; i < N; i++) {
  const v = 1 + Math.floor(Math.random() * VALUES);
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.SphereGeometry(15, 20, 20), glowMaterial(BASE, { emissive: BASE }));
  g.add(s);
  const lbl = new VText(scene, { text: String(v), x: 0, y: 0, z: 0, color: '#ffffff', scale: 0.6 });
  scene.remove(lbl.sprite); g.add(lbl.sprite);
  g.position.set(slotX(i), 320, 0);
  scene.add(g);
  spheres.push({ g, s, lbl, value: v });
}
const setSphColor = (p, c) => { p.s.material.color.setHex(c); p.s.material.emissive.setHex(c); };

const buckets = [];
for (let b = 0; b < VALUES; b++) {
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 230, 24), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.14 }));
  cyl.position.set(BX(b), 395, -50);
  scene.add(cyl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(40, 2.6, 8, 40), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.7 }));
  rim.position.set(BX(b), 510, -50);
  rim.rotation.x = Math.PI / 2;
  scene.add(rim);
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(37, 37, 1, 24), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.75 }));
  fill.position.set(BX(b), 280.5, -50);
  scene.add(fill);
  const lbl = new VText(scene, { text: '0', x: BX(b), y: 228, z: -50, color: PALETTE.textDim, scale: 0.7 });
  buckets.push({ b, fill, lbl, stack: [], count: 0 });
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
function setFill(b, h) {
  b.fill.scale.y = Math.max(h, 0.01);
  b.fill.position.y = 280 + h / 2;
}

function resetAll() {
  for (let i = 0; i < N; i++) {
    const p = spheres[i];
    p.g.position.set(slotX(i), 320, 0);
    p.g.rotation.set(0, 0, 0);
    setSphColor(p, BASE);
  }
  buckets.forEach(b => { b.stack = []; b.count = 0; setFill(b, 0); b.lbl.setText('0'); });
}
function* doneMsg() {
  yield S(() => { status.textContent = '计数排序演示完成：16 个数据（值域 1..5）统计出现次数后按序输出；O(n + k)，稳定排序'; spheres.forEach(p => setSphColor(p, OK)); });
  yield W(700);
}

function* countingSort() {
  resetAll();
  yield S(() => status.textContent = '计数排序：16 个数据（值域 1..5）统计各值出现次数，再按序输出');
  yield W(400);
  yield S(() => status.textContent = '阶段 1：统计各值出现次数（球飞入对应计数桶，桶高增长）');
  yield W(400);
  for (let i = 0; i < N; i++) {
    const p = spheres[i];
    const b = buckets[p.value - 1];
    setSphColor(p, GOLD);
    yield S(() => status.textContent = 'a[' + i + ']=' + p.value + ' 飞入计数桶 ' + p.value + '（第 ' + (b.count + 1) + ' 个）');
    yield* fly(p, { x: p.g.position.x, y: p.g.position.y, z: p.g.position.z }, { x: BX(b.b), y: 308 + b.count * 30, z: -50 }, { lift: 95 });
    b.stack.push(p);
    b.count++;
    yield A(280, p2 => setFill(b, (b.count - 1 + p2) * 30));
    yield S(() => b.lbl.setText(String(b.count)));
    yield W(110);
  }
  yield S(() => status.textContent = '统计完成：桶 ' + buckets.map((b, k) => (k + 1) + ':' + b.count).join(' '));
  yield W(450);
  yield S(() => status.textContent = '阶段 2：按序弹出（从小到大），飞入输出行');
  yield W(400);
  let outIdx = 0;
  for (let b = 0; b < VALUES; b++) {
    while (buckets[b].stack.length) {
      const p = buckets[b].stack.pop();
      const c = buckets[b].count--;
      yield S(() => status.textContent = '桶 ' + (b + 1) + ' 弹出 ' + p.value + ' → 输出 [' + outIdx + ']');
      yield A(260, p2 => setFill(buckets[b], (c - 1 + (1 - p2)) * 30));
      yield S(() => buckets[b].lbl.setText(String(c - 1)));
      yield* fly(p, { x: p.g.position.x, y: p.g.position.y, z: p.g.position.z }, { x: slotX(outIdx), y: 95, z: 0 }, { lift: 55, ms: 380 });
      setSphColor(p, OK);
      outIdx++;
      yield W(90);
    }
  }
  yield* doneMsg();
}

function* randomizeGen() {
  resetAll();
  yield S(() => status.textContent = '随机打乱数组');
  for (let i = 0; i < N; i++) {
    const v = 1 + Math.floor(Math.random() * VALUES);
    spheres[i].value = v;
    spheres[i].lbl.setText(String(v));
    yield W(60);
  }
  yield S(() => status.textContent = '已随机化，可点击「▶ 演示」');
  yield W(300);
}

panel.addButton('随机化', () => engine.start(randomizeGen()));
engine.queue(() => countingSort());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
