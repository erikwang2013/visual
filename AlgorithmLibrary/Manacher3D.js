// AlgorithmLibrary/Manacher3D.js — 回文半径立柱 + 红→紫渐变 + 镜像光球连线（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VBar, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Manacher3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 800], fov: 60 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const RED = 0xfb7185, PURPLE = 0xa78bfa, GREEN = 0x4ade80, GOLD = 0xfcd34d, CYAN = 0x67e8f9, SLATE = 0x64748b;
const hint = new VText(scene, { text: '点击「运行演示」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('');

const TXT = 'abacaba';
const D = (() => { const n = TXT.length, d = Array(n).fill(0); let l = 0, r = -1;
  for (let i = 0; i < n; i++) { let k = i > r ? 1 : Math.min(d[l + r - i], r - i + 1);
    while (i - k >= 0 && i + k < n && TXT[i - k] === TXT[i + k]) k++;
    d[i] = k; if (i + k - 1 > r) { l = i - k + 1; r = i + k - 1; } } return d; })();
const SP = 56;
const cx = k => (k - (TXT.length - 1) / 2) * SP;
const lerp = (a, b, p) => a + (b - a) * p;
const mix = (c1, c2, p) => { const m = new THREE.Color(c1).lerp(new THREE.Color(c2), p); return m.getHex(); };
const chBox = [...TXT].map((ch, k) => new VBox(scene, { w: 44, h: 44, d: 44, x: cx(k), y: 170, label: ch, color: CYAN, emissive: CYAN }));
const bar = D.map((v, k) => { const b = new VBar(scene, { w: 34, d: 34, x: cx(k), color: SLATE, emissive: SLATE }); b.mesh.scale.y = 0.5; b.mesh.position.y = 0.25; b.h = 1 + (v - 1) * 46; b.val = v; return b; });
const valT = D.map((v, k) => new VText(scene, { text: `d1[${k}]`, x: cx(k), y: 300, z: 0, color: PALETTE.textDim, scale: 0.45 }));
const valN = D.map((v, k) => new VText(scene, { text: String(v), x: cx(k), y: 370, z: 0, color: SLATE, scale: 0.55 }));
const mBall = new VNode(scene, { radius: 9, x: cx(0), y: 470, color: GOLD, emissive: GOLD });
const mBall2 = new VNode(scene, { radius: 9, x: cx(0), y: 470, color: GOLD, emissive: GOLD });
mBall.mesh.visible = false; mBall2.mesh.visible = false;
const ring = new VTorus(scene, { radius: 36, x: 0, y: 170, color: GOLD });
ring.mesh.visible = false;
const outT = new VText(scene, { text: '', x: 0, y: 30, z: 0, color: PALETTE.textGlow, scale: 0.75 });
new VText(scene, { text: '回文半径立柱：中心红柱，镜像位置柱色向外渐变 红→紫；金球连线 = 对称镜像', x: 0, y: 250, z: 0, color: PALETTE.textDim, scale: 0.6 });

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

const growBar = (b, p, color) => { const h = Math.max(b.h * p, 0.5); b.mesh.scale.y = h; b.mesh.position.y = h / 2; if (color) b.setColor(color, color); };

const flyBall = (ball, x, ms = 300) => {
  const fx = ball.mesh.position.x;
  return A(ms, p => { const e = p * p * (3 - 2 * p); ball.mesh.position.x = lerp(fx, x, e); });
};

function resetAll() {
  clearFx();
  chBox.forEach(b => b.setColor(CYAN, CYAN));
  bar.forEach(b => { b.mesh.scale.y = 0.5; b.mesh.position.y = 0.25; b.setColor(SLATE, SLATE); });
  valN.forEach((t, k) => t.setText(String(D[k]), { color: SLATE }));
  mBall.mesh.visible = false; mBall2.mesh.visible = false;
  ring.mesh.visible = false;
  outT.setText('');
}

function beam(x0, x1) {
  const pts = [new THREE.Vector3(x0, 470, 40), new THREE.Vector3(x1, 470, 40)];
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineDashedMaterial({ color: GREEN, dashSize: 8, gapSize: 5, transparent: true, opacity: 0.9 }));
  line.computeLineDistances();
  fxGroup.add(line);
}

function* runManacher() {
  yield S(resetAll);
  yield S(() => { hint.setText('Manacher：以每个字符为中心向两侧扩张。d1[i] = 回文半径。镜像位置复用：p 镜像 d1[2c-i]，越界则继续扩张'); });
  let l = 0, r = -1;
  for (let i = 0; i < TXT.length; i++) {
    let base = 1;
    if (i <= r) {
      const mirror = D[l + r - i];
      base = Math.min(mirror, r - i + 1);
      yield S(() => outT.setText(`中心 i=${i} 在回文 [${l}, ${r}] 内：镜像半径 d1[${l + r - i}]=${mirror}，取 min(${mirror}, ${r - i + 1}) = ${base} 起跳`));
      yield W(700);
    }
    let k = base;
    const pairSteps = [];
    while (i - k >= 0 && i + k < TXT.length && TXT[i - k] === TXT[i + k]) { pairSteps.push(k); k++; }
    yield S(() => {
      outT.setText(`中心 ${i}（'${TXT[i]}'）：扩张半径 ${base} → ${D[i]}，共比对 ${pairSteps.length} 对镜像字符`);
      growBar(bar[i], 1, RED);
      valN[i].setText(String(D[i]), { color: RED });
    });
    yield W(600);
    for (const kk of pairSteps) {
      const grad = mix(RED, PURPLE, kk / D[i]);
      yield S(() => {
        chBox[i - kk].setColor(grad, grad); chBox[i + kk].setColor(grad, grad);
        bar[i - kk].setColor(grad, grad); bar[i + kk].setColor(grad, grad);
        clearFx(); beam(cx(i - kk), cx(i + kk));
        mBall.mesh.position.set(cx(i - kk), 470, 0); mBall.mesh.visible = true;
        mBall2.mesh.position.set(cx(i + kk), 470, 0); mBall2.mesh.visible = true;
        outT.setText(`镜像对 (${i - kk}, ${i + kk})：'${TXT[i - kk]}' == '${TXT[i + kk]}' —— 半径 ${kk + 1}，颜色越外越紫`);
      });
      yield W(520);
    }
    yield S(() => { clearFx(); mBall.mesh.visible = false; mBall2.mesh.visible = false; });
    if (i + D[i] - 1 > r) { l = i - D[i] + 1; r = i + D[i] - 1; }
    yield W(350);
  }
  yield S(() => {
    const c = D.indexOf(Math.max(...D));
    for (let k = 0; k < TXT.length; k++) { const dist = Math.abs(k - c); chBox[k].setColor(mix(RED, PURPLE, dist / TXT.length), mix(RED, PURPLE, dist / TXT.length)); }
    ring.mesh.position.set(cx(c), 170, 0); ring.mesh.visible = true;
    outT.setText(`扫描完成：最长回文中心 ${c}，半径 ${D[c]} → 整个串 "${TXT}" 都是回文`);
    status.textContent = `Manacher 完成：d1 = [${D.join(', ')}]，最长回文子串 "${TXT}"（半径 ${D[c]}，全串回文）`;
    hint.setText('复杂度 O(n)：每个位置至少被中心扫描一次；镜像半径直接复用，不回退');
  });
}

panel.addButton('运行演示', () => engine.start(runManacher()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；红柱 = 当前中心，镜像柱色红→紫渐变，绿虚线 = 镜像连线）');

scene.start(engine);
