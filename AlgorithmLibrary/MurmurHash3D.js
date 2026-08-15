// AlgorithmLibrary/MurmurHash3D.js — MurmurHash3 32bit：4 字节块「×c1→左旋15→×c2」混合 k，再「⊕k→左旋13→×5+常量」混入 h，尾部折叠 + fmix 终混（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('MurmurHash3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const CYAN = 0x67e8f9, GOLD = 0xfcd34d, DIM = 0x334155, ROSE = 0xfb7185, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');
const E = p => p * p * (3 - 2 * p);
const hex = v => v.toString(16).padStart(8, '0');

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
    steps.push({ kind: 'kRaw', stage: '块' + (i / 4 + 1), k, h, op: '4 字节小端拼成 k' });
    k = (k * c1) >>> 0; k = rotl(k, 15); k = (k * c2) >>> 0;
    h ^= k; h = rotl(h, 13); h = (h * m + n) >>> 0;
    steps.push({ kind: 'kMix', stage: '块' + (i / 4 + 1) + ' 已混入', k, h, op: 'k × 0xcc9e2d51 → 左旋 15 → × 0x1b873593 → h ⊕= k → 左旋 13 → ×5 + 0xe6546b64' });
  }
  const tail = b.slice(i);
  let kt = 0;
  for (let j = 0; j < tail.length; j++) kt |= tail[j] << (8 * j);
  if (tail.length) {
    steps.push({ kind: 'kRaw', stage: '尾部', k: kt >>> 0, h, op: '不足 4 字节的尾巴折叠为 k' });
    kt = (kt * c1) >>> 0; kt = rotl(kt, 15); kt = (kt * c2) >>> 0;
    steps.push({ kind: 'kMix', stage: '尾部 已混入', k: kt >>> 0, h, op: '尾部 k 同款三连混合' });
    h ^= kt >>> 0;
    steps.push({ kind: 'hMix', stage: '尾部 已异或', k: 0, h, op: 'h ⊕= 混合后的尾部 k' });
  }
  h ^= b.length;
  steps.push({ kind: 'len', stage: '长度混入', k: 0, h, op: 'h ⊕= 消息长度 ' + b.length + '（抹平短输入差异）' });
  h ^= h >>> 16; h = (h * 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = (h * 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  steps.push({ kind: 'fmix', stage: 'fmix', k: 0, h, op: 'fmix 终混：×3 轮大素数乘法 + 移位异或（雪崩扩散）' });
  return { steps, hex: hex(h), h: h >>> 0 };
}
const run1 = murmurRun(MSG);
const run2 = murmurRun('hello worle');
const bytes = new TextEncoder().encode(MSG);

// ---- 预建对象（模块级，运行期仅改文字/颜色/位置/显隐）----
const BYTE_X = i => 320 + (i - 5) * 34;
const byteBoxes = [...bytes].map((v, i) =>
  new VBox(scene, { w: 26, h: 26, d: 26, x: BYTE_X(i), y: 630, z: 0, label: v.toString(16).padStart(2, '0'), color: CYAN, emissive: CYAN }));
const kBox = new VBox(scene, { w: 190, h: 54, d: 54, x: 320, y: 535, z: 0, color: DIM, emissive: DIM });
const hBox = new VBox(scene, { w: 230, h: 60, d: 60, x: 320, y: 420, z: 0, color: DIM, emissive: DIM });
const token = new VBox(scene, { w: 18, h: 18, d: 18, x: 0, y: 0, z: 0, color: GOLD, emissive: GOLD });
token.mesh.visible = false;

function setBytes(from, to, color) {
  for (let i = 0; i < byteBoxes.length; i++) {
    const on = i >= from && i < to;
    byteBoxes[i].setColor(on ? color : CYAN, on ? color : CYAN);
  }
}
function resetAll() {
  bytes.forEach((v, i) => { byteBoxes[i].setText(v.toString(16).padStart(2, '0')); byteBoxes[i].setColor(CYAN, CYAN); });
  kBox.setColor(DIM, DIM); hBox.setColor(DIM, DIM);
  token.mesh.visible = false;
}
const flyTo = (p, fx, fy, tx, ty) => { const e = E(p); token.mesh.position.set(fx + (tx - fx) * e, fy + (ty - fy) * e, 0); };

function* playStep(s, tailBytes) {
  const gx = s.stage === '尾部' || tailBytes ? 456 : (BYTE_X((parseInt(s.stage[1], 10) - 1) * 4) + BYTE_X(parseInt(s.stage[1], 10) * 4 - 1)) / 2;
  if (s.kind === 'kRaw') {
    yield S(() => {
      if (s.stage === '尾部' || tailBytes) { setBytes(8, 11, GOLD); if (tailBytes) byteBoxes[10].setColor(ROSE, ROSE); }
      else setBytes((parseInt(s.stage[1], 10) - 1) * 4, parseInt(s.stage[1], 10) * 4, GOLD);
      kBox.setColor(CYAN, CYAN);
      token.mesh.position.set(gx, 630, 0);
      token.mesh.visible = true;
      status.textContent = s.stage + '：' + s.op + ' = 0x' + hex(s.k);
    });
    yield A(420, p => flyTo(p, gx, 630, 320, 535));
  } else if (s.kind === 'kMix') {
    yield S(() => {
      kBox.setColor(GOLD, GOLD);
      status.textContent = s.op + ' → h = 0x' + hex(s.h);
    });
    yield A(420, p => flyTo(p, 320, 535, 320, 420));
  } else if (s.kind === 'hMix' || s.kind === 'len') {
    yield S(() => {
      hBox.setColor(GOLD, GOLD);
      status.textContent = s.op + ' → h = 0x' + hex(s.h);
    });
    yield W(550);
  } else {
    yield S(() => {
      setBytes(0, 11, ROSE);
      hBox.setColor(GREEN, GREEN);
      token.mesh.visible = false;
      status.textContent = s.op + ' → MurmurHash3「' + MSG + '」= 0x' + hex(s.h);
    });
    yield W(900);
  }
}

function* murmurGen() {
  resetAll();
  yield S(() => { status.textContent = 'MurmurHash3：把「hello world」（11 字节）切成 2 个 4 字节块 + 3 字节尾部，逐块做「乘法 × 旋转 × 异或」三连混合，最后 fmix 终混得 32 位摘要（seed=0）'; });
  yield W(900);
  for (const s of run1.steps) yield* playStep(s, false);
  yield S(() => {
    resetAll();
    byteBoxes[10].setText('65');
    byteBoxes[10].setColor(ROSE, ROSE);
    status.textContent = '雪崩对照：仅把最后 1 字节「d」(0x64) 改为「e」(0x65) → 「hello worle」，其余 10 字节不变，前两块混合完全相同，差异从尾部开始';
  });
  yield W(900);
  const tailIdx = run2.steps.findIndex(s => s.stage === '尾部');
  for (let t = tailIdx; t < run2.steps.length; t++) yield* playStep(run2.steps[t], true);
  yield S(() => { status.textContent = 'MurmurHash 演示完成：MurmurHash3「hello world」= 0x' + run1.hex + '，雪崩对照「hello worle」= 0x' + run2.hex + '（仅 1 字节之差，32 位完全打乱）；复杂度 O(n)，每块常数次乘法/旋转/异或'; });
  yield W(1000);
}

engine.queue(() => murmurGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
