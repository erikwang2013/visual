// AlgorithmLibrary/RabinKarp3D.js — RK 滚动哈希：窗口哈希 O(1) 递推，折线顶点爆炸 = 哈希命中（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RabinKarp3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, RED = 0xfb7185, GOLD = 0xfcd34d, GREEN = 0x4ade80, CYAN = 0x67e8f9, VIOLET = 0xc4b5fd;
const hint = new VText(scene, { text: '点击「▶ 演示」开始', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('');

const TXT = 'ABABABC', P = 'ABAB';
const B = 29;
const hash = s => { let h = 0; for (const ch of s) h = h * B + ch.charCodeAt(0); return h; };
const HP = hash(P);
const winH = [];
for (let i = 0; i <= TXT.length - P.length; i++) winH.push(hash(TXT.slice(i, i + P.length)));
const hMin = Math.min(...winH), hMax = Math.max(...winH);

const SP = 46;
const lerp = (a, b, p) => a + (b - a) * p;
const mx = k => (k - (TXT.length - 1) / 2) * SP + 320;
const px = k => (k - (P.length - 1) / 2) * SP + 320;
const sBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 290, label: ch, color: BLUE, emissive: BLUE }));
const pBox = [...P].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: px(k), y: 620, label: ch, color: RED, emissive: RED }));
const iBall = new VNode(scene, { radius: 11, x: mx(0), y: 210, color: CYAN, emissive: CYAN });
const jBall = new VNode(scene, { radius: 11, x: px(0), y: 710, color: GOLD, emissive: GOLD });
const ring = new VTorus(scene, { radius: 36, x: 0, y: 290, color: GOLD });
ring.mesh.visible = false;
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
new VText(scene, { text: '主串 S', x: 60, y: 290, z: 0, color: PALETTE.textDim, scale: 0.6 });
new VText(scene, { text: '模式串 P', x: 60, y: 620, z: 0, color: PALETTE.textDim, scale: 0.6 });

const chartX = i => 185 + i * 90;
const chartY = h => 500 - 150 * (h - hMin) / (hMax - hMin);
const verts = winH.map((h, i) => new VNode(scene, { radius: 7, x: chartX(i), y: chartY(h), color: 0x475569, emissive: 0x475569 }));
winH.map((_, i) => new VText(scene, { text: 'i=' + i, x: chartX(i), y: 450, z: 0, color: PALETTE.textDim, scale: 0.5 }));
new VText(scene, { text: '滚动哈希曲线 h(i)（顶点 = 各窗口哈希，绿色爆炸 = 哈希命中）', x: 320, y: 540, z: 0, color: VIOLET, scale: 0.62 });

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

const burst = (x, y) => {
  const g = new THREE.Group();
  const parts = [];
  for (let k = 0; k < 26; k++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(3, 6, 6), new THREE.MeshBasicMaterial({ color: GREEN }));
    const start = new THREE.Vector3(x, y, 0);
    m.position.copy(start);
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, (Math.random() - 0.5) * 0.5).normalize();
    parts.push({ m, start, dir, d: 26 + Math.random() * 30 });
    g.add(m);
  }
  fxGroup.add(g);
  return A(650, p => {
    const e = p * p * (3 - 2 * p);
    parts.forEach(pt => pt.m.position.copy(pt.start).addScaledVector(pt.dir, pt.d * e));
  });
};

function resetAll() {
  clearFx();
  sBox.forEach(b => b.setColor(BLUE, BLUE));
  pBox.forEach(b => b.setColor(RED, RED));
  verts.forEach(v => v.setColor(0x475569, 0x475569));
  iBall.mesh.position.set(mx(0), 210, 0);
  jBall.mesh.position.set(px(0), 710, 0);
  ring.mesh.visible = false;
  outT.setText('');
}

function* chartPoint(i, h) {
  const hit = h === HP;
  yield S(() => verts[i].setColor(hit ? GOLD : 0x475569, hit ? GOLD : 0x475569));
  yield W(180);
  if (i > 0) {
    yield S(() => {
      const a = new THREE.Vector3(chartX(i - 1), chartY(winH[i - 1]), 30);
      const b = new THREE.Vector3(chartX(i), chartY(h), 30);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]),
        new THREE.LineBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.9 }));
      fxGroup.add(line);
    });
  }
  if (hit) yield burst(chartX(i), chartY(h));
}

