// 3D/GeneratorEngine.js
// function* 生成器驱动的动画引擎：yield 即状态暂停点，绝不阻塞 while。
// 与 ControlPanel playbar 完全兼容：toggle/playing/speed/onStateChange/notify/step/undo/clear。
//
// yield 协议：
//   W(ms)        等待 ms（纯延时）
//   S(fn)        瞬时步骤，立即执行
//   A(ms, fn)    动画：fn(p) p∈[0,1] 逐帧回调，持续 ms
//   cond(fn)     条件等待：每帧重查 fn()，为 true 才继续
//   （裸 yield undefined 视为瞬时空转）
export const W = ms => ms;
export const S = fn => fn;
export const A = (ms, fn) => [ms, fn];
export const cond = fn => ({ cond: fn });

export class GeneratorEngine {
  constructor({ speed = 1 } = {}) {
    this.speed = speed;
    this.playing = false;
    this.listeners = [];
    this.gen = null;        // 当前生成器
    this.pending = null;    // {type:'anim'|'cond', ...}
    this.done = false;
  }

  onStateChange(cb) { this.listeners.push(cb); }
  notify() { for (const cb of this.listeners) cb(this); }

  play() { this.playing = true; this.notify(); }
  pause() { this.playing = false; this.notify(); }
  toggle() { this.playing ? this.pause() : this.play(); }

  start(gen) {
    this.gen = gen;
    this.pending = null;
    this.done = false;
    this.play();
  }

  clear() { this.gen = null; this.pending = null; this.done = true; this.pause(); this.notify(); }

  // 单步：跳过当前动画/等待，直达下一个状态点（含瞬时步骤）
  step() {
    this.pause();
    this.pending = null;
    this.advance();
    this.notify();
  }

  // 生成器无快照，撤销退化为暂停；页面提供「重跑」完整复位
  undo() { this.pause(); this.notify(); }

  tick(dt) {
    if (!this.playing) return;
    const ms = dt * 1000 * this.speed;
    if (this.pending) {
      if (this.pending.type === 'cond') {
        if (this.pending.fn()) this.pending = null;
        else return;
      } else {
        this.pending.elapsed += ms;
        const d = Math.max(this.pending.duration, 1);
        const p = Math.min(this.pending.elapsed / d, 1);
        if (p < 1) { this.pending.fn(p); return; }
        this.pending.fn(1);
        this.pending = null;
      }
    }
    this.advance();
  }

  advance() {
    let guard = 0;
    while (this.gen && !this.pending) {
      if (++guard > 200000) throw new Error('GeneratorEngine: 生成器疑似死循环');
      const r = this.gen.next();
      if (r.done) { this.gen = null; this.done = true; this.pause(); return; }
      const v = r.value;
      if (v === undefined || v === null) continue;
      if (typeof v === 'number') { this.pending = { type: 'anim', duration: v, elapsed: 0, fn: () => {} }; return; }
      if (typeof v === 'function') { v(); continue; }
      if (Array.isArray(v)) { this.pending = { type: 'anim', duration: v[0], elapsed: 0, fn: v[1] }; return; }
      if (v && typeof v === 'object' && v.cond) {
        if (v.cond()) continue;
        this.pending = { type: 'cond', fn: v.cond };
        return;
      }
      throw new Error('GeneratorEngine: 无效 yield 值 ' + typeof v);
    }
  }
}
