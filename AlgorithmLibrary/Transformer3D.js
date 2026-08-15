// AlgorithmLibrary/Transformer3D.js — Transformer 自注意力：Q/K 缩放点积得分 → softmax 权重 → 对 V 加权聚合，双头合并（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Transformer3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, ORANGE = 0xfb923c, GREEN = 0x4ade80, YELLOW = 0xfacc15, DIM = 0x334155;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

const TX = [120, 220, 320, 420, 520], TOK_Y = 600, QUERY = 2;   // 词₃ 为查询 token
const KV = [[1, 0], [0, 1], [2, 1], [1, 2], [1, 1]];            // 键 = 值
const S1 = [1.41, 0.71, 3.54, 2.83, 2.12];                      // 头1 得分 q₃·k/√2
const A1 = [0.06, 0.03, 0.52, 0.26, 0.13];                      // 头1 softmax 权重
const S2 = [0.71, 0.71, 2.12, 2.12, 1.41];                      // 头2 得分
const A2 = [0.08, 0.08, 0.34, 0.34, 0.16];                      // 头2 softmax 权重
const LINE_T = [0, 1, 3, 4];                                    // 连线指向的 token 下标（不含自身）

// token 球池 + Q/K/得分/权重/输出 盒子池：运行期仅改文字/颜色/显隐/缩放
const tok = TX.map((x, i) => new VNode(scene, { radius: 20, x, y: TOK_Y, z: 0, label: '词' + (i + 1), color: BLUE, emissive: BLUE }));
const kBox = KV.map((kv, i) => new VBox(scene, { w: 46, h: 46, d: 30, x: TX[i], y: 510, z: 0, label: 'k' + (i + 1) + '=(' + kv + ')', color: DIM, emissive: 0 }));
const qBox = new VBox(scene, { w: 120, h: 48, d: 30, x: TX[QUERY], y: 450, z: 0, label: 'q₃=(2,1)', color: DIM, emissive: 0 });
const sBox = TX.map(x => new VBox(scene, { w: 46, h: 40, d: 30, x, y: 380, z: 0, label: '?', color: DIM, emissive: 0 }));
const aBox = TX.map(x => new VBox(scene, { w: 46, h: 40, d: 30, x, y: 315, z: 0, label: '?', color: DIM, emissive: 0 }));
const outBox = new VBox(scene, { w: 110, h: 48, d: 30, x: 320, y: 250, z: 0, label: '输出₃', color: GREEN, emissive: GREEN });
outBox.mesh.visible = false;
const valT = new VText(scene, { text: '', x: 320, y: 200, z: 0, color: GREEN, scale: 0.55 });
valT.sprite.visible = false;

// 注意力连线池：词₃ → 其余 4 词（线宽/颜色 ∝ 权重）
const mkLine = x2 => {
  const b = new VBox(scene, { w: 200, h: 4, d: 4, x: 0, y: 0, z: 0, label: '', color: DIM, emissive: 0 });
  b.mesh.scale.set(Math.abs(x2 - TX[QUERY]) / 200, 1, 1);
  b.mesh.position.set((x2 + TX[QUERY]) / 2, TOK_Y, 0);
  b.mesh.visible = false;
  return b;
};
const lines = [TX[0], TX[1], TX[3], TX[4]].map(mkLine);
const ring = new VTorus(scene, { radius: 26, x: TX[QUERY], y: TOK_Y, z: 0, color: GOLD });
ring.mesh.visible = false;

const wCol = w => (w >= 0.25 ? GOLD : w >= 0.1 ? ORANGE : DIM);
const wEm = w => (wCol(w) === DIM ? 0 : wCol(w));

function resetAll() {
  tok.forEach(n => n.setColor(BLUE, BLUE));
  kBox.forEach(b => b.setColor(DIM, 0));
  qBox.setColor(DIM, 0); qBox.setText('q₃=(2,1)');
  sBox.forEach(b => { b.setColor(DIM, 0); b.setText('?'); });
  aBox.forEach(b => { b.setColor(DIM, 0); b.setText('?'); });
  outBox.mesh.visible = false; outBox.setColor(GREEN, GREEN);
  valT.sprite.visible = false;
  lines.forEach(b => { b.mesh.visible = false; b.mesh.scale.y = 1; b.setColor(DIM, 0); });
  ring.mesh.visible = false; ring.mesh.scale.setScalar(1);
}

