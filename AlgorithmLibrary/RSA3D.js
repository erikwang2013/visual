// AlgorithmLibrary/RSA3D.js — RSA 公钥密码：p/q → n/φ → e/d → C=M^e mod n → M=C^d mod n；
// 平方-乘的每一位在齿轮与二进制块上逐拍展开，锁/钥匙随加密上锁、解密开锁，右侧面板读 p/q/n/φ/e/d 与密文。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { LockKey, ModExpRow } from '../3D/director/CipherStage.js';
applyTheme('RSA3D');

const PUR = 0xc4b5fd, CYAN = 0x22d3ee, GOLD = 0xfcd34d, ROSE = 0xfb7185, GREEN = 0x4ade80, BLUE = 0x60a5fa, WHITE = 0xffffff, DIM = 0x334155;
const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

function gcd(a, b) { while (b) { const t = a % b; a = b; b = t; } return a; }
function extGcd(a, b) {
  if (!b) return [a, 1, 0];
  const [g, x, y] = extGcd(b, a % b);
  return [g, y, x - Math.floor(a / b) * y];
}
function modInv(e, phi) {
  const [g, x] = extGcd(e, phi);
  if (g !== 1) return 0;
  return ((x % phi) + phi) % phi;
}
function modPow(base, exp, n) {
  let r = 1;
  base %= n;
  while (exp > 0) {
    if (exp & 1) r = (r * base) % n;
    base = (base * base) % n;
    exp = Math.floor(exp / 2);
  }
  return r;
}
// 与 modPow 同序，但把每一位的「平方 / 乘底数」留下来给动画用
function expGroups(base, exp, n) {
  const bits = exp.toString(2).split('').map(Number);
  let r = 1;
  const groups = bits.map((bit) => {
    const sq = (r * r) % n;
    r = sq;
    let mul = null;
    if (bit) { mul = (r * base) % n; r = mul; }
    return { bit, sq, mul, r };
  });
  return { bits, groups, result: r };
}
function pickE(phi) {
  if (gcd(17, phi) === 1) return 17;
  for (let e = 3; e < phi; e += 2) if (gcd(e, phi) === 1) return e;
  return 3;
}
function buildConfig(p, q, m) {
  const n = p * q;
  const phi = (p - 1) * (q - 1);
  const e = pickE(phi);
  const d = modInv(e, phi);
  const c = modPow(m, e, n);
  return { p, q, n, phi, e, d, m, c, m2: modPow(c, d, n) };
}

