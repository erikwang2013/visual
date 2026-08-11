// AlgorithmLibrary/RecReverse3D.js — 递归逆转字符串：rev(s) = rev(s[1:]) + s[0]，调用帧链 rev("ABCDE")→…→rev("E") 深入展开，基线 rev("") 后回溯逐字符拼出 "EDCBA"（function* 生成器驱动，结果运行时拼接）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RecReverse3D');

const scene = new Scene3D('scene', { cameraPos: [0, 320, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：递归逆转 —— rev(s) = rev(s[1:]) + s[0]', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 130, z: 0, color: PALETTE.textGlow, scale: 0.44 });
const outT = new VText(scene, { text: '', x: 0, y: -240, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const S0 = 'ABCDE';
const N = S0.length;
const inChips = S0.split('').map((ch, i) => new VBox(scene, { w: 100, h: 50, d: 50, x: -330 + i * 132, y: 170, z: 0, label: ch, color: BLUE, emissive: BLUE }));
new VText(scene, { text: '输入串（每帧取出首字符 s[0]，其余 s[1:] 递归处理）', x: 0, y: 210, z: 0, color: PALETTE.textDim, scale: 0.34 });
const frames = Array.from({ length: N }, (_, i) => new VBox(scene, { w: 320, h: 42, d: 42, x: 0, y: 75 - i * 46, z: 0, label: 'rev("' + S0.slice(i) + '")', color: DIM, emissive: DIM }));
const outChips = Array.from({ length: N }, (_, i) => new VBox(scene, { w: 100, h: 50, d: 50, x: -330 + i * 132, y: -165, z: 0, label: '?', color: DIM, emissive: DIM }));
new VText(scene, { text: '输出串（回溯时字符依次从帧返回，拼到结果尾部）', x: 0, y: -125, z: 0, color: PALETTE.textDim, scale: 0.34 });

function* recRevGen() {
  yield S(() => { hint.setText('递归逆转：把「首字符」不断推迟到最后 —— 深入时只拆串，回溯时才知道结果'); stageT.setText('rev("ABCDE") = rev("BCDE") + "A" —— 先挂起当前帧，去算 rev("BCDE")'); });
  yield W(950);
  for (let i = 0; i < N; i++) {
    frames[i].setColor(WHITE, WHITE);
    yield S(() => { stageT.setText('深入第 ' + (i + 1) + ' 层：rev("' + S0.slice(i) + '") 需要 rev("' + S0.slice(i + 1) + '") —— 压栈'); eqT.setText('rev("' + S0.slice(i) + '") = rev("' + S0.slice(i + 1) + '") + "' + S0[i] + '"'); });
    yield W(650);
    frames[i].setColor(GOLD, GOLD);
    yield W(300);
  }
  yield S(() => { stageT.setText('到达基线：rev("") = "" —— 空串直接返回，开始回溯'); eqT.setText('栈深 = 5；每个字符一个栈帧 —— 空间 O(n)'); });
  yield W(800);
  let result = '';
  for (let i = N - 1; i >= 0; i--) {
    result = result + S0[i];
    frames[i].setColor(GREEN, GREEN);
    frames[i].setText('rev("' + S0.slice(i) + '") = "' + result + '"');
    outChips[N - 1 - i].setText(S0[i]);
    outChips[N - 1 - i].setColor(GREEN, GREEN);
    yield S(() => { stageT.setText('回溯：rev("' + S0.slice(i) + '") = rev("' + S0.slice(i + 1) + '") + "' + S0[i] + '" = "' + result + '" —— ' + S0[i] + ' 落到输出尾部'); eqT.setText('拼接方向：返回串 + 首字符（字符顺序因此颠倒）'); });
    yield W(700);
  }
  outT.setText('rev("ABCDE") = "EDCBA" ✓');
  status.textContent = 'rev("ABCDE") = "EDCBA"';
  yield S(() => { hint.setText('本质：每个字符都「等待」它右边的子串先完成 —— 这天然实现了逆序（后进先出）'); });
  yield W(1100);
  yield S(() => { hint.setText('非递归实现：循环 + 双指针原地交换，O(1) 空间 —— 递归版是教学范例，迭代版是工程选择'); outT.setText('复杂度：时间 O(n)，空间 O(n)（递归栈）—— 反转同样可原地迭代完成'); });
  yield W(1100);
  yield S(() => { hint.setText('递归逆转演示完成：拆串深入 → 空串基线 → 逐层拼回 "EDCBA"'); outT.setText(''); });
  yield W(400);
}

function* runRecRev() {
  hint.setText('递归逆转：拆串 → 基线 → 拼回');
  yield W(400);
  yield* recRevGen();
}

panel.addButton('运行演示', () => engine.start(runRecRev()));
panel.addButton('清空', () => {
  engine.clear();
  frames.forEach((f, i) => { f.setText('rev("' + S0.slice(i) + '")'); f.setColor(DIM, DIM); });
  outChips.forEach(c => { c.setText('?'); c.setColor(DIM, DIM); });
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；上排蓝 = 输入字符、中排 = 调用帧（白闪压栈 → 金挂起 → 绿返回）、下排 = 输出；结果运行时拼接，无硬编码）');

scene.start(engine);
