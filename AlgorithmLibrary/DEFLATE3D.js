// AlgorithmLibrary/DEFLATE3D.js — DEFLATE：LZ77 贪心匹配 + Huffman 熵编码
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DEFLATE3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 660], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行压缩」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const INPUT = 'abracadabra abracadabra abracadabra';
const SP = 32, W = 30;
const pos = i => i < 18 ? { x: -272 + i * SP, y: 165 } : { x: -272 + (i - 18) * SP, y: 90 };
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  const p = pos(i);
  boxes.push(new VBox(scene, { w: W, h: W, d: W, x: p.x, y: p.y, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
const arrow = new VArrow(scene, { x: 0, y: 245, z: 0 });
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

function resetAll() {
  engine.clear();
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  arrow.moveTo(0, 245, 0, 1);
  outText.setText('');
  statT.setText('');
}

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
  bars.push({ ch, f, box: new VBox(scene, { w: 54, h: h, d: 30, x: -175 + i * 70, y: -100 + h / 2, z: 0, label: '', color: DIM, emissive: 0 }) });
  bars[i].freqT = new VText(scene, { text: '', x: -175 + i * 70, y: -100 + h + 24, z: 0, color: PALETTE.textDim, scale: 0.55 });
}
const codeTexts = [];
for (let i = 0; i < 6; i++) {
  codeTexts.push(new VText(scene, { text: '', x: i < 3 ? -330 : -90, y: -205 + (i % 3) * 42, z: 0, color: PALETTE.textGlow, scale: 0.65 }));
}

function runCompress() {
  resetAll();
  hint.setText('阶段 1 · LZ77：贪心扫描，窗口内找最长匹配输出指针');
  const parts = [];
  let ti = 0, outBytes = 0;
  const nextTok = () => {
    if (ti >= tokens.length) {
      statT.setText('LZ77 输出 ' + parts.join(' ') + ' → 经 Huffman 熵编码后共 23 字节（zlib 实测，35 → 23）');
      C(300, runHuffman);
      return;
    }
    const t = tokens[ti]; ti++;
    if (t.type === 'lit') {
      const p0 = pos(t.start);
      arrow.moveTo(p0.x, p0.y + 70, 0, 300);
      C(150, () => {
        for (let i = 0; i < t.n; i++) boxes[t.start + i].setColor(BLUE, BLUE);
        hint.setText('字面 ' + INPUT.slice(t.start, t.start + t.n) + '（' + t.n + ' 个）直接输出');
      });
      C(650, () => {
        parts.push(INPUT.slice(t.start, t.start + t.n));
        outText.setText('LZ77 输出：' + parts.join(' '));
        outBytes += t.n;
      });
      C(380, nextTok);
    } else {
      const dstC = pos(Math.round((t.dst[0] + t.dst[1]) / 2));
      arrow.moveTo(dstC.x, dstC.y + 70, 0, 350);
      C(150, () => {
        for (let i = t.src[0]; i <= t.src[1]; i++) boxes[i].setColor(YELLOW, YELLOW);
        for (let i = t.dst[0]; i <= t.dst[1]; i++) boxes[i].setColor(GREEN, GREEN);
        hint.setText('窗口匹配：「' + INPUT.slice(t.dst[0], t.dst[0] + t.len) + '」在距 ' + t.off + ' 处出现过，长 ' + t.len + ' → M(' + t.off + ',' + t.len + ')');
      });
      C(800, () => {
        parts.push('M(' + t.off + ',' + t.len + ')');
        outText.setText('LZ77 输出：' + parts.join(' '));
        outBytes += 2;
      });
      C(380, nextTok);
    }
  };
  nextTok();

  function runHuffman() {
    hint.setText('阶段 2 · Huffman：统计字符频率，构建最优前缀码');
    let bi = 0;
    const nextBar = () => {
      if (bi >= FREQS.length) { C(400, () => { mergeStep(0); }); return; }
      const b = bars[bi]; bi++;
      C(200, () => { b.box.setColor(YELLOW, YELLOW); b.box.setLabel(b.ch); b.freqT.setText('频率 ' + b.f); });
      C(300, () => { b.box.setColor(GREEN, GREEN); });
      C(200, nextBar);
    };
    nextBar();

    function mergeStep(k) {
      if (k >= merges.length) {
        C(400, () => {
          status.textContent = 'DEFLATE 完成：35 → 23 字节';
          let totalBits = 0;
          FREQS.forEach(([ch, f]) => { totalBits += codes[ch].length * f; });
          FREQS.forEach(([ch, f], i) => {
            codeTexts[i].setText(ch + ' → ' + codes[ch] + '（' + codes[ch].length + ' 位）');
          });
          hint.setText('码字总长 ' + totalBits + ' 位 = ' + (totalBits / 8).toFixed(1) + ' 字节，高频字符 a 仅 1 位（压缩 ~3.5×）');
        });
        return;
      }
      const m = merges[k];
      const xI = bars.findIndex(b => (b.ch === m.x || b.f === m.xf) && !b.done);
      const yI = bars.findIndex((b, i) => i !== xI && (b.ch === m.y || b.f === m.yf) && !b.done);
      C(150, () => { bars[xI].box.setColor(YELLOW, YELLOW); bars[yI].box.setColor(YELLOW, YELLOW); });
      C(700, () => {
        hint.setText('合并：' + (m.x === m.xf ? m.xf : m.x) + '(' + m.xf + ') + ' + (m.y === m.yf ? m.yf : m.y) + '(' + m.yf + ') → ' + m.f);
        bars[xI].box.setColor(DIM, 0); bars[yI].box.setColor(DIM, 0);
        bars[xI].done = true; bars[yI].done = true;
        const h = m.f * 12;
        const nx = (bars[xI].box.x + bars[yI].box.x) / 2;
        const nb = new VBox(scene, { w: 54, h: h, d: 30, x: nx, y: -100 + h / 2, z: 0, label: m.f, color: GREEN, emissive: GREEN });
        bars.push({ ch: m.f, f: m.f, done: false, box: nb });
      });
      C(400, () => { mergeStep(k + 1); });
    }
  }
}

panel.addButton('运行压缩', runCompress);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；DEFLATE 是 gzip/zlib 的核心算法）');

scene.start(engine);
