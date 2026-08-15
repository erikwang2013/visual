// AlgorithmLibrary/CityHash3D.js — CityHash64：Google 的 64 位非加密散列 —— 8 字节块并行载入 a/c/d，种子 x/y/z 参与旋转+乘法混合，末段折叠输出（function* 生成器驱动，解说入状态栏）
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { Scene3D } from '../3D/Scene3D.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CityHash3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, PUR = 0xc4b5fd, VIOLET = 0xa78bfa, ROSE = 0xfb7185;
const status = panel.addStatus('就绪');

const MSG = 'city hash demo!!';
const K1 = 0x9ae16a3b2f90404fn, K2 = 0xc3a5c85c97cb3127n;
const rot64 = (v, n) => BigInt.asUintN(64, (v << BigInt(n)) | (v >> BigInt(64 - n)));
const hex64 = v => BigInt.asUintN(64, v).toString(16).padStart(16, '0');

function cityRun(str) {
  const b = new TextEncoder().encode(str);
  let x = 0x9ddfea08eb382d69n ^ BigInt(b.length);
  let y = K2, z = K1;
  const load = off => {
    let v = 0n;
    for (let j = 7; j >= 0; j--) v = (v << 8n) | BigInt(off + j < b.length ? b[off + j] : 0);
    return v;
  };
  let a = load(0), c = load(8), d = load(16), f = 0n;
  const steps = [{ stage: '初始化', a, c, d, x, y, z, op: 'a/c/d = 三个 8 字节块（第 3 块越界补零），种子 x/y/z 就位' }];
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
const bt = [...bytes].map((v, i) =>
  new VBox(scene, { w: 26, h: 26, d: 26, x: (i - (bytes.length - 1) / 2) * 30 + 320, y: 465, z: 0, label: String.fromCharCode(v), color: i < 8 ? PUR : VIOLET, emissive: i < 8 ? PUR : VIOLET }));
const states = ['a', 'c', 'd', 'x'].map((name, i) =>
  new VBox(scene, { w: 150, h: 48, d: 48, x: 85 + i * 158, y: 345, z: 0, label: name + ' = 0', color: PUR, emissive: PUR }));
const outBox = new VBox(scene, { w: 240, h: 55, d: 55, x: 320, y: 205, z: 0, label: 'hash = 0', color: DIM, emissive: DIM });
const SNAME = ['a', 'c', 'd', 'x'];

function resetAll() {
  bt.forEach((b, i) => { b.setText(String.fromCharCode(bytes[i])); b.setColor(i < 8 ? PUR : VIOLET, i < 8 ? PUR : VIOLET); });
  states.forEach((s, i) => { s.setColor(PUR, PUR); s.setText(SNAME[i] + ' = 0'); });
  outBox.setColor(DIM, DIM); outBox.setText('hash = 0');
}

function* cityGen() {
  resetAll();
  yield S(() => { status.textContent = 'CityHash64：Google 为哈希表/布隆过滤器设计的 64 位散列 —— 8 字节一块并行载入，旋转+乘法混合，吞吐高于逐字符哈希。演示 "' + MSG + '"（16 字节）'; });
  yield W(700);
  for (const s of run1.steps) {
    yield S(() => {
      states.forEach((b, i) => b.setText(SNAME[i] + ' = ' + hex64([s.a, s.c, s.d, s.x][i])));
      states.forEach(b => b.setColor(GOLD, GOLD));
      bt.forEach((b, i) => b.setColor(i < 8 ? PUR : i < 16 ? VIOLET : ROSE, i < 8 ? PUR : i < 16 ? VIOLET : ROSE));
      status.textContent = '[' + s.stage + '] ' + s.op + ' —— 4 路状态交叉混合';
    });
    yield W(800);
  }
  yield S(() => {
    states.forEach(b => b.setColor(DIM, DIM));
    outBox.setColor(GREEN, GREEN);
    outBox.setText('hash = 0x' + run1.hex);
    status.textContent = 'CityHash64("' + MSG + '") = 0x' + run1.hex + '（64 位空间 2⁶⁴ ≈ 1.8×10¹⁹，十亿条数据碰撞率约万亿分之一）';
  });
  yield W(1100);
  yield S(() => {
    bt[15].setText('a');
    bt[15].setColor(ROSE, ROSE);
    outBox.setText('hash = 0x' + run2.hex);
    status.textContent = '雪崩测试：仅改末尾 1 字节 "' + MSG.slice(0, -1) + 'a" → 0x' + run2.hex + '，与 0x' + run1.hex + ' 截然不同';
  });
  yield W(1100);
  yield S(() => { status.textContent = 'CityHash 演示完成：16 字节 → 0x' + run1.hex + '（单字符改动 → 0x' + run2.hex + '）；复杂度：O(n)（8 字节/块并行加载混合）'; });
  yield W(1000);
}

engine.queue(() => cityGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
