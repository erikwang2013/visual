// AlgorithmLibrary/Sunday3D.js — Sunday：窗口从左往右比，失配后看窗口右邻 S[i+m] 决定跳转（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Sunday3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x38bdf8, RED = 0xfb7185, GOLD = 0xfde047, GREEN = 0x4ade80, CYAN = 0x67e8f9, ORANGE = 0xfb923c;
const FRAME = 0x94a3b8;
const status = panel.addStatus('就绪');

const TXT = 'ABCDCABABBAD', P = 'ABBA';
const SP = 46;
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);
const mx = k => (k - (TXT.length - 1) / 2) * SP + 320;   // k=0→67, k=11→573
const cx = i => mx(i) + 92;                               // 窗口框中心（框半宽 116）

// ---- 视觉：主串/模式字符盒、i/j 指针球、窗口框（4 细边）、✕、决定字符橙环、跳转箭头、命中环 ----
const sBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 420, label: ch, color: BLUE, emissive: BLUE }));
const sNum = [...TXT].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 458, z: 10, color: PALETTE.textDim, scale: 0.45 }));
const pBox = [...P].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 560, label: ch, color: RED, emissive: RED }));
const pNum = [...P].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 598, z: 10, color: PALETTE.textDim, scale: 0.45 }));
const iBall = new VNode(scene, { radius: 11, x: mx(0), y: 320, color: CYAN, emissive: CYAN });
const jBall = new VNode(scene, { radius: 11, x: mx(0), y: 640, color: GOLD, emissive: GOLD });

const mkBar = (w, h, x, y) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), new THREE.MeshBasicMaterial({ color: FRAME }));
  m.position.set(x, y, 0);
  return m;
};
const winGroup = new THREE.Group();
const bars = [mkBar(2, 160, -116, 0), mkBar(2, 160, 116, 0), mkBar(232, 2, 0, -80), mkBar(232, 2, 0, 80)];
bars.forEach(b => winGroup.add(b));
winGroup.position.set(cx(0), 420, 0);
scene.add(winGroup);
const frameColor = c => bars.forEach(b => b.material.color.setHex(c));

const xMark = new VText(scene, { text: '✕', x: 0, y: 368, z: 10, color: RED, scale: 0.7 });
xMark.sprite.visible = false;
const oRing = new VTorus(scene, { radius: 36, x: 0, y: 420, color: ORANGE });   // 决定字符 S[i+m] 高亮
oRing.mesh.visible = false;

const fxGroup = new THREE.Group();
const arrowBody = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 2), new THREE.MeshBasicMaterial({ color: ORANGE }));
const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(9, 16, 10), new THREE.MeshBasicMaterial({ color: ORANGE }));
arrowTip.rotation.z = -Math.PI / 2;
fxGroup.add(arrowBody); fxGroup.add(arrowTip);
fxGroup.visible = false;
scene.add(fxGroup);

const ring = new VTorus(scene, { radius: 118, x: cx(7), y: 420, color: GREEN });
ring.mesh.visible = false;

const fly = (ball, x, y, ms = 300) => {
  const fx = ball.mesh.position.x, fy = ball.mesh.position.y;
  return A(ms, p => {
    const e = ease(p);
    ball.mesh.position.x = lerp(fx, x, e);
    ball.mesh.position.y = lerp(fy, y, e);
  });
};

// 同帧四组 lerp：模式盒整行 + 窗口框 + i 球 + j 球（Sunday 左起 j=0，jBall→mx(to)）
const shiftAll = (from, to, ms = 640) => {
  const px0 = pBox.map(b => b.mesh.position.x);
  const gx0 = winGroup.position.x;
  const ix0 = iBall.mesh.position.x;
  const jx0 = jBall.mesh.position.x;
  return A(ms, p => {
    const e = ease(p);
    pBox.forEach((b, k) => { b.mesh.position.x = lerp(px0[k], mx(to + k), e); });
    winGroup.position.x = lerp(gx0, cx(to), e);
    iBall.mesh.position.x = lerp(ix0, mx(to), e);
    jBall.mesh.position.x = lerp(jx0, mx(to), e);
  });
};

// 箭头从窗口左缘 mx(from) 拉伸至新窗口左缘 mx(to)，长度 ∝ 移动量
const stretchArrow = (fromX, toX, ms = 420) => {
  fxGroup.visible = true;
  return A(ms, p => {
    const e = ease(p);
    const len = (toX - fromX) * e;
    arrowBody.scale.x = Math.max(len, 0.001);
    arrowBody.position.set(fromX + len / 2, 492, 0);
    arrowTip.position.set(fromX + len, 492, 0);
  });
};

function resetAll() {
  sBox.forEach(b => b.setColor(BLUE, BLUE));
  pBox.forEach((b, k) => { b.setColor(RED, RED); b.mesh.position.x = mx(k); });
  iBall.mesh.position.set(mx(0), 320, 0);
  jBall.mesh.position.set(mx(0), 640, 0);
  winGroup.position.set(cx(0), 420, 0);
  frameColor(FRAME);
  xMark.sprite.visible = false;
  oRing.mesh.visible = false;
  fxGroup.visible = false;
  arrowBody.scale.x = 1;
  ring.mesh.visible = false;
}

