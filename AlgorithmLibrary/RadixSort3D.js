// AlgorithmLibrary/RadixSort3D.js — 基数排序（LSD）：10 桶 + 数字环按位旋转 90° + 收集重连成链（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('RadixSort3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BASE = 0x60a5fa, GOLD = 0xfcd34d, OK = 0x4ade80, CYAN = 0x22d3ee;
const status = panel.addStatus('就绪');

const DATA = [170, 45, 75, 90, 802, 24, 2, 66, 745, 91, 351, 488, 611, 223, 990];
const N = DATA.length;
const SP = 46, X0 = 78;
const slotX = i => X0 + i * SP;
const BX = d => 67 + d * 74;
const digitOf = (v, pass) => Math.floor(v / (10 ** pass)) % 10;
const NAMES = ['个位', '十位', '百位'];

const spheres = [];
for (let i = 0; i < N; i++) {
  const v = DATA[i];
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.SphereGeometry(16, 20, 20), glowMaterial(BASE, { emissive: BASE }));
  g.add(s);
  const lbl = new VText(scene, { text: String(v), x: 0, y: 0, z: 0, color: '#ffffff', scale: 0.55 });
  scene.remove(lbl.sprite); g.add(lbl.sprite);
  const ring = new THREE.Group();
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(21, 1.8, 8, 32), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.85 })));
  const mark = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 8), new THREE.MeshBasicMaterial({ color: GOLD }));
  mark.position.x = 21;
  ring.add(mark);
  const dLbl = new VText(scene, { text: '?', x: 0, y: 37, z: 0, color: '#fcd34d', scale: 0.5 });
  scene.remove(dLbl.sprite); g.add(dLbl.sprite);
  g.add(ring);
  g.position.set(slotX(i), 320, 0);
  scene.add(g);
  spheres.push({ g, s, lbl, dLbl, ring, value: v });
}
const setSphColor = (p, c) => { p.s.material.color.setHex(c); p.s.material.emissive.setHex(c); };

const buckets = [];
for (let d = 0; d < 10; d++) {
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 240, 20), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.13 }));
  cyl.position.set(BX(d), 400, -50);
  scene.add(cyl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(34, 2.2, 8, 28), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.7 }));
  rim.position.set(BX(d), 520, -50);
  rim.rotation.x = Math.PI / 2;
  scene.add(rim);
  new VText(scene, { text: String(d), x: BX(d), y: 224, z: -50, color: PALETTE.textDim, scale: 0.7 });
}

// ---- 金链对象池：N-1 根直管，模块级预建，运行期仅更新曲线/再生几何 ----
const chainPool = [];
for (let i = 0; i < N - 1; i++) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 2, 1.8, 6, false), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0 }));
  m.visible = false;
  scene.add(m);
  chainPool.push({ m, curve });
}
function* fadeChains() {
  yield A(260, p => chainPool.forEach(c => { c.m.material.opacity = 0.4 * (1 - p); }));
  chainPool.forEach(c => { c.m.visible = false; });
}
function* linkChain() {
  for (let i = 0; i < N - 1; i++) {
    const a = spheres[i].g.position, b = spheres[i + 1].g.position;
    const c = chainPool[i];
    c.curve.points[0].copy(a);
    c.curve.points[1].copy(b);
    c.m.geometry.dispose();
    c.m.geometry = new THREE.TubeGeometry(c.curve, 2, 1.8, 6, false);
    c.m.visible = true;
  }
  yield A(400, p => chainPool.forEach(c => { c.m.material.opacity = 0.4 * p; }));
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
  chainPool.forEach(c => { c.m.visible = false; c.m.material.opacity = 0; });
  for (let i = 0; i < N; i++) {
    const p = spheres[i];
    p.g.position.set(slotX(i), 320, 0);
    p.g.rotation.set(0, 0, 0);
    p.ring.rotation.y = 0;
    p.dLbl.setText('?');
    setSphColor(p, BASE);
  }
}

function* pass(passNo) {
  yield* fadeChains();
  yield A(420, pp => spheres.forEach(p => { p.ring.rotation.y = Math.PI / 2 * pp; }));
  yield S(() => {
    spheres.forEach(p => { p.ring.rotation.y = 0; p.dLbl.setText(String(digitOf(p.value, passNo))); });
    status.textContent = '第 ' + (passNo + 1) + ' 趟：按' + NAMES[passNo] + '分桶（环旋转 90° 指向当前位）';
  });
  yield W(450);
  const buckets = Array.from({ length: 10 }, () => []);
  for (let i = 0; i < N; i++) {
    const p = spheres[i];
    const d = digitOf(p.value, passNo);
    setSphColor(p, GOLD);
    yield S(() => { status.textContent = 'a[' + i + ']=' + p.value + ' 的' + NAMES[passNo] + ' = ' + d + '，飞入桶 ' + d; });
    yield* fly(p, { x: p.g.position.x, y: p.g.position.y, z: p.g.position.z }, { x: BX(d), y: 304 + buckets[d].length * 30, z: -50 }, { lift: 90 });
    buckets[d].push(p);
    yield W(90);
  }
  yield S(() => { status.textContent = '按桶 0→9 顺序收集回主行（重连成链）'; });
  yield W(320);
  let k = 0;
  for (let d = 0; d < 10; d++) {
    for (const p of buckets[d]) {
      yield S(() => { status.textContent = '桶 ' + d + ' → 主行 [' + k + ']'; });
      yield* fly(p, { x: p.g.position.x, y: p.g.position.y, z: p.g.position.z }, { x: slotX(k), y: 320, z: 0 }, { lift: 55, ms: 340 });
      setSphColor(p, BASE);
      k++;
      yield W(70);
    }
  }
  yield* linkChain();
  yield W(250);
}

function* randomizeGen() {
  yield S(resetAll);
  yield S(() => { status.textContent = '随机生成 0..999 的数'; });
  yield W(400);
  for (let i = 0; i < N; i++) {
    const v = Math.floor(Math.random() * 1000);
    spheres[i].value = v;
    spheres[i].lbl.setText(String(v));
    yield W(60);
  }
  yield S(() => { status.textContent = '随机化完成：15 个数取值 0..999'; });
  yield W(400);
}

function* runRadixSort() {
  yield S(resetAll);
  yield S(() => { status.textContent = 'LSD 基数排序：从个位到百位逐趟按位分桶，数字环旋转 90° 指向当前位'; });
  yield W(400);
  for (let passNo = 0; passNo < 3; passNo++) yield* pass(passNo);
  yield S(() => {
    spheres.forEach(p => setSphColor(p, OK));
    status.textContent = '基数排序演示完成：15 个数，个位/十位/百位 3 趟 LSD 稳定桶排，结果 ' + spheres.map(p => p.value).join(', ');
  });
  yield W(900);
}

panel.addButton('随机化', () => engine.start(randomizeGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });
engine.queue(() => runRadixSort());

scene.start(engine);
