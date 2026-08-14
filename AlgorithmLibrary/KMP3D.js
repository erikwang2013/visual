// AlgorithmLibrary/KMP3D.js — KMP 模式匹配：PMT 前缀函数构建 + 线性扫描匹配（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('KMP3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x38bdf8, RED = 0xfb7185, GOLD = 0xfde047, GREEN = 0x4ade80, CYAN = 0x67e8f9, ORANGE = 0xfb923c;
const status = panel.addStatus('就绪');

const TXT = 'ABABABACABAB', P = 'BABAC';
const SP = 46, BAR_BASE = 660;
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);
const mx = k => (k - (TXT.length - 1) / 2) * SP + 320;
const px = k => (k - (P.length - 1) / 2) * SP + 320;
const barH = v => (v + 0.5) * 26;

// ---- 纯数据：静态 PMT 预计算（与动画逐步构建结果一致）----
const pmt = [0];
for (let j = 1, k = 0; j < P.length; j++) {
  while (k > 0 && P[j] !== P[k]) k = pmt[k - 1];
  if (P[j] === P[k]) k++;
  pmt[j] = k;
}

// ---- 视觉：主串/模式字符盒、i/j 指针球、PMT 柱（柱 0 初始显示 π=0，其余隐藏）----
const sBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 420, label: ch, color: BLUE, emissive: BLUE }));
const sNum = [...TXT].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 392, z: 10, color: PALETTE.textDim, scale: 0.45 }));
const pBox = [...P].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: px(k), y: 560, label: ch, color: RED, emissive: RED }));
const pNum = [...P].map((_, k) => new VText(scene, { text: String(k), x: px(k), y: 532, z: 10, color: PALETTE.textDim, scale: 0.45 }));
const iBall = new VNode(scene, { radius: 11, x: mx(0), y: 358, color: CYAN, emissive: CYAN });
const jBall = new VNode(scene, { radius: 11, x: px(0), y: 610, color: GOLD, emissive: GOLD });
const bars = [...P].map((_, k) => new VBox(scene, { w: 34, h: 65, d: 34, x: px(k), y: BAR_BASE, label: '', color: ORANGE, emissive: ORANGE }));
const barVals = [...P].map((_, k) => new VText(scene, { text: '0', x: px(k), y: BAR_BASE + 13 + 14, z: 10, color: PALETTE.textDim, scale: 0.5 }));
bars.forEach((b, k) => {
  if (k === 0) { b.mesh.scale.y = 13 / 65; b.mesh.position.y = BAR_BASE + 6.5; }
  else { b.mesh.scale.y = 0.01; b.mesh.position.y = BAR_BASE; }
});
const ring = new VTorus(scene, { radius: 118, x: 297, y: 420, color: GREEN });
ring.mesh.visible = false;

const fly = (ball, x, y, ms = 300) => {
  const fx = ball.mesh.position.x, fy = ball.mesh.position.y;
  return A(ms, p => {
    const e = ease(p);
    ball.mesh.position.x = lerp(fx, x, e);
    ball.mesh.position.y = lerp(fy, y, e);
  });
};

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

const drawJump = (from, to) => {
  clearFx();
  const x1 = px(from), x2 = px(to);
  const dir = x2 >= x1 ? 1 : -1;
  const n = Math.max(2, Math.floor(Math.abs(x2 - x1) / 36));
  const pts = [];
  for (let s = 0; s <= n; s++) pts.push(new THREE.Vector3(x1 + dir * s * 36, 640, 8));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineDashedMaterial({ color: CYAN, dashSize: 10, gapSize: 7, transparent: true, opacity: 0.9 }));
  line.computeLineDistances();
  fxGroup.add(line);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(9, 16, 8),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.9 }));
  arrow.position.set(x2 + dir * 14, 640, 8);
  arrow.rotation.z = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
  fxGroup.add(arrow);
  return A(350, p => { line.material.opacity = 0.9 * p; arrow.material.opacity = 0.9 * p; });
};

const growBar = (k, v) => {
  const full = barH(v);
  return A(420, p => {
    const e = ease(p);
    const s = Math.max(0.01, e);
    bars[k].mesh.scale.y = s;
    bars[k].mesh.position.y = BAR_BASE + full * s / 2;
    barVals[k].sprite.position.y = BAR_BASE + full * s + 14;
  });
};

