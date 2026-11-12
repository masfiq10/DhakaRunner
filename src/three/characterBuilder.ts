import * as THREE from 'three';
import {
  BackGearId,
  CharacterCustomization,
  HeadgearId,
  HoverboardId,
} from '../types/game';
import {
  createContactShadowTexture,
  createOutfitTexture,
  createRickshawArtTexture,
} from './proceduralTextures';

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torsoMesh: THREE.Mesh;
  collarMesh: THREE.Mesh;
  headGroup: THREE.Group;
  skinMeshes: THREE.Mesh[];
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  pantsMeshes: THREE.Mesh[];
  shoeMeshes: THREE.Mesh[];
  headgearSlot: THREE.Group;
  backGearSlot: THREE.Group;
  hoverboardSlot: THREE.Group;
  shadowPlane: THREE.Mesh;
}

export function buildHoverboardMesh(
  boardId: HoverboardId,
  maxAnisotropy: number = 4
): THREE.Group {
  const group = new THREE.Group();

  // Extruded surfboard / hover-deck shape
  const shape = new THREE.Shape();
  shape.moveTo(-0.48, -0.82);
  shape.quadraticCurveTo(-0.56, 0, -0.38, 0.92);
  shape.quadraticCurveTo(0, 1.15, 0.38, 0.92);
  shape.quadraticCurveTo(0.56, 0, 0.48, -0.82);
  shape.quadraticCurveTo(0, -0.96, -0.48, -0.82);

  const deckGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.03,
    bevelThickness: 0.03,
  });
  deckGeo.rotateX(Math.PI / 2);

  let deckMat: THREE.MeshStandardMaterial;
  let rimColor = 0xf59e0b;
  let thrusterColor = 0x06b6d4;

  if (boardId === 'rickshaw_neon') {
    const artTex = createRickshawArtTexture('#F42A41', '#006A4E', maxAnisotropy);
    deckMat = new THREE.MeshStandardMaterial({
      map: artTex,
      roughness: 0.3,
      metalness: 0.25,
    });
    rimColor = 0xf59e0b;
    thrusterColor = 0x10b981;
  } else if (boardId === 'bengal_tiger') {
    const tigerTex = createOutfitTexture('cricket_tiger', '#F59E0B', '#1E293B', maxAnisotropy);
    deckMat = new THREE.MeshStandardMaterial({
      map: tigerTex,
      roughness: 0.28,
      metalness: 0.35,
    });
    rimColor = 0xf42a41;
    thrusterColor = 0xf59e0b;
  } else if (boardId === 'padma_gold') {
    deckMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.18,
      metalness: 0.88,
    });
    rimColor = 0x38bdf8;
    thrusterColor = 0x38bdf8;
  } else {
    // ilish_silver
    deckMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.14,
      metalness: 0.92,
    });
    rimColor = 0x06b6d4;
    thrusterColor = 0xec4899;
  }

  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.position.y = 0.12;
  deckMesh.castShadow = true;
  group.add(deckMesh);

  // Side neon rail bumpers
  const railGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.45, 8);
  railGeo.rotateX(Math.PI / 2);
  const railMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    emissive: rimColor,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.7,
  });

  const leftRail = new THREE.Mesh(railGeo, railMat);
  leftRail.position.set(-0.5, 0.1, 0);
  const rightRail = new THREE.Mesh(railGeo, railMat);
  rightRail.position.set(0.5, 0.1, 0);
  group.add(leftRail, rightRail);

  // Twin rear thruster nozzles
  const thrusterGeo = new THREE.CylinderGeometry(0.09, 0.13, 0.24, 10);
  thrusterGeo.rotateX(Math.PI / 2);
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.25,
    metalness: 0.85,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: thrusterColor,
    emissive: thrusterColor,
    emissiveIntensity: 1.4,
    roughness: 0.1,
  });

  [-0.22, 0.22].forEach((xOffset) => {
    const nozzle = new THREE.Mesh(thrusterGeo, thrusterMat);
    nozzle.position.set(xOffset, 0.07, 0.88);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), glowMat);
    core.position.set(xOffset, 0.07, 0.98);
    group.add(nozzle, core);
  });

  // Front Rickshaw Brass Bell ornament for Rickshaw Neon board
  if (boardId === 'rickshaw_neon') {
    const bellDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.15,
        metalness: 0.9,
      })
    );
    bellDome.position.set(0, 0.18, -0.82);
    group.add(bellDome);
  }

  return group;
}

