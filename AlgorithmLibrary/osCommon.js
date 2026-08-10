// AlgorithmLibrary/osCommon.js — 操作系统类算法页共享组件（进程块 / 甘特图 / 时钟 / 信息表）
import { VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

export const DEFAULT_PROCS = [
  { id: 'P1', arr: 0, srv: 4, color: PALETTE.blue },
  { id: 'P2', arr: 1, srv: 3, color: PALETTE.green },
  { id: 'P3', arr: 2, srv: 5, color: PALETTE.orange },
  { id: 'P4', arr: 3, srv: 2, color: PALETTE.purple },
];

// 进程块：彩色方块 + 名字标签，位置/颜色/辉光均可动画
export class ProcBox {
  constructor(scene, { id, x, y, z = 0, w = 62, h = 62, color = PALETTE.node }) {
    this.id = id;
    this.box = new VBox(scene, { w, h, d: h * 0.6, x, y, z, label: id, color, emissive: color });
    this.x = x; this.y = y; this.z = z;
  }
  move(x, y, cmd, dur = 340) {
    const sx = this.x, sy = this.y;
    this.x = x; this.y = y;
    cmd({ duration: dur, fn: (p) => {
      this.box.mesh.position.x = sx + (x - sx) * easeInOut(p);
      this.box.mesh.position.y = sy + (y - sy) * easeInOut(p);
    }, undo: () => this.box.mesh.position.set(sx, sy, this.z) });
  }
  glow(on, cmd, dur = 200) {
    const prev = this.box.mesh.material.emissiveIntensity;
    cmd({ duration: dur, fn: () => { this.box.mesh.material.emissiveIntensity = on ? 0.95 : 0.35; }, undo: () => { this.box.mesh.material.emissiveIntensity = prev; } });
  }
  color(c, cmd, dur = 200) {
    const pc = this.box.mesh.material.color.getHex();
    const pe = this.box.mesh.material.emissive.getHex();
    cmd({ duration: dur, fn: () => this.box.setColor(c, c), undo: () => this.box.setColor(pc, pe) });
  }
  remove(cmd) {
    const sx = this.x, sy = this.y, b = this.box;
    cmd({ duration: 280, fn: (p) => { const s = 1 - p; b.mesh.scale.set(s, s, s); b.mesh.position.y = sy + 70 * p; }, undo: () => { b.mesh.scale.set(1, 1, 1); b.mesh.position.set(sx, sy, this.z); } });
  }
}

// 甘特图：沿时间轴从左向右追加着色段
export class Gantt {
  constructor(scene, x0, y, unit = 46) {
    this.scene = scene; this.x0 = x0; this.y = y; this.unit = unit; this.segs = []; this.end = 0;
  }
  add(cmd, { dur, color, label }) {
    const w = Math.max(24, dur * this.unit);
    const x = this.x0 + this.end + w / 2;
    const box = new VBox(this.scene, { w, h: 26, d: 14, x, y: this.y, z: 0, label, color, emissive: color });
    box.mesh.scale.x = 0.01;
    cmd({ duration: 320, fn: () => { box.mesh.scale.x = 1; }, undo: () => { box.mesh.scale.x = 0.01; } });
    this.segs.push(box);
    this.end += dur;
    return box;
  }
  clear() { for (const s of this.segs) { s.remove(); } this.segs = []; this.end = 0; }
}

// 墙上时钟：显示当前时刻
export function makeClock(scene, x, y) {
  const t = new VText(scene, { text: 't = 0', x, y, z: 0, color: PALETTE.textGlow, scale: 1.1 });
  let val = 0;
  return {
    text: t,
    set(v, cmd) { const prev = val; val = v; cmd({ duration: 90, fn: () => t.setText('t = ' + v), undo: () => t.setText('t = ' + prev) }); },
    reset() { val = 0; t.setText('t = 0'); },
  };
}

// 进程信息表：底部固定展示每个进程的到达时间与服务时间
export function makeProcInfo(scene, procs, y = -150) {
  const els = [];
  procs.forEach((p, i) => {
    const x = -520 + i * 150;
    els.push(new VBox(scene, { w: 52, h: 32, d: 16, x, y, z: 0, label: p.id, color: p.color, emissive: p.color }));
    els.push(new VText(scene, { text: '到达' + p.arr + ' 服务' + p.srv, x, y: y - 38, z: 0, color: PALETTE.textDim, scale: 0.72 }));
  });
  return els;
}

// 队列重排：把队列中进程块按序摆到一行
export function reflow(queue, cmd, x0, y, gap = 92) {
  queue.forEach((p, i) => p.move(x0 + i * gap, y, cmd, 240));
}

// 区域标签
export function zoneLabel(scene, text, x, y, color = PALETTE.textDim) {
  return new VText(scene, { text, x, y, z: 0, color, scale: 0.8 });
}

// 通用调度动画驱动：播放预计算的 events 序列
// events: [{ t, arr: [id...] 本拍新到达, q: [id...] 本拍结束时的队列顺序,
//           run: id|null 本拍占用 CPU 的进程, done: [id...] 本拍完成进程, msg: 状态文字 }]
export function playSchedule(scene, cmd, status, events, procs, cfg) {
  const cpu = new VBox(scene, { w: 76, h: 76, d: 46, x: cfg.cpuX, y: cfg.cpuY, z: 0, label: 'CPU', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
  const gantt = new Gantt(scene, cfg.ganttX, cfg.ganttY, cfg.unit);
  const clock = makeClock(scene, cfg.clockX, cfg.clockY);
  const boxes = new Map();
  const queue = [];
  const done = [];
  const colorOf = new Map(procs.map(p => [p.id, p.color]));
  const startT = new Map();
  let prev = null;
  const finish = (id, t) => {
    const b = boxes.get(id);
    gantt.add(cmd, { dur: t - startT.get(id), color: colorOf.get(id), label: id });
    done.push(b);
    b.move(cfg.finishX + (done.length - 1) * cfg.gap, cfg.finishY, cmd);
    b.glow(false, cmd);
    b.color(colorOf.get(id), cmd);
    cpu.setColor(PALETTE.node, PALETTE.nodeEmissive);
  };
  for (const ev of events) {
    clock.set(ev.t, cmd);
    if (ev.arr) ev.arr.forEach((id) => {
      const b = new ProcBox(scene, { id, x: cfg.spawnX, y: cfg.queueY, color: colorOf.get(id) });
      boxes.set(id, b);
      queue.push(b);
    });
    if (prev && prev !== ev.run && !(ev.done || []).includes(prev)) {
      const id = prev, b = boxes.get(id);
      gantt.add(cmd, { dur: ev.t - startT.get(id), color: colorOf.get(id), label: id });
      b.color(colorOf.get(id), cmd);
      b.glow(false, cmd);
      cpu.setColor(PALETTE.node, PALETTE.nodeEmissive);
    }
    if (ev.run && prev !== ev.run) {
      const b = boxes.get(ev.run);
      const qi = queue.indexOf(b);
      if (qi >= 0) queue.splice(qi, 1);
      b.move(cfg.cpuX, cfg.cpuY, cmd);
      b.glow(true, cmd);
      cpu.setColor(colorOf.get(ev.run), colorOf.get(ev.run));
      startT.set(ev.run, ev.t);
    }
    if (ev.done) ev.done.forEach((id) => finish(id, ev.t));
    if (ev.q) reflow(ev.q.map(id => boxes.get(id)).filter(Boolean), cmd, cfg.queueX, cfg.queueY, cfg.gap);
    prev = (ev.done || []).length ? null : (ev.run || null);
    if (ev.msg) status.textContent = ev.msg;
  }
  return {
    cpu, gantt, clock,
    clear() { cpu.remove(); gantt.clear(); clock.text.remove(); boxes.forEach(b => b.box.remove()); },
  };
}
