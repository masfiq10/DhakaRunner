import * as THREE from 'three';
import { BiomeId } from '../types/game';
import {
  createRickshawArtTexture,
  createSignboardTexture,
} from './proceduralTextures';

export type ObstacleKind =
  | 'metro_train'
  | 'brtc_bus'
  | 'cng_auto'
  | 'rickshaw_cart'
  | 'low_barrier'
  | 'high_signboard';

export type CollectibleKind =
  | 'taka_coin'
  | 'cha_boost'
  | 'magnet'
  | 'hoverboard_token'
  | 'star_2x';

export interface SpawnedObstacle {
  id: number;
  kind: ObstacleKind;
  mesh: THREE.Group;
  lane: number; // -1, 0, 1
  z: number;
  length: number;
  width: number;
  height: number;
  bottomY: number; // > 0 for high barriers that can be rolled under
  hasRamp: boolean;
  isMoving: boolean;
  moveSpeed: number;
  smashed: boolean;
  smashVelocity?: THREE.Vector3;
}

export interface SpawnedCollectible {
  id: number;
  kind: CollectibleKind;
  mesh: THREE.Group;
  lane: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

// Shared Materials Cache for high performance
let sharedRickshawTex: THREE.CanvasTexture | null = null;
let sharedMetroSignTex: THREE.CanvasTexture | null = null;
let sharedPadmaSignTex: THREE.CanvasTexture | null = null;

function ensureTextures(maxAnisotropy: number = 4) {
  if (!sharedRickshawTex) {
    sharedRickshawTex = createRickshawArtTexture('#F42A41', '#006A4E', maxAnisotropy);
  }
  if (!sharedMetroSignTex) {
    sharedMetroSignTex = createSignboardTexture(
      'DHAKA METRO RAIL',
      'UTTARA NORTH  •  MOTIJHEEL',
      '#006A4E',
      '#F42A41',
      maxAnisotropy
    );
  }
  if (!sharedPadmaSignTex) {
    sharedPadmaSignTex = createSignboardTexture(
      'PADMA EXPRESSWAY',
      'FAST LANE  •  MAWA TOLL PLAZA',
      '#1E3A8A',
      '#F59E0B',
      maxAnisotropy
    );
  }
}

export function buildObstacleMesh(
  kind: ObstacleKind,
  hasRamp: boolean = false,
  maxAnisotropy: number = 4
): {
  mesh: THREE.Group;
  length: number;
  width: number;
  height: number;
  bottomY: number;
} {
  ensureTextures(maxAnisotropy);
  const group = new THREE.Group();

  if (kind === 'metro_train') {
    const length = 13.5;
    const width = 2.24;
    const height = 3.05;

    // 1. Stainless Steel Coach Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.22,
      metalness: 0.78,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height - 0.35, length), bodyMat);
    body.position.y = (height - 0.35) / 2 + 0.35;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 2. Undercarriage Bogie Frame
    const bogieMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.4,
    });
    const undercarriage = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.88, 0.36, length * 0.94),
      bogieMat
    );
    undercarriage.position.y = 0.18;
    group.add(undercarriage);

    // 3. Iconic Dhaka Metro Green & Red Stripe
    const greenStripe = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.04, 0.36, length + 0.02),
      new THREE.MeshStandardMaterial({ color: 0x006a4e, roughness: 0.3 })
    );
    greenStripe.position.y = 1.42;
    const redStripe = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.05, 0.14, length + 0.03),
      new THREE.MeshStandardMaterial({ color: 0xf42a41, roughness: 0.3 })
    );
    redStripe.position.y = 1.22;
    group.add(greenStripe, redStripe);

    // 4. Tinted Glass Windows Strip
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.12,
      metalness: 0.9,
    });
    const sideWindows = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.03, 0.68, length * 0.86),
      glassMat
    );
    sideWindows.position.y = 2.08;
    const frontWindshield = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.82, 0.72, 0.1),
      glassMat
    );
    frontWindshield.position.set(0, 2.1, length / 2 + 0.02);
    group.add(sideWindows, frontWindshield);

    // 5. LED Headlights & Destination LED Display
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 1.5,
    });
    [-0.72, 0.72].forEach((x) => {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), headlightMat);
      light.position.set(x, 0.85, length / 2 + 0.03);
      group.add(light);
    });

    // 6. Rooftop HVAC & Pantograph
    const hvac = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.65, 0.22, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6 })
    );
    hvac.position.set(0, height + 0.1, 0);
    group.add(hvac);

    // Optional Climbable Boarding Ramp in front (+Z side facing player)
    if (hasRamp) {
      const rampLength = 4.6;
      const rampGroup = new THREE.Group();
      const rampGeo = new THREE.BoxGeometry(width * 0.95, 0.22, rampLength);
      const rampMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.35,
        metalness: 0.3,
      });
      const rampSlope = new THREE.Mesh(rampGeo, rampMat);
      rampSlope.rotation.x = Math.atan2(height, rampLength - 0.4);
      rampSlope.position.set(0, height / 2, length / 2 + rampLength / 2 - 0.3);
      rampGroup.add(rampSlope);
      group.add(rampGroup);
    }

    return { mesh: group, length, width, height, bottomY: 0 };
  }

  if (kind === 'brtc_bus') {
    const length = 10.6;
    const width = 2.22;
    const height = 3.05;

    // 1. Iconic BRTC Crimson Double-Decker Hull
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.32,
      metalness: 0.25,
    });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(width, height - 0.32, length), redMat);
    hull.position.y = (height - 0.32) / 2 + 0.32;
    hull.castShadow = true;
    hull.receiveShadow = true;
    group.add(hull);

    // 2. White & Green Mid-deck Ribbon
    const midStripe = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.04, 0.2, length + 0.02),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    midStripe.position.y = 1.62;
    group.add(midStripe);

    // 3. Lower & Upper Deck Tinted Windows
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.15,
      metalness: 0.85,
    });
    const lowerWin = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.03, 0.56, length * 0.84),
      glassMat
    );
    lowerWin.position.y = 1.15;
    const upperWin = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.03, 0.58, length * 0.88),
      glassMat
    );
    upperWin.position.y = 2.32;

    const frontLowerWin = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.84, 0.62, 0.08),
      glassMat
    );
    frontLowerWin.position.set(0, 1.15, length / 2 + 0.02);
    const frontUpperWin = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.84, 0.58, 0.08),
      glassMat
    );
    frontUpperWin.position.set(0, 2.32, length / 2 + 0.02);
    group.add(lowerWin, upperWin, frontLowerWin, frontUpperWin);

    // 4. Wheels (6 wheels)
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    [-3.4, 0, 3.4].forEach((zPos) => {
      [-width / 2, width / 2].forEach((xPos) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.position.set(xPos, 0.42, zPos);
        group.add(w);
      });
    });

    // Optional Climbable Ramp
    if (hasRamp) {
      const rampLength = 4.4;
      const rampSlope = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.94, 0.22, rampLength),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 })
      );
      rampSlope.rotation.x = Math.atan2(height, rampLength - 0.4);
      rampSlope.position.set(0, height / 2, length / 2 + rampLength / 2 - 0.3);
      group.add(rampSlope);
    }

    return { mesh: group, length, width, height, bottomY: 0 };
  }

  if (kind === 'cng_auto') {
    const length = 2.75;
    const width = 1.68;
    const height = 1.65;

    // Iconic Dhaka Green CNG Auto-Rickshaw
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.35,
      metalness: 0.3,
    });
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.25,
      metalness: 0.8,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.45,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(width, 0.78, length * 0.85), greenMat);
    body.position.y = 0.62;
    body.castShadow = true;

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.68, length * 0.72), cageMat);
    cabin.position.set(0, 1.25, -0.1);

    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.46, width * 0.5, length * 0.76, 12, 1, false, 0, Math.PI),
      roofMat
    );
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.set(0, 1.54, -0.1);

    // Single Front Nose & Headlight
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 0.75, 10), greenMat);
    nose.position.set(0, 0.58, length * 0.38);

    const headlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfef08a,
        emissiveIntensity: 1.2,
      })
    );
    headlight.position.set(0, 0.72, length * 0.49);

    group.add(body, cabin, roof, nose, headlight);
    return { mesh: group, length, width, height, bottomY: 0 };
  }

  if (kind === 'rickshaw_cart') {
    const length = 2.6;
    const width = 1.68;
    const height = 1.78;

    const artMat = new THREE.MeshStandardMaterial({
      map: sharedRickshawTex!,
      roughness: 0.35,
      metalness: 0.2,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.85,
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.7,
    });

    // Passenger Seat Box
    const seatBox = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.52, 1.15), artMat);
    seatBox.position.set(0, 0.68, -0.35);
    seatBox.castShadow = true;

    // Hooded Canopy (Classic Dhaka Rickshaw Hood)
    const hood = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.46, width * 0.48, 1.1, 12, 1, false, 0, Math.PI),
      artMat
    );
    hood.rotation.z = Math.PI / 2;
    hood.position.set(0, 1.25, -0.42);
    hood.castShadow = true;

    // Front Frame & Handlebars
    const frameBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), brassMat);
    frameBar.rotation.x = Math.PI / 3;
    frameBar.position.set(0, 0.72, 0.45);

    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.78, 8), brassMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 1.12, 0.78);

    // 3 Spoke Wheels (2 rear, 1 front)
    const wheelGeo = new THREE.TorusGeometry(0.42, 0.05, 8, 18);
    wheelGeo.rotateY(Math.PI / 2);
    const leftWheel = new THREE.Mesh(wheelGeo, wheelMat);
    leftWheel.position.set(-width * 0.46, 0.45, -0.42);
    const rightWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rightWheel.position.set(width * 0.46, 0.45, -0.42);
    const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frontWheel.position.set(0, 0.45, 0.85);

    group.add(seatBox, hood, frameBar, handlebar, leftWheel, rightWheel, frontWheel);
    return { mesh: group, length, width, height, bottomY: 0 };
  }

  if (kind === 'low_barrier') {
    const length = 0.7;
    const width = 2.25;
    const height = 1.05;

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.7,
    });
    const plankMat = new THREE.MeshStandardMaterial({
      color: 0xf42a41,
      roughness: 0.3,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.3,
    });

    [-0.95, 0.95].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, height, 10), postMat);
      post.position.set(x, height / 2, 0);
      group.add(post);
    });

    const topPlank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.34, 0.16), plankMat);
    topPlank.position.y = 0.78;
    topPlank.castShadow = true;

    const chevron = new THREE.Mesh(new THREE.BoxGeometry(width * 0.6, 0.16, 0.18), stripeMat);
    chevron.position.y = 0.78;

    group.add(topPlank, chevron);
    return { mesh: group, length, width, height, bottomY: 0 };
  }

  // high_signboard (Roll / Slide underneath!)
  const length = 0.8;
  const width = 2.4;
  const height = 2.95;
  const bottomY = 1.18; // Player can slide underneath!

  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.35,
    metalness: 0.75,
  });
  [-1.08, 1.08].forEach((x) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, height, 10), pillarMat);
    post.position.set(x, height / 2, 0);
    group.add(post);
  });

  const boardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, 1.32, 0.22),
    new THREE.MeshStandardMaterial({
      map: sharedMetroSignTex!,
      roughness: 0.3,
      metalness: 0.2,
    })
  );
  boardMesh.position.y = 2.08;
  boardMesh.castShadow = true;
  group.add(boardMesh);

  return { mesh: group, length, width, height, bottomY };
}

