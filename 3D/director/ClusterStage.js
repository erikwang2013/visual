// 3D/director/ClusterStage.js — 分布式集群舞台：服务器岛 + 角色徽章 + 日志柱 + 消息箭头。
// 共识页共用；消息箭头由 onFrame 自驱，页面用 send/broadcast 表现 RPC。
import * as THREE from 'three';
import { VText } from '../VisualObject3D.js';
import { PALETTE, glowMaterial } from '../Glow.js';

const UP = new THREE.Vector3(0, 1, 0);
const ROLE = {
  follower: { color: 0x60a5fa, label: 'Follower' },
  candidate: { color: 0xfbbf24, label: 'Candidate' },
  leader: { color: 0xfcd34d, label: 'Leader' },
  crashed: { color: 0x475569, label: '✕ 已崩溃' },
};

export class ClusterStage {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.scale = opts.scale ?? 1;
    this.center = new THREE.Vector3(...(opts.center || [320, 300, 0]));
    this.spacing = (opts.spacing ?? 160) * this.scale;
    this.count = opts.servers ?? 5;
    this.baseY = this.center.y;
    this.islandR = 54 * this.scale;
    this.servers = [];
    this.messages = [];
    this.group = new THREE.Group();
    scene.add(this.group);

    const s = this.scale;
    this.baseGeo = new THREE.CylinderGeometry(54 * s, 60 * s, 16 * s, 24);
    this.towerGeo = new THREE.BoxGeometry(54 * s, 80 * s, 54 * s);
    this.rackGeo = new THREE.BoxGeometry(46 * s, 5 * s, 2 * s);
    this.ringGeo = new THREE.TorusGeometry(52 * s, 2.2 * s, 6, 40);
    this.logGeo = new THREE.BoxGeometry(30 * s, 14 * s, 26 * s);
    this.coneGeo = new THREE.ConeGeometry(7 * s, 16 * s, 8);
    this.trailGeo = new THREE.CylinderGeometry(2.2 * s, 2.2 * s, 26 * s, 6);

