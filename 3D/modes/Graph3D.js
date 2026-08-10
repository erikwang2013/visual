// 3D/modes/Graph3D.js
// 节点 = 发光球体（算法给坐标）；边 = 管状连线（半透明，可点亮）；
// 支持有向箭头、边权重标签、节点距离标签。
import * as THREE from 'three';
import { VNode, VText, tubeBetween } from '../VisualObject3D.js';
import { PALETTE } from '../Glow.js';
import { ripple, flow } from '../effects/Fx.js';

export class Graph3D {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.nodes = new Map();   // id -> {node, label, x, y, z}
    this.edges = new Map();   // "a->b" -> {mesh, weightLabel, baseColor}
    this.radius = opts.radius || 20;
  }

  addNode(id, label, x, y, z, opts = {}) {
    const node = new VNode(this.scene, { radius: this.radius, x, y, z, label, color: opts.color || PALETTE.node, emissive: opts.emissive });
    this.nodes.set(id, { node, label, x, y, z });
    return node;
  }

  positionNode(id, x, y, z, cmd) {
    const e = this.nodes.get(id);
    if (!e) return;
    const from = { x: e.x, y: e.y, z: e.z };
    cmd({ duration: 450, fn: (p) => { const t = ease(p); e.node.mesh.position.set(from.x + (x-from.x)*t, from.y + (y-from.y)*t, from.z + (z-from.z)*t); if (p === 1) this._rebuildEdgesFor(id); }, undo: () => { e.node.mesh.position.set(from.x, from.y, from.z); e.x = from.x; e.y = from.y; e.z = from.z; this._rebuildEdgesFor(id); } });
    e.x = x; e.y = y; e.z = z;
  }

  addEdge(a, b, opts = {}) {
    const key = `${a}->${b}`;
    if (this.edges.has(key)) return;
    const A = this.nodes.get(a), B = this.nodes.get(b);
    if (!A || !B) return;
    const p1 = A.node.mesh.position.clone();
    const p2 = B.node.mesh.position.clone();
    const dir = p2.clone().sub(p1).normalize();
    p1.addScaledVector(dir, this.radius + 3);
    p2.addScaledVector(dir, this.radius + 3);
    const mesh = tubeBetween(this.scene, p1, p2, { color: opts.color || PALETTE.edge, opacity: 0.55, radius: opts.radius || 2.5 });
    let weightLabel = null;
    if (opts.weight !== undefined) {
      const mid = p1.clone().add(p2).multiplyScalar(0.5).add(new THREE.Vector3(0, 16, 0));
      weightLabel = new VText(this.scene, { text: String(opts.weight), x: mid.x, y: mid.y, z: mid.z, color: PALETTE.textDim, scale: 0.65 });
    }
    this.edges.set(key, { mesh, weightLabel, baseColor: opts.color || PALETTE.edge, baseOpacity: opts.opacity ?? 0.55, directed: !!opts.directed, radius: opts.radius || 2.5 });
  }

  _rebuildEdgesFor(id) {
    for (const [key, e] of this.edges) {
      const [a, b] = key.split('->');
      if (a !== id && b !== id) continue;
      const A = this.nodes.get(a), B = this.nodes.get(b);
      if (!A || !B) continue;
      const p1 = A.node.mesh.position.clone();
      const p2 = B.node.mesh.position.clone();
      const dir = p2.clone().sub(p1);
      if (dir.lengthSq() < 1e-6) continue;
      dir.normalize();
      p1.addScaledVector(dir, this.radius + 3);
      p2.addScaledVector(dir, this.radius + 3);
      this.scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose();
      e.mesh = tubeBetween(this.scene, p1, p2, { color: e.baseColor, opacity: e.baseOpacity, radius: e.radius });
      if (e.weightLabel) e.weightLabel.sprite.position.copy(p1.clone().add(p2).multiplyScalar(0.5).add(new THREE.Vector3(0, 16, 0)));
    }
  }

  lightEdge(a, b, on, cmd) {
    const key = `${a}->${b}`;
    const e = this.edges.get(key);
    if (!e) return;
    let fxDone = false;
    cmd({ duration: 250, fn: (p) => {
      if (!fxDone) { fxDone = true; if (on) { const A = this.nodes.get(a), B = this.nodes.get(b); if (A && B) flow(this.scene, A.node.mesh.position.clone(), B.node.mesh.position.clone(), PALETTE.highlight); } }
      if (on) { e.mesh.material.color.setHex(PALETTE.highlight); e.mesh.material.opacity = 0.45 + p * 0.5; e.mesh.material.emissiveIntensity = p; }
      else { e.mesh.material.color.setHex(e.baseColor); e.mesh.material.opacity = e.baseOpacity; e.mesh.material.emissiveIntensity = 0; }
    }, undo: () => { e.mesh.material.color.setHex(e.baseColor); e.mesh.material.opacity = e.baseOpacity; } });
  }

  highlightNode(id, cmd, color) {
    const e = this.nodes.get(id);
    if (!e) return;
    const c = color || PALETTE.highlight;
    let fxDone = false;
    cmd({ duration: 250, fn: (p) => { if (!fxDone) { fxDone = true; ripple(this.scene, e.node.mesh.position.x, e.node.mesh.position.y, e.node.mesh.position.z, c, e.radius * 2.6); } e.node.mesh.material.color.lerpColors(new THREE.Color(PALETTE.node), new THREE.Color(c), p); e.node.mesh.material.emissive.setHex(PALETTE.highlightEmissive); e.node.mesh.scale.setScalar(1 + p * 0.15); }, undo: () => { e.node.mesh.material.color.setHex(PALETTE.node); e.node.mesh.material.emissive.setHex(PALETTE.nodeEmissive); e.node.mesh.scale.set(1, 1, 1); } });
  }

  dehighlightNode(id, cmd) {
    const e = this.nodes.get(id);
    if (!e) return;
    cmd({ duration: 250, fn: (p) => { e.node.mesh.material.color.lerpColors(new THREE.Color(PALETTE.highlight), new THREE.Color(PALETTE.node), p); e.node.mesh.material.emissive.setHex(PALETTE.nodeEmissive); e.node.mesh.scale.setScalar(1 + (1-p) * 0.15); }, undo: () => {} });
  }

  setNodeLabel(id, text) {
    const e = this.nodes.get(id);
    if (e) e.node.setText(text);
  }

  setLabel(id, text, x, y, z) {
    const e = this.nodes.get(id);
    if (!e) return;
    if (e.labelSprite) { e.labelSprite.remove(); }
    const spr = new VText(this.scene, { text, x, y, z, color: PALETTE.textGlow, scale: 0.7 });
    e.labelSprite = spr;
  }
}

function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }
