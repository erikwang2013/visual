// AlgorithmLibrary/BruteForce3D.js — BF 朴素匹配：i/j 双指针逐字符比对，失配窗口右移（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BruteForce3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x38bdf8, RED = 0xfb7185, GOLD = 0xfde047, GREEN = 0x4ade80, CYAN = 0x67e8f9;
const status = panel.addStatus('就绪');

const TXT = 'AACABAB', P = 'ABAB';
const SP = 46;
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);
const mx = k => (k - (TXT.length - 1) / 2) * SP + 320;
const sBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 420, label: ch, color: BLUE, emissive: BLUE }));
const sNum = [...TXT].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 458, z: 10, color: PALETTE.textDim, scale: 0.45 }));
const pBox = [...P].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 560, label: ch, color: RED, emissive: RED }));
const pNum = [...P].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 598, z: 10, color: PALETTE.textDim, scale: 0.45 }));
const iBall = new VNode(scene, { radius: 11, x: mx(0), y: 380, color: CYAN, emissive: CYAN });
const jBall = new VNode(scene, { radius: 11, x: mx(0), y: 640, color: GOLD, emissive: GOLD });
const ring = new VTorus(scene, { radius: 110, x: 0, y: 420, color: GREEN });
ring.mesh.visible = false;

const fly = (ball, x, y, ms = 300) => {
  const fx = ball.mesh.position.x, fy = ball.mesh.position.y;
  return A(ms, p => {
    const e = ease(p);
    ball.mesh.position.x = lerp(fx, x, e);
    ball.mesh.position.y = lerp(fy, y, e);
  });
};
const shiftP = (s, ms = 500) => {
  const from = pBox.map(b => b.mesh.position.x);
  return A(ms, p => { const e = ease(p); pBox.forEach((b, k) => b.mesh.position.x = lerp(from[k], mx(s + k), e)); });
};

function resetAll() {
  sBox.forEach(b => b.setColor(BLUE, BLUE));
  pBox.forEach(b => b.setColor(RED, RED));
  iBall.mesh.position.set(mx(0), 380, 0);
  jBall.mesh.position.set(mx(0), 640, 0);
  ring.mesh.visible = false;
}

function* runBF() {
  yield S(resetAll);
  yield W(200);
  let i = 0, comps = 0;
  while (i <= TXT.length - P.length) {
    yield fly(iBall, mx(i), 380, 250);
    yield fly(jBall, mx(i), 640, 250);
    let j = 0;
    while (j < P.length && i + j < TXT.length) {
      yield fly(jBall, mx(i + j), 640);
      yield S(() => { sBox[i + j].setColor(GOLD, GOLD); pBox[j].setColor(GOLD, GOLD); });
      yield W(380);
      comps++;
      if (TXT[i + j] === P[j]) {
        yield S(() => { sBox[i + j].setColor(GREEN, GREEN); pBox[j].setColor(GREEN, GREEN); });
        yield W(450);
        j++;
      } else {
        yield S(() => { sBox[i + j].setColor(RED, RED); pBox[j].setColor(RED, RED); });
        yield W(450);
        yield S(() => { sBox[i + j].setColor(BLUE, BLUE); pBox[j].setColor(RED, RED); });
        yield W(120);
        i = i + 1;
        j = 0;
        break;
      }
    }
    if (j === P.length) {
      yield S(() => {
        for (let k = 0; k < P.length; k++) sBox[i + k].setColor(GREEN, GREEN);
        ring.mesh.position.set(mx(i) + (P.length - 1) * SP / 2, 420, 0);
        ring.mesh.visible = true;
      });
      yield W(1400);
      yield S(() => { status.textContent = 'BruteForce 完成：命中位置 ' + i + '，共比较 ' + comps + ' 次'; });
      return;
    }
    yield* shiftP(i);
    yield W(120);
  }
  yield S(() => { status.textContent = 'BruteForce 完成：未找到 "' + P + '"，共比较 ' + comps + ' 次'; });
}

engine.queue(() => runBF());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