    this.buildPlatform();
    for (let i = 0; i < this.count; i++) this.buildServer(i);
    this.offFrame = scene.onFrame((dt) => this.update(dt));
  }

  x(i) { return this.center.x + (i - (this.count - 1) / 2) * this.spacing; }
  z(i) { return this.center.z + (i % 2 ? 26 : -26) * this.scale; }

  buildPlatform() {
    const s = this.scale;
    const r = this.spacing * (this.count - 1) * 0.5 + this.islandR + 130 * s;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(r, 64),
      new THREE.MeshBasicMaterial({ color: 0x0a0f2e, transparent: true, opacity: 0.52, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(this.center.x, this.baseY - 36 * s, this.center.z);
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(r - 10 * s, r, 64),
      new THREE.MeshBasicMaterial({ color: PALETTE.ground, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(this.center.x, this.baseY - 34 * s, this.center.z);
    this.group.add(disc, rim);
  }

  buildServer(i) {
    const s = this.scale, x = this.x(i), z = this.z(i);
    const base = new THREE.Mesh(this.baseGeo, glowMaterial(0x1e293b, { emissive: 0x0f172a, emissiveIntensity: 0.4 }));
    base.position.set(x, this.baseY - 8 * s, z);
    const tower = new THREE.Mesh(this.towerGeo, glowMaterial(PALETTE.node, { emissive: PALETTE.nodeEmissive, emissiveIntensity: 0.35 }));
    tower.position.set(x, this.baseY + 40 * s, z);
    const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: PALETTE.node, transparent: true, opacity: 0.75 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, this.baseY + 1 * s, z);
    const rackMat = new THREE.MeshBasicMaterial({ color: 0x0b1220 });
    for (const dy of [20, 42]) {
      const rack = new THREE.Mesh(this.rackGeo, rackMat);
      rack.position.set(x, this.baseY + dy * s, z + 28 * s);
      this.group.add(rack);
    }
    this.group.add(base, tower, ring);
    const nameLabel = new VText(this.scene, { text: 'S' + (i + 1), x, y: this.baseY - 46 * s, z: z + 8 * s, color: PALETTE.textDim, scale: 0.5 });
    const roleLabel = new VText(this.scene, { text: 'Follower · T0', x, y: this.baseY + 108 * s, z, color: '#93c5fd', scale: 0.45 });
    tower.userData.serverIndex = i;
    this.servers.push({ x, z, base, tower, ring, nameLabel, roleLabel, logs: [], role: 'follower', pulse: null });
  }

  pos(i) {
    const srv = this.servers[i];
    return new THREE.Vector3(srv.x, this.baseY + 16 * this.scale, srv.z);
  }

  anchor(i) {
    const srv = this.servers[i];
    return new THREE.Vector3(srv.x, this.baseY + 92 * this.scale, srv.z);
  }

  logAnchor(i) {
    const srv = this.servers[i];
    const top = this.baseY + (24 + Math.max(0, srv.logs.length - 1) * 18) * this.scale;
    return new THREE.Vector3(srv.x + 44 * this.scale, top, srv.z + 16 * this.scale);
  }

  hitMeshes() { return this.servers.map((srv) => srv.tower); }

  setRole(i, role, term = 0) {
    const srv = this.servers[i];
    if (!srv) return;
    srv.role = role;
    const cfg = ROLE[role] || ROLE.follower;
    const m = srv.tower.material;
    m.color.setHex(cfg.color);
    m.emissive.setHex(cfg.color);
    m.emissiveIntensity = role === 'leader' ? 0.6 : 0.35;
    srv.ring.material.color.setHex(cfg.color);
    srv.ring.material.opacity = role === 'crashed' ? 0.2 : 0.75;
    srv.roleLabel.setText(cfg.label + (role === 'crashed' ? '' : ' · T' + term), {
      color: role === 'leader' ? '#fde68a' : role === 'candidate' ? '#fde68a' : role === 'crashed' ? '#fca5a5' : '#93c5fd',
    });
  }

  pulse(i) {
    const srv = this.servers[i];
    if (srv) srv.pulse = { t: 0, d: 600 };
  }

  setLog(i, entries = [], commit = 0) {
    const srv = this.servers[i];
    if (!srv) return;
    const s = this.scale;
    srv.logs.forEach((o) => {
      this.group.remove(o.mesh);
      o.mesh.material.dispose();
      o.label.remove();
    });
    srv.logs = entries.map((text, k) => {
      const committed = k < commit;
      const y = this.baseY + (24 + k * 18) * s;
      const mesh = new THREE.Mesh(this.logGeo, glowMaterial(committed ? 0x4ade80 : 0x60a5fa, { emissiveIntensity: 0.45 }));
      mesh.position.set(srv.x + 44 * s, y, srv.z);
      this.group.add(mesh);
      const label = new VText(this.scene, {
        text, x: srv.x + 44 * s, y, z: srv.z + 15 * s,
        color: committed ? '#bbf7d0' : PALETTE.textDim, scale: 0.34,
      });
      return { mesh, label };
    });
  }

  send(from, to, opts = {}) {
    if (from === to) return;
    const s = this.scale;
    const a = this.anchor(from);
    const b = this.anchor(to);
    const color = opts.color ?? PALETTE.edge;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false });
    const head = new THREE.Mesh(this.coneGeo, mat);
    head.position.y = 8 * s;
    const trail = new THREE.Mesh(this.trailGeo, mat);
    trail.position.y = -11 * s;
    const g = new THREE.Group();
    g.add(head, trail);
    g.position.copy(a);
    g.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
    g.visible = false;
    this.group.add(g);
    this.messages.push({ g, mat, a, b, t: 0, delay: opts.delay ?? 0, ms: opts.ms ?? 520, arc: (opts.arc ?? 56) * s });
  }

  broadcast(from, targets, opts = {}) {
    targets.forEach((to, k) => this.send(from, to, { ...opts, delay: (opts.delay ?? 0) + k * 70 }));
  }

  clearMessages() {
    for (const m of this.messages) {
      this.group.remove(m.g);
      m.mat.dispose();
    }
    this.messages = [];
  }

  update(dt) {
    const ms = dt * 1000;
    for (const srv of this.servers) {
      if (!srv.pulse) continue;
      srv.pulse.t += ms;
      const p = srv.pulse.t / srv.pulse.d;
      if (p >= 1) { srv.tower.scale.setScalar(1); srv.pulse = null; }
      else srv.tower.scale.setScalar(1 + 0.14 * Math.sin(p * Math.PI));
    }
    for (let k = this.messages.length - 1; k >= 0; k--) {
      const m = this.messages[k];
      if (m.delay > 0) {
        m.delay -= ms;
        if (m.delay > 0) continue;
      }
      m.g.visible = true;
      m.t += ms / m.ms;
      const p = Math.min(m.t, 1);
      m.g.position.lerpVectors(m.a, m.b, p);
      m.g.position.y += Math.sin(p * Math.PI) * m.arc;
      m.mat.opacity = p > 0.72 ? 0.95 * (1 - (p - 0.72) / 0.28) : 0.95;
      if (p >= 1) {
        this.group.remove(m.g);
        m.mat.dispose();
        this.messages.splice(k, 1);
      }
    }
  }

  resetVisuals() {
    this.clearMessages();
    for (let i = 0; i < this.count; i++) {
      this.setRole(i, 'follower', 0);
      this.setLog(i, []);
    }
  }

  dispose() {
    if (this.offFrame) this.offFrame();
    this.clearMessages();
    for (const srv of this.servers) {
      srv.nameLabel.remove();
      srv.roleLabel.remove();
      srv.logs.forEach((o) => o.label.remove());
    }
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.scene.remove(this.group);
    this.servers = [];
  }
}
