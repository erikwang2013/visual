// 3D/Glow.js
import * as THREE from 'three';

export const PALETTE = {
  node:        0x4a90e2, nodeEmissive:  0x143a6e,
  highlight:   0x22d3ee, highlightEmissive: 0x0e7490,
  red:         0xef4444, redEmissive:   0x7f1d1d,
  blue:        0x3b82f6, blueEmissive:  0x1d4ed8,
  green:       0x22c55e, greenEmissive: 0x166534,
  orange:      0xf97316, orangeEmissive: 0x7c2d12,
  yellow:      0xfacc15, yellowEmissive: 0x713f12,
  purple:      0xa855f7, purpleEmissive: 0x581c87,
  edge:        0x7dd3fc, edgeEmissive:  0x1e3a8a,
  ground:      0x3b82f6,
  text:        '#ffffff',
  textDim:     '#9db8d9',
  textGlow:    '#7dd3fc',
};

export function glowMaterial(color, opts = {}) {
  const emissive = opts.emissive !== undefined ? opts.emissive : color;
  const intensity = opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0.45;
  return new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: intensity,
    roughness: opts.roughness ?? 0.35,
    metalness: opts.metalness ?? 0.15,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
}

export function textTexture(text, opts = {}) {
  const size = opts.size || 256;
  const fontSize = opts.fontSize || Math.floor(size * 0.34);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${fontSize}px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
  const pad = Math.ceil(fontSize * 0.62); // 辉光留白，防止长文本被画布边缘裁掉
  const w = Math.max(size, Math.ceil(ctx.measureText(String(text)).width) + pad * 2);
  canvas.width = w;
  canvas.height = size * 0.5;
  ctx.font = `bold ${fontSize}px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const color = opts.color || PALETTE.text;
  const glow = opts.glow || PALETTE.textGlow;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillText(String(text), canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function spriteAspect(tex) {
  return [tex.image.width / 256, tex.image.height / 128];
}

export function makeTextSprite(text, opts = {}) {
  const tex = textTexture(text, opts);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  const scale = opts.scale || 1;
  const [w, h] = spriteAspect(tex);
  sprite.scale.set(100 * scale * w, 50 * scale * h, 1);
  return sprite;
}

export function setSpriteText(sprite, text, opts = {}) {
  const tex = textTexture(text, opts);
  const old = sprite.material.map; if (old) old.dispose();
  sprite.material.map = tex;
  sprite.material.needsUpdate = true;
  const scale = opts.scale || 1;
  const [w, h] = spriteAspect(tex);
  sprite.scale.set(100 * scale * w, 50 * scale * h, 1);
}

// —— 页面视觉主题：每页一套主色，柱子/节点/连线/地面/星空/背景各有身份 ——
// 语义色（红=删除警告、绿=插入成功、橙=枢轴、黄=特殊、紫=辅助）保持通用，不随主题变化。
const THEMES = {
  azure:    { node: 0x4a90e2, nodeEmissive: 0x143a6e, highlight: 0x22d3ee, highlightEmissive: 0x0e7490, edge: 0x7dd3fc, edgeEmissive: 0x1e3a8a, ground: 0x3b82f6, groundEm: 0x1e3a8a, bgTop: '#0a0f2e', bgBottom: '#030514', fog: 0x0a0f2e, stars: [0xffffff, 0xbfdbfe, 0x93c5fd, 0xe0f2fe], textGlow: '#7dd3fc' },
  cyan:     { node: 0x22d3ee, nodeEmissive: 0x0e7490, highlight: 0xe0fbff, highlightEmissive: 0x0891b2, edge: 0x67e8f9, edgeEmissive: 0x155e75, ground: 0x06b6d4, groundEm: 0x164e63, bgTop: '#04131e', bgBottom: '#010609', fog: 0x04131e, stars: [0xffffff, 0xa5f3fc, 0x67e8f9], textGlow: '#67e8f9' },
  emerald:  { node: 0x34d399, nodeEmissive: 0x064e3b, highlight: 0xa7f3d0, highlightEmissive: 0x047857, edge: 0x6ee7b7, edgeEmissive: 0x065f46, ground: 0x10b981, groundEm: 0x064e3b, bgTop: '#031710', bgBottom: '#010604', fog: 0x031710, stars: [0xffffff, 0xa7f3d0, 0x6ee7b7], textGlow: '#6ee7b7' },
  teal:     { node: 0x2dd4bf, nodeEmissive: 0x134e4a, highlight: 0x99f6e4, highlightEmissive: 0x0f766e, edge: 0x5eead4, edgeEmissive: 0x115e59, ground: 0x14b8a6, groundEm: 0x134e4a, bgTop: '#031312', bgBottom: '#010605', fog: 0x031312, stars: [0xffffff, 0x99f6e4, 0x5eead4], textGlow: '#5eead4' },
  amber:    { node: 0xfbbf24, nodeEmissive: 0x78350f, highlight: 0xfde68a, highlightEmissive: 0xb45309, edge: 0xfcd34d, edgeEmissive: 0x92400e, ground: 0xf59e0b, groundEm: 0x78350f, bgTop: '#0f0a02', bgBottom: '#050301', fog: 0x0f0a02, stars: [0xffffff, 0xfde68a, 0xfcd34d], textGlow: '#fcd34d' },
  orange:   { node: 0xfb923c, nodeEmissive: 0x7c2d12, highlight: 0xfed7aa, highlightEmissive: 0x9a3412, edge: 0xfdba74, edgeEmissive: 0x9a3412, ground: 0xf97316, groundEm: 0x7c2d12, bgTop: '#120701', bgBottom: '#060201', fog: 0x120701, stars: [0xffffff, 0xfed7aa, 0xfdba74], textGlow: '#fdba74' },
  rose:     { node: 0xfb7185, nodeEmissive: 0x881337, highlight: 0xfda4af, highlightEmissive: 0x9f1239, edge: 0xfda4af, edgeEmissive: 0x9f1239, ground: 0xf43f5e, groundEm: 0x881337, bgTop: '#120409', bgBottom: '#060102', fog: 0x120409, stars: [0xffffff, 0xfda4af, 0xfbcfe8], textGlow: '#fda4af' },
  magenta:  { node: 0xd946ef, nodeEmissive: 0x701a75, highlight: 0xf0abfc, highlightEmissive: 0xa21caf, edge: 0xe879f9, edgeEmissive: 0x86198f, ground: 0xc026d3, groundEm: 0x701a75, bgTop: '#0e0412', bgBottom: '#050107', fog: 0x0e0412, stars: [0xffffff, 0xf0abfc, 0xe879f9], textGlow: '#e879f9' },
  purple:   { node: 0xa855f7, nodeEmissive: 0x581c87, highlight: 0xd8b4fe, highlightEmissive: 0x7e22ce, edge: 0xc084fc, edgeEmissive: 0x6b21a8, ground: 0x9333ea, groundEm: 0x581c87, bgTop: '#0a0410', bgBottom: '#040106', fog: 0x0a0410, stars: [0xffffff, 0xd8b4fe, 0xc084fc], textGlow: '#c084fc' },
  violet:   { node: 0x8b5cf6, nodeEmissive: 0x4c1d95, highlight: 0xc4b5fd, highlightEmissive: 0x6d28d9, edge: 0xa78bfa, edgeEmissive: 0x5b21b6, ground: 0x7c3aed, groundEm: 0x4c1d95, bgTop: '#0a0510', bgBottom: '#040106', fog: 0x0a0510, stars: [0xffffff, 0xc4b5fd, 0xa78bfa], textGlow: '#a78bfa' },
  indigo:   { node: 0x818cf8, nodeEmissive: 0x312e81, highlight: 0xc7d2fe, highlightEmissive: 0x4338ca, edge: 0xa5b4fc, edgeEmissive: 0x3730a3, ground: 0x6366f1, groundEm: 0x312e81, bgTop: '#05060f', bgBottom: '#010205', fog: 0x05060f, stars: [0xffffff, 0xc7d2fe, 0xa5b4fc], textGlow: '#a5b4fc' },
  red:      { node: 0xf87171, nodeEmissive: 0x7f1d1d, highlight: 0xfecaca, highlightEmissive: 0x991b1b, edge: 0xfca5a5, edgeEmissive: 0x991b1b, ground: 0xef4444, groundEm: 0x7f1d1d, bgTop: '#100203', bgBottom: '#040001', fog: 0x100203, stars: [0xffffff, 0xfca5a5, 0xfecaca], textGlow: '#fca5a5' },
  gold:     { node: 0xf59e0b, nodeEmissive: 0x78350f, highlight: 0xfde68a, highlightEmissive: 0x92400e, edge: 0xfbbf24, edgeEmissive: 0x92400e, ground: 0xd97706, groundEm: 0x78350f, bgTop: '#0f0801', bgBottom: '#050200', fog: 0x0f0801, stars: [0xffffff, 0xfde68a, 0xfcd34d], textGlow: '#fcd34d' },
  pink:     { node: 0xf472b6, nodeEmissive: 0x831843, highlight: 0xfbcfe8, highlightEmissive: 0xa21caf, edge: 0xf9a8d4, edgeEmissive: 0x9d174d, ground: 0xec4899, groundEm: 0x831843, bgTop: '#10030a', bgBottom: '#050102', fog: 0x10030a, stars: [0xffffff, 0xfbcfe8, 0xf9a8d4], textGlow: '#f9a8d4' },
};

const PAGE_THEMES = {
  AVL3D: 'cyan', BFS3D: 'cyan', BinomialQueue3D: 'azure', BPlusTree3D: 'indigo', BST3D: 'emerald',
  BTree3D: 'azure', BucketSort3D: 'teal', ChangingCoordinates2D3D: 'purple', ChangingCoordinates3D3D: 'amber',
  ClosedHash3D: 'violet', ClosedHashBucket3D: 'pink', ComparisonSort3D: 'azure', ConnectedComponent3D: 'emerald',
  CountingSort3D: 'violet', DFS3D: 'violet', Dijkstra3D: 'amber', DisjointSets3D: 'magenta', DPChange3D: 'emerald',
  DPFib3D: 'gold', DPLCS3D: 'violet', FibonacciHeap3D: 'gold', Floyd3D: 'magenta', Heap3D: 'amber',
  HeapSort3D: 'purple', Kruskal3D: 'orange', LeftistHeap3D: 'emerald', OpenHash3D: 'rose', Prim3D: 'pink',
  QueueArray3D: 'azure', QueueLL3D: 'indigo', RadixSort3D: 'magenta', RadixTree3D: 'violet', RecFact3D: 'purple',
  RecQueens3D: 'rose', RecReverse3D: 'cyan', RedBlack3D: 'red', RotateScale2D3D: 'azure', RotateScale3D3D: 'emerald',
  RotateTranslate2D3D: 'cyan', Search3D: 'azure', SimpleStack3D: 'magenta', SkewHeap3D: 'orange', SplayTree3D: 'orange',
  StackArray3D: 'cyan', StackLL3D: 'teal', TopoSortDFS3D: 'indigo', TopoSortIndegree3D: 'azure', Trie3D: 'purple',
  TST3D: 'teal',
};

export let CURRENT_THEME = null;

// 页面加载时调用：变异 PALETTE（模块/柱子主色与高亮、连线、地面、文字辉光）并返回主题场景配置
export function applyTheme(pageName) {
  const t = THEMES[PAGE_THEMES[pageName]] || THEMES.azure;
  Object.assign(PALETTE, {
    node: t.node, nodeEmissive: t.nodeEmissive,
    highlight: t.highlight, highlightEmissive: t.highlightEmissive,
    edge: t.edge, edgeEmissive: t.edgeEmissive,
    ground: t.ground, textGlow: t.textGlow,
  });
  CURRENT_THEME = t;
  return t;
}