export function buildCollectibleMesh(kind: CollectibleKind): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'taka_coin') {
    // Golden 5-Taka octagonal coin with emerald inner ring
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.9,
    });
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.11, 8), goldMat);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;

    const emblem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.13, 8),
      new THREE.MeshStandardMaterial({
        color: 0x006a4e,
        roughness: 0.25,
        metalness: 0.6,
      })
    );
    emblem.rotation.x = Math.PI / 2;
    group.add(coin, emblem);
    return group;
  }

  if (kind === 'cha_boost') {
    // Terracotta "Tong-er Cha" Cup + Glowing Golden Aura
    const clayMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.45,
      metalness: 0.15,
    });
    const teaMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
    });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.56, 12), clayMat);
    const teaTop = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 12), teaMat);
    teaTop.position.y = 0.26;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.05, 8, 20),
      new THREE.MeshStandardMaterial({
        color: 0xf42a41,
        emissive: 0xf42a41,
        emissiveIntensity: 0.8,
      })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(cup, teaTop, ring);
    return group;
  }

  if (kind === 'magnet') {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.12, 10, 18, Math.PI),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x991b1b,
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.7,
      })
    );
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.9,
    });
    [-0.36, 0.36].forEach((x) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.24, 10), tipMat);
      tip.position.set(x, -0.12, 0);
      group.add(tip);
    });
    group.add(arch);
    return group;
  }

  if (kind === 'hoverboard_token') {
    const disc = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.48, 0),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.7,
        roughness: 0.15,
        metalness: 0.85,
      })
    );
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.05, 8, 20),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.8,
      })
    );
    group.add(disc, halo);
    return group;
  }

  // star_2x
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xeab308,
    emissiveIntensity: 0.75,
    roughness: 0.15,
    metalness: 0.9,
  });
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.16), starMat);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.16), starMat);
  b2.rotation.z = Math.PI / 4;
  group.add(b1, b2);
  return group;
}

