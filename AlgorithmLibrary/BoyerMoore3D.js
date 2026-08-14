// AlgorithmLibrary/BoyerMoore3D.js — BM 坏字符规则：从右往左比较，失配按坏字符最右出现位跳跃（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BoyerMoore3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x38bdf8, RED = 0xfb7185, GOLD = 0xfde047, GREEN = 0x4ade80, CYAN = 0x67e8f9, ORANGE = 0xfb923c;
const FRAME = 0x94a3b8;
const status = panel.addStatus('就绪');

const TXT = 'ABACDABABABC', P = 'ABABC';
const SP = 46;
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);
const mx = k => (k - (TXT.length - 1) / 2) * SP + 320;   // k=0→67, k=11→573
const cx = i => mx(i) + 92;                               // 窗口框中心（框半宽 116）

// ---- 视觉：主串/模式字符盒、i/j 指针球、滑动窗口框（4 细边）、✕ 失配标记、跳转箭头、命中环 ----
const sBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 420, label: ch, color: BLUE, emissive: BLUE }));
const sNum = [...TXT].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 458, z: 10, color: PALETTE.textDim, scale: 0.45 }));
const pBox = [...P].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 560, label: ch, color: RED, emissive: RED }));
const pNum = [...P].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 598, z: 10, color: PALETTE.textDim, scale: 0.45 }));
const iBall = new VNode(scene, { radius: 11, x: mx(0), y: 320, color: CYAN, emissive: CYAN });
const jBall = new VNode(scene, { radius: 11, x: mx(4), y: 640, color: GOLD, emissive: GOLD });

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

// 同帧四组 lerp：模式盒整行 + 窗口框 + i 球 + j 球 → 消除多 Group 时序冲突
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
    jBall.mesh.position.x = lerp(jx0, mx(to + 4), e);
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
  jBall.mesh.position.set(mx(4), 640, 0);
  winGroup.position.set(cx(0), 420, 0);
  frameColor(FRAME);
  xMark.sprite.visible = false;
  fxGroup.visible = false;
  arrowBody.scale.x = 1;
  ring.mesh.visible = false;
}

function* runBM() {
  yield S(resetAll);
  yield W(200);
  // ① 建表示意：5 盒自左向右金闪一遍（示意 δ 预计算）
  for (let k = 0; k < P.length; k++) {
    yield S(() => pBox[k].setColor(GOLD, GOLD));
    yield W(300);
    yield S(() => pBox[k].setColor(RED, RED));
    yield W(150);
  }
  yield S(() => { status.textContent = 'BM 坏字符规则：模式 "ABABC" 从右往左比较；δ 表：A→2 B→3 其余→整窗跳'; });
  yield W(300);
  // ② 窗口 i=0：j=4 失配（坏字符 D 未出现 → 跳 5 格）
  yield S(() => { sBox[4].setColor(GOLD, GOLD); pBox[4].setColor(GOLD, GOLD); });
  yield W(420);
  yield S(() => {
    sBox[4].setColor(RED, RED); pBox[4].setColor(RED, RED);
    xMark.sprite.position.set(mx(4), 368, 10);
    xMark.sprite.visible = true;
  });
  yield W(480);
  yield S(() => { status.textContent = '窗口 i=0：S[4]="D"≠P[4]="C"，坏字符 "D" 未在模式中出现 → 移动 j+1=5 格 → 新窗口 i=5'; });
  yield W(200);
  // ③ 跳转 0→5：箭头拉伸 230 + 整行模式盒/框/双球同帧右移
  yield stretchArrow(mx(0), mx(5), 420);
  yield W(160);
  yield shiftAll(0, 5, 640);
  yield S(() => {
    fxGroup.visible = false; arrowBody.scale.x = 1;
    sBox[4].setColor(BLUE, BLUE); pBox[4].setColor(RED, RED);
    xMark.sprite.visible = false;
  });
  yield W(150);
  // ④ 窗口 i=5：j=4 失配（坏字符 A 最右在 P[2] → 跳 2 格）
  yield S(() => { sBox[9].setColor(GOLD, GOLD); pBox[4].setColor(GOLD, GOLD); });
  yield W(400);
  yield S(() => {
    sBox[9].setColor(RED, RED); pBox[4].setColor(RED, RED);
    xMark.sprite.position.set(mx(9), 368, 10);
    xMark.sprite.visible = true;
  });
  yield W(460);
  yield S(() => { status.textContent = '窗口 i=5：S[9]="A"≠P[4]="C"，坏字符 "A" 最右在 P[2] → 移动 4−2=2 格 → 新窗口 i=7'; });
  yield W(200);
  // ⑤ 跳转 5→7：箭头拉伸 92 + 同帧右移
  yield stretchArrow(mx(5), mx(7), 400);
  yield W(140);
  yield shiftAll(5, 7, 600);
  yield S(() => {
    fxGroup.visible = false; arrowBody.scale.x = 1;
    sBox[9].setColor(BLUE, BLUE); pBox[4].setColor(RED, RED);
    xMark.sprite.visible = false;
  });
  yield W(150);
  // ⑥ 窗口 i=7：j=4..0 逐位验证命中 → 绿环
  for (let j = 4; j >= 0; j--) {
    if (j < 4) yield fly(jBall, mx(7 + j), 640, 300);
    yield S(() => { sBox[7 + j].setColor(GOLD, GOLD); pBox[j].setColor(GOLD, GOLD); });
    yield W(400);
    yield S(() => { sBox[7 + j].setColor(GREEN, GREEN); pBox[j].setColor(GREEN, GREEN); });
    yield W(430);
  }
  yield S(() => { ring.mesh.visible = true; frameColor(GREEN); });
  yield W(1300);
  yield S(() => { status.textContent = 'BM 完成：命中位置 7，比较 7 次（BF 需 20 次）；跳转 5 格、2 格各一次'; });
  yield W(800);
}

engine.queue(() => runBM());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
