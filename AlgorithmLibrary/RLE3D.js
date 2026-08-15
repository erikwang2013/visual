// AlgorithmLibrary/RLE3D.js — 游程编码：金环扫描 + 游程高亮 + 计数标注 + 粒子流（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RLE3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, GOLD = 0xfcd34d, YELLOW = 0xfacc15;
const status = panel.addStatus('就绪');

const TXT = 'AAAABBBCCDAA';
const SP = 54, X0 = -TXT.length * SP / 2 + SP / 2 + 320;
const boxes = [];
for (let i = 0; i < TXT.length; i++) {
  boxes.push(new VBox(scene, { w: 44, h: 44, d: 44, x: X0 + i * SP, y: 390, z: 0, label: TXT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}

const runs = [];
for (let i = 0; i < TXT.length; ) {
  let j = i;
  while (j < TXT.length && TXT[j] === TXT[i]) j++;
  runs.push({ ch: TXT[i], len: j - i, start: i });
  i = j;
}

const ring = new VTorus(scene, { radius: 32, x: X0, y: 390, color: GOLD });
ring.mesh.visible = false;
const countTexts = runs.map(r => new VText(scene, { text: '', x: X0 + (r.start + (r.len - 1) / 2) * SP, y: 475, z: 0, color: GREEN, scale: 0.9 }));

// 粒子流小球：模块级预建复用，A 回调内仅改 position
const fxGroup = new THREE.Group();
scene.add(fxGroup);
const flowParts = [];
for (let i = 0; i < 3; i++) {
  const v = new THREE.Mesh(new THREE.SphereGeometry(3.5, 8, 8),
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
  v.visible = false;
  fxGroup.add(v);
  flowParts.push(v);
}
const clearFx = () => flowParts.forEach(v => { v.visible = false; });

const flowV = runs.map(r => ({ s: X0 + r.start * SP, e: X0 + (r.start + r.len - 1) * SP }));
function* flowLine(d, ms = 380) {
  const { s, e } = flowV[d];
  flowParts.forEach(v => v.visible = true);
  yield A(ms, p => flowParts.forEach((v, i) => { const t = (p + i * 0.18) % 1; v.position.set(s + (e - s) * t, 390, 20); }));
  flowParts.forEach(v => v.visible = false);
}

function resetAll() {
  clearFx();
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  ring.mesh.visible = false;
  ring.mesh.scale.setScalar(1);
  countTexts.forEach(t => t.setText(''));
}

function* runCompress() {
  yield S(resetAll);
  yield W(200);
  yield S(() => { status.textContent = 'RLE 游程编码：扫描序列，连续相同字符压缩为「字符 + 出现次数」'; });
  yield W(500);
  for (let d = 0; d < runs.length; d++) {
    const r = runs[d];
    const cx = X0 + (r.start + (r.len - 1) / 2) * SP;
    yield S(() => {
      ring.mesh.visible = true;
      ring.mesh.position.x = cx;
      status.textContent = '扫描游程 ' + (d + 1) + '/' + runs.length + '：金环定位到第 ' + r.start + ' 位';
    });
    yield W(500);
    yield S(() => {
      for (let i = r.start; i < r.start + r.len; i++) boxes[i].setColor(YELLOW, YELLOW);
      status.textContent = '连续 ' + r.len + ' 个「' + r.ch + '」→ 记作 ' + r.ch + r.len;
    });
    yield W(600);
    yield* flowLine(d);
    yield A(300, p => { ring.mesh.scale.setScalar(1 + 0.18 * Math.sin(p * Math.PI * 2)); });
    yield S(() => {
      for (let i = r.start; i < r.start + r.len; i++) boxes[i].setColor(GREEN, GREEN);
      countTexts[d].setText(r.ch + '×' + r.len);
      status.textContent = '游程 ' + (d + 1) + ' 完成：「' + r.ch + '」×' + r.len + ' 已记作 ' + r.ch + r.len;
    });
    yield W(500);
  }
  const out = runs.map(r => r.ch + r.len).join('');
  yield S(() => {
    clearFx();
    ring.mesh.visible = false;
    status.textContent = 'RLE 演示完成：' + TXT + ' → ' + runs.map(r => r.ch + r.len).join(' ') + '（' + TXT.length + ' → ' + out.length + ' 字符，' + (TXT.length / out.length).toFixed(2) + '× 压缩，可无损还原）';
  });
  yield W(500);
}

engine.queue(() => runCompress());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
