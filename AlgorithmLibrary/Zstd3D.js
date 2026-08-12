// AlgorithmLibrary/Zstd3D.js — Zstandard：哈希链插入 + 查表匹配解析 + 金环扫描（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Zstd3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 680], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, DIM = 0x334155, GOLD = 0xfcd34d;
const hint = new VText(scene, { text: '点击「运行演示」开始', x: 0, y: 275, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const INPUT = 'mississippi mississippi mississippi';
const SP = 32, BOX = 30;
const pos = i => i < 18 ? { x: -272 + i * SP, y: 175 } : { x: -272 + (i - 18) * SP, y: 100 };
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  const p = pos(i);
  boxes.push(new VBox(scene, { w: BOX, h: BOX, d: BOX, x: p.x, y: p.y, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
new VText(scene, { text: '输入（35 字符）', x: -350, y: 230, z: 0, color: PALETTE.textDim, scale: 0.7 });

const HSP = 38, HX0 = -304;
const slots = [];
for (let i = 0; i < 16; i++) {
  slots.push(new VBox(scene, { w: 34, h: 34, d: 34, x: HX0 + i * HSP, y: -50, z: 0, label: '', color: DIM, emissive: 0 }));
}
new VText(scene, { text: '哈希表（3 字节 → 16 槽，xxHash 简化）', x: -330, y: -15, z: 0, color: PALETTE.textDim, scale: 0.6 });
const outText = new VText(scene, { text: '', x: 0, y: -140, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const statT = new VText(scene, { text: '', x: 0, y: -195, z: 0, color: PALETTE.textDim, scale: 0.7 });

const INS = [{ i: 0, slot: 3 }, { i: 1, slot: 3 }, { i: 2, slot: 9 }, { i: 3, slot: 3 }, { i: 7, slot: 0 }, { i: 9, slot: 9 }];
const slotHead = new Array(16).fill(null);

const ring = new VTorus(scene, { radius: 20, x: 0, y: 175, color: GOLD });
ring.mesh.visible = false;

function resetAll() {
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  ring.mesh.visible = false;
  for (const s of slots) { s.setColor(DIM, 0); s.setText(''); }
  slotHead.fill(null);
  outText.setText('');
  statT.setText('');
}

function* runCompress() {
  yield S(resetAll);
  yield S(() => { hint.setText('Zstd：3 字节滑动窗口计算哈希 → 链式查表找最长匹配'); });
  yield W(400);
  // 阶段 1 · 哈希插入
  for (let ii = 0; ii < INS.length; ii++) {
    const ins = INS[ii];
    const p0 = pos(ins.i);
    yield S(() => ring.mesh.visible = true);
    yield A(300, p => { ring.mesh.position.x = p0.x; ring.mesh.position.y = p0.y; });
    yield S(() => {
      for (let k = 0; k < 3; k++) boxes[ins.i + k].setColor(BLUE, BLUE);
      hint.setText('idx' + ins.i + ' 「' + INPUT.slice(ins.i, ins.i + 3) + '」 → 哈希槽 ' + ins.slot + '（插入链表头部）');
    });
    yield W(650);
    yield S(() => {
      slots[ins.slot].setColor(YELLOW, YELLOW);
      slotHead[ins.slot] = ins.i;
      slots[ins.slot].setText(String(ins.i));
    });
    yield W(450);
    yield S(() => {
      slots[ins.slot].setColor(DIM, 0);
      for (let k = 0; k < 3; k++) boxes[ins.i + k].setColor(PALETTE.node, PALETTE.nodeEmissive);
    });
    yield W(300);
  }
  // 阶段 2 · 查表解析
  yield S(() => { hint.setText('解析 idx0..11：前 12 个字符无长匹配 → 全部字面输出'); });
  yield W(250);
  yield S(() => { for (let i = 0; i < 12; i++) boxes[i].setColor(BLUE, BLUE); });
  yield W(800);
  yield S(() => {
    outText.setText('输出：mississippi  （12 字面）');
    hint.setText('解析 idx12：查表槽 3 → 链上命中 idx0（首字符 m 匹配）→ 贪心扩展');
  });
  yield W(1000);
  yield S(() => {
    slots[3].setColor(YELLOW, YELLOW);
    for (let i = 0; i < 12; i++) boxes[i].setColor(YELLOW, YELLOW);
    for (let i = 12; i < 24; i++) boxes[i].setColor(GREEN, GREEN);
    hint.setText('idx12 起 12 字符「mississippi 」= idx0 内容 → 指针 M(12,12)');
  });
  yield W(900);
  yield S(() => {
    slots[3].setColor(DIM, 0); slots[3].setText('12');
    for (let i = 0; i < 12; i++) boxes[i].setColor(PALETTE.node, PALETTE.nodeEmissive);
    outText.setText('输出：mississippi  M(12,12)');
    hint.setText('解析 idx24：查表槽 3 → 命中 idx12 → 贪心扩展 11 个字符到结尾');
  });
  yield W(1000);
  yield S(() => {
    slots[3].setColor(YELLOW, YELLOW);
    for (let i = 12; i < 23; i++) boxes[i].setColor(YELLOW, YELLOW);
    for (let i = 24; i < 35; i++) boxes[i].setColor(GREEN, GREEN);
    hint.setText('idx24 起 11 字符「mississippi」= idx12 内容 → 指针 M(12,11)');
  });
  yield W(900);
  yield S(() => {
    slots[3].setColor(DIM, 0);
    outText.setText('输出：mississippi  M(12,12)  M(12,11)');
    statT.setText('12 + 2 + 2 = 16 字节 vs 35 字节（54% 压缩，FSE 熵编码前 LZ77 层）');
    status.textContent = 'Zstd 压缩完成：35 → 16 字节';
    hint.setText('剩余工作：token 经 FSE 有限状态熵编码输出压缩流（zstd 全程实测）');
  });
  yield W(500);
}

panel.addButton('运行演示', () => engine.start(runCompress()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄 = 源匹配，绿 = 目标；Zstandard 是 Facebook 的高压缩比、高速度压缩器）');

scene.start(engine);
