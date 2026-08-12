// AlgorithmLibrary/RecReverse3D.js — 递归逆转字符串：rev(s) = rev(s[1:]) + s[0]，调用帧链 rev("ABCDE")→…→rev("E") 深入展开，基线 rev("") 后回溯逐字符拼出 "EDCBA"（function* 生成器驱动，结果运行时拼接）
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
const hint = new VText(scene, { text: '点击「运行演示」开始：递归逆转 —— 拆串深入再拼回', x: 0, y: -375, z: 0, color: PALETTE.textGlow, scale: 0.85, wrapChars: 0 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -165, z: 0, color: PALETTE.textGlow, scale: 0.44 });
const outT = new VText(scene, { text: '', x: 0, y: -260, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const S0 = 'ABCDE';
const N = S0.length;
const inChips = S0.split('').map((ch, i) => new VBox(scene, { w: 100, h: 50, d: 50, x: -164 + i * 132, y: 336, z: 0, label: ch, color: BLUE, emissive: BLUE }));
const frames = Array.from({ length: N }, (_, i) => new VBox(scene, { w: 320, h: 42, d: 42, x: 100, y: 221 - i * 46, z: 0, label: S0.slice(i), color: DIM, emissive: DIM }));
const outChips = Array.from({ length: N }, (_, i) => new VBox(scene, { w: 100, h: 50, d: 50, x: -164 + i * 132, y: -44, z: 0, label: '?', color: DIM, emissive: DIM }));

function* recRevGen() {
  yield S(() => { hint.setText('递归逆转：把首字符不断推迟到最后，回溯时才知结果', { wrapChars: 0 }); stageT.setText('拆串深入：rev("ABCDE") 挂起，等待右子串', { wrapChars: 0 }); });
  yield W(950);
  for (let i = 0; i < N; i++) {
    frames[i].setColor(WHITE, WHITE);
    yield S(() => { stageT.setText('深入第 ' + (i + 1) + ' 层：rev("' + S0.slice(i) + '") 压栈', { wrapChars: 0 }); eqT.setText('rev("' + S0.slice(i) + '") = rev("' + S0.slice(i + 1) + '") + "' + S0[i] + '"', { wrapChars: 0 }); });
    yield W(650);
    frames[i].setColor(GOLD, GOLD);
    yield W(300);
  }
  yield S(() => { stageT.setText('到达基线：rev("") = "" —— 空串直接返回', { wrapChars: 0 }); eqT.setText('栈深 = 5；每个字符一个栈帧 —— 空间 O(n)', { wrapChars: 0 }); });
  yield W(800);
  let result = '';
  for (let i = N - 1; i >= 0; i--) {
    result = result + S0[i];
    frames[i].setColor(GREEN, GREEN);
    outChips[N - 1 - i].setText(S0[i]);
    outChips[N - 1 - i].setColor(GREEN, GREEN);
    yield S(() => { stageT.setText('回溯：rev("' + S0.slice(i) + '") 返回 "' + result + '"', { wrapChars: 0 }); eqT.setText('rev("' + S0.slice(i) + '") = rev("' + S0.slice(i + 1) + '") + "' + S0[i] + '" —— 字符落到尾部', { wrapChars: 0 }); });
    yield W(700);
  }
  outT.setText('rev("ABCDE") = "EDCBA" ✓', { wrapChars: 0 });
  status.textContent = 'rev("ABCDE") = "EDCBA"';
  yield S(() => { stageT.setText(''); hint.setText('本质：字符等待右边子串先完成 —— 后进先出即逆序', { wrapChars: 0 }); });
  yield W(1100);
  yield S(() => { hint.setText('非递归实现：循环 + 双指针原地交换，O(1) 空间', { wrapChars: 0 }); outT.setText('复杂度：时间 O(n)，空间 O(n)（递归栈）', { wrapChars: 0 }); });
  yield W(1100);
  yield S(() => { hint.setText('演示完成：拆串 → 基线 → 拼回 "EDCBA"；原地反转 O(1) 空间', { wrapChars: 0 }); outT.setText(''); });
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
  frames.forEach((f, i) => { f.setText(S0.slice(i)); f.setColor(DIM, DIM); });
  outChips.forEach(c => { c.setText('?'); c.setColor(DIM, DIM); });
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；上排蓝 = 输入字符、中排 = 调用帧（白闪压栈 → 金挂起 → 绿返回）、下排 = 输出；结果运行时拼接，无硬编码）');

scene.start(engine);
