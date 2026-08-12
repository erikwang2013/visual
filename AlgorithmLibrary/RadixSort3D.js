// AlgorithmLibrary/RadixSort3D.js — 基数排序（LSD）：10 桶 + 数字环按位旋转 90° + 收集重连成链（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('RadixSort3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BASE = 0x60a5fa, GOLD = 0xfcd34d, OK = 0x4ade80, CYAN = 0x22d3ee;

const hint = new VText(scene, { text: '基数排序 LSD：数字环按位旋转 90°，球飞入 10 桶，收集回主行重连成链', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
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

let chains = [];
function clearChains() {
  chains.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  chains = [];
}
function* fadeChains() {
  if (!chains.length) return;
  yield A(260, p => chains.forEach(m => { m.material.opacity = 0.4 * (1 - p); }));
  clearChains();
}
function* linkChain() {
  clearChains();
  for (let i = 0; i < N - 1; i++) {
    const m = tubeBetween(scene, spheres[i].g.position, spheres[i + 1].g.position, { color: GOLD, radius: 1.8, opacity: 0 });
    chains.push(m);
  }
  yield A(400, p => chains.forEach(m => { m.material.opacity = 0.4 * p; }));
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
  clearChains();
  for (let i = 0; i < N; i++) {
    const p = spheres[i];
    p.g.position.set(slotX(i), 320, 0);
    p.g.rotation.set(0, 0, 0);
    p.ring.rotation.y = 0;
    p.dLbl.setText('?');
    setSphColor(p, BASE);
  }
}
function* doneMsg() {
  yield S(() => { hint.setText('基数排序完成：LSD 稳定，O(d·(n+k))'); status.textContent = '基数排序完成：O(d·(n+k))'; spheres.forEach(p => setSphColor(p, OK)); });
  yield W(700);
}

function* pass(passNo) {
  yield* fadeChains();
  yield A(420, pp => spheres.forEach(p => { p.ring.rotation.y = Math.PI / 2 * pp; }));
  yield S(() => {
    spheres.forEach(p => { p.ring.rotation.y = 0; p.dLbl.setText(String(digitOf(p.value, passNo))); });
    hint.setText('第 ' + (passNo + 1) + ' 趟：按' + NAMES[passNo] + '分桶（环旋转 90° 指向当前位）');
  });
  yield W(450);
  const buckets = Array.from({ length: 10 }, () => []);
  for (let i = 0; i < N; i++) {
    const p = spheres[i];
    const d = digitOf(p.value, passNo);
    setSphColor(p, GOLD);
    yield S(() => hint.setText('a[' + i + ']=' + p.value + ' 的' + NAMES[passNo] + ' = ' + d + '，飞入桶 ' + d));
    yield* fly(p, { x: p.g.position.x, y: p.g.position.y, z: p.g.position.z }, { x: BX(d), y: 304 + buckets[d].length * 30, z: -50 }, { lift: 90 });
    buckets[d].push(p);
    yield W(90);
  }
  yield S(() => hint.setText('按桶 0→9 顺序收集回主行（重连成链）'));
  yield W(320);
  let k = 0;
  for (let d = 0; d < 10; d++) {
    for (const p of buckets[d]) {
      yield S(() => hint.setText('桶 ' + d + ' → 主行 [' + k + ']'));
      yield* fly(p, { x: p.g.position.x, y: p.g.position.y, z: p.g.position.z }, { x: slotX(k), y: 320, z: 0 }, { lift: 55, ms: 340 });
      setSphColor(p, BASE);
      k++;
      yield W(70);
    }
  }
  yield* linkChain();
  yield W(250);
}

function* radixSort() {
  yield S(resetAll);
  hint.setText('LSD 基数排序：从个位到百位，逐趟按位分桶');
  yield W(400);
  for (let passNo = 0; passNo < 3; passNo++) yield* pass(passNo);
  yield* doneMsg();
}

function* randomizeGen() {
  yield S(resetAll);
  hint.setText('随机生成 0..999 的数');
  for (let i = 0; i < N; i++) {
    const v = Math.floor(Math.random() * 1000);
    spheres[i].value = v;
    spheres[i].lbl.setText(String(v));
    yield W(60);
  }
  yield S(() => hint.setText('已随机化，可点击「▶ 演示」'));
}

panel.addButton('随机化', () => engine.start(randomizeGen()));
engine.queue(() => radixSort());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金链 = 收集后的顺序链）');

scene.start(engine);
