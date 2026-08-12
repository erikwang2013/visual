// AlgorithmLibrary/BoyerMoore3D.js — BM 坏字符规则：从右往左比较，失配按坏字符最后出现位置跳跃（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BoyerMoore3D');

const scene = new Scene3D('scene', { cameraPos: [0, 430, 780], fov: 60 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, RED = 0xfb7185, GOLD = 0xfcd34d, GREEN = 0x4ade80, CYAN = 0x67e8f9, ORANGE = 0xfb923c;
const hint = new VText(scene, { text: '点击「运行演示」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('');

const TXT = 'ABCBABAB', P = 'ABAB';
const SP = 46;
const lerp = (a, b, p) => a + (b - a) * p;
const mx = k => (k - (TXT.length - 1) / 2) * SP;
const sBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 150, label: ch, color: BLUE, emissive: BLUE }));
const pBox = [...P].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 430, label: ch, color: RED, emissive: RED }));
const iBall = new VNode(scene, { radius: 11, x: mx(0), y: 70, color: CYAN, emissive: CYAN });
const jBall = new VNode(scene, { radius: 11, x: mx(0), y: 520, color: GOLD, emissive: GOLD });
const ring = new VTorus(scene, { radius: 36, x: 0, y: 150, color: GOLD });
ring.mesh.visible = false;
const xMark = new VText(scene, { text: '✕', x: 0, y: 150, z: 40, color: RED, scale: 1.35 });
xMark.sprite.visible = false;
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

const lastIndex = (ch, upto) => { for (let k = upto; k >= 0; k--) if (P[k] === ch) return k; return -1; };

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
  xMark.sprite.visible = false;
  outT.setText('');
}

function* runBM() {
  yield S(resetAll);
  yield S(() => { hint.setText('BM：模式串从右往左比较。失配的字符叫「坏字符」：它没在 P 中先段出现 → 整段跳过 j+1 格；出现过 → 对齐到最后一次出现处'); });
  let i = 0;
  while (i <= TXT.length - P.length) {
    yield flyWindow(i);
    let j = P.length - 1;
    let full = true;
    while (j >= 0) {
      yield fly(jBall, mx(i + j), 520);
      yield S(() => { sBox[i + j].setColor(GOLD, GOLD); pBox[j].setColor(GOLD, GOLD); });
      yield W(300);
      if (TXT[i + j] === P[j]) {
        yield S(() => {
          sBox[i + j].setColor(GREEN, GREEN); pBox[j].setColor(GREEN, GREEN);
          outT.setText(`第 ${j + 1} 位匹配：S[${i + j}]='${TXT[i + j]}' == P[${j}]='${P[j]}' —— 成为「好后缀」的一部分`);
        });
        j--;
      } else {
        const bad = TXT[i + j];
        const last = lastIndex(bad, j - 1);
        const shift = last >= 0 ? j - last : j + 1;
        const gs = P.slice(j + 1);
        yield S(() => {
          xMark.sprite.position.set(mx(i + j), 150, 40);
          xMark.sprite.visible = true;
          sBox[i + j].setColor(RED, RED); pBox[j].setColor(RED, RED);
          outT.setText(`坏字符 S[${i + j}]='${bad}' ≠ P[${j}]='${P[j]}'：'${bad}' ${last >= 0 ? `最后出现在 P[${last}]` : '在 P 中未出现'} → 平移 ${shift} 格${gs ? `；好后缀 '${gs}' 已确认绿色` : ''}`);
        });
        yield W(800);
        yield S(() => hint.setText(`坏字符跳转：窗口右移 ${shift} 格（橙色拉伸箭头 = 步长，指向新窗口位置）`));
        yield stretchArrow(mx(i), mx(i + shift), 300, 700);
        yield flyWindow(i + shift, 550);
        yield W(350);
        yield S(() => {
          clearFx();
          xMark.sprite.visible = false;
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
        status.textContent = `BM 结果：主串 "${TXT}" 中 "${P}" 出现在位置 ${i}（坏字符跳转 2 次）`;
        hint.setText('对比 BF：同样失配，BF 的 i 只回退 1 格；BM 一次跳 3 格 —— 坏字符规则让「没用的字符」直接翻页，文本越长优势越大');
      });
      yield W(1400);
      return;
    }
    yield W(200);
  }
  yield S(() => { outT.setText('匹配失败：主串中不存在模式串'); status.textContent = `BM 结果：主串 "${TXT}" 中未找到 "${P}"`; });
}

panel.addButton('运行演示', () => engine.start(runBM()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；红 ✕ = 坏字符，绿 = 好后缀，金球 = 比较指针，橙色箭头 = 平移步长）');

scene.start(engine);
