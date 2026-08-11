// AlgorithmLibrary/RLE3D.js — 游程编码：金环扫描 + 游程高亮 + 计数球生长 + 粒子流（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RLE3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, GOLD = 0xfcd34d, YELLOW = 0xfacc15;
const hint = new VText(scene, { text: '点击「运行压缩」开始', x: 0, y: 260, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const TXT = 'AAAABBBCCDAA';
const SP = 54, X0 = -TXT.length * SP / 2 + SP / 2;
const boxes = [];
for (let i = 0; i < TXT.length; i++) {
  boxes.push(new VBox(scene, { w: 44, h: 44, d: 44, x: X0 + i * SP, y: 90, z: 0, label: TXT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
new VText(scene, { text: '输入（12 字符）', x: X0 - 240, y: 90, z: 0, color: PALETTE.textDim, scale: 0.7 });
const outText = new VText(scene, { text: '', x: 0, y: -60, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const ratioT = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textDim, scale: 0.7 });

const runs = [];
for (let i = 0; i < TXT.length; ) {
  let j = i;
  while (j < TXT.length && TXT[j] === TXT[i]) j++;
  runs.push({ ch: TXT[i], len: j - i, start: i });
  i = j;
}

const ring = new VTorus(scene, { radius: 32, x: X0, y: 90, color: GOLD });
ring.mesh.visible = false;
const countTexts = runs.map(r => new VText(scene, { text: '', x: X0 + (r.start + (r.len - 1) / 2) * SP, y: 175, z: 0, color: GREEN, scale: 0.9 }));

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

function flowLine(pA, pB, count = 3, ms = 380) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const v = new THREE.Mesh(new THREE.SphereGeometry(3.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
    parts.push(v); fxGroup.add(v);
  }
  return A(ms, p => parts.forEach((v, i) => v.position.copy(pA.clone().lerp(pB, (p + i * 0.18) % 1))));
}

function resetAll() {
  clearFx();
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  ring.mesh.visible = false;
  countTexts.forEach(t => t.setText(''));
  outText.setText('');
  ratioT.setText('');
}

function* runCompress() {
  yield S(resetAll);
  yield S(() => { hint.setText('RLE：扫描序列，连续相同字符压缩为「字符 + 出现次数」'); });
  yield W(400);
  for (let d = 0; d < runs.length; d++) {
    const r = runs[d];
    const cx = X0 + (r.start + (r.len - 1) / 2) * SP;
    yield S(() => {
      ring.mesh.visible = true;
      hint.setText(`扫描游程 ${d + 1}/${runs.length}：从第 ${r.start} 位开始`);
    });
    yield A(450, p => { ring.mesh.position.x = cx; });
    yield W(150);
    yield S(() => {
      for (let i = r.start; i < r.start + r.len; i++) boxes[i].setColor(YELLOW, YELLOW);
      hint.setText('连续 ' + r.len + ' 个「' + r.ch + '」→ 记作 ' + r.ch + r.len);
    });
    const pA = new THREE.Vector3(X0 + r.start * SP, 90, 20);
    const pB = new THREE.Vector3(X0 + (r.start + r.len - 1) * SP, 90, 20);
    yield* flowLine(pA, pB);
    yield A(300, p => { ring.mesh.scale.setScalar(1 + 0.18 * Math.sin(p * Math.PI * 2)); });
    yield S(() => {
      for (let i = r.start; i < r.start + r.len; i++) boxes[i].setColor(GREEN, GREEN);
      countTexts[d].setText(r.ch + '×' + r.len);
      outText.setText('压缩结果：' + runs.slice(0, d + 1).map(x => x.ch + x.len).join(' '));
      hint.setText(`游程 ${d + 1} 完成：「${r.ch}」×${r.len} 已记作 ${r.ch}${r.len}`);
    });
    yield W(420);
  }
  const out = runs.map(r => r.ch + r.len).join(' ');
  yield S(() => {
    clearFx();
    ring.mesh.visible = false;
    outText.setText('压缩结果：' + out);
    ratioT.setText('12 字符 → ' + out.replace(/ /g, '').length + ' 个字符（' + (TXT.length / out.replace(/ /g, '').length).toFixed(2) + '× 压缩）');
    hint.setText('解压时把每个「字符+计数」展开为连续字符即可还原');
    status.textContent = 'RLE 压缩完成：' + TXT + ' → ' + out;
  });
  yield W(500);
}

panel.addButton('运行压缩', () => engine.start(runCompress()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金环 = 扫描位置，绿色计数 = 游程长度）');

scene.start(engine);
