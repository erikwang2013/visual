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
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * 0.5;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `bold ${opts.fontSize || Math.floor(size * 0.34)}px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
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

export function makeTextSprite(text, opts = {}) {
  const tex = textTexture(text, opts);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  const scale = opts.scale || 1;
  sprite.scale.set(100 * scale, 50 * scale, 1);
  return sprite;
}

export function setSpriteText(sprite, text, opts = {}) {
  const tex = textTexture(text, opts);
  sprite.material.map = tex;
  sprite.material.needsUpdate = true;
  const scale = opts.scale || 1;
  sprite.scale.set(100 * scale, 50 * scale, 1);
}
