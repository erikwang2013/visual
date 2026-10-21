// AlgorithmLibrary/Raft3D.js — Raft 共识：随机超时 → 拉票 → 多数票 → 心跳 → 日志复制 → 提交 → 不变量。
// 5 座服务器岛；点击服务器切换崩溃/恢复（保留多数派）；日志柱绿=已提交、蓝=未提交。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { ClusterStage } from '../3D/director/ClusterStage.js';
applyTheme('Raft3D');

const N = 5, LEADER = 2, MAJORITY = 3;
const ROLE_CN = { follower: 'Follower', candidate: 'Candidate', leader: 'Leader' };
const C = { vote: 0xfbbf24, ack: 0x4ade80, heartbeat: 0x22d3ee, append: 0x60a5fa };
const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;

const scene = new Scene3D('scene', { cameraPos: [560, 600, 1000], lookAt: [320, 350, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const stage = new ClusterStage(scene, {
  servers: N,
  center: [320, 300, 0],
  spacing: isMobile ? 146 : 160,
  scale: isMobile ? 0.82 : 1,
});

const director = new StoryDirector(scene, {
  title: 'Raft · 共识',
  total: 8,
  legend: [
    { label: 'Follower', color: '#60a5fa' },
    { label: 'Candidate', color: '#fbbf24' },
    { label: 'Leader', color: '#fcd34d' },
    { label: '已提交日志', color: '#4ade80' },
    { label: '心跳/RPC', color: '#22d3ee' },
  ],
  onReplay: () => restart(true),
});

const roles = Array(N).fill('follower');
const terms = Array(N).fill(0);
const logs = Array.from({ length: N }, () => []);
const commits = Array(N).fill(0);
const crashed = new Set();
const manualCrashed = new Set();
let storyCrashed = false;
let lastMsg = '—';

const SHOT_WIDE = { pos: [560, 600, 1000], target: [320, 350, 0], ms: 900 };
const SHOT_NODE = { pos: [650, 500, 790], target: [470, 360, 0], ms: 700 };
const SHOT_FOLLOW = { pos: [560, 470, 830], target: [400, 360, 0], ms: 650 };
const SHOT_LOG = { pos: [400, 470, 700], target: [360, 380, 0], ms: 700, fov: 46 };
const SHOT_COMMIT = { pos: [520, 650, 920], target: [320, 380, 0], ms: 850 };
const SHOT_SIDE = { pos: [920, 450, 560], target: [320, 380, 0], ms: 850 };
const SHOT_FINAL = { pos: [610, 650, 1010], target: [320, 360, 0], ms: 900 };

function syncNodes() {
  for (let i = 0; i < N; i++) stage.setRole(i, crashed.has(i) ? 'crashed' : roles[i], terms[i]);
}
function syncLogs() {
  for (let i = 0; i < N; i++) stage.setLog(i, logs[i], commits[i]);
}

function stateBlocks(note = '—') {
  return {
    blocks: [
      { type: 'chips', label: '任期 term', items: terms.map((t, i) => ({ text: 'S' + (i + 1) + ' T' + t, cls: terms[i] && roles[i] === 'leader' ? 'current' : '' })) },
      {
        type: 'chips', label: '角色',
        items: roles.map((r, i) => ({
          text: 'S' + (i + 1) + ' ' + (crashed.has(i) ? '已崩溃' : ROLE_CN[r]),
          cls: crashed.has(i) ? 'reject' : r === 'leader' ? 'open' : r === 'candidate' ? 'current' : 'closed',
        })),
      },
      {
        type: 'chips', label: '日志 log（✓=已提交）',
        items: logs.map((l, i) => ({
          text: l.length ? 'S' + (i + 1) + '[' + l.join(' ') + ']' + (commits[i] ? '✓' : '') : 'S' + (i + 1) + '[]',
          cls: commits[i] ? 'done' : l.length ? 'open' : 'closed',
        })),
      },
      { type: 'chips', label: 'commitIndex', items: commits.map((c, i) => ({ text: 'S' + (i + 1) + ':' + c, cls: c ? 'done' : '' })) },
      { type: 'text', label: '消息', value: lastMsg },
    ],
    footer: note,
  };
}

function resetState() {
  roles.fill('follower');
  terms.fill(0);
  logs.forEach((l) => { l.length = 0; });
  commits.fill(0);
  crashed.clear();
  manualCrashed.clear();
  storyCrashed = false;
  lastMsg = '—';
  stage.clearMessages();
  syncNodes();
  syncLogs();
  director.stateUpdate(stateBlocks('5 节点就绪 · 多数派 3/5'));
}

function* raftStory() {
  director.reset();
  resetState();

  director.chapter('集群');
  yield S(() => director.beat({
    title: '5 台服务器，谁会当选？',
    why: '每个节点先随机倒计时；先超时者发起选举——随机化避免所有节点同时竞选导致选票分裂。',
    stateText: '5 节点 · term=0 · 全部 Follower',
    progress: 0,
    camera: SHOT_WIDE,
    annotations: [
      { id: 'title', text: 'Raft：多数票决定共识', anchor: () => new THREE.Vector3(320, 480, 0), offset: [0, -24] },
      { id: 'quorum', text: '多数派 = 3/5', anchor: () => new THREE.Vector3(320, 440, 0), offset: [0, -22], className: 'gold' },
    ],
  }));
  yield W(650);

  roles[LEADER] = 'candidate';
  terms[LEADER] = 1;
  lastMsg = 'S3 选举计时器先到期';
  syncNodes();
  stage.pulse(LEADER);
  const lPos = stage.pos(LEADER);
  ripple(scene, lPos.x, lPos.y, lPos.z, C.vote, 72);
  director.chapter('超时');
  yield S(() => {
    director.beat({
      title: 'S3 超时 → Candidate',
      why: 'Follower 在随机超时内没收到心跳，就转成 Candidate：任期 +1，并先投自己一票。',
      stateText: 'S3 Candidate · term=1 · 随机超时避免脑裂',
      progress: 1,
      camera: SHOT_NODE,
      annotations: [{ id: 'timeout', text: 'S3 超时最早 · term 1', anchor: () => stage.anchor(LEADER), offset: [0, -18], className: 'gold' }],
    });
    director.stateUpdate(stateBlocks('随机超时：只有最早者进入竞选'));
  });
  yield W(620);

  const voters = [0, 1, 3, 4].filter((i) => !crashed.has(i));
  const replies = voters.slice(0, 3);
  stage.broadcast(LEADER, voters, { color: C.vote, ms: 520, arc: 62 });
  lastMsg = 'S3 → ' + voters.map((i) => 'S' + (i + 1)).join('/') + '：RequestVote(term=1)';
  director.chapter('竞选');
  yield S(() => {
    director.beat({
      title: '广播 RequestVote 拉票',
      why: 'Candidate 向所有节点请求投票；请求带上自己的任期，任期更大者优先。',
      stateText: 'RequestVote ' + voters.length + ' 条 · term=1',
      progress: 2,
      camera: SHOT_FOLLOW,
      annotations: [{ id: 'rv', text: 'RequestVote · term 1', anchor: () => stage.anchor(LEADER).add(new THREE.Vector3(0, 30, 0)), offset: [0, -16], className: 'gold' }],
    });
    director.stateUpdate(stateBlocks(lastMsg));
  });
  yield W(540);
  stage.clearMessages();
  const liveReplies = replies.filter((i) => !crashed.has(i));
  const votes = liveReplies.length + 1; // 含 Candidate 自投；集群固定 5 台
  liveReplies.forEach((v, k) => stage.send(v, LEADER, { color: C.ack, ms: 420, delay: k * 90, arc: 44 }));
  lastMsg = '收到 ' + liveReplies.length + ' 张回复 + S3 自投 = ' + votes + '/5 票';
  yield S(() => {
    director.beat({
      title: votes + ' 票赞成（含自投）',
      why: '每个 Follower 只对任期更新且日志不落后的 Candidate 投票；票数够多数就能当选。',
      stateText: '赞成 ' + votes + '/5（含自投）· 多数派门槛 3',
      progress: 2,
      camera: SHOT_FOLLOW,
      annotations: [{ id: 'votes', text: '赞成票 ' + votes + '/5 ≥ 3', anchor: () => new THREE.Vector3(320, 470, 0), offset: [0, -22], className: 'final' }],
    });
    director.stateUpdate(stateBlocks(lastMsg));
  });
  yield W(560);

  roles[LEADER] = 'leader';
  terms.fill(1);
  for (let i = 0; i < N; i++) if (i !== LEADER && !crashed.has(i)) roles[i] = 'follower';
  lastMsg = 'S3 获 ' + votes + '/5 票 → Leader(term=1)';
  syncNodes();
  stage.pulse(LEADER);
  director.chapter('多数票');
  yield S(() => {
    director.beat({
      title: votes + '/5 票 → 当选 Leader',
      why: '多数票（≥3/5）保证同一任期最多一个 Leader：任意两个多数派必定有交集。',
      stateText: 'S3 Leader · term=1 · ' + votes + '/5 ≥ 多数派 3',
      progress: 3,
      camera: SHOT_WIDE,
      annotations: [
        { id: 'leader', text: 'S3 Leader · term 1', anchor: () => stage.anchor(LEADER), offset: [0, -18], className: 'gold' },
        { id: 'why', text: '两个多数派必有交集 → 不会双主', anchor: () => new THREE.Vector3(320, 450, 0), offset: [0, -22] },
      ],
    });
    director.stateUpdate(stateBlocks('多数票 = 合法性来源'));
  });
  yield W(680);

  const alive = [...Array(N).keys()].filter((i) => i !== LEADER && !crashed.has(i));
  stage.broadcast(LEADER, alive, { color: C.heartbeat, ms: 460, arc: 50 });
  lastMsg = 'S3 → ' + alive.map((i) => 'S' + (i + 1)).join('/') + '：心跳（空 AppendEntries）';
  director.chapter('心跳');
  yield S(() => {
    director.beat({
      title: 'Leader 心跳维持权威',
      why: '心跳是空的 AppendEntries；Follower 收到就重置超时计时器，不再发起竞选。',
      stateText: '心跳周期 << 选举超时',
      progress: 4,
      camera: SHOT_FOLLOW,
      annotations: [{ id: 'hb', text: '心跳压住竞选计时器', anchor: () => stage.anchor(LEADER).add(new THREE.Vector3(0, 34, 0)), offset: [0, -16], className: 'gold' }],
    });
    director.stateUpdate(stateBlocks(lastMsg));
  });
  yield W(460);
  stage.clearMessages();
  stage.broadcast(LEADER, alive, { color: C.heartbeat, ms: 420, arc: 44, delay: 120 });
  yield W(480);
  lastMsg = '心跳持续 · 集群稳定在 term=1';
  yield S(() => director.stateUpdate(stateBlocks('心跳周期到达 → 重置 Follower 超时')));
  yield W(360);

  if (!crashed.has(0)) { crashed.add(0); storyCrashed = true; }
  roles[0] = 'follower';
  syncNodes();
  logs[LEADER].push('x=1');
  stage.setLog(LEADER, logs[LEADER], commits[LEADER]);
  const targets = [0, 1, 3, 4].filter((i) => !crashed.has(i));
  stage.broadcast(LEADER, targets, { color: C.append, ms: 560, arc: 58 });
  lastMsg = 'Client → S3：SET x=1；AppendEntries → ' + targets.map((i) => 'S' + (i + 1)).join('/');
  director.chapter('日志复制');
  yield S(() => {
    director.beat({
      title: '日志复制：先写 Leader，再发 AppendEntries',
      why: '命令只进 Leader 日志；AppendEntries 带 prevLogIndex/prevLogTerm，Follower 校验匹配后追加。',
      stateText: 'S3 log=[x=1] · S1 网络分区收不到',
      progress: 5,
      camera: SHOT_LOG,
      annotations: [
        { id: 'log', text: 'Leader 日志：[x=1]', anchor: () => stage.logAnchor(LEADER), offset: [0, -18], className: 'gold' },
        { id: 'part', text: 'S1 分区：收不到 AppendEntries', anchor: () => stage.anchor(0), offset: [0, -18], className: 'warn' },
      ],
    });
    director.stateUpdate(stateBlocks(lastMsg));
  });
  yield W(560);
  const delivered = targets.filter((i) => !crashed.has(i));
  delivered.forEach((i) => {
    logs[i].push('x=1');
    stage.setLog(i, logs[i], commits[i]);
    const p = stage.pos(i);
    ripple(scene, p.x, p.y, p.z, C.append, 52);
  });
  stage.clearMessages();
  lastMsg = 'AppendEntries 已到 ' + delivered.map((i) => 'S' + (i + 1)).join('/') + '：追加 x=1';
  yield S(() => {
    director.setBeatState('S3 + ' + delivered.length + ' 台已复制 · 等待多数确认');
    director.stateUpdate(stateBlocks(lastMsg));
  });
  yield W(500);

  const commitTargets = delivered.filter((i) => !crashed.has(i));
  const replicated = 1 + commitTargets.length;
  const canCommit = replicated >= MAJORITY;
  if (canCommit) {
    commits[LEADER] = 1;
    commitTargets.forEach((i) => { commits[i] = 1; });
  }
  syncLogs();
  lastMsg = canCommit
    ? 'Leader + ' + commitTargets.length + ' Follower = ' + replicated + '/5 ≥ 3 → commitIndex=1'
    : '仅 ' + replicated + '/5 副本 < 多数派 3 → 暂不提交';
  stage.pulse(LEADER);
  const lp = stage.pos(LEADER);
  ripple(scene, lp.x, lp.y, lp.z, C.ack, 80);
  stage.broadcast(LEADER, commitTargets, { color: C.ack, ms: 500, arc: 48 });
  director.chapter('提交');
  yield S(() => {
    director.beat({
      title: canCommit ? '多数复制 → 提交 commitIndex=1' : '副本不足 → 暂不提交',
      why: 'Leader 收到过半（≥3/5）确认才提交；提交后靠下一次心跳把 commitIndex 广播给 Follower。',
      stateText: canCommit
        ? 'commitIndex=1 · 已提交 x=1 · S1 仍落后'
        : '仅 ' + replicated + '/5 副本 · 未达多数派 3',
      progress: 6,
      camera: SHOT_COMMIT,
      annotations: canCommit ? [
        { id: 'commit', text: 'commitIndex=1：多数确认才提交', anchor: () => stage.logAnchor(LEADER), offset: [0, -18], className: 'final' },
        { id: 'lag', text: 'S1 分区：commitIndex 仍为 0', anchor: () => stage.anchor(0), offset: [0, -18], className: 'warn' },
      ] : [
        { id: 'lag', text: 'S1 分区：收不到 AppendEntries', anchor: () => stage.anchor(0), offset: [0, -18], className: 'warn' },
      ],
    });
    director.stateUpdate(stateBlocks(lastMsg));
  });
  yield W(640);

  const manualRevived = [...manualCrashed].filter((i) => i !== 0);
  crashed.clear();
  manualCrashed.clear();
  storyCrashed = false;
  syncNodes();
  const behind = [];
  for (let i = 0; i < N; i++) {
    if (!logs[i].length) {
      logs[i] = ['x=1'];
      stage.setLog(i, logs[i], 0);
      behind.push(i);
    }
  }
  if (behind.length) stage.broadcast(LEADER, behind, { color: C.append, ms: 520, arc: 52 });
  const revivedNote = manualRevived.length
    ? '；手动崩溃 S' + manualRevived.map((i) => i + 1).join('/S') + ' 同时恢复'
    : '';
  lastMsg = (behind.length ? 'S1 恢复：按 nextIndex 补齐 [x=1]' : '全体日志一致：S3[ x=1 ]') + revivedNote;
  director.chapter('不变量');
  yield S(() => {
    director.beat({
      title: '日志匹配 + 领导者完整性',
      why: '相同 index/term 的日志条目必定相同；已提交条目一定出现在之后每个 Leader 的日志里——崩溃恢复只补齐、不覆盖历史。',
      stateText: (behind.length ? 'S1 恢复并补齐 x=1' : '全部节点日志一致') + revivedNote + ' · 已提交 x=1 不丢失',
      progress: 7,
      camera: SHOT_SIDE,
      annotations: [
        { id: 'match', text: '日志匹配：index+term 相同 ⇒ 命令相同', anchor: () => new THREE.Vector3(320, 500, 0), offset: [0, -22] },
        { id: 'complete', text: '领导者完整性：已提交条目不会被覆盖', anchor: () => new THREE.Vector3(320, 455, 0), offset: [0, -22], className: 'final' },
      ],
    });
    director.stateUpdate(stateBlocks(lastMsg));
  });
  yield W(480);
  if (canCommit) {
    behind.forEach((i) => { commits[i] = 1; stage.setLog(i, logs[i], 1); });
    commits.forEach((_, i) => { if (logs[i].length && !commits[i]) { commits[i] = 1; stage.setLog(i, logs[i], 1); } });
  }
  lastMsg = (canCommit ? '全部 5 节点日志一致 · commitIndex=1' : '日志已补齐 · 未达多数派，不提交') + revivedNote;
  director.setBeatState((canCommit ? 'S1 恢复后补齐 · 已提交日志不被覆盖' : '副本不足 · 未提交') + revivedNote);
  director.stateUpdate(stateBlocks(lastMsg));
  status.textContent = 'Raft: S3 当选 Leader（term=1 · ' + votes + '/5 票）· ' +
    (canCommit ? 'commitIndex=1 已提交 x=1' : '未达多数派，未提交') + ' · 多数票 + 日志匹配 + 领导者完整性';
  yield W(850);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'Raft = 选举 + 日志复制',
    why: '多数票保证唯一 Leader，AppendEntries 保证日志匹配，提交规则保证领导者完整性——比 Paxos 更易理解与实现。',
    stateText: 'O(1) 心跳 · 复制 O(日志条数) · 恢复按 nextIndex 补齐',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function restart(autoPlay = true) {
  engine.clear();
  director.reset();
  resetState();
  status.textContent = '';
  engine.queue(() => raftStory());
  if (autoPlay) engine.toggle();
}

// 点击服务器或按钮：崩溃/恢复（S3 永久保护；手动最多 1 台，剧本另崩 S1）
function toggleCrash(i) {
  if (i === LEADER) {
    status.textContent = 'S3 是演示中的 Leader，不能手动崩溃';
    return;
  }
  if (crashed.has(i)) {
    crashed.delete(i);
    manualCrashed.delete(i);
    status.textContent = 'S' + (i + 1) + ' 已恢复';
  } else {
    if (manualCrashed.size >= 1) {
      status.textContent = '手动最多崩溃 1 台，保留多数派 3/5';
      return;
    }
    crashed.add(i);
    manualCrashed.add(i);
    status.textContent = 'S' + (i + 1) + ' 已崩溃：观察日志与 commitIndex 的差异';
  }
  syncNodes();
  director.stateUpdate(stateBlocks('手动：S' + (i + 1) + (crashed.has(i) ? ' 已崩溃' : ' 已恢复')));
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let down = null;
const canvas = scene.renderer.domElement;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 6) return;
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, scene.camera);
  const hits = raycaster.intersectObjects(stage.hitMeshes(), false);
  if (!hits.length) return;
  toggleCrash(hits[0].object.userData.serverIndex);
});

const crashSelect = input.addSelect('操作节点', ['S1', 'S2', 'S3', 'S4', 'S5'], 'S1', () => {});
input.addButton('崩溃/恢复', () => {
  const i = Number(crashSelect.value.slice(1)) - 1;
  if (i >= 0 && i < N) toggleCrash(i);
});

input.addButton('重播', () => restart(true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  resetState();
  status.textContent = '';
});

resetState();
engine.queue(() => raftStory());
scene.start(engine);