function* tweenLines(wts) {
  yield A(420, p => {
    const e = ease(p);
    lines.forEach((ln, i) => { ln.mesh.scale.y = 1 + 5 * wts[LINE_T[i]] * e; });
    ring.mesh.scale.setScalar(0.85 + wts[QUERY] * e);
  });
  lines.forEach((ln, i) => ln.setColor(wCol(wts[LINE_T[i]]), wEm(wts[LINE_T[i]])));
}

function* runAttn() {
  resetAll();
  yield S(() => { status.textContent = 'Transformer 自注意力：词₃ 生成查询 q₃ = (2,1)，与全部 5 个键 K 做缩放点积得注意力权重，再对值 V 加权求和（此处 V = K）'; });
  yield W(900);
  yield S(() => {
    tok[QUERY].setColor(GOLD, GOLD);
    qBox.setColor(GOLD, GOLD);
    status.textContent = '查询：词₃ 经 W_Q 投影得 q₃ = (2,1)（金）— 它决定"词₃ 最关心什么"';
  });
  yield W(900);
  yield S(() => {
    kBox.forEach(b => b.setColor(BLUE, BLUE));
    status.textContent = '键：K 行 = 各词的键向量（蓝）— 点积 q₃·kᵢ 衡量词₃ 与每个词的相关性';
  });
  yield W(900);
  yield S(() => {
    sBox.forEach((b, i) => { b.setText(String(S1[i])); b.setColor(YELLOW, YELLOW); });
    status.textContent = '得分：s₃ᵢ = q₃·kᵢ/√dₖ（√2 ≈ 1.41）→ [1.41, 0.71, 3.54, 2.83, 2.12]，词₃ 与自己相关性最高';
  });
  yield W(1000);
  yield S(() => {
    aBox.forEach((b, i) => { b.setText(String(A1[i])); b.setColor(wCol(A1[i]), wEm(A1[i])); });
    lines.forEach(ln => { ln.mesh.visible = true; });
    ring.mesh.visible = true;
    status.textContent = 'softmax 归一化 → 权重 α = [0.06, 0.03, 0.52, 0.26, 0.13]（线粗/色亮 ∝ 权重）— 词₃ 把 52% 注意力给了自己';
  });
  yield* tweenLines(A1);
  yield W(700);
  yield S(() => {
    outBox.mesh.visible = true;
    valT.sprite.visible = true;
    valT.setText('(1.49, 1.20)');
    status.textContent = '聚合：输出₃ = 0.06v₁ + 0.03v₂ + 0.52v₃ + 0.26v₄ + 0.13v₅ = (1.49, 1.20) — 携带全场信息的上下文向量';
  });
  yield W(1000);
  yield S(() => {
    qBox.setText('q₃=(1,1)');
    sBox.forEach((b, i) => { b.setText(String(S2[i])); });
    status.textContent = '多头：头 2 用不同投影 q₃ = (1,1)，得分 [0.71, 0.71, 2.12, 2.12, 1.41] — 各头关注模式不同';
  });
  yield W(900);
  yield S(() => {
    aBox.forEach((b, i) => { b.setText(String(A2[i])); b.setColor(wCol(A2[i]), wEm(A2[i])); });
    status.textContent = '头 2 权重 α′ = [0.08, 0.08, 0.34, 0.34, 0.16] — 注意力更分散，同时关注词₃、词₄';
  });
  yield* tweenLines(A2);
  yield W(700);
  yield S(() => {
    outBox.setColor(BLUE, BLUE);
    valT.setText('(1.26, 1.26)');
    status.textContent = '头 2 聚合：0.08v₁ + 0.08v₂ + 0.34v₃ + 0.34v₄ + 0.16v₅ = (1.26, 1.26)';
  });
  yield W(900);
  yield S(() => {
    outBox.setColor(GOLD, GOLD);
    valT.setText('(1.38, 1.23)', { color: GOLD });
    status.textContent = '合并：双头输出拼接后经线性层 → 输出₃ = (1.38, 1.23) — 不同头捕捉不同的关联模式';
  });
  yield W(900);
  yield S(() => { status.textContent = 'Transformer 演示完成：词₃ 注意力 α=[0.06,0.03,0.52,0.26,0.13] → 输出 (1.49,1.20)，双头合并 (1.38,1.23)；自注意力 O(n²·d)'; });
  yield W(800);
}

engine.queue(() => runAttn());
panel.addButton('清空', () => {
  engine.clear();
  resetAll();
  status.textContent = '';
});

scene.start(engine);
