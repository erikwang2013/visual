// AlgorithmLibrary/Sunday3D.js — Sunday：窗口从左往右比，失配后看「窗口右侧第一个字符」，偏移量橙色标注（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Sunday3D');

const scene = new Scene3D('scene', { cameraPos: [0, 430, 780], fov: 60 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, RED = 0xfb7185, GOLD = 0xfcd34d, GREEN = 0x4ade80, CYAN = 0x67e8f9, ORANGE = 0xfb923c;
const hint = new VText(scene, { text: '点击「▶ 演示」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('');

const TXT = 'ABCABAB', P = 'BAB';
const SP = 46;
const lerp = (a, b, p) => a + (b - a) * p;
const mx = k => (k - (TXT.length - 1) / 2) * SP;
const sBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 150, label: ch, color: BLUE, emissive: BLUE }));
const pBox = [...P].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 430, label: ch, color: RED, emissive: RED }));
const iBall = new VNode(scene, { radius: 11, x: mx(0), y: 70, color: CYAN, emissive: CYAN });
const jBall = new VNode(scene, { radius: 11, x: mx(0), y: 520, color: GOLD, emissive: GOLD });
const ring = new VTorus(scene, { radius: 36, x: 0, y: 150, color: GOLD });
ring.mesh.visible = false;
const nextBall = new VNode(scene, { radius: 10, x: 0, y: 210, color: ORANGE, emissive: ORANGE });
nextBall.mesh.visible = false;
const shiftT = new VText(scene, { text: '', x: 0, y: 252, z: 0, color: ORANGE, scale: 0.62 });
const outT = new VText(scene, { text: '', x: 0, y: 30, z: 0, color: PALETTE.textGlow, scale: 0.75 });
new VText(scene, { text: '主串 S', x: -330, y: 150, z: 0, color: PALETTE.textDim, scale: 0.6 });
new VText(scene, { text: '模式串 P', x: -330, y: 430, z: 0, color: PALETTE.textDim, scale: 0.6 });

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

const fly = (ball, x, y, ms = 340) => {
  const fx = ball.mesh.position.x, fy = ball.mesh.position.y;
  return A(ms, p => {
    const e = p * p * (3 - 2 * p);
    ball.mesh.position.x = lerp(fx, x, e);
    ball.mesh.position.y = lerp(fy, y, e);
  });
};

const flyWindow = (i, ms = 480) => {
  const from = pBox.map(b => b.mesh.position.x);
  const fromI = iBall.mesh.position.x;
  return A(ms, p => {
    const e = p * p * (3 - 2 * p);
    pBox.forEach((b, k) => { b.mesh.position.x = lerp(from[k], mx(i + k), e); });
    iBall.mesh.position.x = lerp(fromI, mx(i), e);
  });
};

const lastIndex = ch => { for (let k = P.length - 1; k >= 0; k--) if (P[k] === ch) return k; return -1; };

const stretchArrow = (fromX, toX, y, ms) => {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 1, 8), new THREE.MeshBasicMaterial({ color: ORANGE }));
  shaft.rotation.z = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(8, 18, 10), new THREE.MeshBasicMaterial({ color: ORANGE }));
  head.rotation.z = Math.PI / 2;
  g.add(shaft); g.add(head);
  g.position.set(fromX, y, 50);
  fxGroup.add(g);
  return A(ms, p => {
    const e = p * p * (3 - 2 * p);
    const len = (toX - fromX) * e;
    shaft.scale.x = Math.max(len, 0.001);
    head.position.x = len;
  });
};

function resetAll() {
  clearFx();
  sBox.forEach(b => b.setColor(BLUE, BLUE));
  pBox.forEach(b => b.setColor(RED, RED));
  iBall.mesh.position.set(mx(0), 70, 0);
  jBall.mesh.position.set(mx(0), 520, 0);
  ring.mesh.visible = false;
  nextBall.mesh.visible = false;
  shiftT.setText('');
  outT.setText('');
}

function* runSunday() {
  yield S(resetAll);
  yield S(() => { hint.setText('Sunday：窗口从左往右比。失配后不看失配位，看「窗口右侧第一个字符」S[i+m]：在 P 中 → 对齐到最后一次出现处；不在 → 整个跳过 m+1 格'); });
  let i = 0;
  while (i <= TXT.length - P.length) {
    yield flyWindow(i);
    let j = 0, full = true;
    while (j < P.length) {
      yield fly(jBall, mx(i + j), 520);
      yield S(() => { sBox[i + j].setColor(GOLD, GOLD); pBox[j].setColor(GOLD, GOLD); });
      yield W(300);
      if (TXT[i + j] === P[j]) {
        yield S(() => { sBox[i + j].setColor(GREEN, GREEN); pBox[j].setColor(GREEN, GREEN); outT.setText(`第 ${j + 1} 位匹配：S[${i + j}]='${TXT[i + j]}' == P[${j}]='${P[j]}'`); });
        j++;
      } else {
        const nx = TXT[i + P.length];
        const last = lastIndex(nx);
        const shift = last >= 0 ? P.length - last : P.length + 1;
        yield S(() => {
          nextBall.mesh.position.set(mx(i + P.length), 210, 0);
          nextBall.mesh.visible = true;
          sBox[i + j].setColor(RED, RED); pBox[j].setColor(RED, RED);
          shiftT.setText(`S[${i + P.length}]='${nx}' ${last >= 0 ? `在 P 中最后出现于 ${last}` : '不在 P 中'} → 偏移 ${shift} 格`);
          outT.setText(`失配：S[${i + j}]='${TXT[i + j]}' ≠ P[${j}]='${P[j]}' —— Sunday 的决定者：窗口右侧的 '${nx}'`);
        });
        yield W(800);
        yield S(() => hint.setText(`Sunday 偏移 ${shift}：窗口右移 ${shift} 格（橙色球 = 窗口右侧字符，橙色数字 = 偏移量）`));
        yield stretchArrow(mx(i), mx(i + shift), 300, 700);
        yield flyWindow(i + shift, 550);
        yield W(300);
        yield S(() => {
          clearFx();
          nextBall.mesh.visible = false;
          shiftT.setText('');
          pBox.forEach(b => b.setColor(RED, RED));
          sBox.forEach(b => b.setColor(BLUE, BLUE));
        });
        i += shift;
        full = false;
        break;
      }
    }
    if (full) {
      yield S(() => {
        for (let k = 0; k < P.length; k++) sBox[i + k].setColor(GREEN, GREEN);
        ring.mesh.position.set(mx(i), 150, 0);
        ring.mesh.visible = true;
        outT.setText(`匹配成功：S[${i}..${i + P.length - 1}] == P —— 第 ${i + 1} 次对齐命中`);
        status.textContent = `Sunday 结果：主串 "${TXT}" 中 "${P}" 出现在位置 ${i}（偏移 2 次）`;
        hint.setText('对比 BM 只看窗口内：Sunday 连窗口右侧的字符都用上 —— 平均跳得更远，尤其字符集大时');
      });
      yield W(1400);
      return;
    }
    yield W(200);
  }
  yield S(() => { outT.setText('匹配失败：主串中不存在模式串'); status.textContent = `Sunday 结果：主串 "${TXT}" 中未找到 "${P}"`; });
}

engine.queue(() => runSunday());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；橙色球 = 窗口右侧字符，橙色数字 = 偏移量，金球 = 比较指针）');

scene.start(engine);