function buildHeadgearMesh(headgear: HeadgearId, primaryHex: string, secondaryHex: string): THREE.Group {
  const group = new THREE.Group();
  if (headgear === 'none') return group;

  const primaryMat = new THREE.MeshStandardMaterial({
    color: primaryHex,
    roughness: 0.4,
    metalness: 0.15,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: secondaryHex,
    roughness: 0.3,
    metalness: 0.3,
  });

  if (headgear === 'snapback_cap') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.31, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      primaryMat
    );
    dome.position.y = 0.08;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.36), accentMat);
    visor.position.set(0, 0.1, -0.28);
    group.add(dome, visor);
  } else if (headgear === 'boishakhi_bandana') {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.315, 0.315, 0.14, 16),
      accentMat
    );
    band.position.y = 0.16;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), primaryMat);
    knot.position.set(0, 0.16, 0.31);
    group.add(band, knot);
  } else if (headgear === 'cricket_helmet') {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.65),
      primaryMat
    );
    shell.position.y = 0.05;
    const grillMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.2,
    });
    const grill = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.022, 6, 14, Math.PI),
      grillMat
    );
    grill.rotation.x = Math.PI / 2;
    grill.position.set(0, -0.04, -0.14);
    group.add(shell, grill);
  } else if (headgear === 'cyber_visor') {
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
    });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.22), visorMat);
    visor.position.set(0, 0.04, -0.22);
    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.03, 8, 16),
      accentMat
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 0.16;
    group.add(visor, crown);
  }

  return group;
}

function buildBackGearMesh(
  backGear: BackGearId,
  primaryHex: string,
  secondaryHex: string,
  maxAnisotropy: number = 4
): THREE.Group {
  const group = new THREE.Group();
  if (backGear === 'none') return group;

  if (backGear === 'cricket_bat') {
    const willowMat = new THREE.MeshStandardMaterial({
      color: 0xdeb887,
      roughness: 0.55,
      metalness: 0.05,
    });
    const gripMat = new THREE.MeshStandardMaterial({
      color: secondaryHex,
      roughness: 0.7,
    });
    const batGroup = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.82, 0.07), willowMat);
    blade.position.y = -0.12;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.44, 10), gripMat);
    handle.position.y = 0.45;
    // Red tape-ball sticker
    const sticker = new THREE.Mesh(
      new THREE.BoxGeometry(0.23, 0.18, 0.075),
      new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.3 })
    );
    sticker.position.y = 0.04;
    batGroup.add(blade, handle, sticker);
    batGroup.rotation.z = -0.42;
    batGroup.position.set(0, 0.05, 0.24);
    group.add(batGroup);
  } else if (backGear === 'rickshaw_shield') {
    const tex = createRickshawArtTexture(primaryHex, secondaryHex, maxAnisotropy);
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.07, 8),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.25 })
    );
    shield.rotation.x = Math.PI / 2;
    shield.position.set(0, 0.05, 0.24);
    group.add(shield);
  } else if (backGear === 'folk_dotara') {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.4,
      metalness: 0.15,
    });
    const dotaraGroup = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), woodMat);
    bowl.scale.set(1, 1.15, 0.65);
    bowl.position.y = -0.22;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.75, 10), woodMat);
    neck.position.y = 0.24;
    dotaraGroup.add(bowl, neck);
    dotaraGroup.rotation.z = 0.38;
    dotaraGroup.position.set(0, 0.06, 0.25);
    group.add(dotaraGroup);
  } else if (backGear === 'jet_pack') {
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.22,
      metalness: 0.85,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.1,
    });
    [-0.14, 0.14].forEach((x) => {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.56, 12), metalMat);
      tank.position.set(x, 0.04, 0.25);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 8), glowMat);
      flame.rotation.x = Math.PI;
      flame.position.set(x, -0.3, 0.25);
      group.add(tank, flame);
    });
  }

  return group;
}

