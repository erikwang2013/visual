// AlgorithmLibrary/DEFLATE3D.js — DEFLATE：LZ77 贪心匹配 + 频率柱 + Huffman 合并 + 码表揭示（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DEFLATE3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 660], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, DIM = 0x334155, GOLD = 0xfcd34d;
const hint = new VText(scene, { text: '点击「▶ 演示」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const INPUT = 'abracadabra abracadabra abracadabra';
const SP = 32, BOX = 30;
const pos = i => i < 18 ? { x: -272 + i * SP, y: 165 } : { x: -272 + (i - 18) * SP, y: 90 };
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  const p = pos(i);
  boxes.push(new VBox(scene, { w: BOX, h: BOX, d: BOX, x: p.x, y: p.y, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
new VText(scene, { text: '输入（35 字符）', x: -350, y: 215, z: 0, color: PALETTE.textDim, scale: 0.7 });
const outText = new VText(scene, { text: '', x: 0, y: -30, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const statT = new VText(scene, { text: '', x: 0, y: -95, z: 0, color: PALETTE.textDim, scale: 0.7 });

const tokens = [
  { type: 'lit', n: 7, start: 0 },
  { type: 'lit', n: 1, start: 7 },
  { type: 'match', off: 7, len: 4, src: [0, 3], dst: [7, 10] },
  { type: 'lit', n: 1, start: 11 },
  { type: 'lit', n: 1, start: 12 },
  { type: 'match', off: 12, len: 23, src: [0, 22], dst: [12, 34] },
];

const ring = new VTorus(scene, { radius: 20, x: 0, y: 165, color: GOLD });
ring.mesh.visible = false;

function huffman(freqs) {
  let pool = freqs.map(([ch, f]) => ({ ch, f, l: null, r: null }));
  const merges = [];
  while (pool.length > 1) {
    pool.sort((a, b) => a.f - b.f);
    const x = pool.shift(), y = pool.shift();
    merges.push({ x: x.ch || x.f, xf: x.f, y: y.ch || y.f, yf: y.f, f: x.f + y.f });
    pool.push({ ch: '', f: x.f + y.f, l: x, r: y });
  }
  const codes = {};
  const walk = (n, pre) => {
    if (n.ch) codes[n.ch] = pre;
    else { walk(n.l, pre + '0'); walk(n.r, pre + '1'); }
  };
  walk(pool[0], '');
  return { codes, merges };
}

const FREQS = [[' ', 2], ['c', 3], ['d', 3], ['b', 6], ['r', 6], ['a', 15]];
const { codes, merges } = huffman(FREQS);
const bars = [];
for (let i = 0; i < FREQS.length; i++) {
  const [ch, f] = FREQS[i];
  const h = f * 12;
  bars.push({ ch, f, done: false, tmp: false, box: new VBox(scene, { w: 54, h: h, d: 30, x: -175 + i * 70, y: -100 + h / 2, z: 0, label: '', color: DIM, emissive: 0 }) });
  bars[i].freqT = new VText(scene, { text: '', x: -175 + i * 70, y: -100 + h + 24, z: 0, color: PALETTE.textDim, scale: 0.55 });
}
const codeTexts = [];
for (let i = 0; i < 6; i++) {
  codeTexts.push(new VText(scene, { text: '', x: i < 3 ? -330 : -90, y: -205 + (i % 3) * 42, z: 0, color: PALETTE.textGlow, scale: 0.65 }));
}

function resetAll() {
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  ring.mesh.visible = false;
  outText.setText('');
  statT.setText('');
  codeTexts.forEach(t => t.setText(''));
  for (const b of bars) {
    b.freqT.setText('');
    if (b.tmp) b.box.remove();
    else { b.box.setColor(DIM, 0); b.done = false; }
  }
  bars.length = FREQS.length;
}

function* runCompress() {
  yield S(resetAll);
  yield S(() => { hint.setText('阶段 1 · LZ77：贪心扫描，窗口内找最长匹配输出指针'); });
  yield W(400);
  const parts = [];
  let outBytes = 0;
  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti];
    if (t.type === 'lit') {
      const p0 = pos(t.start);
      yield S(() => ring.mesh.visible = true);
      yield A(300, p => { ring.mesh.position.x = p0.x; ring.mesh.position.y = p0.y; });
      yield S(() => {
        for (let i = 0; i < t.n; i++) boxes[t.start + i].setColor(BLUE, BLUE);
        hint.setText('字面 ' + INPUT.slice(t.start, t.start + t.n) + '（' + t.n + ' 个）直接输出');
      });
      yield W(600);
      yield S(() => {
        for (let i = 0; i < t.n; i++) boxes[t.start + i].setColor(GREEN, GREEN);
        parts.push(INPUT.slice(t.start, t.start + t.n));
        outText.setText('LZ77 输出：' + parts.join(' '));
        outBytes += t.n;
      });
      yield W(380);
    } else {
      const dstC = pos(Math.round((t.dst[0] + t.dst[1]) / 2));
      yield S(() => ring.mesh.visible = true);
      yield A(300, p => { ring.mesh.position.x = dstC.x; ring.mesh.position.y = dstC.y; });
      yield S(() => {
        for (let i = t.src[0]; i <= t.src[1]; i++) boxes[i].setColor(YELLOW, YELLOW);
        for (let i = t.dst[0]; i <= t.dst[1]; i++) boxes[i].setColor(GREEN, GREEN);
        hint.setText('窗口匹配：「' + INPUT.slice(t.dst[0], t.dst[0] + t.len) + '」在距 ' + t.off + ' 处出现过，长 ' + t.len + ' → M(' + t.off + ',' + t.len + ')');
      });
      yield W(750);
      yield S(() => {
        parts.push('M(' + t.off + ',' + t.len + ')');
        outText.setText('LZ77 输出：' + parts.join(' '));
        outBytes += 2;
      });
      yield W(380);
    }
  }
  yield S(() => { statT.setText('LZ77 输出 ' + parts.join(' ') + ' → 经 Huffman 熵编码后共 23 字节（zlib 实测，35 → 23）'); });
  yield W(600);
  // 阶段 2 · Huffman 频率柱
  yield S(() => { ring.mesh.visible = false; hint.setText('阶段 2 · Huffman：统计字符频率，构建最优前缀码'); });
  yield W(500);
  for (let bi = 0; bi < FREQS.length; bi++) {
    const b = bars[bi];
    yield S(() => { b.box.setColor(YELLOW, YELLOW); b.box.setText(b.ch); b.freqT.setText('频率 ' + b.f); });
    yield W(450);
    yield S(() => b.box.setColor(GREEN, GREEN));
    yield W(250);
  }
  for (let k = 0; k < merges.length; k++) {
    const m = merges[k];
    const xI = bars.findIndex(b => (b.ch === m.x || b.f === m.xf) && !b.done);
    const yI = bars.findIndex((b, i) => i !== xI && (b.ch === m.y || b.f === m.yf) && !b.done);
    yield S(() => { bars[xI].box.setColor(YELLOW, YELLOW); bars[yI].box.setColor(YELLOW, YELLOW); });
    yield W(650);
    const h = m.f * 12;
    const nx = (bars[xI].box.x + bars[yI].box.x) / 2;
    const nb = new VBox(scene, { w: 54, h: h, d: 30, x: nx, y: -100 + h / 2, z: 0, label: m.f, color: GREEN, emissive: GREEN });
    nb.mesh.scale.y = 0.01;
    yield S(() => {
      hint.setText('合并：' + (m.x === m.xf ? m.xf : m.x) + '(' + m.xf + ') + ' + (m.y === m.yf ? m.yf : m.y) + '(' + m.yf + ') → ' + m.f);
      bars[xI].box.setColor(DIM, 0); bars[yI].box.setColor(DIM, 0);
      bars[xI].done = true; bars[yI].done = true;
      bars.push({ ch: m.f, f: m.f, done: false, tmp: true, box: nb, freqT: new VText(scene, { text: '', x: nx, y: -100 + h + 24, z: 0, color: PALETTE.textDim, scale: 0.55 }) });
    });
    yield A(400, p => { nb.mesh.scale.y = 0.01 + 0.99 * p; });
    yield W(400);
  }
  const totalBits = FREQS.reduce((s, [ch, f]) => s + codes[ch].length * f, 0);
  yield S(() => {
    status.textContent = 'DEFLATE 完成：35 → 23 字节';
    FREQS.forEach(([ch, f], i) => codeTexts[i].setText(ch + ' → ' + codes[ch] + '（' + codes[ch].length + ' 位）'));
    hint.setText('码字总长 ' + totalBits + ' 位 = ' + (totalBits / 8).toFixed(1) + ' 字节，高频字符 a 仅 1 位（压缩 ~3.5×）');
  });
  yield W(500);
}

engine.queue(() => runCompress());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄 = 源匹配，绿 = 目标；DEFLATE 是 gzip/zlib 的核心算法）');

scene.start(engine);
