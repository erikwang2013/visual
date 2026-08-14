// AlgorithmLibrary/RabinKarp3D.js — RabinKarp 滚动哈希：模式哈希 + 逐窗口滚动哈希比较 + 碰撞逐字符验证（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RabinKarp3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x38bdf8, RED = 0xfb7185, GOLD = 0xfde047, GREEN = 0x4ade80, CYAN = 0x67e8f9;
const FRAME = 0x94a3b8;
const status = panel.addStatus('就绪');

const TXT = '59302363124', P = '3124', Q = 101;
const HP = 3124 % Q;                       // 94
const WIN = [72, 10, 94, 34, 40, 96, 50, 94];
const SP = 46;
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);
const mx = k => (k - (TXT.length - 1) / 2) * SP + 320;
const px = k => (k - (P.length - 1) / 2) * SP + 320;
const cx = i => 159 + SP * i;              // 窗口框中心

// ---- 视觉：主串/模式字符盒 + 可滑动窗口框（4 条细边 + 窗口哈希标签）----
const sBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 420, label: ch, color: BLUE, emissive: BLUE }));
const sNum = [...TXT].map((_, k) => new VText(scene, { text: String(k), x: mx(k), y: 392, z: 10, color: PALETTE.textDim, scale: 0.45 }));
const pBox = [...P].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: px(k), y: 560, label: ch, color: RED, emissive: RED }));
const pNum = [...P].map((_, k) => new VText(scene, { text: String(k), x: px(k), y: 532, z: 10, color: PALETTE.textDim, scale: 0.45 }));

const mkBar = (w, h, x, y) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), new THREE.MeshBasicMaterial({ color: FRAME }));
  m.position.set(x, y, 0);
  return m;
};
const winGroup = new THREE.Group();
const bars = [mkBar(2, 190, -92, 0), mkBar(2, 190, 92, 0), mkBar(186, 2, 0, -95), mkBar(186, 2, 0, 95)];
bars.forEach(b => winGroup.add(b));
winGroup.position.set(cx(0), 420, 0);
scene.add(winGroup);

const hTag = new VText(scene, { text: String(WIN[0]), x: 0, y: -70, z: 10, color: CYAN, scale: 0.6 });
scene.remove(hTag.sprite);
winGroup.add(hTag.sprite);
const hpTag = new VText(scene, { text: String(HP), x: 320, y: 610, z: 10, color: GOLD, scale: 0.6 });
hpTag.sprite.visible = false;

const frameColor = c => bars.forEach(b => b.material.color.setHex(c));

function resetAll() {
  sBox.forEach(b => b.setColor(BLUE, BLUE));
  pBox.forEach(b => b.setColor(RED, RED));
  winGroup.position.set(cx(0), 420, 0);
  frameColor(FRAME);
  hTag.setText(String(WIN[0]), { color: CYAN });
  hpTag.sprite.visible = false;
  hpTag.setText(String(HP), { color: GOLD });
}

function* runRK() {
  yield S(resetAll);
  yield W(200);
  // ① 模式哈希：4 盒逐盒金闪 → HP 揭晓
  for (let k = 0; k < P.length; k++) {
    yield S(() => pBox[k].setColor(GOLD, GOLD));
    yield W(350);
    yield S(() => pBox[k].setColor(RED, RED));
  }
  yield S(() => { hpTag.sprite.visible = true; hpTag.setText(String(HP), { color: GOLD }); });
  yield W(450);
  yield S(() => hpTag.setText(String(HP), { color: CYAN }));
  yield W(200);
  // ② 逐窗口滚动 W1..W7（W0 加载即显示；失配闪框、W2 碰撞验证、W7 命中验证）
  for (let i = 1; i <= 7; i++) {
    yield A(380, p => { const e = ease(p); winGroup.position.x = lerp(cx(i - 1), cx(i), e); });
    yield S(() => hTag.setText(String(WIN[i]), { color: GOLD }));
    yield W(220);
    yield S(() => hTag.setText(String(WIN[i]), { color: CYAN }));
    yield S(() => { hpTag.setText(String(HP), { color: GOLD }); frameColor(GOLD); });
    yield W(260);
    if (WIN[i] !== HP) {
      yield S(() => { hpTag.setText(String(HP), { color: CYAN }); frameColor(RED); });
      yield W(340);
      yield S(() => frameColor(FRAME));
      yield W(150);
    } else if (i === 2) {
      // ③ 碰撞：哈希相同但字符不等 → 伪命中
      yield S(() => { hpTag.setText(String(HP), { color: CYAN }); frameColor(GOLD); });
      yield W(320);
      yield S(() => { sBox[2].setColor(GOLD, GOLD); pBox[0].setColor(GOLD, GOLD); });
      yield W(250);
      yield S(() => { sBox[2].setColor(GREEN, GREEN); pBox[0].setColor(GREEN, GREEN); });
      yield W(350);
      yield S(() => { sBox[3].setColor(GOLD, GOLD); pBox[1].setColor(GOLD, GOLD); });
      yield W(250);
      yield S(() => { sBox[3].setColor(RED, RED); pBox[1].setColor(RED, RED); });
      yield W(420);
      yield S(() => { for (let k = 0; k < 4; k++) sBox[2 + k].setColor(RED, RED); frameColor(RED); });
      yield W(350);
      yield S(() => {
        for (let k = 0; k < 4; k++) sBox[2 + k].setColor(BLUE, BLUE);
        pBox[0].setColor(RED, RED); pBox[1].setColor(RED, RED);
        frameColor(FRAME);
      });
      yield W(150);
    } else {
      // ④ 命中：逐位验证全同 → 窗口绿框
      yield S(() => { hpTag.setText(String(HP), { color: CYAN }); frameColor(GOLD); });
      yield W(300);
      for (let k = 0; k < P.length; k++) {
        yield S(() => { sBox[7 + k].setColor(GOLD, GOLD); pBox[k].setColor(GOLD, GOLD); });
        yield W(220);
        yield S(() => { sBox[7 + k].setColor(GREEN, GREEN); pBox[k].setColor(GREEN, GREEN); });
        yield W(320);
      }
      yield S(() => frameColor(GREEN));
      yield W(1200);
    }
  }
  // ⑤ 完成
  yield S(() => { status.textContent = 'RabinKarp 完成：命中位置 7；哈希比较 8 次，逐字符验证 6 次（含 1 次伪命中）'; });
  yield W(800);
}

engine.queue(() => runRK());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
