// 3D/modes/Tree3D.js
// 节点 = 发光球体；父子 = 管状连线；页面算法负责布局坐标。
// 删除节点后重画整棵树的连线（简单可靠）。
import * as THREE from 'three';
import { VNode, VText, tubeBetween } from '../VisualObject3D.js';
import { PALETTE } from '../Glow.js';

export class Tree3D {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.radius = opts.radius || 20;
    this.nodes = new Map();   // id -> { node, x, y, z, parentId }
    this.edgeMeshes = [];
    this.defaultColor = opts.color || PALETTE.node;
  }

  addNode(id, label, x, y, z, opts = {}) {
    const node = new VNode(this.scene, {
      radius: this.radius, x, y, z,
      label, color: opts.color || this.defaultColor,
      emissive: opts.emissive,
    });
    this.nodes.set(id, { node, x, y, z, parentId: opts.parentId ?? null, color: opts.color || this.defaultColor, highlighted: false });
    this.drawEdges();
    return node;
  }

  removeNode(id) {
    const entry = this.nodes.get(id);
    if (!entry) return;
    entry.node.remove();
    this.nodes.delete(id);
    this.drawEdges();
  }

  moveNode(id, x, y, z, cmd) {
    const e = this.nodes.get(id);
    if (!e) return;
    const from = { x: e.x, y: e.y, z: e.z };
    cmd({ duration: 500, fn: (p) => {
      const t = ease(p);
      e.node.mesh.position.set(from.x + (x - from.x) * t, from.y + (y - from.y) * t, from.z + (z - from.z) * t);
      if (p === 1) this.drawEdges();
    }, undo: () => { e.node.mesh.position.set(from.x, from.y, from.z); e.x = from.x; e.y = from.y; e.z = from.z; this.drawEdges(); } });
    e.x = x; e.y = y; e.z = z;
  }

  setColor(id, color, emissive) {
    const e = this.nodes.get(id);
    if (!e) return;
    e.color = color;
    e.node.setColor(color, emissive);
  }

  highlight(id, cmd) {
    const e = this.nodes.get(id);
    if (!e) return;
    if (e.highlighted) return;
    e.highlighted = true;
    const base = e.color;
    cmd({ duration: 300, fn: (p) => {
      e.node.mesh.material.color.lerpColors(new THREE.Color(base), new THREE.Color(PALETTE.highlight), p);
      e.node.mesh.material.emissive.setHex(PALETTE.highlightEmissive);
      e.node.mesh.scale.setScalar(1 + p * 0.18);
    }, undo: () => { e.node.mesh.material.color.setHex(base); e.node.mesh.material.emissive.setHex(base); e.node.mesh.scale.set(1, 1, 1); } });
  }

  unhighlight(id, cmd) {
    const e = this.nodes.get(id);
    if (!e) return;
    if (!e.highlighted) return;
    e.highlighted = false;
    const base = e.color;
    cmd({ duration: 300, fn: (p) => {
      e.node.mesh.material.color.lerpColors(new THREE.Color(PALETTE.highlight), new THREE.Color(base), p);
      e.node.mesh.material.emissive.setHex(base);
      e.node.mesh.scale.setScalar(1 + (1 - p) * 0.18);
    }, undo: () => {} });
  }

  drawEdges() {
    for (const m of this.edgeMeshes) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.edgeMeshes = [];
    for (const [id, e] of this.nodes) {
      if (e.parentId == null) continue;
      const p = this.nodes.get(e.parentId);
      if (!p) continue;
      const a = e.node.mesh.position.clone();
      const b = p.node.mesh.position.clone();
      const dir = b.clone().sub(a);
      if (dir.lengthSq() < 1e-6) continue;
      dir.normalize();
      a.addScaledVector(dir, this.radius + 2);
      b.addScaledVector(dir, this.radius + 2);
      this.edgeMeshes.push(tubeBetween(this.scene, a, b, { color: PALETTE.edge, opacity: 0.5, radius: 2 }));
    }
  }

  clear() {
    for (const e of this.nodes.values()) e.node.remove();
    for (const m of this.edgeMeshes) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.nodes = new Map();
    this.edgeMeshes = [];
  }
}

function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }
