// AlgorithmLibrary/ArithmeticCoding3D.js — 算术编码：区间条逐符号缩窄 + 分段比例缩放 + 金环指示编码点（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ArithmeticCoding3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x60a5fa, GOLD = 0xfcd34d;
const hint = new VText(scene, { text: '点击「运行演示」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const PROB = { A: 0.5, B: 0.25, C: 0.25 };
const MSG = 'AAB';
const BAR = 620, BAR_H = 34;
const barBox = new VBox(scene, { w: BAR, h: BAR_H, d: 26, x: 0, y: 140, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
barBox.mesh.material.transparent = true;
barBox.mesh.material.opacity = 0.15;
new VText(scene, { text: '概率区间 [0, 1)', x: 0, y: 185, z: 0, color: PALETTE.textDim, scale: 0.7 });

// 三段分段：A=[0,0.5) 绿 / B=[0.5,0.75) 黄 / C=[0.75,1) 蓝
const SEG_COLOR = { A: GREEN, B: YELLOW, C: BLUE };
const segs = {};
for (const ch of ['A', 'B', 'C']) {
  segs[ch] = new VBox(scene, { w: BAR * PROB[ch], h: BAR_H - 6, d: 12, x: 0, y: 140, z: 8, color: SEG_COLOR[ch], emissive: SEG_COLOR[ch] });
  segs[ch].mesh.material.transparent = true;
  segs[ch].mesh.material.opacity = 0.75;
}
function placeSegs(L, H) {
  let x = L;
  for (const ch of ['A', 'B', 'C']) {
    const w = (H - L) * PROB[ch];
    const c = segs[ch];
    c.mesh.scale.x = w / (BAR * PROB[ch]);
    c.mesh.position.x = (x - 0.5) * BAR + w / 2;
    x += w;
  }
}
placeSegs(0, 1);

const ring = new VTorus(scene, { radius: 14, x: -BAR / 2, y: 30, color: GOLD });
ring.mesh.visible = false;
const rangeText = new VText(scene, { text: '', x: 0, y: 60, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const outText = new VText(scene, { text: '', x: 0, y: -10, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const codeText = new VText(scene, { text: '', x: 0, y: -80, z: 0, color: PALETTE.textDim, scale: 0.75 });

// 预计算区间序列
const L = [0], H = [1];
for (const ch of MSG) {
  const l = L[L.length - 1], h = H[H.length - 1];
  let acc = l;
  for (const k of ['A', 'B', 'C']) {
    if (k === ch) { L.push(acc); H.push(acc + (h - l) * PROB[k]); break; }
    acc += (h - l) * PROB[k];
  }
}
const F = (L[L.length - 1] + H[H.length - 1]) / 2;
const bits = Math.ceil(-Math.log2(H[H.length - 1] - L[L.length - 1]));

function resetAll() {
  placeSegs(0, 1);
  for (const k of ['A', 'B', 'C']) segs[k].mesh.material.opacity = 0.75;
  ring.mesh.visible = false;
  rangeText.setText('');
  outText.setText('');
  codeText.setText('');
}

function* runEncode() {
  yield S(resetAll);
  yield S(() => { hint.setText('算术编码：把整条消息映射到 [0,1) 内的一个区间，每读一个符号区间就按概率缩窄'); });
  yield W(400);
  for (let done = 0; done < MSG.length; done++) {
    const ch = MSG[done];
    const l = L[done], h = H[done];
    const nL = L[done + 1], nH = H[done + 1];
    const x = (nL + nH) / 2;
    yield S(() => ring.mesh.visible = true);
    yield A(450, p => { ring.mesh.position.x = (x - 0.5) * BAR; });
    yield S(() => {
      rangeText.setText('区间 [' + l.toFixed(4) + ', ' + h.toFixed(4) + ')，读到「' + ch + '」');
      placeSegs(l, h);
      for (const k of ['A', 'B', 'C']) segs[k].mesh.material.opacity = k === ch ? 1 : 0.3;
      hint.setText('P(' + ch + ') = ' + PROB[ch] + ' → 新区间 = [' + l.toFixed(3) + ', ' + h.toFixed(3) + ') × ' + PROB[ch] + ' = [' + nL.toFixed(4) + ', ' + nH.toFixed(4) + ')');
    });
    yield W(900);
    yield S(() => {
      outText.setText('已读：' + MSG.slice(0, done + 1) + ' → 当前区间 [' + nL.toFixed(4) + ', ' + nH.toFixed(4) + ')');
      for (const k of ['A', 'B', 'C']) segs[k].mesh.material.opacity = 0.75;
    });
    yield W(450);
  }
  yield S(() => {
    ring.mesh.visible = false;
    codeText.setText('编码：区间中点 ' + F.toFixed(4) + '，需 ' + bits + ' bit（H-L = ' + (H[MSG.length] - L[MSG.length]).toFixed(4) + ' < 2⁻' + (bits - 1) + '）');
    status.textContent = MSG + ' → ' + F.toFixed(4) + '（' + bits + ' bit，理论极限 ≈ ' + bits + '）';
    hint.setText('解压时按同一概率表重复区间划分，落入哪个子区间就输出哪个符号');
  });
  yield W(500);
}

panel.addButton('运行演示', () => engine.start(runEncode()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；彩色分段按概率缩窄，金环 = 编码点；JPEG 2000 / xz 用它逼近熵极限）');

scene.start(engine);
