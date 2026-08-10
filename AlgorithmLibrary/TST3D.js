// AlgorithmLibrary/TST3D.js
// 三叉搜索树：Tree3D；节点=字符；中(相等)下/左(小于)/右(大于)；词尾变绿加 ★。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Tree3D } from '../3D/modes/Tree3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TST3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 700], fov: 60 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const tree = new Tree3D(scene);
const status = panel.addStatus('');

let nextId = 0;
const model = new Map();
let root = null;

function mkNode(ch, x, y, parent) {
  const n = { id: 'n' + (nextId++), char: ch, x, y, end: false, parent, left: null, mid: null, right: null };
  model.set(n.id, n);
  return n;
}

function popIn(id) {
  const vn = tree.nodes.get(id).node;
  vn.mesh.scale.setScalar(0.01);
  C(400, (p) => { const t = easeInOut(p); vn.mesh.scale.setScalar(0.01 + 0.99 * t); }, () => vn.mesh.scale.set(1, 1, 1));
}
function pulse(id) {
  const vn = tree.nodes.get(id).node;
  C(600, (p) => vn.mesh.scale.setScalar(1 + 0.25 * Math.sin(p * Math.PI)), () => vn.mesh.scale.set(1, 1, 1));
}
function markEnd(id) {
  const n = model.get(id);
  tree.setColor(id, PALETTE.green, PALETTE.greenEmissive);
  C(1, () => tree.nodes.get(id) && tree.nodes.get(id).node.setText(n.char + '★'), () => {});
}
function unmarkEnd(id) {
  const n = model.get(id);
  tree.setColor(id, PALETTE.node, PALETTE.nodeEmissive);
  C(1, () => tree.nodes.get(id) && tree.nodes.get(id).node.setText(n.char), () => {});
}

function insertWord(word) {
  engine.clear();
  status.textContent = '插入 ' + word;
  if (!root) {
    root = mkNode(word[0], 0, 210, null);
    tree.addNode(root.id, root.char, 0, 210, 0);
    popIn(root.id);
  }
  const path = [];
  let cur = root, i = 0;
  while (true) {
    const ch = word[i];
    if (cur.char === ch) {
      path.push(cur.id);
      if (i === word.length - 1) break;
      i++;
      if (!cur.mid) {
        cur.mid = mkNode(word[i], cur.x, cur.y - 95, cur);
        tree.addNode(cur.mid.id, cur.mid.char, cur.mid.x, cur.mid.y, 0, { parentId: cur.id });
        popIn(cur.mid.id);
      }
      cur = cur.mid;
    } else if (ch < cur.char) {
      path.push(cur.id);
      if (!cur.left) {
        cur.left = mkNode(ch, cur.x - 90, cur.y - 95, cur);
        tree.addNode(cur.left.id, cur.left.char, cur.left.x, cur.left.y, 0, { parentId: cur.id });
        popIn(cur.left.id);
      }
      cur = cur.left;
    } else {
      path.push(cur.id);
      if (!cur.right) {
        cur.right = mkNode(ch, cur.x + 90, cur.y - 95, cur);
        tree.addNode(cur.right.id, cur.right.char, cur.right.x, cur.right.y, 0, { parentId: cur.id });
        popIn(cur.right.id);
      }
      cur = cur.right;
    }
  }
  const existed = cur.end;
  cur.end = true;
  for (const id of path) tree.highlight(id, C);
  markEnd(cur.id);
  pulse(cur.id);
  status.textContent = existed ? word + ' 已存在' : '';
}

function findWord(word) {
  engine.clear();
  const path = [];
  let cur = root, i = 0;
  while (cur && i < word.length) {
    const ch = word[i];
    path.push(cur.id);
    if (cur.char === ch) { if (i === word.length - 1) break; i++; cur = cur.mid; }
    else if (ch < cur.char) cur = cur.left;
    else cur = cur.right;
  }
  for (const id of path) tree.highlight(id, C);
  const found = !!cur && cur.char === word[word.length - 1] && cur.end;
  if (found) pulse(cur.id);
  status.textContent = found ? word + ' 找到' : word + ' 未找到';
}

function deleteWord(word) {
  engine.clear();
  let cur = root, i = 0;
  while (cur && i < word.length) {
    const ch = word[i];
    if (cur.char === ch) { if (i === word.length - 1) break; i++; cur = cur.mid; }
    else if (ch < cur.char) cur = cur.left;
    else cur = cur.right;
  }
  if (!cur || cur.char !== word[word.length - 1] || !cur.end) { status.textContent = word + ' 不存在'; return; }
  status.textContent = '删除 ' + word;
  cur.end = false;
  unmarkEnd(cur.id);
  pulse(cur.id);
  let node = cur;
  while (node && !node.left && !node.mid && !node.right) {
    if (node === root) {
      const rid = root.id;
      root = null;
      model.delete(rid);
      const re = tree.nodes.get(rid);
      if (re) {
        const rm = re.node.mesh;
        C(300, (p2) => rm.scale.setScalar(Math.max(1 - p2, 0.001)), () => rm.scale.set(1, 1, 1));
        C(1, () => tree.removeNode(rid), () => {});
      }
      break;
    }
    const p = node.parent;
    if (p.mid === node) p.mid = null;
    else if (p.left === node) p.left = null;
    else p.right = null;
    const id = node.id;
    model.delete(id);
    const e = tree.nodes.get(id);
    if (e) {
      const m = e.node.mesh;
      C(300, (p2) => m.scale.setScalar(Math.max(1 - p2, 0.001)), () => m.scale.set(1, 1, 1));
      C(1, () => tree.removeNode(id), () => {});
    }
    node = p;
  }
  status.textContent = '';
}

function printWords() {
  engine.clear();
  const words = [];
  (function inorder(n, prefix) {
    if (!n) return;
    inorder(n.left, prefix);
    const here = prefix + n.char;
    if (n.end) words.push(here);
    inorder(n.mid, here);
    inorder(n.right, prefix);
  })(root, '');
  status.textContent = '共 ' + words.length + ' 个单词';
  words.forEach((w, i) => {
    const x = (i - (words.length - 1) / 2) * 150;
    const tmp = new VText(scene, { text: w, x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.9 });
    C(450, (p) => { const t = easeInOut(p); tmp.sprite.position.x = x * t; tmp.sprite.position.y = 230 + (-235 - 230) * t; }, () => tmp.remove());
    C(60, () => tmp.remove(), () => {});
  });
  status.textContent = '';
}

let input = panel.addInput('输入单词', (v) => { if (v) insertWord(v.trim()); }, 12);
panel.addButton('插入', () => { if (input.value) insertWord(input.value.trim()); });
panel.addButton('查找', () => { if (input.value) findWord(input.value.trim()); });
panel.addButton('打印', printWords);
panel.addButton('删除', () => { if (input.value) deleteWord(input.value.trim()); });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