const scene = new Scene3D('scene', { cameraPos: [520, 620, 1120], lookAt: [460, 470, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

function chip(x, y, w, label, color) {
  return new VBox(scene, { w, h: 52, d: 46, x, y, z: 0, label, color, emissive: color });
}
const pChip = chip(120, 690, 120, 'p=61', PUR);
const qChip = chip(260, 690, 120, 'q=53', PUR);
const nChip = chip(430, 690, 150, 'n=?', CYAN);
const phiChip = chip(610, 690, 170, 'φ=?', CYAN);
const eChip = chip(180, 560, 130, 'e=?', GOLD);
const dChip = chip(500, 560, 160, 'd=?', ROSE);
const mChip = chip(110, 430, 130, 'M=65', BLUE);
const cChip = chip(340, 430, 140, 'C=?', GOLD);
const m2Chip = chip(580, 430, 140, "M′=?", GREEN);

const lock = new LockKey(scene, { x: 800, y: 640, z: 0 });
const modExp = new ModExpRow(scene, { x: 100, y: 290, z: 0, bits: 14, step: 44, color: 0x34d399 });

const director = new StoryDirector(scene, {
  title: 'RSA · 公钥密码',
  total: 8,
  legend: [
    { label: '素数', color: '#c4b5fd' },
    { label: '公钥 e', color: '#fcd34d' },
    { label: '私钥 d', color: '#fb7185' },
    { label: '模幂位', color: '#34d399' },
    { label: '明文 M', color: '#60a5fa' },
    { label: '密文 C', color: '#fcd34d' },
  ],
  onReplay: () => restart(currentP, currentQ, currentMsg, true),
});

const SHOT_ESTABLISH = { pos: [520, 620, 1120], target: [460, 470, 0], ms: 900 };
const SHOT_PRIME = { pos: [420, 820, 780], target: [360, 690, 0], ms: 750 };
const SHOT_KEYS = { pos: [560, 700, 820], target: [430, 560, 0], ms: 750 };
const SHOT_LOCK = { pos: [1080, 720, 760], target: [800, 640, 0], ms: 750 };
const SHOT_MATH = { pos: [400, 540, 780], target: [360, 400, 0], ms: 700 };
const SHOT_VERIFY = { pos: [560, 600, 900], target: [440, 500, 0], ms: 750 };
const SHOT_FINAL = { pos: [580, 760, 1180], target: [460, 500, 0], ms: 900 };

let currentP = 61, currentQ = 53, currentMsg = 65;

function blocks(st = {}, note = '—') {
  const v = (x) => (x === undefined || x === null ? '—' : String(x));
  const bitItems = (st.bits || []).map((b, i) => ({ text: String(b), cls: i === st.bit ? 'head' : '' }));
  return {
    blocks: [
      {
        type: 'kv',
        label: '素数 / 模数',
        items: [
          { k: 'p', v: v(st.p) },
          { k: 'q', v: v(st.q) },
          { k: 'n = p·q', v: v(st.n) },
          { k: 'φ(n)', v: v(st.phi) },
        ],
      },
      {
        type: 'kv',
        label: '密钥对',
        items: [{ k: 'e 公钥', v: v(st.e) }, { k: 'd 私钥', v: v(st.d) }],
      },
      { type: 'chips', label: '指数二进制（当前位）', items: bitItems, empty: '—' },
      {
        type: 'kv',
        label: '消息 / 密文',
        items: [{ k: 'M', v: v(st.m) }, { k: 'C', v: v(st.c) }, { k: 'M′', v: v(st.m2) }],
      },
      { type: 'text', label: '当前', value: note },
    ],
    footer: 'ed ≡ 1 (mod φ) · 欧拉定理保证加解密互逆',
  };
}

function resetVisual(cfg) {
  const { p, q, m } = cfg;
  pChip.setText('p=' + p); pChip.setColor(PUR, PUR);
  qChip.setText('q=' + q); qChip.setColor(PUR, PUR);
  nChip.setText('n=?'); nChip.setColor(DIM, 0x1e293b);
  phiChip.setText('φ=?'); phiChip.setColor(DIM, 0x1e293b);
  eChip.setText('e=?'); eChip.setColor(DIM, 0x1e293b);
  dChip.setText('d=?'); dChip.setColor(DIM, 0x1e293b);
  mChip.setText('M=' + m); mChip.setColor(BLUE, BLUE);
  cChip.setText('C=?'); cChip.setColor(DIM, 0x1e293b);
  m2Chip.setText("M′=?"); m2Chip.setColor(DIM, 0x1e293b);
  lock.setOpen(true);
  lock.setLockLabel('公钥锁');
  lock.setKeyLabel('私钥钥匙');
  modExp.reset();
  director.stateUpdate(blocks({ p, q, m }, '选择两个素数'));
  director.setProgress(0);
  status.textContent = '';
}

const pSelect = input.addSelect('p', PRIMES, 61, (v) => restart(Number(v), Number(qSelect.value), currentMsg, true));
const qSelect = input.addSelect('q', PRIMES, 53, (v) => restart(Number(pSelect.value), Number(v), currentMsg, true));
const msgInput = panel.addInput('消息 M（1<M<n），回车应用', (v) => {
  const msg = Number(v.trim());
  if (!Number.isInteger(msg) || msg <= 1 || msg >= currentP * currentQ) {
    status.textContent = '消息需为 1 < M < n 的整数（当前 n=' + currentP * currentQ + '）';
    return;
  }
  restart(currentP, currentQ, msg, true);
}, 6);

function* runRSA(cfg) {
  const { p, q, n, phi, e, d, m, c, m2 } = cfg;
  director.reset();
  resetVisual(cfg);

  // Hook
  director.chapter('建立');
  yield S(() => director.beat({
    title: '公钥为什么能公开？',
    why: 'RSA 是陷阱门：公开 (e,n) 谁都能加密；只有拿私钥 d 的人能解密。',
    stateText: 'p=' + p + ' · q=' + q + ' · 待生成 n/φ',
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'lock', text: '公钥锁：谁都能锁上', anchor: () => new THREE.Vector3(800, 730, 0), offset: [0, -24], className: 'gold' },
      { id: 'key', text: '私钥钥匙：只有持有者能开', anchor: () => new THREE.Vector3(648, 570, 0), offset: [0, -24] },
    ],
  }));
  director.stateUpdate(blocks({ p, q, m }, '选择两个素数'));
  yield W(780);

  // p/q → n/φ
  director.chapter('密钥生成');
  yield S(() => {
    pChip.setColor(WHITE, WHITE);
    qChip.setColor(WHITE, WHITE);
    director.beat({
      title: '选素数 p、q',
      why: 'n = p·q，φ(n) = (p−1)(q−1)；只知道 n 无法快速反推 p、q——这正是安全边界。',
      stateText: 'p=' + p + ' · q=' + q,
      progress: 1,
      camera: SHOT_PRIME,
      annotations: [
        { id: 'p', text: 'p=' + p, anchor: () => new THREE.Vector3(120, 735, 0), offset: [0, -20], className: 'gold' },
        { id: 'q', text: 'q=' + q, anchor: () => new THREE.Vector3(260, 735, 0), offset: [0, -20], className: 'gold' },
      ],
    });
  });
  yield W(480);
  yield S(() => {
    nChip.setText('n=' + n); nChip.setColor(CYAN, CYAN);
    phiChip.setText('φ=' + phi); phiChip.setColor(CYAN, CYAN);
    director.setBeatState('n = ' + p + '×' + q + ' = ' + n + ' · φ = ' + phi);
    director.stateUpdate(blocks({ p, q, n, phi, m }, 'n 与 φ 已生成'));
  });
  yield W(680);

  // 公钥 e
  lock.setOpen(false);
  lock.setLockLabel('公钥 (' + e + ',' + n + ')');
  eChip.setText('e=' + e);
  eChip.setColor(GOLD, GOLD);
  director.chapter('公钥');
  yield S(() => director.beat({
    title: '公钥 e：与 φ 互素',
    why: 'e 与 φ 互素才能求模逆 d；公钥 (e,n) 公开，任何人都能锁上密文。',
    stateText: 'e=' + e + ' · gcd(e,φ)=1 · 公钥锁已上锁',
    progress: 2,
    camera: SHOT_LOCK,
    annotations: [{ id: 'e', text: '公钥 (' + e + ',' + n + ') 公开', anchor: () => new THREE.Vector3(800, 730, 0), offset: [0, -22], className: 'gold' }],
  }));
  director.stateUpdate(blocks({ p, q, n, phi, e, m }, '公钥已公开'));
  yield W(700);

  // 私钥 d
  dChip.setText('d=' + d);
  dChip.setColor(ROSE, ROSE);
  lock.setKeyLabel('私钥 d=' + d);
  director.chapter('私钥');
  yield S(() => director.beat({
    title: '私钥 d = e⁻¹ mod φ',
    why: '扩展欧几里得解 e·d ≡ 1 (mod φ)；d 是唯一能从密文还原明文的指数，绝不公开。',
    stateText: 'e·d = ' + e * d + ' ≡ 1 (mod ' + phi + ')',
    progress: 3,
    camera: SHOT_KEYS,
    annotations: [{ id: 'd', text: 'd=' + d + ' 保密', anchor: () => new THREE.Vector3(648, 570, 0), offset: [0, -22], className: 'warn' }],
  }));
  director.stateUpdate(blocks({ p, q, n, phi, e, d, m }, '私钥已生成'));
  yield W(700);

  // 加密：C = M^e mod n
  modExp.setExponent(e);
  const enc = expGroups(m, e, n);
  director.chapter('加密');
  yield S(() => director.beat({
    title: '加密 C = M^e mod n',
    why: '公开的 e 很小（' + e + ' = ' + e.toString(2) + '₂），平方-乘只需 O(log e) 次乘法。',
    stateText: 'C = ' + m + '^' + e + ' mod ' + n,
    progress: 4,
    camera: SHOT_MATH,
    annotations: [{ id: 'c', text: '公钥上锁：C = M^e mod n', anchor: () => new THREE.Vector3(340, 490, 0), offset: [0, -22], className: 'gold' }],
  }));
  yield W(420);
  for (let i = 0; i < enc.groups.length; i++) {
    const g = enc.groups[i];
    modExp.mark(i);
    yield S(() => {
      modExp.setCaption('位 ' + g.bit + '：r² mod n = ' + g.sq);
      director.setBeatState('加密位 ' + g.bit + ' · 平方 → ' + g.sq);
      director.stateUpdate(blocks({ p, q, n, phi, e, d, m, bits: enc.bits, bit: i }, '公钥平方-乘'));
    });
    yield W(190);
    if (g.mul !== null) {
      yield S(() => {
        modExp.setCaption('位 1：r × M mod n = ' + g.mul);
        director.setBeatState('加密位 1 · 乘 M → ' + g.mul);
      });
      yield W(190);
    }
    modExp.done(i);
  }
  cChip.setText('C=' + c);
  cChip.setColor(GOLD, GOLD);
  modExp.finish('C = ' + c);
  yield S(() => {
    director.setBeatState('密文 C = ' + c + ' · 公钥锁已扣上');
    director.stateUpdate(blocks({ p, q, n, phi, e, d, m, c, bits: enc.bits, bit: enc.bits.length - 1 }, '加密完成'));
    director.setProgress(4);
  });
  yield W(620);

  // 解密：M = C^d mod n
  modExp.setExponent(d);
  const dec = expGroups(c, d, n);
  director.chapter('解密');
  yield S(() => director.beat({
    title: '解密 M = C^d mod n',
    why: 'd 很长，但平方-乘仍在 O(log d) 次乘法内完成；跑完应回到明文 M。',
    stateText: 'M′ = ' + c + '^' + d + ' mod ' + n,
    progress: 5,
    camera: SHOT_MATH,
    annotations: [{ id: 'm2', text: '私钥开锁：M′ = C^d mod n', anchor: () => new THREE.Vector3(580, 490, 0), offset: [0, -22], className: 'final' }],
  }));
  yield W(380);
  for (let i = 0; i < dec.groups.length; i++) {
    const g = dec.groups[i];
    modExp.mark(i);
    yield S(() => {
      modExp.setCaption('位 ' + g.bit + '：平方' + (g.mul !== null ? ' + 乘 C' : '') + ' → r = ' + g.r);
    });
    yield W(110);
    modExp.done(i);
    if (i % 3 === 2 || i === dec.groups.length - 1) {
      yield S(() => {
        director.setBeatState('解密位 ' + g.bit + ' · r = ' + g.r);
        director.stateUpdate(blocks({ p, q, n, phi, e, d, m, c, bits: dec.bits, bit: i }, '私钥平方-乘'));
      });
    }
  }
  lock.setOpen(true);
  m2Chip.setText("M′=" + m2);
  m2Chip.setColor(GREEN, GREEN);
  modExp.finish("M′ = " + m2);
  yield S(() => {
    director.setBeatState('M′ = ' + m2 + (m2 === m ? ' ✓ 还原明文' : ' ✗'));
    director.stateUpdate(blocks({ p, q, n, phi, e, d, m, c, m2, bits: dec.bits, bit: dec.bits.length - 1 }, '解密完成'));
    director.setProgress(5);
  });
  yield W(720);

  // 欧拉定理验证
  const ed = e * d;
  const verify = modPow(m, ed, n);
  director.chapter('不变量');
  yield S(() => director.beat({
    title: '欧拉定理：M^(ed) ≡ M (mod n)',
    why: 'ed ≡ 1 (mod φ)，欧拉定理给出 M^(ed) = M^(1+kφ) ≡ M；这是 RSA 正确性的根基。',
    stateText: 'ed = ' + ed + ' = ' + phi + '×' + Math.floor(ed / phi) + ' + 1 · 验证 ' + (verify === m ? '✓' : '✗'),
    progress: 6,
    camera: SHOT_VERIFY,
    annotations: [{ id: 'euler', text: 'M^(ed) mod n = ' + verify + ' = M', anchor: () => new THREE.Vector3(440, 600, 0), offset: [0, -22], className: 'final' }],
  }));
  director.stateUpdate(blocks({ p, q, n, phi, e, d, m, c, m2 }, '欧拉验证：M^(ed) mod n = ' + verify));
  yield W(900);

  // 复盘
  director.chapter('复盘');
  yield S(() => director.beat({
    title: '安全性 = 分解 n 很难',
    why: 'n 公开，但分解 n 得到 p,q 才能算 φ 求 d；现实用 2048 位模数 + OAEP 填充，裸 RSA 有攻击面。',
    stateText: '密钥生成 O(log³n) · 加密 O(log e·log²n)',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  director.setProgress(8);
  status.textContent = 'RSA 完成：p=' + p + ' q=' + q + ' n=' + n + ' φ=' + phi + ' e=' + e + ' d=' + d +
    ' · M=' + m + ' → C=' + c + ' → M′=' + m2;
  yield W(850);
}

function restart(p, q, msg, autoPlay = true) {
  if (p === q) {
    q = PRIMES.find((x) => x !== p);
    qSelect.value = String(q);
  }
  const n = p * q;
  if (!Number.isInteger(msg) || msg <= 1 || msg >= n) {
    msg = Math.min(n - 1, Math.max(2, Math.round(msg) || 65));
    msgInput.value = String(msg);
  }
  currentP = p; currentQ = q; currentMsg = msg;
  engine.clear();
  director.reset();
  status.textContent = '';
  const cfg = buildConfig(p, q, msg);
  resetVisual(cfg);
  engine.queue(() => runRSA(cfg));
  if (autoPlay) engine.toggle();
}

input.addButton('重播', () => restart(currentP, currentQ, currentMsg, true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  currentP = 61; currentQ = 53; currentMsg = 65;
  pSelect.value = '61';
  qSelect.value = '53';
  msgInput.value = '';
  status.textContent = '';
  const cfg = buildConfig(currentP, currentQ, currentMsg);
  resetVisual(cfg);
  engine.queue(() => runRSA(cfg));
});

const initialCfg = buildConfig(currentP, currentQ, currentMsg);
resetVisual(initialCfg);
engine.queue(() => runRSA(initialCfg));
scene.start(engine);
