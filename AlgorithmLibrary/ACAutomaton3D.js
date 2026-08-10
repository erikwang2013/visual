// AlgorithmLibrary/ACAutomaton3D.js
// AC 自动机（多模式匹配）：模式串建 Trie（VBox 节点 + 管状边 + ★ 词尾），
// BFS 构建 fail 指针（暗色细线逐个指向），主串逐字符沿自动机跳转匹配（cyan 高亮，命中 green）。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ACAutomaton3D');

const scene = new Scene3D('scene', { cameraPos: [0, 350, 980], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '输入模式串与主串：先「构建」再「匹配」', x: 0, y: 268, z: 0, color: PALETTE.textGlow, scale: 0.85 });

const ROOT_Y = 200, STEP_Y = 76, X_GAP = 86, FAIL_COLOR = 0x64748b;
let nextId = 0, maxDepth = 0;
let root = null, built = false;
const nodes = new Map();      // id -> {model, box}
const edges = new Map();      // 'a->b' -> {mesh, label}
const failLineById = new Map(); // id -> {mesh}
let aux = [];
let textBoxes = [], textIndexLabels = [], lastTextI = -1;

function clearAll() {
  engine.clear();
  for (const e of nodes.values()) e.box.remove();
  nodes.clear();
  for (const e of edges.values()) {
    scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose();
    if (e.label) e.label.remove();
  }
  edges.clear();
  for (const f of failLineById.values()) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }
  failLineById.clear();
  for (const o of textBoxes) o.remove();
  for (const o of textIndexLabels) o.remove();
  for (const o of aux) o.remove();
  textBoxes = []; textIndexLabels = []; aux = [];
  root = null; built = false; nextId = 0; maxDepth = 0; lastTextI = -1;
  status.textContent = '已清空';
  hint.setText('输入模式串与主串：先「构建」再「匹配」');
}

function makeModelNode(char, parent, depth) {
  if (depth > maxDepth) maxDepth = depth;
  return { id: 'n' + (nextId++), char, depth, parent, children: new Map(), fail: null, pats: [], end: false };
}

function layout() {
  const byDepth = [];
  const q = [root];
  while (q.length) {
    const m = q.shift();
    (byDepth[m.depth] = byDepth[m.depth] || []).push(m);
    for (const c of m.children.values()) q.push(c);
  }
  const pos = new Map();
  for (const d in byDepth) {
    const arr = byDepth[d];
    arr.forEach((m, i) => pos.set(m.id, { x: (i - (arr.length - 1) / 2) * X_GAP, y: ROOT_Y - STEP_Y * m.depth, z: 0 }));
  }
  return pos;
}

function drawEdge(a, b, label) {
  const A = nodes.get(a).box, B = nodes.get(b).box;
  const p1 = A.mesh.position.clone(), p2 = B.mesh.position.clone();
  const dir = p2.clone().sub(p1);
  if (dir.lengthSq() < 1e-6) return;
  dir.normalize();
  p1.addScaledVector(dir, 24); p2.addScaledVector(dir, 24);
  const mesh = tubeBetween(scene, p1, p2, { color: PALETTE.edge, opacity: 0.5, radius: 2.2 });
  const mid = p1.clone().add(p2).multiplyScalar(0.5).add(new THREE.Vector3(0, 20, 0));
  const lbl = new VText(scene, { text: label, x: mid.x, y: mid.y, z: mid.z, color: PALETTE.textDim, scale: 0.62 });
  edges.set(a + '->' + b, { mesh, label: lbl });
}

function popIn(id) {
  const box = nodes.get(id).box;
  box.mesh.scale.setScalar(0.01);
  C(380, (p) => { const t = easeInOut(p); box.mesh.scale.setScalar(0.01 + 0.99 * t); }, () => box.mesh.scale.set(1, 1, 1));
}
function pulse(id) {
  const box = nodes.get(id).box;
  C(420, (p) => box.mesh.scale.setScalar(1 + 0.22 * Math.sin(p * Math.PI)), () => box.mesh.scale.set(1, 1, 1));
}