function resetAll() {
  clearFx();
  sBox.forEach(b => b.setColor(BLUE, BLUE));
  pBox.forEach(b => b.setColor(RED, RED));
  iBall.mesh.position.set(mx(0), 358, 0);
  jBall.mesh.position.set(px(0), 610, 0);
  ring.mesh.visible = false;
  bars.forEach((b, k) => {
    b.setColor(ORANGE, ORANGE);
    if (k === 0) { b.mesh.scale.y = 13 / 65; b.mesh.position.y = BAR_BASE + 6.5; }
    else { b.mesh.scale.y = 0.01; b.mesh.position.y = BAR_BASE; }
    barVals[k].setText('0', { color: PALETTE.textDim });
    barVals[k].sprite.position.y = BAR_BASE + 13 + 14;
  });
}

function* runKMP() {
  yield S(resetAll);
  yield W(200);
  let comps = 0;
  // Phase A：构建 PMT（逐 j 计算 π[j]）
  let k = 0;
  for (let j = 1; j < P.length; j++) {
    yield fly(jBall, px(j), 610, 250);
    yield S(() => { pBox[j].setColor(GOLD, GOLD); pBox[k].setColor(GOLD, GOLD); });
    yield W(250);
    while (k > 0 && P[j] !== P[k]) {
      comps++;
      yield S(() => { pBox[j].setColor(RED, RED); pBox[k].setColor(RED, RED); });
      yield drawJump(k, pmt[k - 1]);
      yield W(380);
      k = pmt[k - 1];
      yield S(() => { pBox[j].setColor(GOLD, GOLD); pBox[k].setColor(GOLD, GOLD); });
      yield W(250);
    }
    comps++;
    const ck = k;
    if (P[j] === P[ck]) {
      yield S(() => { pBox[j].setColor(GREEN, GREEN); pBox[ck].setColor(GREEN, GREEN); });
      yield W(450);
      k++;
    } else {
      yield S(() => { pBox[j].setColor(RED, RED); pBox[ck].setColor(RED, RED); });
      yield W(450);
    }
    pmt[j] = k;
    yield growBar(j, k);
    yield S(() => { barVals[j].setText(String(k), { color: PALETTE.textDim }); });
    yield S(() => { pBox[j].setColor(RED, RED); pBox[ck].setColor(RED, RED); });
    yield W(120);
  }
  // Phase B：线性扫描匹配
  yield fly(jBall, px(0), 610, 250);
  let i = 0, j = 0;
  while (i < TXT.length) {
    yield fly(iBall, mx(i), 358, 250);
    yield fly(jBall, px(j), 610, 250);
    yield S(() => { sBox[i].setColor(GOLD, GOLD); pBox[j].setColor(GOLD, GOLD); });
    yield W(380);
    comps++;
    if (TXT[i] === P[j]) {
      yield S(() => { sBox[i].setColor(GREEN, GREEN); pBox[j].setColor(GREEN, GREEN); });
      yield W(450);
      i++; j++;
      if (j === P.length) break;
    } else if (j > 0) {
      yield S(() => { sBox[i].setColor(RED, RED); pBox[j].setColor(RED, RED); });
      yield drawJump(j, pmt[j - 1]);
      yield W(300);
      j = pmt[j - 1];
      yield fly(jBall, px(j), 610, 250);
      yield S(() => { sBox[i].setColor(BLUE, BLUE); pBox[j].setColor(GOLD, GOLD); });
      yield W(120);
    } else {
      yield S(() => { sBox[i].setColor(RED, RED); pBox[j].setColor(RED, RED); });
      yield W(450);
      yield S(() => { sBox[i].setColor(BLUE, BLUE); pBox[j].setColor(RED, RED); });
      yield W(120);
      i++;
    }
  }
  if (j === P.length) {
    const at = i - P.length;
    yield S(() => {
      for (let q = 0; q < P.length; q++) sBox[at + q].setColor(GREEN, GREEN);
      ring.mesh.position.set(mx(at) + (P.length - 1) * SP / 2, 420, 0);
      ring.mesh.visible = true;
    });
    yield W(1400);
    yield S(() => { status.textContent = 'KMP 完成：命中位置 ' + at + '，比较 ' + comps + ' 次'; });
  } else {
    yield S(() => { status.textContent = 'KMP 完成：未找到 "' + P + '"，比较 ' + comps + ' 次'; });
  }
}

engine.queue(() => runKMP());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