export function buildCharacterMesh(
  config: CharacterCustomization,
  maxAnisotropy: number = 4
): CharacterRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Soft contact shadow plane on ground (y = 0.02)
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.75, 1.75),
    new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  root.add(shadowPlane);

  const skinMat = new THREE.MeshStandardMaterial({
    color: config.skinTone,
    roughness: 0.55,
    metalness: 0.05,
  });

  const outfitTex = createOutfitTexture(
    config.outfitPattern,
    config.primaryColor,
    config.secondaryColor,
    maxAnisotropy
  );
  const torsoMat = new THREE.MeshStandardMaterial({
    map: outfitTex,
    roughness: 0.45,
    metalness: 0.12,
  });

  const collarMat = new THREE.MeshStandardMaterial({
    color: config.secondaryColor,
    roughness: 0.35,
    metalness: 0.2,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: config.pantsColor,
    roughness: 0.65,
    metalness: 0.08,
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: config.shoeColor,
    roughness: 0.3,
    metalness: 0.25,
  });

  // 1. Torso
  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.88, 0.42), torsoMat);
  torsoMesh.position.y = 1.24;
  torsoMesh.castShadow = true;
  bodyPivot.add(torsoMesh);

  // 2. Collar / Scarf accent
  const collarMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.065, 8, 16),
    collarMat
  );
  collarMesh.rotation.x = Math.PI / 2;
  collarMesh.position.y = 1.68;
  bodyPivot.add(collarMesh);

  // 3. Head & Facial Details
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.98;
  bodyPivot.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.54, 0.52), skinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Hair base
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.75,
  });
  const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.56), hairMat);
  hairMesh.position.set(0, 0.22, 0.02);
  headGroup.add(hairMesh);

  // Expressive Eyes & Brows
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
  [-0.12, 0.12].forEach((x) => {
    const eyeWhite = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.03), eyeWhiteMat);
    eyeWhite.position.set(x, 0.03, -0.26);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), eyeMat);
    pupil.position.set(x, 0.03, -0.27);
    headGroup.add(eyeWhite, pupil);
  });

  // Headgear slot
  const headgearSlot = new THREE.Group();
  headgearSlot.position.y = 0.12;
  headGroup.add(headgearSlot);
  headgearSlot.add(
    buildHeadgearMesh(config.headgear, config.primaryColor, config.secondaryColor)
  );

  // Back gear slot
  const backGearSlot = new THREE.Group();
  backGearSlot.position.y = 1.28;
  bodyPivot.add(backGearSlot);
  backGearSlot.add(
    buildBackGearMesh(config.backGear, config.primaryColor, config.secondaryColor, maxAnisotropy)
  );

  // 4. Articulated Left & Right Arms
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.48, 1.58, 0);
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.48, 1.58, 0);

  const skinMeshes: THREE.Mesh[] = [headMesh];
  [leftArmGroup, rightArmGroup].forEach((armGrp) => {
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.24), collarMat);
    sleeve.position.y = -0.14;
    sleeve.castShadow = true;
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.18), skinMat);
    forearm.position.y = -0.44;
    forearm.castShadow = true;
    skinMeshes.push(forearm);
    armGrp.add(sleeve, forearm);
    bodyPivot.add(armGrp);
  });

  // 5. Articulated Left & Right Legs + Sneakers
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.2, 0.82, 0);
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.2, 0.82, 0);

  const pantsMeshes: THREE.Mesh[] = [];
  const shoeMeshes: THREE.Mesh[] = [];
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

  [leftLegGroup, rightLegGroup].forEach((legGrp) => {
    const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.66, 0.3), pantsMat);
    legMesh.position.y = -0.33;
    legMesh.castShadow = true;
    pantsMeshes.push(legMesh);

    const shoeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.44), shoeMat);
    shoeMesh.position.set(0, -0.71, -0.05);
    shoeMesh.castShadow = true;
    shoeMeshes.push(shoeMesh);

    const soleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.46), soleMat);
    soleMesh.position.set(0, -0.79, -0.05);

    legGrp.add(legMesh, shoeMesh, soleMesh);
    bodyPivot.add(legGrp);
  });

  // 6. Hoverboard Slot under feet
  const hoverboardSlot = new THREE.Group();
  hoverboardSlot.position.y = 0.02;
  root.add(hoverboardSlot);
  hoverboardSlot.add(buildHoverboardMesh(config.hoverboard, maxAnisotropy));

  return {
    root,
    bodyPivot,
    torsoMesh,
    collarMesh,
    headGroup,
    skinMeshes,
    leftArmGroup,
    rightArmGroup,
    leftLegGroup,
    rightLegGroup,
    pantsMeshes,
    shoeMeshes,
    headgearSlot,
    backGearSlot,
    hoverboardSlot,
    shadowPlane,
  };
}

