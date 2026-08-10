// 3D/AnimationEngine.js
// 命令模型：{ duration(ms), fn(progress 0..1), undo() }
// 支持 play/pause/step/undo、速度控制、撤销栈（快照还原）。

export class AnimationEngine {
  constructor({ speed = 1 } = {}) {
    this.queue = [];
    this.current = null;      // 正在执行的命令 {cmd, elapsed}
    this.done = [];           // 已完成的命令（用于 undo）
    this.speed = speed;
    this.playing = false;
    this.listeners = [];
  }

  onStateChange(cb) { this.listeners.push(cb); }
  notify() { for (const cb of this.listeners) cb(this); }

  addCommand(cmd) { this.queue.push(cmd); this.notify(); }

  play() { this.playing = true; this.notify(); }
  pause() { this.playing = false; this.notify(); }
  toggle() { this.playing ? this.pause() : this.play(); }

  // step：跳过动画，瞬间完成当前命令并推进
  step() {
    this.pause();
    if (this.current) { this.finishCurrent(); return; }
    if (this.queue.length) { this.current = { cmd: this.queue.shift(), elapsed: Infinity }; this.finishCurrent(); }
    this.notify();
  }

  finishCurrent() {
    const { cmd } = this.current;
    cmd.fn(1);
    this.done.push(cmd);
    this.current = null;
    if (this.queue.length) {
      this.current = { cmd: this.queue.shift(), elapsed: 0 };
    }
  }

  undo() {
    this.pause();
    const cmd = this.done.pop();
    if (cmd && cmd.undo) cmd.undo();
    if (!this.current && this.queue.length) {
      // 撤销后把下一个待执行命令让位：不自动回退队列，仅停止
    }
    this.notify();
  }

  clear() { this.queue = []; this.done = []; this.current = null; this.playing = false; this.notify(); }

  tick(dt) {
    if (!this.playing) return;
    if (!this.current && this.queue.length) {
      this.current = { cmd: this.queue.shift(), elapsed: 0 };
    }
    if (!this.current) { this.playing = false; this.notify(); return; }
    const { cmd, elapsed } = this.current;
    const next = elapsed + dt * 1000 * this.speed;
    const d = Math.max(cmd.duration, 1);
    const p = Math.min(next / d, 1);
    cmd.fn(p);
    this.current.elapsed = next;
    if (p >= 1) this.finishCurrent();
  }
}