export function buildRoadsideSceneryProp(
  biome: Exclude<BiomeId, 'auto'>,
  side: -1 | 1,
  variant: number
): THREE.Group {
  const group = new THREE.Group();

  if (biome === 'mirpur_metro') {
    // Dhaka Metro Viaduct Pillar + Modern Apartment or Krishnachura Tree
    if (variant % 2 === 0) {
      const concreteMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.75,
      });
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 8.5, 12), concreteMat);
      pillar.position.set(side * 6.8, 4.25, 0);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 2.2), concreteMat);
      cap.position.set(side * 6.8, 8.4, 0);

      // Street Building behind pillar
      const bldgHeight = 10 + (variant % 4) * 3.5;
      const bldgMat = new THREE.MeshStandardMaterial({
        color: variant % 4 === 0 ? 0x1e293b : 0x0f172a,
        roughness: 0.45,
        metalness: 0.3,
      });
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(6.5, bldgHeight, 7.5), bldgMat);
      bldg.position.set(side * 12.5, bldgHeight / 2, 0);

      // Glowing apartment windows strip
      const winGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, bldgHeight * 0.75, 4.8),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.65,
        })
      );
      winGlow.position.set(side * 9.22, bldgHeight * 0.52, 0);

      group.add(pillar, cap, bldg, winGlow);
    } else {
      // Vibrant Orange-Red Krishnachura (Royal Poinciana) Tree + Street Lamp
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.42, 3.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 })
      );
      trunk.position.set(side * 6.6, 1.6, 0);

      const foliageMat = new THREE.MeshStandardMaterial({
        color: 0xf42a41, // Krishnachura flame blossom red-orange
        roughness: 0.65,
      });
      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 1), foliageMat);
      crown1.position.set(side * 6.6, 4.1, 0);
      const crown2 = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.35, 1),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 })
      );
      crown2.position.set(side * 7.4, 3.4, 1.1);

      group.add(trunk, crown1, crown2);
    }
    return group;
  }

  if (biome === 'puran_dhaka') {
    // Old Dhaka Heritage Terracotta Facade + Festive Golden Lantern Arch
    const height = 8.5 + (variant % 3) * 2.5;
    const wallMat = new THREE.MeshStandardMaterial({
      color: variant % 2 === 0 ? 0x9a3412 : 0xb45309,
      roughness: 0.65,
    });
    const bldg = new THREE.Mesh(new THREE.BoxGeometry(5.8, height, 7.2), wallMat);
    bldg.position.set(side * 10.2, height / 2, 0);

    // Colorful Bazaar Canopy Awning
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.35, 6.4),
      new THREE.MeshStandardMaterial({
        color: variant % 2 === 0 ? 0x006a4e : 0xec4899,
        roughness: 0.4,
      })
    );
    awning.position.set(side * 6.8, 3.2, 0);

    // Warm Golden Fairy Light Post
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 5.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.25 })
    );
    post.position.set(side * 5.8, 2.6, 0);

    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.4,
      })
    );
    lantern.position.set(side * 5.8, 5.3, 0);

    group.add(bldg, awning, post, lantern);
    return group;
  }

  // padma_bridge: Massive Steel Truss Arch & River Pylon
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.28,
    metalness: 0.85,
  });
  const goldBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
  });

  const column = new THREE.Mesh(new THREE.BoxGeometry(0.95, 11.5, 0.95), steelMat);
  column.position.set(side * 6.2, 5.75, 0);

  const diagonal = new THREE.Mesh(new THREE.BoxGeometry(0.55, 9.5, 0.55), steelMat);
  diagonal.rotation.x = side * 0.45;
  diagonal.position.set(side * 6.2, 5.2, 2.2);

  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, 0.95), steelMat);
  topBeam.position.set(side * 4.8, 11.2, 0);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), goldBeaconMat);
  beacon.position.set(side * 6.2, 11.8, 0);

  group.add(column, diagonal, topBeam, beacon);
  return group;
}
