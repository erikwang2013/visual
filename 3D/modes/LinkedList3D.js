// 3D/modes/LinkedList3D.js
// 链表模式：节点盒子 + 指针盒子 + 状态驱动箭头重绘（redraw）。
// 删除用隐藏而非 dispose（mesh.visible=false），保证撤销可恢复。
import * as THREE from 'three';
import { VBox } from '../VisualObject3D.js';
import { makeTextSprite, PALETTE } from '../Glow.js';

function arrowBetween(scene, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 4) return new THREE.Group();
  const dirN = dir.clone().normalize();
  const group = new THREE.Group();
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, b]), 2, 2.5, 6, false),
    new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.55 }));
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(6, 14, 10),
    new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.75 }));
  cone.position.copy(b).addScaledVector(dirN, -7);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirN);
  group.add(tube, cone);
  scene.add(group);
  return group;
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  g.removeFromParent();
}

export class LinkedList3D {
  constructor(scene) {
    this.scene = scene;
    this.nodes = new Map();       // id -> { box, nullText }
    this.pointers = new Map();    // name -> { box, nameLabel, nullText, targetId }
    this.nextMap = new Map();     // id -> nextId | null
    this.arrowGroups = [];
  }

  // 新节点：数据盒（52x46）+ 右侧 NULL 文字（mesh 子对象，随盒移动）
  addNode(id, x, y, z = 0) {
    const box = new VBox(this.scene, { w: 52, h: 46, d: 28, x, y, z, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
    const nullText = makeTextSprite('NULL', { color: PALETTE.textDim, scale: 0.55 });
    nullText.position.set(44, 0, 30);
    nullText.visible = false;
    box.mesh.add(nullText);
    this.nodes.set(id, { box, nullText });
    return { box, nullText };
  }

  moveNode(id, x, y, cmd, duration = 400) {
    const node = this.nodes.get(id);
    const sx = node.box.mesh.position.x, sy = node.box.mesh.position.y;
    cmd({
      duration,
      fn: (p) => {
        node.box.mesh.position.x = sx + (x - sx) * p;
        node.box.mesh.position.y = sy + (y - sy) * p;
        if (p >= 1) this.redraw();
      },
      undo: () => { node.box.mesh.position.x = sx; node.box.mesh.position.y = sy; this.redraw(); },
    });
  }

  setNodeValue(id, value, cmd) {
    const node = this.nodes.get(id);
    const prev = node.box.text;
    cmd({ duration: 200, fn: () => node.box.setText(String(value)), undo: () => node.box.setText(prev) });
  }

  highlightNode(id, cmd, color) {
    const node = this.nodes.get(id);
    const c = color || PALETTE.highlight;
    cmd({
      duration: 250,
      fn: (p) => { node.box.mesh.material.emissiveIntensity = 0.35 + p * 0.55; node.box.mesh.material.color.setHex(c); },
      undo: () => { node.box.mesh.material.emissiveIntensity = 0.35; node.box.mesh.material.color.setHex(PALETTE.node); },
    });
  }

  setNext(from, to, cmd) {
    const prev = this.nextMap.get(from) ?? null;
    cmd({
      duration: 250,
      fn: (p) => { if (p >= 1) { this.nextMap.set(from, to); this.redraw(); } },
      undo: () => {
        if (prev === null) this.nextMap.delete(from); else this.nextMap.set(from, prev);
        this.redraw();
      },
    });
  }

  // 隐藏式删除：记录 prevNext（自身指向）与 prevOf（谁指向自己），撤销时恢复
  deleteNode(id, cmd) {
    const node = this.nodes.get(id);
    if (!node) return;
    const prevNext = this.nextMap.get(id) ?? null;
    let prevOf = null;
    for (const [k, v] of this.nextMap) if (v === id) { prevOf = k; break; }
    cmd({
      duration: 1,
      fn: (p) => {
        if (p >= 1) {
          node.box.mesh.visible = false;
          node.nullText.visible = false;
          this.nextMap.delete(id);
          if (prevOf !== null) this.nextMap.delete(prevOf);
          this.redraw();
        }
      },
      undo: () => {
        if (prevOf !== null) this.nextMap.set(prevOf, id);
        this.nextMap.set(id, prevNext);
        node.box.mesh.visible = true;
        this.redraw();
      },
    });
  }

  // 立即隐藏并清理 nextMap（创建类操作首个 cmd 的 undo，撤销时移除新节点）
  forceDeleteNode(id) {
    const node = this.nodes.get(id);
    if (!node) return;
    node.box.mesh.visible = false;
    node.nullText.visible = false;
    this.nextMap.delete(id);
    this.redraw();
  }

  // 指针盒子：46x46 蓝色，名称文字在盒上方，NULL 文字在盒下方
  addPointer(name, label, x, y) {
    const box = new VBox(this.scene, { w: 46, h: 46, d: 20, x, y, z: 0, label: '', color: PALETTE.blue, emissive: PALETTE.blueEmissive });
    const nameLabel = makeTextSprite(label, { color: PALETTE.textGlow, scale: 0.7 });
    nameLabel.position.set(0, 40, 24);
    box.mesh.add(nameLabel);
    const nullText = makeTextSprite('NULL', { color: PALETTE.textDim, scale: 0.55 });
    nullText.position.set(0, -40, 24);
    nullText.visible = false;
    box.mesh.add(nullText);
    this.pointers.set(name, { box, nameLabel, nullText, targetId: null });
  }

  movePointer(name, x, y, cmd, duration = 400) {
    const p = this.pointers.get(name);
    const sx = p.box.mesh.position.x, sy = p.box.mesh.position.y;
    cmd({
      duration,
      fn: (t) => { p.box.mesh.position.x = sx + (x - sx) * t; p.box.mesh.position.y = sy + (y - sy) * t; },
      undo: () => { p.box.mesh.position.x = sx; p.box.mesh.position.y = sy; this.redraw(); },
    });
  }

  pointTo(name, id, cmd) {
    const p = this.pointers.get(name);
    const prev = p.targetId ?? null;
    cmd({
      duration: 300,
      fn: (t) => { if (t >= 1) { p.targetId = id; this.redraw(); } },
      undo: () => { p.targetId = prev; this.redraw(); },
    });
  }

  // 依据 nextMap 与指针 targetId 重建全部箭头
  redraw() {
    for (const g of this.arrowGroups) disposeGroup(g);
    this.arrowGroups = [];
    for (const [id, node] of this.nodes) {
      if (!node.box.mesh.visible) continue;
      const to = this.nextMap.get(id) ?? null;
      node.nullText.visible = to === null;
      if (to === null) continue;
      const other = this.nodes.get(to);
      if (!other || !other.box.mesh.visible) continue;
      const a = node.box.mesh.position, b = other.box.mesh.position;
      this.arrowGroups.push(arrowBetween(this.scene,
        new THREE.Vector3(a.x + 34, a.y, a.z), new THREE.Vector3(b.x - 34, b.y, b.z)));
    }
    for (const p of this.pointers.values()) {
      const a = p.box.mesh.position;
      const t = (p.targetId !== null && p.targetId !== undefined) ? this.nodes.get(p.targetId) : null;
      if (t && t.box.mesh.visible) {
        const b = t.box.mesh.position;
        this.arrowGroups.push(arrowBetween(this.scene,
          new THREE.Vector3(a.x, a.y - 25, a.z), new THREE.Vector3(b.x, b.y + 25, b.z)));
        p.nullText.visible = false;
      } else {
        this.arrowGroups.push(arrowBetween(this.scene,
          new THREE.Vector3(a.x, a.y - 25, a.z), new THREE.Vector3(a.x, a.y - 40, a.z)));
        p.nullText.visible = true;
      }
    }
  }
}
