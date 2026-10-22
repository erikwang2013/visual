// 3D/director/HeapStage.js — 堆/二项队列共用舞台：数组格 + 完全二叉树，或按 rank 排列的二项树森林。
// 页面只改值/颜色/显隐；算法状态仍由页面生成器维护。
import * as THREE from 'three';
import { VNode, VBox, VText } from '../VisualObject3D.js';
import { PALETTE } from '../Glow.js';

const UP = new THREE.Vector3(0, 1, 0);
const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const placeBetween = (mesh, a, b, radius = 1) => {
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-4) { mesh.visible = false; return; }
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  mesh.scale.set(radius, len, radius);
  mesh.visible = true;
};

export class HeapStage {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.cx = opts.cx ?? 320;
    this.cap = opts.cap ?? 8;
    this.arrayY = opts.arrayY ?? 120;
    this.treeTop = opts.treeTop ?? 740;
    this.nodeR = opts.nodeR ?? 20;
    this.root = new THREE.Group();
    scene.add(this.root);

    this.array = [];
    this.indexLabels = [];
    this.nodes = [];
    this.nodeAt = [];
    this.edges = [];
    this.rankSlots = [];
    this.forestMap = new Map();
    this.forestEdgePool = [];
    this.forestEdgeUsed = 0;

    const showHeap = opts.heap !== false;
    const cellW = opts.cellW ?? 50;
    const gap = opts.cellGap ?? 8;
    const step = cellW + gap;
    if (showHeap) {
    for (let i = 0; i < this.cap; i++) {
        const x = this.cx + (i - (this.cap - 1) / 2) * step;
        const box = new VBox(this.scene, {
          w: cellW, h: 34, d: 20, x, y: this.arrayY, z: 0,
          color: 0x60a5fa, emissive: 0x60a5fa, label: '',
        });
        box.label?.scale.multiplyScalar(0.55);
        this.array.push(box);
        this.indexLabels.push(new VText(this.scene, {
          text: String(i), x, y: this.arrayY - 28, z: 0, color: PALETTE.textDim, scale: 0.38,
        }));
      }

      for (let i = 0; i < this.cap; i++) {
        const p = this.heapPos(i);
        const n = new VNode(this.scene, {
          radius: this.nodeR, x: p.x, y: p.y, z: 0, label: '0',
          color: 0x60a5fa, emissive: 0x60a5fa, labelScale: 0.9,
        });
        n.mesh.visible = false;
        this.nodes.push(n);
      }
      for (let i = 1; i < this.cap; i++) {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(1, 1, 1, 6),
          new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.38, depthWrite: false }),
        );
        this.root.add(m);
        this.edges.push(m);
      }

    }


    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(this.nodeR + 7, 2.2, 8, 30),
      new THREE.MeshBasicMaterial({ color: PALETTE.highlight, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    this.ring.visible = false;
    this.root.add(this.ring);

    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 1.8, 1, 6),
        new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.4, depthWrite: false }),
      );
      m.visible = false;
      this.root.add(m);
      this.forestEdgePool.push(m);
    }
  }

  heapPos(i) {
    const d = Math.floor(Math.log2(i + 1));
    const k = i - (2 ** d - 1);
    const span = 520;
    const step = span / (2 ** d);
    return V3(this.cx + (k - (2 ** d - 1) / 2) * step, this.treeTop - d * 82, 0);
  }

  updateArrayValues(values) {
    values.forEach((v, i) => {
      const b = this.array[i];
      if (!b) return;
      b.setText(String(v));
      b.label?.scale.multiplyScalar(0.55);
      b.mesh.visible = i < values.length;
    });
    this.indexLabels.forEach((t, i) => { t.sprite.visible = i < values.length; });
  }

  setArray(values) {
    values.forEach((v, i) => {
      const b = this.array[i];
      if (!b) return;
      b.setColor(0x60a5fa, 0x60a5fa);
    });
    this.updateArrayValues(values);
  }

  setCellColor(i, c) { this.array[i]?.setColor(c, c); }

  setNodeVisibleAt(i, on) {
    const n = this.nodeAt[i];
    if (n) n.mesh.visible = on;
  }

  setNodeColorAt(i, c) { this.nodeAt[i]?.setColor(c, c); }

  setAllNodeColor(c, n = this.nodeAt.length) {
    for (let i = 0; i < n; i++) this.nodeAt[i]?.setColor(c, c);
  }

  reset(values) {
    this.ring.visible = false;
    this.nodeAt = [];
    this.nodes.forEach((n, i) => {
      n.mesh.visible = i < values.length;
      n.mesh.scale.setScalar(1);
      n.setColor(0x60a5fa, 0x60a5fa);
      const p = this.heapPos(i);
      n.mesh.position.set(p.x, p.y, 0);
      n.setText(String(values[i] ?? ''));
      this.nodeAt[i] = i < values.length ? n : null;
      n.mesh.visible = i < values.length;
    });
    this.setArray(values);
    this.edges.forEach((m, k) => {
      const i = k + 1;
      m.visible = i < values.length;
      if (m.visible) {
        const a = this.heapPos((i - 1) >> 1);
        const b = this.heapPos(i);
        placeBetween(m, a, b, 1.8);
      }
    });
  }

  // 交换两个下标的节点视觉；页面负责同时交换自己的值数组。
  swap(i, j, ms = 420) {
    const a = this.nodeAt[i], b = this.nodeAt[j];
    if (!a || !b) return;
    const pa = this.heapPos(i), pb = this.heapPos(j);
    a.moveTo(pb.x, pb.y, 0, ms);
    b.moveTo(pa.x, pa.y, 0, ms);
    this.nodeAt[i] = b;
    this.nodeAt[j] = a;
  }

  // 插入：把预设节点放到完全二叉树的末尾。
  showNewNode(i, value) {
    const n = this.nodes[i];
    this.nodeAt[i] = n;
    n.setText(String(value));
    n.setColor(0xfb923c, 0xfb923c);
    const p = this.heapPos(i);
    n.mesh.position.set(p.x, p.y, 0);
    n.mesh.scale.setScalar(0.45);
    n.mesh.visible = true;
    this.edgeVisible(i);
  }

  edgeVisible(i) {
    const m = this.edges[i - 1];
    if (!m || i < 1) return;
    m.visible = true;
    placeBetween(m, this.heapPos((i - 1) >> 1), this.heapPos(i), 1.8);
  }

  // 取最小：隐藏根，把末尾节点移到根；返回被移除的根值。
  moveLastToRoot(last) {
    const oldRoot = this.nodeAt[0];
    const lastNode = this.nodeAt[last];
    if (!oldRoot || !lastNode) return null;
    const removed = oldRoot.text;
    oldRoot.mesh.visible = false;
    lastNode.moveTo(this.heapPos(0).x, this.heapPos(0).y, 0, 500);
    this.nodeAt[0] = lastNode;
    this.nodeAt[last] = null;
    this.edges[last - 1].visible = false;
    return removed;
  }

  focus(i, color = PALETTE.highlight) {
    const n = this.nodeAt[i];
    if (!n) return;
    this.ring.position.copy(n.mesh.position);
    this.ring.material.color.setHex(color);
    this.ring.visible = true;
  }

  hideFocus() { this.ring.visible = false; }

  // ---- 二项树森林 ----
  buildRankSlots(labels, y = 800) {
    const gap = 210;
    labels.forEach((label, r) => {
      const x = this.cx + (r - (labels.length - 1) / 2) * gap;
      const b = new VBox(this.scene, {
        w: 62, h: 26, d: 18, x, y, z: 0, label,
        color: 0x334155, emissive: 0x334155,
      });
      b.label?.scale.multiplyScalar(0.5);
      this.root.add(b.mesh);
      this.rankSlots.push(b);
    });
  }

  setRank(r, occupied, extra = '') {
    const b = this.rankSlots[r];
    if (!b) return;
    b.setText('B' + r + (extra ? ' ' + extra : ''));
    b.label?.scale.multiplyScalar(0.5);
    b.setColor(occupied ? 0xfcd34d : 0x334155, occupied ? 0xfcd34d : 0x334155);
  }

  layoutForest(forest, opts = {}) {
    const slots = opts.slots ?? 4;
    const gap = opts.gap ?? 210;
    const y0 = opts.y ?? 620;
    const dy = opts.dy ?? 78;
    const span = (n) => Math.max(58, n.children.reduce((s, c) => s + span(c) + 14, 0));
    const seen = new Set();
    const targets = new Map();
    const place = (n, x, y) => {
      targets.set(n, V3(x, y, 0));
      const total = n.children.reduce((s, c) => s + span(c), 0) + Math.max(0, n.children.length - 1) * 14;
      let acc = x - total / 2;
      n.children.forEach((c) => {
        const w = span(c);
        place(c, acc + w / 2, y - dy);
        acc += w + 14;
      });
    };
    forest.forEach((r, rank) => {
      if (!r) return;
      place(r, this.cx + (rank - (slots - 1) / 2) * gap, y0);
    });

    const edgeList = [];
    const walk = (n) => {
      seen.add(n);
      n.children.forEach((c) => { edgeList.push([n, c]); walk(c); });
    };
    forest.forEach((r) => r && walk(r));

    targets.forEach((p, n) => {
      let v = this.forestMap.get(n);
      if (!v) {
        v = new VNode(this.scene, {
          radius: 18, x: p.x, y: p.y, z: 0, label: String(n.v),
          color: 0x60a5fa, emissive: 0x60a5fa, labelScale: 0.82,
        });
        this.root.add(v.mesh);
        this.forestMap.set(n, v);
      } else {
        v.setText(String(n.v));
        v.moveTo(p.x, p.y, 0, opts.ms ?? 420);
      }
      v.mesh.visible = true;
    });
    this.forestMap.forEach((v, n) => {
      if (!seen.has(n)) v.mesh.visible = false;
    });

    let k = 0;
    edgeList.forEach(([a, b]) => {
      const m = this.forestEdgePool[k++];
      if (!m) return;
      m.visible = true;
      placeBetween(m, targets.get(a), targets.get(b), 1.6);
    });
    for (let i = k; i < this.forestEdgePool.length; i++) this.forestEdgePool[i].visible = false;
    this.forestEdgeUsed = k;
    this.forestTargets = targets;
  }

  colorForest(n, c) { this.forestMap.get(n)?.setColor(c, c); }

  colorForestAll(c) { this.forestMap.forEach((v) => v.setColor(c, c)); }

  forestNode(n) { return this.forestMap.get(n); }

  clearForest() {
    this.forestMap.forEach((v) => { v.mesh.visible = false; });
    this.forestEdgePool.forEach((m) => { m.visible = false; });
    this.rankSlots.forEach((b) => b.setColor(0x334155, 0x334155));
  }

  resetForest() {
    this.forestMap.forEach((v) => {
      v.mesh.traverse((o) => {
        if (o.geometry && !o.isSprite) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      v.mesh.parent?.remove(v.mesh);
      v.remove();
    });
    this.forestMap.clear();
    this.forestEdgePool.forEach((m) => { m.visible = false; });
    this.rankSlots.forEach((b) => b.setColor(0x334155, 0x334155));
  }

  // 卸载释放本舞台私有几何/材质；文字纹理全局缓存、SpriteGeometry 共享，均不释放。
  _disposeTree(obj) {
    obj.traverse((o) => {
      if (o.isSprite) o.material?.dispose();
      else {
        o.geometry?.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
  }

  remove() {
    if (this._removed) return;
    this._removed = true;
    this.array.forEach((b) => { this._disposeTree(b.mesh); this.scene.remove(b.mesh); b._dead = true; });
    this.nodes.forEach((n) => { this._disposeTree(n.mesh); this.scene.remove(n.mesh); n._dead = true; });
    this.indexLabels.forEach((t) => { t.sprite.material?.dispose(); t.remove(); });
    this.rankSlots.forEach((b) => { b._dead = true; });
    this.forestMap.forEach((v) => { v._dead = true; });
    this._disposeTree(this.root);
    this.scene.remove(this.root);
    this.array = []; this.indexLabels = []; this.nodes = []; this.nodeAt = [];
    this.edges = []; this.rankSlots = []; this.forestMap.clear(); this.forestEdgePool = [];
  }
}
