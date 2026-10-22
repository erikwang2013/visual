// 3D/director/GraphStage.js — 可复用的图舞台：节点、边、权重、源点灯塔、活动环。
// BFS 之外的图页（DFS/Dijkstra/Bellman-Ford/Prim/Kruskal）共用。
import * as THREE from 'three';
import { VNode, VText, VTorus } from '../VisualObject3D.js';
import { PALETTE } from '../Glow.js';

const v3 = (p) => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone());
const disposeObject = (obj) => obj.traverse((o) => {
  if (o.geometry && !o.isSprite) o.geometry.dispose();
  if (o.material) {
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => m.dispose());
  }
});
export const edgeKey = (a, b) => (a < b ? a + '-' + b : b + '-' + a);

export class GraphStage {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.n = opts.nodes ?? 8;
    this.rawEdges = opts.edges || [];
    this.directed = !!opts.directed;
    this.center = v3(opts.center || [320, 300, 0]);
    this.scale = opts.scale ?? 1;
    this.nodeRadius = opts.nodeRadius ?? 26;
    this.labelScale = opts.labelScale ?? 0.8;
    this.labels = opts.labels || null;
    this.edgeLabelOffset = opts.edgeLabelOffset || {};
    const ringRadius = (opts.ringRadius ?? 300) * this.scale;
    this.positions = opts.positions
      ? opts.positions.map(v3)
      : Array.from({ length: this.n }, (_, i) => {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / this.n;
          return new THREE.Vector3(
            this.center.x + Math.cos(a) * ringRadius,
            this.center.y + (i % 2 ? 14 : -14) * this.scale,
            this.center.z + Math.sin(a) * ringRadius,
          );
        });
    this.nodes = new Map();
    this.nodeLabels = new Map();
    this.edges = new Map();
    this.disposables = [];
    this.buildPlatform();
    this.buildNodes();
    this.buildEdges();
    this.activeRing = new VTorus(scene, { radius: 42 * this.scale, color: 0x22d3ee });
    this.activeRing.mesh.rotation.x = Math.PI / 2;
    this.activeRing.mesh.visible = false;
    this.beacon = this.makeBeacon();
    this.beacon.position.copy(this.positions[0]);
    scene.add(this.beacon);
    this.setSource(0);
  }

  key(a, b) { return this.directed ? a + '>' + b : edgeKey(a, b); }
  pos(i) { return this.positions[i]; }
  node(i) { return this.nodes.get(i); }
  edge(a, b) { return this.edges.get(this.key(a, b)); }

  makeBeacon() {
    const g = new THREE.Group();
    const s = this.scale;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8 * s, 1.8 * s, 170 * s, 8),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.26, depthWrite: false }),
    );
    beam.position.y = 85 * s;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(38 * s, 2.2, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.8 }),
    );
    ring.rotation.x = Math.PI / 2;
    g.add(beam, ring);
    return g;
  }

  buildPlatform() {
    const r = Math.max(...this.positions.map((p) => Math.hypot(p.x - this.center.x, p.z - this.center.z))) + 80 * this.scale;
    const g = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(r, 64),
      new THREE.MeshBasicMaterial({ color: 0x0a0f2e, transparent: true, opacity: 0.52, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(this.center.x, this.center.y - 44 * this.scale, this.center.z);
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(r - 10, r, 64),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(this.center.x, this.center.y - 43 * this.scale, this.center.z);
    g.add(disc, rim);
    this.scene.add(g);
    this.platform = g;
  }

  buildNodes() {
    for (let i = 0; i < this.n; i++) {
      const p = this.positions[i];
      const node = new VNode(this.scene, {
        radius: this.nodeRadius * this.scale,
        x: p.x, y: p.y, z: p.z,
        label: String(this.labels ? this.labels[i] : i),
        labelScale: this.labelScale,
        color: 0x64748b,
        emissive: 0x1e293b,
      });
      node.mesh.userData.nodeId = i;
      this.nodes.set(i, node);
      const label = new VText(this.scene, {
        text: '', x: p.x, y: p.y - 44 * this.scale, z: p.z,
        color: PALETTE.textDim, scale: 0.55,
      });
      this.nodeLabels.set(i, label);
    }
  }

  buildEdges() {
    for (const e of this.rawEdges) {
      const [a, b, w] = e;
      const pa = this.positions[a];
      const pb = this.positions[b];
      if (!pa || !pb) continue;
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([pa, pb]), 8, 2.2 * this.scale, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.28, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      this.scene.add(mesh);
      let arrow = null;
      if (this.directed) {
        const dir = pb.clone().sub(pa).normalize();
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(6 * this.scale, 14 * this.scale, 10),
          new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.28, depthWrite: false }),
        );
        cone.position.copy(pb).addScaledVector(dir, -((this.nodeRadius + 8) * this.scale));
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        this.scene.add(cone);
        arrow = cone;
      }
      let label = null;
      if (w !== undefined) {
        const mid = pa.clone().add(pb).multiplyScalar(0.5);
        const off = this.edgeLabelOffset[this.key(a, b)] || [0, 20, 0];
        label = new VText(this.scene, {
          text: String(w), x: mid.x + off[0] * this.scale, y: mid.y + off[1] * this.scale, z: mid.z + off[2] * this.scale,
          color: PALETTE.textDim, scale: 0.6,
        });
      }
      this.edges.set(this.key(a, b), { a, b, w, mesh, label, arrow });
    }
  }

  setNodeColor(i, color) {
    const n = this.nodes.get(i);
    if (n) n.setColor(color, color);
  }

  setEdge(a, b, color, opacity = 0.9) {
    const e = this.edges.get(this.key(a, b));
    if (!e) return;
    e.mesh.material.color.setHex(color);
    e.mesh.material.opacity = opacity;
    if (e.arrow) { e.arrow.material.color.setHex(color); e.arrow.material.opacity = opacity; }
  }

  setEdgeLabel(a, b, text) {
    const e = this.edges.get(this.key(a, b));
    if (e && e.label) e.label.setText(String(text));
  }

  setEdgeLabelColor(a, b, color) {
    const e = this.edges.get(this.key(a, b));
    if (e && e.label) e.label.sprite.material.color.setHex(color);
  }

  setEdgeVisible(a, b, visible) {
    const e = this.edges.get(this.key(a, b));
    if (!e) return;
    e.mesh.visible = visible;
    if (e.arrow) e.arrow.visible = visible;
    if (e.label) e.label.sprite.visible = visible;
  }

  setDist(i, text) {
    const l = this.nodeLabels.get(i);
    if (l) l.setText(text);
  }

  setActive(i, color = 0x22d3ee) {
    if (i === null || i === undefined) { this.activeRing.mesh.visible = false; return; }
    this.activeRing.mesh.position.copy(this.positions[i]);
    this.activeRing.mesh.material.color.setHex(color);
    this.activeRing.mesh.material.emissive.setHex(color);
    this.activeRing.mesh.visible = true;
  }

  setSource(i) {
    this.beacon.position.copy(this.positions[i]);
  }

  dispose() {
    this.nodes.forEach((n) => { disposeObject(n.mesh); n.remove(); });
    this.nodeLabels.forEach((l) => { if (l.sprite && l.sprite.material) l.sprite.material.dispose(); l.remove(); });
    this.edges.forEach((e) => {
      this.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      e.mesh.material.dispose();
      if (e.arrow) { this.scene.remove(e.arrow); e.arrow.geometry.dispose(); e.arrow.material.dispose(); }
      if (e.label) { if (e.label.sprite && e.label.sprite.material) e.label.sprite.material.dispose(); e.label.remove(); }
    });
    if (this.activeRing) { disposeObject(this.activeRing.mesh); this.activeRing.remove(); }
    if (this.beacon) {
      this.scene.remove(this.beacon);
      this.beacon.traverse((o) => {
        if (o.geometry && !o.isSprite) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
    if (this.platform) {
      this.scene.remove(this.platform);
      this.platform.traverse((o) => {
        if (o.geometry && !o.isSprite) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
    this.nodes.clear();
    this.nodeLabels.clear();
    this.edges.clear();
  }
}
