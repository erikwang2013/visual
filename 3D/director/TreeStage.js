// 3D/director/TreeStage.js — 可复用的树岛舞台：节点/边、BST 布局、动态信息标签、镜头。
// BST/AVL/红黑树共用 syncTree；Trie 与 B+ 树用 syncNodes 传入自定义布局。
import * as THREE from 'three';
import { VNode, VTorus } from '../VisualObject3D.js';
import { makeTextSprite, setSpriteText, PALETTE } from '../Glow.js';

const UP = new THREE.Vector3(0, 1, 0);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 6);
const CONE = new THREE.ConeGeometry(1, 2, 8);
const v3 = (p) => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone());

export class TreeStage {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.center = v3(opts.center || [320, 470, 0]);
    this.scale = opts.scale ?? 1;
    this.radius = (opts.radius ?? 22) * this.scale;
    this.labelScale = opts.labelScale ?? 0.8;
    this.nodes = new Map();      // id -> VNode / VBox（须有 mesh）
    this.positions = new Map();  // id -> 布局目标位置
    this.infos = new Map();
    this.edgeList = [];
    this.activeId = null;
    this.islandRadius = (opts.islandRadius ?? 620) * this.scale;
    this.buildIsland();
    this.ring = new VTorus(scene, { radius: 34 * this.scale, color: 0x22d3ee });
    this.ring.mesh.rotation.x = Math.PI / 2;
    this.ring.mesh.visible = false;
    scene.onFrame(() => this.refreshEdges());
  }

  buildIsland() {
    const g = new THREE.Group();
    const y = this.center.y - 230 * this.scale;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(this.islandRadius, 64),
      new THREE.MeshBasicMaterial({ color: 0x0a0f2e, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(this.center.x, y, this.center.z);
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(this.islandRadius - 9, this.islandRadius, 64),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(this.center.x, y + 1, this.center.z);
    g.add(disc, rim);
    // 树岛同心环：暗示“层级”，也把树托在画面里
    for (let i = 1; i <= 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(this.islandRadius * (i / 4), 1, 6, 80),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.07, depthWrite: false }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(this.center.x, y + 3, this.center.z);
      g.add(ring);
    }
    this.scene.add(g);
    this.island = g;
  }

  vpos(id) {
    const o = this.nodes.get(id);
    return o ? o.mesh.position : (this.positions.get(id) || null);
  }

  attachNode(id, obj, pos) {
    this.nodes.set(id, obj);
    this.positions.set(id, pos.clone());
    return obj;
  }

  addNode(id, pos, opts = {}) {
    let n = this.nodes.get(id);
    const color = opts.color ?? 0x60a5fa;
    if (!n) {
      n = new VNode(this.scene, {
        radius: opts.radius ?? this.radius,
        x: pos.x, y: pos.y, z: pos.z,
        label: opts.label === undefined ? '' : String(opts.label),
        labelScale: opts.labelScale ?? this.labelScale,
        color,
        emissive: color,
      });
      n.text = opts.label === undefined ? '' : String(opts.label);
      n.mesh.userData.id = id;
      this.nodes.set(id, n);
    }
    this.positions.set(id, pos.clone());
    return n;
  }

  removeNode(id) {
    const n = this.nodes.get(id);
    if (!n) return;
    const sp = this.infos.get(id);
    if (sp) {
      n.mesh.remove(sp);
      sp.material.dispose();
      this.infos.delete(id);
    }
    if (n.remove) n.remove();
    else this.scene.remove(n.mesh);
    if (n.label) { n.mesh.remove(n.label); n.label.material.dispose(); }
    if (n.mesh.geometry) n.mesh.geometry.dispose();
    if (n.mesh.material) n.mesh.material.dispose();
    this.nodes.delete(id);
    this.positions.delete(id);
  }

  // entries: [{id,pos,label,color,radius,labelScale}]；links: [a,b] 或 {a,b,color,opacity,radius,arrow}
  syncNodes(entries, links = [], opts = {}) {
    const { ms = 0, spawn = 0 } = opts;
    const alive = new Set();
    for (const e of entries) {
      alive.add(e.id);
      const prev = this.nodes.get(e.id);
      if (!prev) {
        const start = spawn ? new THREE.Vector3(e.pos.x, e.pos.y + spawn, e.pos.z) : e.pos;
        const n = this.addNode(e.id, start, e);
        if (spawn) n.moveTo(e.pos.x, e.pos.y, e.pos.z, ms || 480);
      } else {
        prev.mesh.visible = true;
        prev.mesh.scale.setScalar(1);
        if (e.label !== undefined && prev.text !== String(e.label)) {
          prev.text = String(e.label);
          if (prev.setText) prev.setText(prev.text);
        }
        if (e.color !== undefined && prev.setColor) prev.setColor(e.color, e.color);
        if (ms > 0) prev.moveTo(e.pos.x, e.pos.y, e.pos.z, ms);
        else prev.mesh.position.copy(e.pos);
        this.positions.set(e.id, e.pos.clone());
      }
    }
    for (const id of [...this.nodes.keys()]) if (!alive.has(id)) this.removeNode(id);
    this.setEdges(links);
  }

  // 二叉树的统一同步：中序 x + 深度 y；node 字段约定 left/right。
  syncTree(root, opts = {}) {
    const id = opts.id || ((n) => n.key);
    const left = opts.left || ((n) => n.left);
    const right = opts.right || ((n) => n.right);
    const label = opts.label || ((n) => n.key);
    const color = opts.color || (() => 0x60a5fa);
    const pos = this.layoutBinary(root, { id, left, right, ...(opts.layout || {}) });
    const entries = [];
    const links = [];
    (function walk(n) {
      if (!n) return;
      entries.push({ id: id(n), pos: pos.get(id(n)), label: label(n), color: color(n) });
      if (left(n)) links.push([id(n), id(left(n))]);
      if (right(n)) links.push([id(n), id(right(n))]);
      walk(left(n));
      walk(right(n));
    })(root);
    this.syncNodes(entries, links, { ms: opts.ms || 0, spawn: opts.spawn || 0 });
    return pos;
  }

  layoutBinary(root, { id = (n) => n.key, left = (n) => n.left, right = (n) => n.right, stepX = 86, stepY = 112, topY = 780, depthZ = 8 } = {}) {
    const items = [];
    (function walk(n, d) {
      if (!n) return;
      walk(left(n), d + 1);
      items.push({ n, d });
      walk(right(n), d + 1);
    })(root, 0);
    const pos = new Map();
    const sx = stepX * this.scale;
    const sy = stepY * this.scale;
    const dz = depthZ * this.scale;
    items.forEach(({ n, d }, i) => {
      pos.set(id(n), new THREE.Vector3(
        this.center.x + (i - (items.length - 1) / 2) * sx,
        topY - d * sy,
        -d * dz,
      ));
    });
    return pos;
  }

  resolve(ref) {
    if (ref === null || ref === undefined) return null;
    if (typeof ref === 'function') return ref();
    if (typeof ref === 'number' || typeof ref === 'string') return this.vpos(ref);
    if (Array.isArray(ref)) return new THREE.Vector3(ref[0], ref[1], ref[2]);
    return ref;
  }

  makeEdge(spec) {
    const mat = new THREE.MeshBasicMaterial({
      color: spec.color ?? 0x7dd3fc,
      transparent: true,
      opacity: spec.opacity ?? 0.5,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(CYL, mat);
    mesh.renderOrder = 1;
    this.scene.add(mesh);
    let arrow = null;
    if (spec.arrow) {
      arrow = new THREE.Mesh(CONE, mat.clone());
      arrow.renderOrder = 1;
      this.scene.add(arrow);
    }
    return { mesh, arrow, a: spec.a, b: spec.b, r: (spec.radius ?? 2) * this.scale, off: (spec.offset ?? 7) * this.scale };
  }

  setEdges(links = []) {
    while (this.edgeList.length > links.length) {
      const e = this.edgeList.pop();
      this.scene.remove(e.mesh);
      e.mesh.material.dispose();
      if (e.arrow) { this.scene.remove(e.arrow); e.arrow.material.dispose(); }
    }
    links.forEach((l, i) => {
      const s = Array.isArray(l) ? { a: l[0], b: l[1] } : l;
      let e = this.edgeList[i];
      if (!e) { e = this.makeEdge(s); this.edgeList.push(e); }
      const color = s.color ?? 0x7dd3fc;
      const opacity = s.opacity ?? 0.5;
      e.a = s.a;
      e.b = s.b;
      e.r = (s.radius ?? 2) * this.scale;
      e.off = (s.offset ?? 7) * this.scale;
      e.mesh.material.color.setHex(color);
      e.mesh.material.opacity = opacity;
      const wantArrow = !!s.arrow;
      if (wantArrow && !e.arrow) {
        e.arrow = new THREE.Mesh(CONE, e.mesh.material.clone());
        e.arrow.renderOrder = 1;
        this.scene.add(e.arrow);
      } else if (!wantArrow && e.arrow) {
        this.scene.remove(e.arrow);
        e.arrow.material.dispose();
        e.arrow = null;
      }
      if (e.arrow) {
        e.arrow.material.color.setHex(color);
        e.arrow.material.opacity = opacity;
        e.arrow.scale.set(4 * this.scale, 9 * this.scale, 4 * this.scale);
      }
    });
    this.refreshEdges();
  }

  refreshEdges() {
    for (const e of this.edgeList) {
      const pa = this.resolve(e.a);
      const pb = this.resolve(e.b);
      if (!pa || !pb) {
        e.mesh.visible = false;
        if (e.arrow) e.arrow.visible = false;
        continue;
      }
      const d = pb.clone().sub(pa);
      const len = d.length();
      if (len < 0.01) {
        e.mesh.visible = false;
        if (e.arrow) e.arrow.visible = false;
        continue;
      }
      const dir = d.divideScalar(len);
      e.mesh.visible = true;
      e.mesh.position.copy(pa).addScaledVector(dir, len / 2);
      e.mesh.quaternion.setFromUnitVectors(UP, dir);
      e.mesh.scale.set(e.r, len, e.r);
      if (e.arrow) {
        e.arrow.visible = true;
        e.arrow.position.copy(pb).addScaledVector(dir, -e.off);
        e.arrow.quaternion.setFromUnitVectors(UP, dir);
      }
    }
    if (this.activeId !== null) {
      const p = this.resolve(this.activeId);
      this.ring.mesh.visible = !!p;
      if (p) this.ring.mesh.position.copy(p);
    }
  }

  setNodeColor(id, color) {
    const n = this.nodes.get(id);
    if (n && n.setColor) n.setColor(color, color);
  }

  setActive(id, color = 0x22d3ee) {
    this.activeId = id;
    if (id === null || id === undefined) { this.ring.mesh.visible = false; return; }
    this.ring.mesh.material.color.setHex(color);
    this.ring.mesh.material.emissive.setHex(color);
    this.ring.mesh.visible = true;
    this.refreshEdges();
  }

  // 节点上方第二行信息（高度/BF/黑高），避开 VNode 自带名称标签（y≈38）。
  setInfo(id, text, opts = {}) {
    const n = this.nodes.get(id);
    if (!n) return;
    let sp = this.infos.get(id);
    if (!sp) {
      sp = makeTextSprite(text, { scale: opts.scale ?? 0.5, color: opts.color ?? PALETTE.textDim });
      sp.position.set(0, opts.y ?? 72, 0);
      sp.renderOrder = 1000;
      n.mesh.add(sp);
      this.infos.set(id, sp);
    } else {
      setSpriteText(sp, text, { scale: opts.scale ?? 0.5, color: opts.color ?? PALETTE.textDim });
    }
  }

  overview(ms = 850) {
    return {
      pos: [this.center.x + 430 * this.scale, 720 * this.scale + 80, 1050 * this.scale],
      target: [this.center.x, 440, 0],
      ms,
    };
  }

  wide(ms = 900) {
    return {
      pos: [this.center.x, 900 * this.scale, 1220 * this.scale],
      target: [this.center.x, 450, 0],
      ms,
    };
  }

  focus(id, opts = {}) {
    const p = this.resolve(id) || this.center;
    const dist = (opts.dist ?? 430) * this.scale;
    const lift = (opts.lift ?? 190) * this.scale;
    return {
      pos: [p.x + dist * 0.5, p.y + lift, p.z + dist],
      target: [p.x, p.y, p.z],
      ms: opts.ms ?? 650,
    };
  }

  clear() {
    for (const id of [...this.nodes.keys()]) this.removeNode(id);
    this.setEdges([]);
    this.activeId = null;
    this.ring.mesh.visible = false;
  }
}
