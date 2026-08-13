// AlgorithmLibrary/Brotli3D.js — Brotli：LZ77 字典匹配 + 上下文三元组预测 + 熵编码字节流（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Brotli3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, DIM = 0x334155, GOLD = 0xfcd34d;
const hint = new VText(scene, { text: '点击「▶ 演示」开始', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('');

const INPUT = 'hello hello hello hello hello world';
const SP = 32, BOX = 30;
const pos = i => i < 18 ? { x: 68 + i * SP, y: 475 } : { x: 68 + (i - 18) * SP, y: 400 };
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  const p = pos(i);
  boxes.push(new VBox(scene, { w: BOX, h: BOX, d: BOX, x: p.x, y: p.y, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
new VText(scene, { text: '输入（35 字符）', x: 700, y: 495, z: 0, color: PALETTE.textDim, scale: 0.5, wrapChars: 8 });
const outText = new VText(scene, { text: '', x: 700, y: 430, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
const hexT1 = new VText(scene, { text: '', x: 700, y: 385, z: 0, color: PALETTE.textDim, scale: 0.5, wrapChars: 8 });
const hexT2 = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textDim, scale: 0.5, wrapChars: 8 });
const statT = new VText(scene, { text: '', x: 700, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });

const tokens = [
  { type: 'lit', n: 6, start: 0 },
  { type: 'match', off: 6, len: 6, src: [0, 5], dst: [6, 11] },
  { type: 'match', off: 6, len: 6, src: [6, 11], dst: [12, 17] },
  { type: 'match', off: 6, len: 6, src: [12, 17], dst: [18, 23] },
  { type: 'match', off: 6, len: 6, src: [18, 23], dst: [24, 29] },
  { type: 'lit', n: 5, start: 30 },
];

const CTX = [['h', 'e', 'l'], ['e', 'l', 'l'], ['l', 'l', 'o'], ['l', 'o', ' ']];
const ctxGroup = [];
for (let i = 0; i < CTX.length; i++) {
  const g = [];
  for (let j = 0; j < 3; j++) {
    g.push(new VBox(scene, { w: 36, h: 36, d: 36, x: 40 + i * 160 + j * 48, y: 270, z: 0, label: CTX[i][j], color: DIM, emissive: 0 }));
  }
  ctxGroup.push(g);
}
const ctxT = new VText(scene, { text: '', x: 700, y: 265, z: 0, color: PALETTE.textDim, scale: 0.5, wrapChars: 8 });

const ring = new VTorus(scene, { radius: 20, x: 68, y: 475, color: GOLD });
ring.mesh.visible = false;

function resetAll() {
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  ring.mesh.visible = false;
  outText.setText('');
  hexT1.setText(''); hexT2.setText(''); statT.setText('');
  for (const g of ctxGroup) for (const b of g) { b.setColor(DIM, 0); b.setText(''); }
  ctxT.setText('');
}

function* runCompress() {
  yield S(resetAll);
  yield S(() => { hint.setText('阶段 1 · 字典匹配：' + INPUT.slice(0, 6) + ' 后全部是重复的 ' + INPUT.slice(0, 6) + '…'); });
  yield W(400);
  const parts = [];
  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti];
    if (t.type === 'lit') {
      const p0 = pos(t.start);
      yield S(() => ring.mesh.visible = true);
      yield A(300, p => { ring.mesh.position.x = p0.x; ring.mesh.position.y = p0.y; });
      yield S(() => {
        for (let i = 0; i < t.n; i++) boxes[t.start + i].setColor(BLUE, BLUE);
        hint.setText('字面 ' + INPUT.slice(t.start, t.start + t.n) + ' 直接输出');
      });
      yield W(600);
      yield S(() => {
        for (let i = 0; i < t.n; i++) boxes[t.start + i].setColor(GREEN, GREEN);
        parts.push(INPUT.slice(t.start, t.start + t.n));
        outText.setText('字典输出：' + parts.join(' '));
      });
      yield W(300);
    } else {
      const dstC = pos(Math.round((t.dst[0] + t.dst[1]) / 2));
      yield S(() => ring.mesh.visible = true);
      yield A(300, p => { ring.mesh.position.x = dstC.x; ring.mesh.position.y = dstC.y; });
      yield S(() => {
        for (let i = t.src[0]; i <= t.src[1]; i++) boxes[i].setColor(YELLOW, YELLOW);
        for (let i = t.dst[0]; i <= t.dst[1]; i++) boxes[i].setColor(GREEN, GREEN);
        hint.setText('重复「' + INPUT.slice(t.dst[0], t.dst[0] + t.len) + '」在 6 字节前出现过 → 指针 M(6,6)');
      });
      yield W(700);
      yield S(() => {
        parts.push('M(6,6)');
        outText.setText('字典输出：' + parts.join(' '));
      });
      yield W(300);
    }
  }
  yield S(() => { statT.setText('匹配输出 ' + parts.join(' ') + ' → 进入上下文建模与熵编码'); });
  yield W(600);
  // 阶段 2 · 上下文建模
  yield S(() => { ring.mesh.visible = false; hint.setText('阶段 2 · 上下文建模：用前 2 个字符预测下一个字符（Brotli 特色）'); });
  yield W(500);
  for (let ci = 0; ci < CTX.length; ci++) {
    const g = ctxGroup[ci];
    yield S(() => {
      g[0].setColor(BLUE, BLUE); g[1].setColor(BLUE, BLUE);
      g[2].setColor(YELLOW, YELLOW);
      ctxT.setText('上下文 「' + CTX[ci][0] + CTX[ci][1] + '」 预测下一字符「' + CTX[ci][2] + '」');
    });
    yield W(650);
    yield S(() => g[2].setColor(GREEN, GREEN));
    yield W(350);
  }
  // 阶段 3 · 熵编码
  yield S(() => { hint.setText('阶段 3 · 熵编码：上下文概率模型 + 二阶哈夫曼编码输出字节流'); });
  yield W(400);
  yield S(() => {
    hexT1.setText('输出 23 字节：1b 22 00 f8 8d 94 6e de 44 55 86 96');
    hexT2.setText('              6c 20 6f 35 08 3d 75 40 0c 29 8e');
  });
  yield W(900);
  yield S(() => {
    statT.setText('35 字节 → 23 字节（1.52×，含字典/上下文/熵编码三层，brotli 实测）');
    status.textContent = 'Brotli 压缩完成：35 → 23 字节';
    hint.setText('解压按逆序：熵解码 → 上下文反建模 → 字典展开，无损还原原文');
  });
  yield W(500);
}

engine.queue(() => runCompress());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄 = 源匹配，绿 = 目标；Brotli 是 Google 的通用压缩器，HTTP 传输优化利器）');

scene.start(engine);
