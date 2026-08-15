// AlgorithmLibrary/RecReverse3D.js — 递归逆转字符串：rev(s) = rev(s[1:]) + s[0]，调用帧链深入展开，基线后回溯逐字符拼出 "EDCBA"（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('RecReverse3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const S0 = 'ABCDE';
const N = S0.length;
const chipX = (i) => 45 + i * 104;
const inChips = S0.split('').map((ch, i) => new VBox(scene, { w: 90, h: 46, d: 46, x: chipX(i), y: 438, z: 0, label: ch, color: BLUE, emissive: BLUE }));
const frames = Array.from({ length: N }, (_, i) => new VBox(scene, { w: 320, h: 42, d: 42, x: 271, y: 328 - i * 46, z: 0, label: S0.slice(i), color: DIM, emissive: DIM }));
const outChips = Array.from({ length: N }, (_, i) => new VBox(scene, { w: 90, h: 46, d: 46, x: chipX(i), y: 53, z: 0, label: '?', color: DIM, emissive: DIM }));

function* recRevGen() {
  yield S(() => { status.textContent = '递归逆转：把首字符不断推迟到最后，回溯时才知结果'; });
  yield W(950);
  for (let i = 0; i < N; i++) {
    frames[i].setColor(WHITE, WHITE);
    yield S(() => { status.textContent = '深入第 ' + (i + 1) + ' 层：rev("' + S0.slice(i) + '") 压栈 —— 等待右子串 rev("' + S0.slice(i + 1) + '")'; });
    yield W(650);
    frames[i].setColor(GOLD, GOLD);
    yield W(300);
  }
  yield S(() => { status.textContent = '到达基线：rev("") = "" —— 空串直接返回，开始回溯'; });
  yield W(800);
  let result = '';
  for (let i = N - 1; i >= 0; i--) {
    result = result + S0[i];
    frames[i].setColor(GREEN, GREEN);
    outChips[N - 1 - i].setText(S0[i]);
    outChips[N - 1 - i].setColor(GREEN, GREEN);
    yield S(() => { status.textContent = '回溯：rev("' + S0.slice(i) + '") 返回 "' + result + '" —— 字符 "' + S0[i] + '" 落到尾部'; });
    yield W(700);
  }
  yield S(() => { status.textContent = 'rev("ABCDE") = "EDCBA" ✓ —— 递归栈后进先出即逆序'; });
  yield W(800);
  yield S(() => { status.textContent = '复杂度：时间 O(n)，空间 O(n)（递归栈深 5）；非递归可用双指针原地交换降到 O(1) 空间'; });
  yield W(1100);
  yield S(() => { status.textContent = '递归反转演示完成：5 个字符、5 层调用帧（rev("ABCDE")→…→rev("")），回溯逐字符拼出 "EDCBA"，时间/空间均为 O(n)'; });
  yield W(400);
}

function* runRecRev() {
  yield S(() => { status.textContent = '递归逆转：拆串深入 rev("ABCDE") → 基线 rev("") → 回溯拼回'; });
  yield W(400);
  yield* recRevGen();
}

engine.queue(() => runRecRev());
panel.addButton('清空', () => {
  engine.clear();
  frames.forEach((f, i) => { f.setText(S0.slice(i)); f.setColor(DIM, DIM); });
  outChips.forEach(c => { c.setText('?'); c.setColor(DIM, DIM); });
  status.textContent = '';
});

scene.start(engine);
