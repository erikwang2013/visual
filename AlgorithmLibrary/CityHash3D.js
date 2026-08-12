// AlgorithmLibrary/CityHash3D.js — CityHash64：Google 设计，4 路并行混合 + 种子传播，64bit 散列（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CityHash3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, PUR = 0xc4b5fd, VIOLET = 0xa78bfa, ROSE = 0xfb7185;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：CityHash64', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const MSG = 'city hash demo!!';
const K1 = 0x9ae16a3b2f90404fn;
const K2 = 0xc3a5c85c97cb3127n;
const rot64 = (v, n) => BigInt.asUintN(64, (v << BigInt(n)) | (v >> BigInt(64 - n)));
function cityRun(str) {
  const b = new TextEncoder().encode(str);
  let x = 0x9ddfea08eb382d69n ^ BigInt(b.length);
  let y = K2;
  let z = K1;
  const steps = [];
  const load = (off) => {
    let v = 0n;
    for (let j = 7; j >= 0; j--) v = (v << 8n) | BigInt(off + j < b.length ? b[off + j] : 0);
    return v;
  };
  let a = load(0), c = load(8), d = load(16), f = 0n;
  steps.push({ stage: '初始化', a, c, d, x, y, z, op: '4 路状态 a/c/d + 种子 x,y,z（K1/K2 黄金常量）' });
  for (let r = 0; r < 2; r++) {
    d = BigInt.asUintN(64, rot64(d, 41) * K2); a ^= d; x = BigInt.asUintN(64, rot64(x, 15) * K1); d = BigInt.asUintN(64, d + a);
    steps.push({ stage: '混合轮 ' + (r + 1) + '（1/2）', a, c, d, x, y, z, op: 'd←rot41×K2 → a⊕=d → x←rot15×K1 → d+=a' });
    c = BigInt.asUintN(64, rot64(c, 25) * K2); y = BigInt.asUintN(64, rot64(y, 15) * K1); c = BigInt.asUintN(64, c + y);
    steps.push({ stage: '混合轮 ' + (r + 1) + '（2/2）', a, c, d, x, y, z, op: 'c←rot25×K2 → y←rot15×K1 → c+=y' });
  }
  f = rot64(BigInt.asUintN(64, BigInt.asUintN(64, rot64(c, 28) * K1) + x), 0);
  steps.push({ stage: '中间混合', a, c, d, x, y, z, op: 'f = mix(c)：rot28 × K1 + 种子 x' });
  x = BigInt.asUintN(64, x + rot64(f, 13)); y = BigInt.asUintN(64, y + rot64(f, 37)); z = BigInt.asUintN(64, z + rot64(f, 61));
  let out = rot64(BigInt.asUintN(64, y + z), 13);
  out = BigInt.asUintN(64, out * K1); out = BigInt.asUintN(64, out + (z ^ rot64(out, 17)));
  steps.push({ stage: '终混', a, c, d, x, y, z, op: 'x/y/z 各加 rot(f) 后折叠为 64bit 输出' });
  return { steps, hex: out.toString(16).padStart(16, '0') };
}
const run1 = cityRun(MSG);
const run2 = cityRun('city hash demo!a');

const bytes = new TextEncoder().encode(MSG);
const bt = [];
bytes.forEach((v, i) => {
  bt.push(new VBox(scene, { w: 26, h: 26, d: 26, x: (i - (bytes.length - 1) / 2) * 30, y: 165, z: 0, label: String.fromCharCode(v), color: VIOLET, emissive: VIOLET }));
});
const states = ['a', 'c', 'd', '种子 x'].map((name, i) =>
  new VBox(scene, { w: 150, h: 48, d: 48, x: -235 + i * 158, y: 45, z: 0, label: name + ' = 0', color: PUR, emissive: PUR }));
const outBox = new VBox(scene, { w: 240, h: 55, d: 55, x: 0, y: -95, z: 0, label: 'hash = 0', color: DIM, emissive: DIM });
new VText(scene, { text: '"city hash demo!!" = 16 字节 → 3 个 64bit 块并行载入 a/c/d', x: 0, y: 218, z: 0, color: PALETTE.textDim, scale: 0.7 });
new VText(scene, { text: '特色：4 路流水线并行', x: 0, y: -138, z: 0, color: PALETTE.textDim, scale: 0.6 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -190, z: 0, color: PALETTE.textGlow, scale: 0.7 });
const SNAME = ['a', 'c', 'd', '种子 x'];

function resetAll() {
  bt.forEach((b, i) => { b.setText(String.fromCharCode(bytes[i])); b.setColor(VIOLET, VIOLET); });
  states.forEach((s, i) => { s.setColor(PUR, PUR); s.setText(SNAME[i] + ' = 0'); });
  outBox.setColor(DIM, DIM); outBox.setText('hash = 0');
  stageT.setText(''); outT.setText('');
}
const hex64 = (v) => BigInt.asUintN(64, v).toString(16).padStart(16, '0');

function* cityGen() {
  resetAll();
  yield S(() => hint.setText('CityHash 是 Google 为哈希表/布隆过滤器设计的 64bit 散列：比 MurmurHash 更快，比加密哈希安全得多'));
  yield S(() => { stageT.setText('初始化：16 字节 → 3 个 64bit 块并行载入 a/c/d，种子 x/y/z 就位'); });
  yield W(500);
  for (const s of run1.steps) {
    yield S(() => {
      states[0].setText('a = ' + hex64(s.a));
      states[1].setText('c = ' + hex64(s.c));
      states[2].setText('d = ' + hex64(s.d));
      states[3].setText('种子 x = ' + hex64(s.x));
      states.forEach(b => b.setColor(GOLD, GOLD));
      bt.forEach((b, i) => b.setColor(i < 8 ? PUR : i < 16 ? VIOLET : ROSE, i < 8 ? PUR : i < 16 ? VIOLET : ROSE));
      stageT.setText('[' + s.stage + '] ' + s.op);
      hint.setText('四路状态同时流动 —— 这就是"并行混合"：一个周期内让 4 个数据通道交叉影响');
    });
    yield W(750);
  }
  yield S(() => {
    states.forEach(b => b.setColor(DIM, DIM));
    outBox.setColor(GREEN, GREEN);
    outT.setText('CityHash64("' + MSG + '") = 0x' + run1.hex);
    status.textContent = 'CityHash64 = 0x' + run1.hex + ' —— 64bit 散列（16 字节输入）';
    hint.setText('64bit 空间 2⁶⁴ ≈ 1.8×10¹⁹ —— 十亿条数据碰撞概率约万亿分之一');
  });
  yield W(1100);
  yield S(() => {
    outT.setText('雪崩：CityHash64("city hash demo!a") = 0x' + run2.hex + '  —  1 字符之差 → 16 位 hex 全变');
    status.textContent = '雪崩：0x' + run1.hex + ' → 0x' + run2.hex;
    hint.setText('CityHash 与 MurmurHash 同类（非加密），但吞吐更高；Google 用于 BigTable 等内部系统');
  });
  yield W(1000);
  yield S(() => {
    outT.setText('复杂度 O(n)（块级 8 字节/次加载）：64bit 输出 2⁶⁴ 空间 — 碰撞率远低于 32bit 散列');
    hint.setText('对比 BKDR：BKDR 逐字符滚乘；CityHash 4 路并行 + 乘法/旋转，吞吐是逐字符的 4-8 倍');
  });
  yield W(900);
}

engine.queue(() => cityGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫/蓝/红 = 三组 64bit 块，金 = 当前四路状态，绿 = 输出哈希）');

scene.start(engine);
