// AlgorithmLibrary/MLFQ3D.js — 多级反馈队列调度（Q1 时间片1 / Q2 时间片2 / Q3 FCFS）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { DEFAULT_PROCS, makeProcInfo, zoneLabel, playSchedule } from './osCommon.js';
applyTheme('MLFQ3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
const status = panel.addStatus('');

const procs = DEFAULT_PROCS;
const Q = [1, 2, Infinity]; // 三级队列的时间片
makeProcInfo(scene, procs);
zoneLabel(scene, '就绪队列（Q1·1拍 | Q2·2拍 | Q3·FCFS）', -260, 148);
zoneLabel(scene, 'Q1', -274, 52, PALETTE.textGlow);
zoneLabel(scene, 'Q2', -90, 52, PALETTE.textGlow);
zoneLabel(scene, 'Q3', 94, 52, PALETTE.textGlow);
zoneLabel(scene, 'CPU', 380, 148);
zoneLabel(scene, '时间轴（甘特图）', -560, 8);
let run = null;

// 模拟：新进程进 Q1；时间片用完未完成则降一级；高优先级队列非空时抢占
function simMLFQ() {
  const events = [];
  const rem = new Map(procs.map(p => [p.id, p.srv]));
  const levels = [[], [], []];
  const levelOf = new Map(procs.map(p => [p.id, 0]));
  const order = [...procs].sort((a, b) => a.arr - b.arr);
  let t = 0, idx = 0, cpu = null, finished = 0, qLeft = 0;
  while (finished < procs.length) {
    const arr = [];
    while (idx < order.length && order[idx].arr <= t) { levels[0].push(order[idx].id); arr.push(order[idx].id); idx++; }
    let preemptMsg = '';
    if (cpu) {
      const lv = levelOf.get(cpu);
      const higher = levels.slice(0, lv).some(a => a.length > 0);
      if (qLeft === 0 && rem.get(cpu) > 0) {
        const nlv = Math.min(2, lv + 1);
        levelOf.set(cpu, nlv);
        levels[nlv].push(cpu);
        preemptMsg = '；' + cpu + ' 时间片用完，降级到 Q' + (nlv + 1);
        cpu = null; qLeft = 0;
      } else if (higher) {
        levels[lv].push(cpu);
        preemptMsg = '；' + cpu + ' 被高优先级进程抢占，回到 Q' + (lv + 1);
        cpu = null; qLeft = 0;
      }
    }
    let run = null, done = [];
    if (!cpu) for (let lv = 0; lv < 3; lv++) if (levels[lv].length) { cpu = levels[lv].shift(); qLeft = Q[lv]; break; }
    if (cpu) run = cpu;
    if (run) {
      rem.set(run, rem.get(run) - 1);
      if (rem.get(run) === 0) { done = [run]; finished++; cpu = null; qLeft = 0; }
      else qLeft--;
    }
    let msg = 't=' + t;
    if (arr.length) msg += '：' + arr.join('、') + ' 到达，进入 Q1';
    msg += preemptMsg;
    if (run && !done.length) msg += '；' + run + ' 从 Q' + (levelOf.get(run) + 1) + ' 获得 CPU（剩余 ' + rem.get(run) + '）';
    if (done.length) msg += '；' + done[0] + ' 完成';
    events.push({ t, arr, q: [...levels[0], ...levels[1], ...levels[2]], run, done, msg });
    t++;
  }
  return events;
}

function runMLFQ() {
  clearAll();
  run = playSchedule(scene, C, status, simMLFQ(), procs, {
    cpuX: 380, cpuY: 100, queueX: -320, queueY: 100, gap: 92, spawnX: -740,
    finishX: -520, finishY: -95, ganttX: -520, ganttY: -40, unit: 46, clockX: -520, clockY: 185,
  });
}

function clearAll() {
  engine.clear();
  if (run) { run.clear(); run = null; }
  status.textContent = '已清空';
}

panel.addButton('运行 MLFQ', runMLFQ);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
