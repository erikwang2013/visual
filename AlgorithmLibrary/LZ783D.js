// AlgorithmLibrary/LZ783D.js — LZ78：动态字典生长 + 金环扫描 + 匹配前缀高亮 + 字典条目生长（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LZ783D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x60a5fa, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始', x: 0, y: 260, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const INPUT = 'ABABABABAB';
const SP = 48, X0 = -INPUT.length * SP / 2 + SP / 2;
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  boxes.push(new VBox(scene, { w: 38, h: 38, d: 38, x: X0 + i * SP, y: 120, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
new VText(scene, { text: '输入：' + INPUT, x: X0 - 230, y: 120, z: 0, color: PALETTE.textDim, scale: 0.7 });
const dictTitle = new VText(scene, { text: '字典（编码时动态构建）', x: 0, y: -10, z: 0, color: PALETTE.textDim, scale: 0.7 });
const outText = new VText(scene, { text: '', x: 0, y: -110, z: 0, color: PALETTE.textGlow, scale: 0.8 });

// 预计算 tokens 与字典增长
const tokens = [];
const dict = [''];
for (let i = 0; i < INPUT.length; ) {
  let idx = 0, len = 0;
  for (let k = 1; k < dict.length; k++) {
    if (INPUT.startsWith(dict[k], i) && dict[k].length > len) { idx = k; len = dict[k].length; }
  }
  const next = INPUT[i + len] || '';
  tokens.push({ idx, len, next, start: i, dictIdx: dict.length });
  dict.push(dict[idx] + next);
  i += len + (next ? 1 : 0);
}

const ring = new VTorus(scene, { radius: 25, x: X0, y: 120, color: YELLOW });
ring.mesh.visible = false;
const dictBoxes = [];

function resetAll() {
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  ring.mesh.visible = false;
  outText.setText('');
  for (const p of dictBoxes) { p[0].remove(); p[1].remove(); }
  dictBoxes.length = 0;
}

function* runCompress() {
  yield S(resetAll);
  yield S(() => { hint.setText('LZ78：维护动态字典，输出 (最长前缀的字典号, 下一字符) 对'); });
  yield W(400);
  for (let d = 0; d < tokens.length; d++) {
    const t = tokens[d];
    const cx = X0 + (t.start + t.len / 2 - (INPUT.length - 1) / 2) * SP;
    yield S(() => ring.mesh.visible = true);
    yield A(350, p => { ring.mesh.position.x = cx; });
    yield S(() => {
      for (let i = t.start; i < t.start + t.len; i++) boxes[i].setColor(YELLOW, YELLOW);
      if (t.next) boxes[t.start + t.len].setColor(BLUE, BLUE);
      hint.setText('最长前缀「' + dict[t.idx] + '」（字典 ' + t.idx + ' 号）+' + (t.next || '结束') + ' → (' + t.idx + ',' + (t.next || '∅') + ')，字典新增 ' + t.dictIdx + ' 号「' + dict[t.dictIdx] + '」');
    });
    yield W(600);
    yield S(() => {
      for (let i = t.start; i < t.start + t.len; i++) boxes[i].setColor(GREEN, GREEN);
      if (t.next) boxes[t.start + t.len].setColor(GREEN, GREEN);
      outText.setText('输出：' + tokens.slice(0, d + 1).map(x => '(' + x.idx + ',' + (x.next || '∅') + ')').join(' '));
    });
    const n = dictBoxes.length;
    const dx = -260 + n * 150;
    const ib = new VBox(scene, { w: 56, h: 40, d: 30, x: dx, y: -40, z: 0, label: String(t.dictIdx), color: DIM, emissive: DIM });
    const pb = new VBox(scene, { w: 70, h: 40, d: 30, x: dx + 72, y: -40, z: 0, label: dict[t.dictIdx], color: GREEN, emissive: GREEN });
    ib.mesh.scale.setScalar(0.01);
    pb.mesh.scale.setScalar(0.01);
    dictBoxes.push([ib, pb]);
    yield A(320, p => { ib.mesh.scale.setScalar(0.01 + 0.99 * p); pb.mesh.scale.setScalar(0.01 + 0.99 * p); });
    yield W(450);
  }
  const out = tokens.map(t => '(' + t.idx + ',' + (t.next || '∅') + ')').join(' ');
  yield S(() => {
    ring.mesh.visible = false;
    hint.setText('字典随输入增长；解压时同步重建字典即可还原');
    status.textContent = '压缩完成：' + INPUT + ' → ' + out + '（10 字符 → ' + out.replace(/ /g, '').length + ' 字符）';
  });
  yield W(500);
}

engine.queue(() => runCompress());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄环 = 当前扫描位，绿箱 = 字典条目；LZW / GIF 是它的变体）');

scene.start(engine);