function build() {
  clearAll();
  const pats = patternsInput.value.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
  if (!pats.length) { status.textContent = '请输入至少一个模式串'; return; }
  patternsInput.value = pats.join(',');
  root = { id: 'root', char: '', depth: 0, parent: null, children: new Map(), fail: null, pats: [], end: false };
  root.fail = root;
  const insSteps = [];   // {parentId, nodeId, end}
  for (const w of pats) {
    let m = root;
    for (const ch of w) {
      if (!m.children.has(ch)) {
        const nm = makeModelNode(ch, m, m.depth + 1);
        m.children.set(ch, nm);
        insSteps.push({ parentId: m.id, nodeId: nm.id, end: false });
      }
      m = m.children.get(ch);
    }
    m.end = true;
    m.pats.push(w);
    insSteps.push({ parentId: null, nodeId: m.id, end: true });
  }
  const pos = layout();
  const rootBox = new VBox(scene, { w: 40, h: 40, d: 24, x: pos.get('root').x, y: pos.get('root').y, label: '根', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
  nodes.set('root', { model: root, box: rootBox });
  popIn('root');
  const q = [root];
  while (q.length) {
    const m = q.shift();
    if (m.id === 'root') {
      for (const c of m.children.values()) q.push(c);
      continue;
    }
    const p = pos.get(m.id);
    const box = new VBox(scene, { w: 36, h: 36, d: 22, x: p.x, y: p.y, label: m.char, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
    nodes.set(m.id, { model: m, box });
    popIn(m.id);
    drawEdge(m.parent.id, m.id, m.char);
    for (const c of m.children.values()) q.push(c);
  }
  C(1, () => hint.setText('① 插入模式串建 Trie：' + pats.join(' / ')), () => {});
  for (const st of insSteps) {
    if (!st.end) continue;
    (function (id, ch) {
      C(450, () => {
        hint.setText('✔ 模式结束：节点 ' + id + ' 标记词尾 ★');
        nodes.get(id).box.setText(ch + '★');
        pulse(id);
      }, () => {});
    })(st.nodeId, nodes.get(st.nodeId).model.char);
  }
  // BFS 构建 fail 指针
  C(1, () => hint.setText('② BFS 构建 fail 指针：失配时沿 fail 跳转（暗色细线）'), () => {});
  const failEvents = [];
  const fq = [root];
  while (fq.length) {
    const v = fq.shift();
    for (const [ch, w] of v.children) {
      if (v === root) {
        w.fail = root;
      } else {
        let f = v.fail;
        while (f !== root && !f.children.has(ch)) f = f.fail;
        w.fail = f.children.get(ch) || root;
      }
      if (w.fail !== root) failEvents.push({ v: w, fail: w.fail, ch });
      fq.push(w);
    }
  }
  for (const fe of failEvents) {
    C(550, () => {
      hint.setText('fail(' + fe.v.char + ') → ' + (fe.fail === root ? '根' : fe.fail.char) + '：失配跳转目标');
      nodes.get(fe.v.id).box.setColor(PALETTE.red, PALETTE.redEmissive);
      pulse(fe.fail.id);
    }, () => { nodes.get(fe.v.id).box.setColor(PALETTE.node, PALETTE.nodeEmissive); });
    (function (vId, fId) {
      C(1, () => {
        const A = nodes.get(vId).box, B = nodes.get(fId).box;
        const p1 = A.mesh.position.clone(), p2 = B.mesh.position.clone();
        p1.z = -26; p2.z = -26;
        const mesh = tubeBetween(scene, p1, p2, { color: FAIL_COLOR, opacity: 0.5, radius: 1.4 });
        failLineById.set(vId, { mesh });
      }, () => {});
    })(fe.v.id, fe.fail.id);
  }
  built = true;
  C(1, () => hint.setText('③ Trie 与 fail 指针构建完成，点击「匹配」开始多模式匹配'), () => {});
}

function matchText() {
  if (!built || !root) { status.textContent = '请先点击「构建」'; return; }
  engine.clear();
  const text = textInput.value.trim().toUpperCase() || 'USHERS';
  textInput.value = text;
  const n = text.length, spacing = 54, w = 44;
  const ty = ROOT_Y - STEP_Y * (maxDepth + 1) - 40;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * spacing;
    textBoxes.push(new VBox(scene, { w, h: w, d: w * 0.6, x, y: ty, label: text[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
    textIndexLabels.push(new VText(scene, { text: i, x, y: ty - 42, z: 0, color: PALETTE.textDim, scale: 0.7 }));
  }
  const tl = new VText(scene, { text: '主串', x: textBoxes[0].mesh.position.x - 60, y: ty, z: 0, color: PALETTE.textDim, scale: 0.7 });
  aux.push(tl);
  C(1, () => hint.setText('③ 主串逐字符沿自动机跳转：当前节点 / 转移 cyan 高亮'), () => {});

  // 预计算匹配步骤
  const steps = [];
  const found = [];
  let cur = root;
  for (let i = 0; i < n; i++) {
    const ch = text[i];
    while (cur !== root && !cur.children.has(ch)) { steps.push({ t: 'fail', from: cur, i }); cur = cur.fail; }
    if (cur.children.has(ch)) { steps.push({ t: 'go', from: cur, to: cur.children.get(ch), ch, i }); cur = cur.children.get(ch); }
    else steps.push({ t: 'stay', ch, i });
    let f = cur; const hits = [];
    while (f !== root) { for (const p of f.pats) hits.push(p); f = f.fail; }
    if (hits.length) { steps.push({ t: 'hit', node: cur, pats: hits, i }); found.push(...hits); }
  }
  lastTextI = -1;
  for (const st of steps) {
    if (st.t === 'go') {
      C(600, () => {
        hint.setText('T[' + st.i + "]='" + st.ch + "'：沿边 '"+st.ch+"' 转移 " + (st.from === root ? '根' : st.from.char) + ' → ' + st.to.char);
        if (lastTextI >= 0) textBoxes[lastTextI].setColor(PALETTE.node, PALETTE.nodeEmissive);
        textBoxes[st.i].setColor(PALETTE.highlight, PALETTE.highlightEmissive);
        if (st.from !== root) nodes.get(st.from.id).box.setColor(PALETTE.node, PALETTE.nodeEmissive);
        nodes.get(st.to.id).box.setColor(PALETTE.highlight, PALETTE.highlightEmissive);
        const e = edges.get(st.from.id + '->' + st.to.id);
        if (e) { e.mesh.material.color.setHex(PALETTE.highlight); e.mesh.material.opacity = 0.9; }
        lastTextI = st.i;
      }, () => {});
      C(1, () => {
        const e = edges.get(st.from.id + '->' + st.to.id);
        if (e) { e.mesh.material.color.setHex(PALETTE.edge); e.mesh.material.opacity = 0.5; }
      }, () => {});
    } else if (st.t === 'fail') {
      C(650, () => {
        hint.setText('失配：节点 ' + st.from.char + ' 无出边 ' + text[st.i] + '，沿 fail 跳转');
        if (lastTextI >= 0) textBoxes[lastTextI].setColor(PALETTE.node, PALETTE.nodeEmissive);
        textBoxes[st.i].setColor(PALETTE.red, PALETTE.redEmissive);
        nodes.get(st.from.id).box.setColor(PALETTE.red, PALETTE.redEmissive);
        lastTextI = st.i;
      }, () => {});
      C(1, () => {
        textBoxes[st.i].setColor(PALETTE.node, PALETTE.nodeEmissive);
        nodes.get(st.from.id).box.setColor(PALETTE.node, PALETTE.nodeEmissive);
        const fl = failLineById.get(st.from.id);
        if (fl) { fl.mesh.material.color.setHex(PALETTE.highlight); fl.mesh.material.opacity = 0.9; }
      }, () => {});
      C(1, () => {
        const fl = failLineById.get(st.from.id);
        if (fl) { fl.mesh.material.color.setHex(FAIL_COLOR); fl.mesh.material.opacity = 0.5; }
      }, () => {});
    } else if (st.t === 'stay') {
      C(500, () => {
        hint.setText('T[' + st.i + "]='" + st.ch + "'：根节点无此出边，停留根节点");
        textBoxes[st.i].setColor(PALETTE.yellow, PALETTE.yellowEmissive);
        lastTextI = st.i;
      }, () => {});
      C(1, () => textBoxes[st.i].setColor(PALETTE.node, PALETTE.nodeEmissive), () => {});
    } else if (st.t === 'hit') {
      for (const p of st.pats) {
        (function (pat, i) {
          C(600, () => {
            hint.setText('✔ 命中模式串 "' + pat + '"（位置 ' + (i - pat.length + 1) + '）');
            let f = st.node;
            while (f !== root) {
              if (f.pats.includes(pat)) { nodes.get(f.id).box.setColor(PALETTE.green, PALETTE.greenEmissive); pulse(f.id); break; }
              f = f.fail;
            }
          }, () => {});
        })(p, st.i);
      }
    }
  }
  const uniq = [...new Set(found)];
  C(1, () => {
    status.textContent = uniq.length ? '匹配完成，命中: ' + uniq.join(', ') : '匹配完成，未命中任何模式串';
    hint.setText('④ 主串扫描结束' + (uniq.length ? '，共命中 ' + uniq.length + ' 个模式' : '，未命中'));
  }, () => {});
}

const patternsInput = panel.addInput('模式串（逗号分隔）', () => build(), 30);
patternsInput.value = 'he,she,his,hers';
const textInput = panel.addInput('主串', () => matchText(), 20);
textInput.value = 'ushers';
panel.addButton('构建', build);
panel.addButton('匹配', matchText);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