export function applyCharacterCustomization(
  rig: CharacterRig,
  config: CharacterCustomization,
  showHoverboard: boolean,
  maxAnisotropy: number = 4
) {
  // Update Torso texture
  const torsoMat = rig.torsoMesh.material as THREE.MeshStandardMaterial;
  if (torsoMat.map) torsoMat.map.dispose();
  torsoMat.map = createOutfitTexture(
    config.outfitPattern,
    config.primaryColor,
    config.secondaryColor,
    maxAnisotropy
  );
  torsoMat.needsUpdate = true;

  // Update Collar & Sleeves
  (rig.collarMesh.material as THREE.MeshStandardMaterial).color.set(config.secondaryColor);

  // Update Skin
  rig.skinMeshes.forEach((m) => {
    (m.material as THREE.MeshStandardMaterial).color.set(config.skinTone);
  });

  // Update Pants & Shoes
  rig.pantsMeshes.forEach((m) => {
    (m.material as THREE.MeshStandardMaterial).color.set(config.pantsColor);
  });
  rig.shoeMeshes.forEach((m) => {
    (m.material as THREE.MeshStandardMaterial).color.set(config.shoeColor);
  });

  // Rebuild Headgear
  rig.headgearSlot.clear();
  rig.headgearSlot.add(
    buildHeadgearMesh(config.headgear, config.primaryColor, config.secondaryColor)
  );

  // Rebuild Back Gear
  rig.backGearSlot.clear();
  rig.backGearSlot.add(
    buildBackGearMesh(config.backGear, config.primaryColor, config.secondaryColor, maxAnisotropy)
  );

  // Rebuild Hoverboard
  rig.hoverboardSlot.clear();
  rig.hoverboardSlot.add(buildHoverboardMesh(config.hoverboard, maxAnisotropy));
  rig.hoverboardSlot.visible = showHoverboard;
}

