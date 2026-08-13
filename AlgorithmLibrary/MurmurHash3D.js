// AlgorithmLibrary/MurmurHash3D.js — MurmurHash3：乘法×旋转×异或三连混合 + fmix 终混，非加密但极快（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MurmurHash3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, MAG = 0xf0abfc, CYAN = 0x67e8f9, ROSE = 0xfb7185;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：MurmurHash3', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');

const MSG = 'hello world';
const rotl = (v, n) => ((v << n) | (v >>> (32 - n))) >>> 0;
function murmurRun(str) {
  const b = new TextEncoder().encode(str);
  const c1 = 0xcc9e2d51, c2 = 0x1b873593, m = 5, n = 0xe6546b64;
  let h = 0;
  const steps = [];
  let i = 0;
  for (; i + 4 <= b.length; i += 4) {
    let k = (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) >>> 0;
    steps.push({ stage: '块' + (i / 4 + 1), k, h, op: 'k × c1 → 左旋15 → × c2' });
    k = (k * c1) >>> 0; k = rotl(k, 15); k = (k * c2) >>> 0;
    h ^= k; h = rotl(h, 13); h = (h * m + n) >>> 0;
    steps.push({ stage: '块' + (i / 4 + 1) + ' 已混入', k, h, op: 'h ⊕ k → 左旋13 → ×5 + 0xe6546b64' });
  }
  const tail = b.slice(i);
  let kt = 0;
  for (let j = 0; j < tail.length; j++) kt |= tail[j] << (8 * j);
  if (tail.length) {
    steps.push({ stage: '尾部', k: kt >>> 0, h, op: '不足 4 字节的尾巴单独折叠' });
    kt = (kt * c1) >>> 0; kt = rotl(kt, 15); kt = (kt * c2) >>> 0;
    h ^= kt >>> 0;
  }
  h ^= b.length;
  steps.push({ stage: 'fmix 前', k: 0, h, op: 'h ⊕ 消息长度' });
  h ^= h >>> 16; h = (h * 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = (h * 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  steps.push({ stage: 'fmix', k: 0, h, op: 'fmix：×3 轮乘大素数 + 移位异或（雪崩扩散）' });
  return { steps, hex: (h >>> 0).toString(16).padStart(8, '0'), h: h >>> 0 };
}
const run1 = murmurRun(MSG);
const run2 = murmurRun('hello worle');

const bytes = new TextEncoder().encode(MSG);
const bt = [];
bytes.forEach((v, i) => {
  bt.push(new VBox(scene, { w: 26, h: 26, d: 26, x: 320 + (i - 5) * 32, y: 455, z: 0, label: v.toString(16).padStart(2, '0'), color: CYAN, emissive: CYAN }));
});
const mixer = new VBox(scene, { w: 90, h: 70, d: 70, x: 320, y: 335, z: 0, label: '混合器', color: MAG, emissive: MAG });
const hBox = new VBox(scene, { w: 180, h: 55, d: 55, x: 320, y: 205, z: 0, label: 'h = 00000000', color: DIM, emissive: DIM });
new VText(scene, { text: '输入 11 字节：2 个完整 4 字节块 + 3 字节尾部', x: 700, y: 320, z: 0, color: PALETTE.textDim, scale: 0.55, wrapChars: 8 });
new VText(scene, { text: '块混合：k×c1 → 左旋15 → ×c2 → h⊕k → 左旋13 → ×5+常量', x: 700, y: 220, z: 0, color: PALETTE.textDim, scale: 0.55, wrapChars: 8 });
const stageT = new VText(scene, { text: '', x: 320, y: 555, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });

function resetAll() {
  bt.forEach((b, i) => { b.setText(bytes[i].toString(16).padStart(2, '0')); b.setColor(CYAN, CYAN); });
  hBox.setColor(DIM, DIM); hBox.setText('h = 00000000');
  stageT.setText(''); outT.setText('');
}

function* murmurGen() {
  resetAll();
  yield S(() => hint.setText('MurmurHash 目标：非加密但分布极均匀、速度极快 —— Redis/Elasticsearch/Java HashMap 都在用'));
  yield S(() => { stageT.setText('字节流按 4 字节切块（小端拼成 32bit），不足 4 字节进"尾部"'); });
  yield W(700);
  for (const s of run1.steps) {
    yield S(() => {
      if (s.stage.startsWith('块')) {
        const bi = parseInt(s.stage.match(/\d/)[0]) - 1;
        bt.forEach((b, i) => b.setColor(i >= bi * 4 && i < bi * 4 + 4 ? GOLD : CYAN, i >= bi * 4 && i < bi * 4 + 4 ? GOLD : CYAN));
      } else if (s.stage === '尾部') {
        bt.forEach((b, i) => b.setColor(i >= 8 ? GOLD : CYAN, i >= 8 ? GOLD : CYAN));
      } else {
        bt.forEach(b => b.setColor(ROSE, ROSE));
      }
      hBox.setColor(GOLD, GOLD);
      hBox.setText('h = ' + s.h.toString(16).padStart(8, '0'));
      stageT.setText(s.stage + '：' + s.op);
      hint.setText('当前摘要 h = 0x' + s.h.toString(16).padStart(8, '0') + ' —— 每步让 1 bit 输入影响更多输出位');
    });
    yield W(650);
  }
  yield S(() => {
    hBox.setColor(GREEN, GREEN);
    outT.setText('MurmurHash3("hello world") = 0x' + run1.hex + '（32bit，seed=0）');
    status.textContent = 'MurmurHash3("hello world") = 0x' + run1.hex;
    hint.setText('优势：SIMD 友好、无内存访问（随机性全靠算术），常用于布隆过滤器与哈希表');
  });
  yield W(800);
  yield S(() => {
    outT.setText('雪崩：MurmurHash3("hello worle") = 0x' + run2.hex + '  —  1 字符之差 → 32bit 完全打乱');
    status.textContent = '雪崩：0x' + run1.hex + ' → 0x' + run2.hex;
    hint.setText('只差 1 字符的两个输入，哈希值应无任何关联 —— 均匀分布的核心');
  });
  yield W(1100);
}

engine.queue(() => murmurGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；消息 "hello world"，对照 "hello worle"）');

scene.start(engine);