function* runRK() {
  yield S(resetAll);
  yield S(() => { hint.setText('RK：先算模式串哈希 H；每个窗口的哈希用「滚动」公式 O(1) 递推；哈希相等才逐字符验证（本例 base=29）'); });
  const matches = [];
  let h = winH[0];
  for (let i = 0; i < winH.length; i++) {
    yield fly(iBall, mx(i), 210);
    yield S(() => {
      outT.setText(i === 0
        ? `窗口 0 直接计算哈希：${h}`
        : `滚动：h${i} = (h${i - 1} − S[${i - 1}]·29³)·29 + S[${i + P.length - 1}] = ${h}`);
    });
    yield* chartPoint(i, h);
    if (h === HP) {
      matches.push(i);
      yield S(() => { hint.setText(`h${i} == H = ${HP} —— 哈希命中！顶点爆炸，窗口金色，逐字符验证`); });
      yield W(500);
      let ok = true;
      for (let k = 0; k < P.length; k++) {
        yield fly(iBall, mx(i + k), 210);
        yield fly(jBall, px(k), 710);
        yield S(() => { sBox[i + k].setColor(GOLD, GOLD); pBox[k].setColor(GOLD, GOLD); });
        yield W(240);
        if (TXT[i + k] === P[k]) {
          yield S(() => { sBox[i + k].setColor(GREEN, GREEN); pBox[k].setColor(GREEN, GREEN); });
        } else {
          ok = false;
          yield S(() => { sBox[i + k].setColor(RED, RED); pBox[k].setColor(RED, RED); });
          break;
        }
      }
      yield S(() => {
        pBox.forEach(b => b.setColor(RED, RED));
        sBox.forEach(b => b.setColor(BLUE, BLUE));
      });
      yield W(250);
      if (ok) {
        yield S(() => {
          for (let k = 0; k < P.length; k++) sBox[i + k].setColor(GREEN, GREEN);
          ring.mesh.position.set(mx(i), 290, 0);
          ring.mesh.visible = true;
          outT.setText(`验证通过：S[${i}..${i + P.length - 1}] == P —— 匹配位置 ${i}（金色窗口框）`);
        });
        yield W(1100);
        yield S(() => ring.mesh.visible = false);
      } else {
        yield S(() => outT.setText('哈希命中但字符不等 —— 哈希碰撞！验证环节就是为此存在的'));
        yield W(900);
      }
    } else {
      yield S(() => { outT.setText(`h${i} = ${h} ≠ H = ${HP} —— 哈希不等，整窗跳过，不逐字符`); });
      yield W(650);
    }
    if (i < winH.length - 1) {
      yield S(() => {});
      h = (h - TXT.charCodeAt(i) * Math.pow(B, P.length - 1)) * B + TXT.charCodeAt(i + P.length);
    }
  }
  yield S(() => {
    matches.forEach(m => { for (let k = 0; k < P.length; k++) sBox[m + k].setColor(GREEN, GREEN); });
    ring.mesh.position.set(mx(matches[0]), 290, 0);
    ring.mesh.visible = true;
    outT.setText(`扫描结束：匹配位置 ${matches.join('、')}。${winH.length} 个窗口 = 1 次直接哈希 + ${winH.length - 1} 次 O(1) 滚动`);
    status.textContent = `RK 结果：主串 "${TXT}" 中 "${P}" 出现在位置 ${matches.join(' 和 ')}（哈希命中 ${matches.length} 次，均验证通过）`;
    hint.setText('对比 BF：RK 把「比较字符串」变成「比较整数」；哈希不等直接跳过，命中才回查 —— 平均 O(n+m)');
  });
}

engine.queue(() => runRK());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫色折线 = 哈希曲线，金色顶点 + 爆炸 = 命中，金环 = 匹配窗口）');

scene.start(engine);