export function animateCharacterRig(
  rig: CharacterRig,
  elapsed: number,
  options: {
    mode: 'running' | 'jumping' | 'sliding' | 'hoverboard' | 'studio';
    runSpeed: number;
    laneTilt: number;
  }
) {
  const { mode, runSpeed, laneTilt } = options;

  if (mode === 'studio') {
    // Relaxed heroic breathing & subtle wave in Character Studio
    rig.bodyPivot.position.y = 0.16 + Math.sin(elapsed * 2.5) * 0.03;
    rig.bodyPivot.rotation.set(0, 0, 0);
    rig.leftLegGroup.rotation.set(0, 0, -0.04);
    rig.rightLegGroup.rotation.set(0, 0, 0.04);
    rig.leftArmGroup.rotation.set(Math.sin(elapsed * 2) * 0.12, 0, 0.12);
    rig.rightArmGroup.rotation.set(-Math.sin(elapsed * 2) * 0.12, 0, -0.12);
    rig.headGroup.rotation.y = Math.sin(elapsed * 1.4) * 0.18;
    rig.hoverboardSlot.visible = true;
    rig.hoverboardSlot.position.y = 0.04 + Math.sin(elapsed * 3) * 0.025;
    return;
  }

  rig.headGroup.rotation.y = 0;
  rig.bodyPivot.rotation.z = laneTilt * -0.25;

  if (mode === 'sliding') {
    // Low parkour slide under barriers
    rig.bodyPivot.position.y = -0.35;
    rig.bodyPivot.rotation.x = -1.05;
    rig.leftLegGroup.rotation.x = 0.9;
    rig.rightLegGroup.rotation.x = 0.5;
    rig.leftArmGroup.rotation.x = -0.8;
    rig.rightArmGroup.rotation.x = -0.8;
  } else if (mode === 'jumping') {
    // Dynamic mid-air tuck
    rig.bodyPivot.position.y = rig.hoverboardSlot.visible ? 0.16 : 0;
    rig.bodyPivot.rotation.x = 0.18;
    rig.leftLegGroup.rotation.x = -0.65;
    rig.rightLegGroup.rotation.x = 0.45;
    rig.leftArmGroup.rotation.x = -0.95;
    rig.rightArmGroup.rotation.x = -0.65;
  } else if (mode === 'hoverboard') {
    // Surfing stance on the Rickshaw/Bengal Hoverboard
    const hoverBob = Math.sin(elapsed * 8) * 0.05;
    rig.hoverboardSlot.position.y = 0.05 + hoverBob;
    rig.bodyPivot.position.y = 0.18 + hoverBob;
    rig.bodyPivot.rotation.x = 0.12;
    rig.bodyPivot.rotation.y = 0.32;
    rig.leftLegGroup.rotation.x = -0.22;
    rig.rightLegGroup.rotation.x = 0.22;
    rig.leftArmGroup.rotation.z = 0.45;
    rig.rightArmGroup.rotation.z = -0.45;
    rig.leftArmGroup.rotation.x = Math.sin(elapsed * 6) * 0.15;
    rig.rightArmGroup.rotation.x = -Math.sin(elapsed * 6) * 0.15;
  } else {
    // High-energy sprint stride
    const strideFreq = elapsed * (runSpeed * 0.58);
    const swing = Math.sin(strideFreq) * 0.88;
    rig.bodyPivot.position.y = Math.abs(Math.cos(strideFreq)) * 0.1;
    rig.bodyPivot.rotation.x = 0.14;
    rig.bodyPivot.rotation.y = 0;

    rig.leftLegGroup.rotation.x = swing;
    rig.rightLegGroup.rotation.x = -swing;
    rig.leftArmGroup.rotation.x = -swing * 0.9;
    rig.rightArmGroup.rotation.x = swing * 0.9;
    rig.leftArmGroup.rotation.z = 0.08;
    rig.rightArmGroup.rotation.z = -0.08;
  }
}

// Traffic Sergeant ("Mama") Chaser Mesh
export function buildSergeantMesh(): THREE.Group {
  const group = new THREE.Group();

  const uniformMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a, // Dhaka Traffic Police Navy/Teal
    roughness: 0.55,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0x84cc16, // High-vis lime traffic vest
    emissive: 0x4d7c0f,
    emissiveIntensity: 0.25,
    roughness: 0.35,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xb8763e,
    roughness: 0.55,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.9, 0.46), vestMat);
  torso.position.y = 1.25;
  torso.castShadow = true;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.5), skinMat);
  head.position.y = 1.96;

  // White Traffic Helmet
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.33, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
    whiteMat
  );
  helmet.position.y = 2.06;

  // Left & Right Legs
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.72, 0.3), uniformMat);
  leftLeg.position.set(-0.2, 0.44, 0);
  leftLeg.name = 'leftLeg';
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.72, 0.3), uniformMat);
  rightLeg.position.set(0.2, 0.44, 0);
  rightLeg.name = 'rightLeg';

  // Right arm holding glowing red traffic baton
  const rightArm = new THREE.Group();
  rightArm.position.set(0.5, 1.55, 0);
  rightArm.name = 'rightArm';
  const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.56, 0.22), uniformMat);
  armMesh.position.y = -0.2;
  const baton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8),
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
    })
  );
  baton.position.set(0, -0.5, -0.18);
  baton.rotation.x = Math.PI / 3;
  rightArm.add(armMesh, baton);

  group.add(torso, head, helmet, leftLeg, rightLeg, rightArm);
  return group;
}
