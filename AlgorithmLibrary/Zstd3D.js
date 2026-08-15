// AlgorithmLibrary/Zstd3D.js — Zstandard：哈希链插入 + 查表匹配解析 + 金环扫描（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Zstd3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, DIM = 0x334155, GOLD = 0xfcd34d;
const status = panel.addStatus('就绪');

const INPUT = 'mississippi mississippi mississippi';
const SP = 32, BOX = 30;
const POS = [];
for (let i = 0; i < INPUT.length; i++) {
  POS.push(i < 18 ? { x: -272 + i * SP + 320, y: 470 } : { x: -272 + (i - 18) * SP + 320, y: 395 });
}
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  const p = POS[i];
  boxes.push(new VBox(scene, { w: BOX, h: BOX, d: BOX, x: p.x, y: p.y, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}

const HSP = 38, HX0 = 16;
const slots = [];
for (let i = 0; i < 16; i++) {
  slots.push(new VBox(scene, { w: 34, h: 34, d: 34, x: HX0 + i * HSP, y: 250, z: 0, label: '', color: DIM, emissive: 0 }));
}

const INS = [{ i: 0, slot: 3 }, { i: 1, slot: 3 }, { i: 2, slot: 9 }, { i: 3, slot: 3 }, { i: 7, slot: 0 }, { i: 9, slot: 9 }];
const slotHead = new Array(16).fill(null);

const ring = new VTorus(scene, { radius: 20, x: 0, y: 470, color: GOLD });
ring.mesh.visible = false;

function resetAll() {
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  ring.mesh.visible = false;
  for (const s of slots) { s.setColor(DIM, 0); s.setText(''); }
  slotHead.fill(null);
}

function* runCompress() {
  yield S(resetAll);
  yield W(200);
  yield S(() => { status.textContent = 'Zstd：3 字节滑动窗口计算哈希 → 链式查表找最长匹配（LZ77 层，后接 FSE 熵编码）'; });
  yield W(500);
  // 阶段 1 · 哈希插入
  for (let ii = 0; ii < INS.length; ii++) {
    const ins = INS[ii];
    const p0 = POS[ins.i];
    yield S(() => {
      ring.mesh.visible = true;
      ring.mesh.position.x = p0.x;
      ring.mesh.position.y = p0.y;
      status.textContent = 'idx' + ins.i + ' 「' + INPUT.slice(ins.i, ins.i + 3) + '」 → 哈希槽 ' + ins.slot + '（插入链表头部）';
    });
    yield W(600);
    yield S(() => {
      for (let k = 0; k < 3; k++) boxes[ins.i + k].setColor(BLUE, BLUE);
      slots[ins.slot].setColor(YELLOW, YELLOW);
      slotHead[ins.slot] = ins.i;
      slots[ins.slot].setText(String(ins.i));
      status.textContent = '槽 ' + ins.slot + ' 链头更新为 idx' + ins.i;
    });
    yield W(550);
    yield S(() => {
      slots[ins.slot].setColor(DIM, 0);
      for (let k = 0; k < 3; k++) boxes[ins.i + k].setColor(PALETTE.node, PALETTE.nodeEmissive);
    });
    yield W(350);
  }
  // 阶段 2 · 查表解析
  yield S(() => { status.textContent = '解析 idx0..11：前 12 个字符无长匹配 → 全部字面输出'; });
  yield W(500);
  yield S(() => {
    for (let i = 0; i < 12; i++) boxes[i].setColor(BLUE, BLUE);
    status.textContent = '输出：mississippi（12 字面）';
  });
  yield W(800);
  yield S(() => { status.textContent = '解析 idx12：查表槽 3 → 链上命中 idx0（首字符 m 匹配）→ 贪心扩展'; });
  yield W(800);
  yield S(() => {
    slots[3].setColor(YELLOW, YELLOW);
    for (let i = 0; i < 12; i++) boxes[i].setColor(YELLOW, YELLOW);
    for (let i = 12; i < 24; i++) boxes[i].setColor(GREEN, GREEN);
    status.textContent = 'idx12 起 12 字符「mississippi 」= idx0 内容 → 指针 M(12,12)';
  });
  yield W(800);
  yield S(() => {
    slots[3].setColor(DIM, 0);
    slots[3].setText('12');
    for (let i = 0; i < 12; i++) boxes[i].setColor(PALETTE.node, PALETTE.nodeEmissive);
    status.textContent = '输出：mississippi M(12,12)';
  });
  yield W(800);
  yield S(() => { status.textContent = '解析 idx24：查表槽 3 → 命中 idx12 → 贪心扩展 11 个字符到结尾'; });
  yield W(800);
  yield S(() => {
    slots[3].setColor(YELLOW, YELLOW);
    for (let i = 12; i < 23; i++) boxes[i].setColor(YELLOW, YELLOW);
    for (let i = 24; i < 35; i++) boxes[i].setColor(GREEN, GREEN);
    status.textContent = 'idx24 起 11 字符「mississippi」= idx12 内容 → 指针 M(12,11)';
  });
  yield W(800);
  yield S(() => {
    slots[3].setColor(DIM, 0);
    for (let i = 12; i < 23; i++) boxes[i].setColor(PALETTE.node, PALETTE.nodeEmissive);
    for (let i = 24; i < 35; i++) boxes[i].setColor(PALETTE.node, PALETTE.nodeEmissive);
    ring.mesh.visible = false;
    status.textContent = 'Zstd 演示完成：35 → 16 字节（12 字面 + 2 指针，LZ77 层压缩 54%，FSE 熵编码前）';
  });
  yield W(500);
}

engine.queue(() => runCompress());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
