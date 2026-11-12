import * as THREE from 'three';
import { OutfitPatternId } from '../types/game';

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRoadTrackTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt base
  ctx.fillStyle = '#182030';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  for (let i = 0; i < 1600; i++) {
    const x = (i * 73) % 512;
    const y = (i * 139) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 3, 3);
  }

  // Outer yellow-gold shoulder stripes
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(10, 0, 8, 512);
  ctx.fillRect(494, 0, 8, 512);

  // Three-lane Metro sleepers & steel rails in each lane
  const laneCenters = [96, 256, 416];
  laneCenters.forEach((cx) => {
    // Concrete ties / sleepers
    ctx.fillStyle = '#253146';
    for (let y = 0; y < 512; y += 32) {
      ctx.fillRect(cx - 48, y + 6, 96, 12);
    }
    // Steel tracks
    ctx.fillStyle = '#64748B';
    ctx.fillRect(cx - 34, 0, 5, 512);
    ctx.fillRect(cx + 29, 0, 5, 512);
    // Specular rail highlight
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(cx - 33, 0, 2, 512);
    ctx.fillRect(cx + 30, 0, 2, 512);
  });

  // Lane divider dashed lines
  ctx.fillStyle = 'rgba(248, 250, 252, 0.45)';
  [176, 336].forEach((lx) => {
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(lx - 3, y + 8, 6, 36);
    }
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createRickshawArtTexture(
  primaryHex: string = '#F42A41',
  secondaryHex: string = '#006A4E',
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Rich base
  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 256, 256);

  // Inner ornamental border
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 236, 236);

  ctx.fillStyle = secondaryHex;
  ctx.fillRect(22, 22, 212, 212);

  // Scalloped folk petals around frame
  ctx.fillStyle = '#F59E0B';
  for (let i = 0; i < 8; i++) {
    const pos = 36 + i * 26;
    ctx.beginPath();
    ctx.arc(pos, 24, 8, 0, Math.PI * 2);
    ctx.arc(pos, 232, 8, 0, Math.PI * 2);
    ctx.arc(24, pos, 8, 0, Math.PI * 2);
    ctx.arc(232, pos, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central lotus/sunburst motif
  ctx.save();
  ctx.translate(128, 128);
  for (let p = 0; p < 12; p++) {
    ctx.rotate((Math.PI * 2) / 12);
    ctx.fillStyle = p % 2 === 0 ? '#F59E0B' : '#06B6D4';
    ctx.beginPath();
    ctx.ellipse(0, -46, 12, 32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = primaryHex;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createOutfitTexture(
  pattern: OutfitPatternId,
  primaryHex: string,
  secondaryHex: string,
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 256, 256);

  if (pattern === 'cricket_tiger') {
    // Diagonal Bengal Tiger stripes & #75 jersey badge
    ctx.fillStyle = secondaryHex;
    ctx.fillRect(0, 40, 256, 42);

    // Tiger claw diagonal stripes
    ctx.fillStyle = 'rgba(245, 158, 11, 0.88)';
    for (let y = 100; y < 220; y += 26) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(116, y - 10);
      ctx.lineTo(96, y + 10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(232, y);
      ctx.lineTo(140, y - 10);
      ctx.lineTo(160, y + 10);
      ctx.closePath();
      ctx.fill();
    }

    // Jersey Number 75
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 46px Oxanium, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BD 75', 128, 76);
  } else if (pattern === 'street_hoodie') {
    // Center zipper + glowing cyber Dhaka chevron
    ctx.fillStyle = secondaryHex;
    ctx.fillRect(118, 0, 20, 256);

    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(32, 70);
    ctx.lineTo(128, 136);
    ctx.lineTo(224, 70);
    ctx.stroke();

    // Front kangaroo pocket
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(48, 168, 160, 56);
  } else if (pattern === 'jamdani_royal') {
    // Traditional geometric Jamdani diamond weave + embroidered Koti placket
    ctx.strokeStyle = secondaryHex;
    ctx.lineWidth = 3;
    for (let y = 16; y < 248; y += 32) {
      for (let x = 16; x < 248; x += 32) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-8, -8, 16, 16);
        ctx.restore();
      }
    }
    // Center Panjabi gold placket
    ctx.fillStyle = secondaryHex;
    ctx.fillRect(114, 0, 28, 128);
    ctx.fillStyle = '#F8FAFC';
    for (let b = 22; b < 116; b += 28) {
      ctx.beginPath();
      ctx.arc(128, b, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === 'boishakh_festive') {
    // Pohela Boishakh Alpona spirals & festive bands
    ctx.fillStyle = secondaryHex;
    ctx.fillRect(0, 0, 256, 36);
    ctx.fillRect(0, 204, 256, 52);

    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(128, 120, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = secondaryHex;
    ctx.beginPath();
    ctx.arc(128, 120, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSignboardTexture(
  textTop: string,
  textBottom: string,
  bgHex: string = '#006A4E',
  accentHex: string = '#F42A41',
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  // Red circle badge on left (Bangladesh motif)
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.arc(54, 64, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 30px Oxanium, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(textTop, 102, 54);

  ctx.fillStyle = '#FDE68A';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(textBottom, 102, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}
