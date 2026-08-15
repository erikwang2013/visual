// AlgorithmLibrary/UnboundedKnapsack3D.js — 完全背包：容量 0..10 正序扫描，dp[w]=max(dp[w-wi]+vi)，同一物品可反复装（一维滚动数组）（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('UnboundedKnapsack3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const status = panel.addStatus('就绪');

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, ORANGE = 0xfb923c, CYAN = 0x22d3ee, WHITE = 0xffffff;
const ease = p => p * p * (3 - 2 * p);

const ITEMS = [{ id: 'A', w: 3, v: 4 }, { id: 'B', w: 5, v: 8 }, { id: 'C', w: 4, v: 6 }];
const CAP = 10;
const SLOT_X = w => 40 + w * 60;

// ---- 容量槽 0..CAP（峰值 11，预建常驻）：运行期仅改文字/显隐/缩放/颜色，绝不 new ----
const slots = [];
for (let w = 0; w <= CAP; w++) {
  const b = new VBox(scene, { w: 44, h: 40, d: 36, x: SLOT_X(w), y: 500, z: 0, label: '', color: BLUE, emissive: BLUE });
  slots.push(b);
}

// ---- 物品块 A/B/C（预建常驻）----
const itemBox = new Map();   // id -> { box, lab }
ITEMS.forEach((it, i) => {
  const y = 400 - i * 100;
  const box = new VBox(scene, { w: 96, h: 48, d: 40, x: -30, y, z: 0, label: it.id, color: BLUE, emissive: BLUE });
  itemBox.set(it.id, { box });
});

const dp = new Array(CAP + 1).fill(0);
const pick = new Array(CAP + 1).fill(-1);

function setSlot(w, v, c) { dp[w] = v; slots[w].setText(String(v)); slots[w].setColor(c, c); }
function setSlotCol(w, c) { slots[w].setColor(c, c); }
function setItemCol(id, c) { itemBox.get(id).box.setColor(c, c); }

function* runUB() {
  dp.fill(0); pick.fill(-1);
  yield S(() => { status.textContent = '完全背包：容量 0..10 正序扫描，dp[w]=max(dp[w-wi]+vi)，物品可无限重复取用。物品 A(重3 值4)、B(重5 值8)、C(重4 值6)'; });
  yield W(600);
  for (let w = 0; w <= CAP; w++) {
    const b = slots[w];
    b.setText('');
    b.setColor(BLUE, BLUE);
    yield A(240, p => { b.mesh.scale.setScalar(0.01 + 0.99 * ease(p)); });
    b.mesh.scale.setScalar(1);
  }
  slots[0].setColor(GOLD, GOLD);
  slots[0].setText('0');
  for (const o of itemBox.values()) { o.box.setColor(BLUE, BLUE); }
  yield W(300);
  for (let w = 1; w <= CAP; w++) {
    let best = 0, bf = -1;
    setSlotCol(w, CYAN);
    yield S(() => { status.textContent = '容量 ' + w + '：逐一尝试「最后装的一件」'; });
    yield W(280);
    for (const it of ITEMS) {
      if (w >= it.w) {
        const v = dp[w - it.w] + it.v;
        setItemCol(it.id, ORANGE);
        yield S(() => { status.textContent = '装 ' + it.id + '：dp[' + (w - it.w) + ']=' + dp[w - it.w] + ' + ' + it.v + ' = ' + v + (v > best ? ' ← 暂优' : ''); });
        yield W(320);
        if (v > best) { best = v; bf = it.id; }
        setItemCol(it.id, BLUE);
      } else {
        yield S(() => { status.textContent = it.id + ' 重 ' + it.w + ' > 容量 ' + w + '，放不下'; });
        yield W(200);
      }
    }
    setSlot(w, best, GOLD);
    pick[w] = bf;
    yield S(() => { status.textContent = '→ dp[' + w + '] = ' + best + '（最后装 ' + (bf || '—') + '）'; });
    yield W(420);
  }
  yield S(() => { status.textContent = '填表完成，回溯：从容量 10 反复减掉「最后装的那件」的重量'; });
  yield W(520);
  const comb = [];
  let w = CAP;
  while (w > 0 && pick[w] !== -1) {
    const it = ITEMS.find(i => i.id === pick[w]);
    comb.push(it.id);
    const o = itemBox.get(it.id);
    const baseY = o.box.mesh.position.y;
    setItemCol(it.id, GOLD);
    yield A(430, p => { o.box.mesh.position.y = baseY + 40 * Math.sin(p * Math.PI); });
    yield S(() => { status.textContent = 'dp[' + w + '] 最后装 ' + it.id + '（重 ' + it.w + '）→ 容量 ' + w + ' - ' + it.w + ' = ' + (w - it.w); });
    yield W(400);
    w -= it.w;
  }
  const total = dp[CAP];
  yield S(() => { status.textContent = 'UnboundedKnapsack 演示完成：最大价值 ' + total + '，组合 ' + comb.join('+') + '（总重 10，正好装满）；O(n·W) 时间、O(W) 空间'; });
  yield W(800);
}

engine.queue(() => runUB());
panel.addButton('清空', () => {
  engine.clear();
  for (let w = 0; w <= CAP; w++) {
    slots[w].mesh.scale.setScalar(1);
    slots[w].setText('');
    slots[w].setColor(BLUE, BLUE);
  }
  itemBox.forEach(o => { o.box.setColor(BLUE, BLUE); });
  dp.fill(0);
  pick.fill(-1);
  status.textContent = '';
});

scene.start(engine);