// 跳转后复位本窗口已比较的全部列（防绿/红残留跨窗）
const resetWindow = (i, jMax) => S(() => {
  for (let q = 0; q <= jMax; q++) { sBox[i + q].setColor(BLUE, BLUE); pBox[q].setColor(RED, RED); }
  xMark.sprite.visible = false;
  oRing.mesh.visible = false;
  fxGroup.visible = false;
  arrowBody.scale.x = 1;
});

function* runSunday() {
  yield S(resetAll);
  yield W(200);
  // ① 建表示意：4 盒自左向右金闪（示意 shift 预计算）
  for (let k = 0; k < P.length; k++) {
    yield S(() => pBox[k].setColor(GOLD, GOLD));
    yield W(300);
    yield S(() => pBox[k].setColor(RED, RED));
    yield W(150);
  }
  yield S(() => { status.textContent = 'Sunday 规则：模式 "ABBA" 从左往右逐位比较；shift 表：A→1、B→2、其余→5'; });
  yield W(300);
  // ② 窗口 i=0：j=0,1 匹配绿；j=2 失配（决定字符 S[4]='C' ∉ P → 跳 5）
  yield S(() => { sBox[0].setColor(GOLD, GOLD); sBox[1].setColor(GOLD, GOLD); pBox[0].setColor(GOLD, GOLD); pBox[1].setColor(GOLD, GOLD); });
  yield fly(jBall, mx(1), 640, 300);
  yield W(340);
  yield S(() => { sBox[0].setColor(GREEN, GREEN); sBox[1].setColor(GREEN, GREEN); pBox[0].setColor(GREEN, GREEN); pBox[1].setColor(GREEN, GREEN); });
  yield W(380);
  yield S(() => { sBox[2].setColor(GOLD, GOLD); pBox[2].setColor(GOLD, GOLD); });
  yield fly(jBall, mx(2), 640, 300);
  yield W(340);
  yield S(() => {
    sBox[2].setColor(RED, RED); pBox[2].setColor(RED, RED);
    xMark.sprite.position.set(mx(2), 368, 10);
    xMark.sprite.visible = true;
    oRing.mesh.position.set(mx(4), 420, 0);
    oRing.mesh.visible = true;
  });
  yield W(420);
  yield S(() => { status.textContent = '窗口 i=0：S[0..1] 匹配，j=2 失配 S[2]="C"≠P[2]="B"；看右邻 S[4]="C" 不在模式 → 跳 5 格 → 新窗口 i=5'; });
  yield W(250);
  // ③ 大跳 0→5：箭头拉伸 230 + 同帧右移
  yield stretchArrow(mx(0), mx(5), 420);
  yield W(160);
  yield shiftAll(0, 5, 640);
  yield resetWindow(0, 2);
  yield W(150);
  // ④ 窗口 i=5：j=0,1 匹配绿；j=2 失配（决定字符 S[9]='B' 最右在 P[2] → 跳 2）
  yield S(() => { sBox[5].setColor(GOLD, GOLD); sBox[6].setColor(GOLD, GOLD); pBox[0].setColor(GOLD, GOLD); pBox[1].setColor(GOLD, GOLD); });
  yield fly(jBall, mx(6), 640, 300);
  yield W(340);
  yield S(() => { sBox[5].setColor(GREEN, GREEN); sBox[6].setColor(GREEN, GREEN); pBox[0].setColor(GREEN, GREEN); pBox[1].setColor(GREEN, GREEN); });
  yield W(380);
  yield S(() => { sBox[7].setColor(GOLD, GOLD); pBox[2].setColor(GOLD, GOLD); });
  yield fly(jBall, mx(7), 640, 300);
  yield W(340);
  yield S(() => {
    sBox[7].setColor(RED, RED); pBox[2].setColor(RED, RED);
    xMark.sprite.position.set(mx(7), 368, 10);
    xMark.sprite.visible = true;
    oRing.mesh.position.set(mx(9), 420, 0);
    oRing.mesh.visible = true;
  });
  yield W(420);
  yield S(() => { status.textContent = '窗口 i=5：S[5..6] 匹配，j=2 失配 S[7]="A"≠P[2]="B"；右邻 S[9]="B" 最右在 P[2] → 跳 2 格 → 新窗口 i=7'; });
  yield W(250);
  // ⑤ 小跳 5→7：箭头拉伸 92 + 同帧右移
  yield stretchArrow(mx(5), mx(7), 400);
  yield W(140);
  yield shiftAll(5, 7, 600);
  yield resetWindow(5, 2);
  yield W(150);
  // ⑥ 窗口 i=7：j=0..3 逐位验证命中 → 绿环
  for (let j = 0; j < P.length; j++) {
    if (j > 0) yield fly(jBall, mx(7 + j), 640, 300);
    yield S(() => { sBox[7 + j].setColor(GOLD, GOLD); pBox[j].setColor(GOLD, GOLD); });
    yield W(340);
    yield S(() => { sBox[7 + j].setColor(GREEN, GREEN); pBox[j].setColor(GREEN, GREEN); });
    yield W(380);
  }
  yield S(() => { ring.mesh.visible = true; frameColor(GREEN); });
  yield W(1200);
  yield S(() => { status.textContent = '窗口 i=7：S[7..10]="ABBA" 全部匹配，命中位置 7'; });
  yield W(250);
  yield S(() => { status.textContent = 'Sunday 完成：命中位置 7，共比较 10 次（BF 需 16 次）'; });
  yield W(700);
}

engine.queue(() => runSunday());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
