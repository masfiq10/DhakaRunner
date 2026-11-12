import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BiomeId,
  CharacterCustomization,
  GameModeState,
  RunTelemetry,
} from '../types/game';
import { soundEngine } from '../utils/soundEngine';
import {
  animateCharacterRig,
  applyCharacterCustomization,
  buildCharacterMesh,
  buildSergeantMesh,
  CharacterRig,
} from '../three/characterBuilder';
import {
  buildCollectibleMesh,
  buildObstacleMesh,
  buildRoadsideSceneryProp,
  CollectibleKind,
  ObstacleKind,
  SpawnedCollectible,
  SpawnedObstacle,
} from '../three/obstacleBuilder';
import { createRoadTrackTexture } from '../three/proceduralTextures';

const LANE_WIDTH = 2.8;
const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH];

// Reusable math vectors outside the render loop (Zero GC)
const _camTargetPos = new THREE.Vector3();
const _camLookAtPos = new THREE.Vector3();

// Seeded PRNG (Mulberry32) for shareable procedural level seeds
function createSeededRng(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const t = (h ^= h >>> 16) >>> 0;
    return t / 4294967296;
  };
}

const BIOME_PALETTES: Record<
  Exclude<BiomeId, 'auto'>,
  { skyHex: number; fogHex: number; sunHex: number; hemiSky: number; hemiGround: number }
> = {
  mirpur_metro: {
    skyHex: 0x0b1528,
    fogHex: 0x0b1528,
    sunHex: 0xfffbeb,
    hemiSky: 0x38bdf8,
    hemiGround: 0x0f172a,
  },
  puran_dhaka: {
    skyHex: 0x1c1026,
    fogHex: 0x1c1026,
    sunHex: 0xfde68a,
    hemiSky: 0xf59e0b,
    hemiGround: 0x27120b,
  },
  padma_bridge: {
    skyHex: 0x0f1e36,
    fogHex: 0x0f1e36,
    sunHex: 0xfef08a,
    hemiSky: 0x06b6d4,
    hemiGround: 0x091526,
  },
};

interface DhakaRunnerCanvasProps {
  gameMode: GameModeState;
  customization: CharacterCustomization;
  selectedBiome: BiomeId;
  levelSeed: string;
  runTriggerId: number;
  hoverboardTriggerId: number;
  onTelemetryUpdate: (telemetry: RunTelemetry) => void;
  onGameOver: (finalTelemetry: RunTelemetry) => void;
  onMissionEvent: (
    type: 'coins' | 'distance' | 'jumps' | 'rolls' | 'trains_climbed' | 'hoverboard_uses',
    amount: number
  ) => void;
}

export const DhakaRunnerCanvas: React.FC<DhakaRunnerCanvasProps> = ({
  gameMode,
  customization,
  selectedBiome,
  levelSeed,
  runTriggerId,
  hoverboardTriggerId,
  onTelemetryUpdate,
  onGameOver,
  onMissionEvent,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Store latest props & callbacks in refs so WebGL canvas never re-mounts
  const gameModeRef = useRef<GameModeState>(gameMode);
  gameModeRef.current = gameMode;

  const customizationRef = useRef<CharacterCustomization>(customization);
  customizationRef.current = customization;

  const selectedBiomeRef = useRef<BiomeId>(selectedBiome);
  selectedBiomeRef.current = selectedBiome;

  const levelSeedRef = useRef<string>(levelSeed);
  levelSeedRef.current = levelSeed;

  const callbacksRef = useRef({
    onTelemetryUpdate,
    onGameOver,
    onMissionEvent,
  });
  callbacksRef.current = { onTelemetryUpdate, onGameOver, onMissionEvent };

  // Mutable Engine Ref for instant reactive updates
  const engineRef = useRef<{
    rig: CharacterRig | null;
    maxAnisotropy: number;
    resetAndStartRun: () => void;
    activateHoverboard: () => void;
    handleAction: (action: 'left' | 'right' | 'jump' | 'roll' | 'hoverboard') => void;
  } | null>(null);

  // Apply character customization live whenever customization or mode changes
  useEffect(() => {
    if (engineRef.current && engineRef.current.rig) {
      const showBoard =
        gameMode === 'studio' ||
        gameMode === 'menu';
      applyCharacterCustomization(
        engineRef.current.rig,
        customization,
        showBoard,
        engineRef.current.maxAnisotropy
      );
    }
  }, [customization, gameMode]);

  // Trigger a fresh run whenever runTriggerId increments
  useEffect(() => {
    if (runTriggerId > 0 && engineRef.current) {
      engineRef.current.resetAndStartRun();
    }
  }, [runTriggerId]);

  // Trigger hoverboard from UI button
  useEffect(() => {
    if (hoverboardTriggerId > 0 && engineRef.current) {
      engineRef.current.activateHoverboard();
    }
  }, [hoverboardTriggerId]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // 2. Scene, Studio Environment Reflection & Horizon Fog
    const scene = new THREE.Scene();
    const initialPalette = BIOME_PALETTES.mirpur_metro;
    scene.background = new THREE.Color(initialPalette.skyHex);
    scene.fog = new THREE.FogExp2(initialPalette.fogHex, 0.0115);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(
      62,
      container.clientWidth / container.clientHeight,
      0.1,
      160
    );
    camera.position.set(0, 4.8, 7.6);
    camera.lookAt(0, 1.8, -6);

    // 4. Balanced 3-Point Studio & Sun Lighting Rig
    const hemiLight = new THREE.HemisphereLight(
      initialPalette.hemiSky,
      initialPalette.hemiGround,
      0.85
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(initialPalette.sunHex, 2.1);
    keyLight.position.set(14, 26, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 90;
    const d = 22;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-12, 10, -20);
    scene.add(rimLight);

    // 5. Endless Three-Lane Road & Railway Track Ribbon
    const roadTex = createRoadTrackTexture(maxAnisotropy);
    roadTex.repeat.set(1, 18);
    const roadGeo = new THREE.PlaneGeometry(10.2, 220);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.72,
      metalness: 0.15,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(0, 0, -85);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Outer Sidewalks / Riverbanks
    const bankGeo = new THREE.PlaneGeometry(60, 220);
    bankGeo.rotateX(-Math.PI / 2);
    const bankMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
    });
    const leftBank = new THREE.Mesh(bankGeo, bankMat);
    leftBank.position.set(-35, -0.03, -85);
    const rightBank = new THREE.Mesh(bankGeo, bankMat);
    rightBank.position.set(35, -0.03, -85);
    scene.add(leftBank, rightBank);

    // Studio Showcase Turntable Pedestal (visible when in Studio mode)
    const pedestalGroup = new THREE.Group();
    const discMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.7, 0.14, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.2,
        metalness: 0.8,
      })
    );
    discMesh.position.y = -0.07;
    const rimRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.62, 0.04, 10, 36),
      new THREE.MeshStandardMaterial({
        color: 0x006a4e,
        emissive: 0x10b981,
        emissiveIntensity: 0.85,
      })
    );
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0.01;
    pedestalGroup.add(discMesh, rimRing);
    scene.add(pedestalGroup);

    // 6. Build Player Character & Traffic Sergeant Chaser ("Mama")
    const playerRig = buildCharacterMesh(customizationRef.current, maxAnisotropy);
    scene.add(playerRig.root);

    const sergeantMesh = buildSergeantMesh();
    sergeantMesh.position.set(0, 0, 5.5);
    sergeantMesh.visible = false;
    scene.add(sergeantMesh);

    // 7. Particle Burst Pool for Coin Pickups & Smashed Obstacles
    const particleCount = 36;
    const particleGeo = new THREE.OctahedronGeometry(0.14, 0);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const particleInstanced = new THREE.InstancedMesh(
      particleGeo,
      particleMat,
      particleCount
    );
    particleInstanced.frustumCulled = false;
    scene.add(particleInstanced);

    const particles: {
      active: boolean;
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      life: number;
      scale: number;
    }[] = Array.from({ length: particleCount }, () => ({
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      scale: 0,
    }));
    const dummyObj = new THREE.Object3D();

    function spawnBurst(x: number, y: number, z: number, count: number = 10) {
      let spawned = 0;
      for (let i = 0; i < particles.length && spawned < count; i++) {
        const p = particles[i];
        if (!p.active) {
          p.active = true;
          p.pos.set(x, y, z);
          p.vel.set(
            (Math.random() - 0.5) * 9,
            Math.random() * 7 + 2,
            (Math.random() - 0.5) * 9
          );
          p.life = 0.45 + Math.random() * 0.25;
          p.scale = 1;
          spawned++;
        }
      }
    }

    // 8. Dynamic World Containers
    const obstacleContainer = new THREE.Group();
    const collectibleContainer = new THREE.Group();
    const sceneryContainer = new THREE.Group();
    scene.add(obstacleContainer, collectibleContainer, sceneryContainer);

    let activeObstacles: SpawnedObstacle[] = [];
    let activeCollectibles: SpawnedCollectible[] = [];
    let activeScenery: { mesh: THREE.Group; z: number }[] = [];

    // 9. Game Physics & Procedural State
    let rng = createSeededRng(levelSeedRef.current || 'DHAKA-2026');
    let nextSpawnZ = -32;
    let nextSceneryZ = -10;
    let uidCounter = 1;

    let currentLane = 0; // -1, 0, 1
    let previousLane = 0;
    let playerX = 0;
    let playerY = 0;
    let velocityY = 0;
    let groundSupportY = 0;
    let isJumping = false;
    let slideTimer = 0;

    let runSpeed = 22; // units/sec
    let distanceRun = 0;
    let score = 0;
    let highScore = Number(localStorage.getItem('dhaka_dash_highscore') || '0');
    let takaCoins = 0;
    let totalBankTaka = Number(localStorage.getItem('dhaka_dash_bank') || '250');
    let comboCount = 0;
    let stumbleWarning = 0; // 0 to 1
    let hoverboardCharges = 3;

    const powerUps = {
      chaBoost: 0,
      magnet: 0,
      multiplier2x: 0,
      hoverboard: 0,
    };

    let studioYaw = 0.35;
    let isDraggingStudio = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastTapTime = 0;
    let lastHudSync = 0;

    function getCurrentBiome(): Exclude<BiomeId, 'auto'> {
      const sel = selectedBiomeRef.current;
      if (sel !== 'auto') return sel;
      const cycle = Math.floor(distanceRun / 380) % 3;
      return cycle === 0
        ? 'mirpur_metro'
        : cycle === 1
        ? 'puran_dhaka'
        : 'padma_bridge';
    }

    function populateInitialScenery() {
      sceneryContainer.clear();
      activeScenery = [];
      nextSceneryZ = 10;
      const biome = getCurrentBiome();
      for (let i = 0; i < 14; i++) {
        spawnSceneryPair(nextSceneryZ, biome, i);
        nextSceneryZ -= 16;
      }
    }

    function spawnSceneryPair(
      zPos: number,
      biome: Exclude<BiomeId, 'auto'>,
      variantIdx: number
    ) {
      ([-1, 1] as const).forEach((side) => {
        const prop = buildRoadsideSceneryProp(
          biome,
          side,
          variantIdx + (side === 1 ? 1 : 0)
        );
        prop.position.set(0, 0, zPos);
        sceneryContainer.add(prop);
        activeScenery.push({ mesh: prop, z: zPos });
      });
    }

    // Procedural Wave Generator: guarantees at least 1 solvable path across the 3 lanes
    function spawnProceduralWave(zCenter: number) {
      const biome = getCurrentBiome();
      const lanes = [-1, 0, 1];
      // Pick a guaranteed safe or ramp-climbable lane
      const safeLaneIdx = Math.floor(rng() * 3);
      const safeLane = lanes[safeLaneIdx];

      lanes.forEach((lane) => {
        const laneX = LANE_X[lane + 1];

        if (lane === safeLane) {
          // In the safe lane, either spawn a line/arc of 5-Taka coins, a climbable Ramp Train, or a jumpable low barrier
          const safeRoll = rng();
          if (safeRoll < 0.25 && distanceRun > 40) {
            // Spawn a Metro Train or BRTC Bus WITH a climbable boarding ramp!
            const kind: ObstacleKind =
              biome === 'mirpur_metro' || rng() < 0.55 ? 'metro_train' : 'brtc_bus';
            const built = buildObstacleMesh(kind, true, maxAnisotropy);
            built.mesh.position.set(laneX, 0, zCenter);
            obstacleContainer.add(built.mesh);
            activeObstacles.push({
              id: uidCounter++,
              kind,
              mesh: built.mesh,
              lane,
              z: zCenter,
              length: built.length,
              width: built.width,
              height: built.height,
              bottomY: built.bottomY,
              hasRamp: true,
              isMoving: false,
              moveSpeed: 0,
              smashed: false,
            });

            // Trail of Taka coins up the ramp and along the roof!
            for (let c = 0; c < 6; c++) {
              const cz = zCenter + built.length / 2 + 3.2 - c * 2.4;
              const cy = c < 2 ? 1.1 + c * 1.1 : built.height + 0.65;
              spawnCollectible('taka_coin', lane, laneX, cy, cz);
            }
          } else {
            // Coin line + occasional power-up
            const coinCount = 5;
            const hasLowBarrier = safeRoll > 0.65;
            if (hasLowBarrier) {
              const kind: ObstacleKind = rng() < 0.5 ? 'low_barrier' : 'high_signboard';
              const built = buildObstacleMesh(kind, false, maxAnisotropy);
              built.mesh.position.set(laneX, 0, zCenter);
              obstacleContainer.add(built.mesh);
              activeObstacles.push({
                id: uidCounter++,
                kind,
                mesh: built.mesh,
                lane,
                z: zCenter,
                length: built.length,
                width: built.width,
                height: built.height,
                bottomY: built.bottomY,
                hasRamp: false,
                isMoving: false,
                moveSpeed: 0,
                smashed: false,
              });
            }

            for (let c = 0; c < coinCount; c++) {
              const cz = zCenter + 4 - c * 2.1;
              const archY =
                hasLowBarrier && c >= 1 && c <= 3
                  ? 2.25
                  : 0.75;
              spawnCollectible('taka_coin', lane, laneX, archY, cz);
            }

            // Spawn Bangladeshi Power-Up 18% of waves
            if (rng() < 0.18) {
              const powerChoices: CollectibleKind[] = [
                'cha_boost',
                'magnet',
                'hoverboard_token',
                'star_2x',
              ];
              const pKind = powerChoices[Math.floor(rng() * powerChoices.length)];
              spawnCollectible(pKind, lane, laneX, 1.15, zCenter - 7.5);
            }
          }
        } else {
          // Non-safe lanes: spawn diverse Dhaka vehicles & obstacles
          const r = rng();
          if (r < 0.78) {
            let kind: ObstacleKind = 'cng_auto';
            if (r < 0.24) kind = 'metro_train';
            else if (r < 0.44) kind = 'brtc_bus';
            else if (r < 0.58) kind = 'rickshaw_cart';
            else if (r < 0.68) kind = 'cng_auto';
            else if (r < 0.73) kind = 'low_barrier';
            else kind = 'high_signboard';

            const isMoving =
              (kind === 'metro_train' || kind === 'brtc_bus' || kind === 'cng_auto') &&
              distanceRun > 80 &&
              rng() < 0.32;

            const built = buildObstacleMesh(kind, false, maxAnisotropy);
            built.mesh.position.set(laneX, 0, zCenter);
            obstacleContainer.add(built.mesh);

            activeObstacles.push({
              id: uidCounter++,
              kind,
              mesh: built.mesh,
              lane,
              z: zCenter,
              length: built.length,
              width: built.width,
              height: built.height,
              bottomY: built.bottomY,
              hasRamp: false,
              isMoving,
              moveSpeed: isMoving ? 9 + rng() * 6 : 0,
              smashed: false,
            });

            // Coins over CNG or Rickshaw
            if ((kind === 'cng_auto' || kind === 'rickshaw_cart') && rng() < 0.5) {
              spawnCollectible('taka_coin', lane, laneX, 2.45, zCenter);
            }
          }
        }
      });
    }

    function spawnCollectible(
      kind: CollectibleKind,
      lane: number,
      x: number,
      y: number,
      z: number
    ) {
      const mesh = buildCollectibleMesh(kind);
      mesh.position.set(x, y, z);
      collectibleContainer.add(mesh);
      activeCollectibles.push({
        id: uidCounter++,
        kind,
        mesh,
        lane,
        x,
        y,
        z,
        collected: false,
      });
    }

    function resetAndStartRun() {
      obstacleContainer.clear();
      collectibleContainer.clear();
      activeObstacles = [];
      activeCollectibles = [];

      rng = createSeededRng(
        (levelSeedRef.current || 'DHAKA-2026') + '-' + Math.floor(Date.now() / 1000)
      );

      currentLane = 0;
      previousLane = 0;
      playerX = 0;
      playerY = 0;
      velocityY = 0;
      groundSupportY = 0;
      isJumping = false;
      slideTimer = 0;

      runSpeed = 23;
      distanceRun = 0;
      score = 0;
      takaCoins = 0;
      comboCount = customizationRef.current.presetId === 'tania' ? 2 : 0;
      stumbleWarning = 0;
      hoverboardCharges = 3;

      powerUps.chaBoost = 0;
      powerUps.magnet = 0;
      powerUps.multiplier2x = 0;
      powerUps.hoverboard = 0;

      playerRig.root.position.set(0, 0, 0);
      playerRig.root.rotation.set(0, 0, 0);
      playerRig.hoverboardSlot.visible = false;
      pedestalGroup.visible = false;
      sergeantMesh.visible = false;

      populateInitialScenery();

      nextSpawnZ = -34;
      for (let w = 0; w < 6; w++) {
        spawnProceduralWave(nextSpawnZ);
        nextSpawnZ -= 24;
      }

      soundEngine.playRickshawBell();
      soundEngine.startBeat();
      syncHudNow();
    }

    function activateHoverboard() {
      if (gameModeRef.current !== 'playing') return;
      if (powerUps.hoverboard > 0 || hoverboardCharges <= 0) return;

      hoverboardCharges -= 1;
      const bonusFactor = customizationRef.current.presetId === 'nila' ? 1.2 : 1.0;
      powerUps.hoverboard = 12 * bonusFactor;
      playerRig.hoverboardSlot.visible = true;
      soundEngine.playRickshawBell();
      callbacksRef.current.onMissionEvent('hoverboard_uses', 1);
      syncHudNow();
    }

    function handleAction(action: 'left' | 'right' | 'jump' | 'roll' | 'hoverboard') {
      if (gameModeRef.current !== 'playing') return;

      if (action === 'left' && currentLane > -1) {
        previousLane = currentLane;
        currentLane -= 1;
        soundEngine.playLaneSwitch();
      } else if (action === 'right' && currentLane < 1) {
        previousLane = currentLane;
        currentLane += 1;
        soundEngine.playLaneSwitch();
      } else if (action === 'jump') {
        if (!isJumping && playerY <= groundSupportY + 0.08) {
          velocityY = 14.2;
          isJumping = true;
          slideTimer = 0;
          soundEngine.playJump();
          callbacksRef.current.onMissionEvent('jumps', 1);
        }
      } else if (action === 'roll') {
        slideTimer = 0.68;
        if (playerY > groundSupportY + 0.1) {
          // Fast slam-drop from air
          velocityY = -26;
        }
        soundEngine.playSlide();
        callbacksRef.current.onMissionEvent('rolls', 1);
      } else if (action === 'hoverboard') {
        activateHoverboard();
      }
    }

    function triggerCrash(reason: string) {
      soundEngine.playCrash();
      soundEngine.stopBeat();
      if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('dhaka_dash_highscore', String(highScore));
      }
      localStorage.setItem('dhaka_dash_bank', String(totalBankTaka));

      const finalSnapshot: RunTelemetry = {
        score: Math.floor(score),
        highScore,
        takaCoins,
        totalBankTaka,
        distanceMeters: Math.floor(distanceRun),
        speedKmh: Math.round(runSpeed * 3.2),
        multiplier:
          (1 + Math.floor(comboCount / 10)) * (powerUps.multiplier2x > 0 ? 2 : 1),
        comboCount,
        activeBiome: getCurrentBiome(),
        stumbleWarning,
        hoverboardCharges,
        powerUps: { ...powerUps },
        crashReason: reason,
      };
      callbacksRef.current.onGameOver(finalSnapshot);
    }

    function syncHudNow(crashReason?: string) {
      const mult =
        (1 + Math.floor(comboCount / 10)) * (powerUps.multiplier2x > 0 ? 2 : 1);
      callbacksRef.current.onTelemetryUpdate({
        score: Math.floor(score),
        highScore: Math.max(highScore, Math.floor(score)),
        takaCoins,
        totalBankTaka,
        distanceMeters: Math.floor(distanceRun),
        speedKmh: Math.round(
          (runSpeed * (powerUps.chaBoost > 0 ? 1.55 : 1)) * 3.2
        ),
        multiplier: mult,
        comboCount,
        activeBiome: getCurrentBiome(),
        stumbleWarning,
        hoverboardCharges,
        powerUps: { ...powerUps },
        crashReason,
      });
    }

    engineRef.current = {
      rig: playerRig,
      maxAnisotropy,
      resetAndStartRun,
      activateHoverboard,
      handleAction,
    };

    // Populate initial backdrop for menu/studio
    populateInitialScenery();
    for (let w = 0; w < 4; w++) {
      spawnProceduralWave(-28 - w * 24);
    }

    // Pre-compile shaders on hardware WebGL
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 10. Keyboard Controls
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (gameModeRef.current !== 'playing') return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          handleAction('left');
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          handleAction('right');
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space': {
          e.preventDefault();
          const now = performance.now();
          if (e.code === 'Space' && now - lastTapTime < 280) {
            handleAction('hoverboard');
          } else {
            handleAction('jump');
          }
          lastTapTime = now;
          break;
        }
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          handleAction('roll');
          break;
        case 'KeyE':
        case 'ShiftLeft':
        case 'ShiftRight':
          e.preventDefault();
          handleAction('hoverboard');
          break;
      }
    };

    // Pointer / Touch Controls for Swipe & Studio Turntable
    const onPointerDown = (e: PointerEvent) => {
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      if (gameModeRef.current === 'studio' || gameModeRef.current === 'menu') {
        isDraggingStudio = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingStudio) return;
      const dx = e.clientX - dragStartX;
      dragStartX = e.clientX;
      studioYaw += dx * 0.012;
    };

    const onPointerUp = (e: PointerEvent) => {
      isDraggingStudio = false;
      if (gameModeRef.current !== 'playing') return;

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) > 28) {
        if (absX > absY) {
          handleAction(dx > 0 ? 'right' : 'left');
        } else {
          handleAction(dy > 0 ? 'roll' : 'jump');
        }
      } else {
        const now = performance.now();
        if (now - lastTapTime < 280) {
          handleAction('hoverboard');
        }
        lastTapTime = now;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // 11. Main Animation Loop with Software-WebGL Fence Pacing
    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const rawDelta = clock.getDelta();
      const dt = Math.min(rawDelta, 0.05);
      const elapsed = clock.getElapsedTime();
      const mode = gameModeRef.current;

      // Update Biome Atmosphere Color smoothly
      const activeBiome = getCurrentBiome();
      const targetPal = BIOME_PALETTES[activeBiome];
      (scene.background as THREE.Color).lerp(new THREE.Color(targetPal.skyHex), dt * 2.2);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(new THREE.Color(targetPal.fogHex), dt * 2.2);
      }

      if (mode === 'studio' || mode === 'menu') {
        // Studio / Menu Showcase Mode: Smoothly focus camera on Character & Pedestal
        pedestalGroup.visible = true;
        pedestalGroup.position.set(0, 0, 0);
        playerRig.root.position.set(0, 0.05, 0);

        if (!isDraggingStudio) {
          studioYaw += dt * 0.45;
        }
        playerRig.root.rotation.y = studioYaw;

        animateCharacterRig(playerRig, elapsed, {
          mode: 'studio',
          runSpeed: 0,
          laneTilt: 0,
        });

        _camTargetPos.set(0, 1.65, 3.65);
        _camLookAtPos.set(0, 1.25, 0);
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-6 * dt));
        camera.lookAt(_camLookAtPos);
        camera.fov = THREE.MathUtils.damp(camera.fov, 50, 6, dt);
        camera.updateProjectionMatrix();
      } else if (mode === 'playing') {
        pedestalGroup.visible = false;
        playerRig.root.rotation.y = Math.PI; // Facing -Z down the Dhaka highway

        // Advance Power-Up Timers
        if (powerUps.chaBoost > 0) powerUps.chaBoost = Math.max(0, powerUps.chaBoost - dt);
        if (powerUps.magnet > 0) powerUps.magnet = Math.max(0, powerUps.magnet - dt);
        if (powerUps.multiplier2x > 0) {
          powerUps.multiplier2x = Math.max(0, powerUps.multiplier2x - dt);
        }
        if (powerUps.hoverboard > 0) {
          powerUps.hoverboard = Math.max(0, powerUps.hoverboard - dt);
          if (powerUps.hoverboard <= 0) {
            playerRig.hoverboardSlot.visible = false;
          }
        }
        if (stumbleWarning > 0) {
          stumbleWarning = Math.max(0, stumbleWarning - dt * 0.14);
        }

        // Progressive Speed & Score
        runSpeed = Math.min(44, runSpeed + dt * 0.34);
        const effectiveSpeed = runSpeed * (powerUps.chaBoost > 0 ? 1.55 : 1.0);
        const stepZ = effectiveSpeed * dt;
        distanceRun += stepZ * 0.45;
        const mult =
          (1 + Math.floor(comboCount / 10)) * (powerUps.multiplier2x > 0 ? 2 : 1);
        score += stepZ * mult * 1.2;

        callbacksRef.current.onMissionEvent('distance', stepZ * 0.45);

        // Scroll Road Track Texture
        roadTex.offset.y -= stepZ * 0.082;

        // Smooth Horizontal Lane Damping
        const targetX = LANE_X[currentLane + 1];
        const prevX = playerX;
        playerX = THREE.MathUtils.damp(playerX, targetX, 14, dt);
        const laneTilt = (targetX - playerX) * 0.45;

        // Slide Timer
        if (slideTimer > 0) {
          slideTimer = Math.max(0, slideTimer - dt);
        }

        // Determine Ground Support Height (Road = 0, or Top of Train / BRTC Bus = 3.05)
        groundSupportY = 0;
        for (let i = 0; i < activeObstacles.length; i++) {
          const obs = activeObstacles[i];
          if (obs.smashed) continue;
          if (obs.kind === 'metro_train' || obs.kind === 'brtc_bus') {
            const obsX = LANE_X[obs.lane + 1];
            if (Math.abs(playerX - obsX) < 1.15) {
              const halfLen = obs.length / 2;
              const frontZ = obs.z + halfLen;
              const backZ = obs.z - halfLen;

              // Check if on climbable ramp
              if (obs.hasRamp && frontZ >= -0.5 && frontZ + 4.4 >= 0 && obs.z <= 4.4) {
                const rampStartZ = frontZ + 4.4;
                if (0 <= rampStartZ && 0 >= frontZ) {
                  const t = 1 - (0 - frontZ) / 4.4;
                  const rampY = THREE.MathUtils.clamp(t * obs.height, 0, obs.height);
                  groundSupportY = Math.max(groundSupportY, rampY);
                }
              }

              // Check if over roof of coach/bus
              if (0 <= frontZ + 0.4 && 0 >= backZ - 0.4 && playerY >= obs.height - 0.55) {
                groundSupportY = Math.max(groundSupportY, obs.height);
              }
            }
          }
        }

        // Vertical Jump & Gravity Kinematics
        playerY += velocityY * dt;
        if (playerY > groundSupportY) {
          velocityY -= 36 * dt;
        }
        if (playerY <= groundSupportY) {
          if (groundSupportY > 2.5 && isJumping) {
            callbacksRef.current.onMissionEvent('trains_climbed', 1);
          }
          playerY = groundSupportY;
          velocityY = 0;
          isJumping = false;
        }

        playerRig.root.position.set(playerX, playerY, 0);
        playerRig.shadowPlane.position.y = groundSupportY - playerY + 0.02;

        // Animate Character Limbs
        const charAnimMode =
          slideTimer > 0
            ? 'sliding'
            : isJumping
            ? 'jumping'
            : powerUps.hoverboard > 0
            ? 'hoverboard'
            : 'running';

        animateCharacterRig(playerRig, elapsed, {
          mode: charAnimMode,
          runSpeed: effectiveSpeed,
          laneTilt,
        });

        // Update Traffic Sergeant ("Mama") Chaser when Stumble Warning is active
        if (stumbleWarning > 0.02) {
          sergeantMesh.visible = true;
          const sZ = THREE.MathUtils.lerp(5.2, 1.85, stumbleWarning);
          sergeantMesh.position.x = THREE.MathUtils.damp(
            sergeantMesh.position.x,
            playerX,
            10,
            dt
          );
          sergeantMesh.position.y = 0;
          sergeantMesh.position.z = sZ;
          sergeantMesh.rotation.y = Math.PI;
          const sSwing = Math.sin(elapsed * 18) * 0.9;
          const lLeg = sergeantMesh.getObjectByName('leftLeg');
          const rLeg = sergeantMesh.getObjectByName('rightLeg');
          if (lLeg) lLeg.rotation.x = sSwing;
          if (rLeg) rLeg.rotation.x = -sSwing;
        } else {
          sergeantMesh.visible = false;
        }

        // Advance & Check Obstacles
        const playerTop = playerY + (slideTimer > 0 ? 0.95 : 1.95);
        const playerBottom = playerY;

        for (let i = activeObstacles.length - 1; i >= 0; i--) {
          const obs = activeObstacles[i];

          if (obs.smashed && obs.smashVelocity) {
            obs.mesh.position.addScaledVector(obs.smashVelocity, dt);
            obs.mesh.rotation.x += dt * 5;
            obs.mesh.rotation.z += dt * 4;
            obs.z = obs.mesh.position.z;
          } else {
            obs.z += (effectiveSpeed + (obs.isMoving ? obs.moveSpeed : 0)) * dt;
            obs.mesh.position.z = obs.z;

            // Collision Detection with Player (at z = 0)
            const halfLen = obs.length / 2;
            const zOverlap = obs.z + halfLen > -0.38 && obs.z - halfLen < 0.38;
            const obsX = LANE_X[obs.lane + 1];
            const xDist = Math.abs(playerX - obsX);

            if (zOverlap && xDist < 0.98) {
              // Ignore if player is safely on top of the train/bus or climbing its ramp
              const onRoofOrRamp =
                (obs.kind === 'metro_train' || obs.kind === 'brtc_bus') &&
                (playerBottom >= obs.height - 0.5 ||
                  (obs.hasRamp && obs.z + halfLen >= -0.4));

              // Ignore if player jumped over obstacle
              const jumpedOver = playerBottom >= obs.height - 0.18;

              // Ignore if player rolled under high signboard
              const rolledUnder = obs.bottomY > 0 && playerTop <= obs.bottomY + 0.15;

              if (!onRoofOrRamp && !jumpedOver && !rolledUnder) {
                // Did player have Cha Turbo or Hoverboard Shield active?
                if (powerUps.chaBoost > 0) {
                  obs.smashed = true;
                  obs.smashVelocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 18,
                    14,
                    -28
                  );
                  score += 150;
                  spawnBurst(obsX, 1.2, 0, 12);
                  soundEngine.playBoardBreak();
                } else if (powerUps.hoverboard > 0) {
                  // Hoverboard absorbs the crash!
                  powerUps.hoverboard = 0;
                  playerRig.hoverboardSlot.visible = false;
                  obs.smashed = true;
                  obs.smashVelocity = new THREE.Vector3(0, 12, -24);
                  spawnBurst(playerX, 1.0, 0, 14);
                  soundEngine.playBoardBreak();
                } else {
                  // Check if side-swipe stumble vs head-on crash
                  const isSideSwipe =
                    (obs.kind === 'metro_train' || obs.kind === 'brtc_bus') &&
                    Math.abs(prevX - obsX) > 0.72 &&
                    obs.z + halfLen > 0.45;

                  if (isSideSwipe && stumbleWarning < 0.45) {
                    // Bounce back to previous lane & summon Traffic Sergeant Mama!
                    currentLane = previousLane;
                    playerX = LANE_X[currentLane + 1];
                    stumbleWarning = 1.0;
                    soundEngine.playStumbleWhistle();
                  } else {
                    const labelMap: Record<ObstacleKind, string> = {
                      metro_train: 'Collided with Uttara-Motijheel Metro Coach',
                      brtc_bus: 'Blocked by BRTC Red Double-Decker Bus',
                      cng_auto: 'Clipped a Green Dhaka CNG Auto-Rickshaw',
                      rickshaw_cart: 'Crashed into a Painted Puran Dhaka Rickshaw',
                      low_barrier: 'Tripped over a Road Construction Barrier',
                      high_signboard: 'Hit an Overhead Dhaka Highway Signboard',
                    };
                    triggerCrash(
                      stumbleWarning >= 0.45 && isSideSwipe
                        ? 'Caught by Traffic Sergeant Mama after stumbling!'
                        : labelMap[obs.kind]
                    );
                    break;
                  }
                }
              }
            }
          }

          if (obs.z > 24) {
            obstacleContainer.remove(obs.mesh);
            activeObstacles.splice(i, 1);
          }
        }

        // Advance & Collect Coins / Power-Ups
        const magnetRadius =
          customizationRef.current.presetId === 'kazi' ? 9.5 : 7.5;

        for (let i = activeCollectibles.length - 1; i >= 0; i--) {
          const item = activeCollectibles[i];
          item.z += stepZ;
          item.mesh.rotation.y += dt * 3.2;

          // Chumbok Magnet pulls Taka coins across all lanes toward the runner
          if (
            item.kind === 'taka_coin' &&
            (powerUps.magnet > 0 || powerUps.chaBoost > 0) &&
            item.z > -magnetRadius &&
            item.z < 2.5
          ) {
            item.x = THREE.MathUtils.damp(item.x, playerX, 15, dt);
            item.y = THREE.MathUtils.damp(item.y, playerY + 1.0, 15, dt);
          }

          item.mesh.position.set(item.x, item.y, item.z);

          // Pickup check
          const distSq =
            (item.x - playerX) * (item.x - playerX) +
            (item.y - (playerY + 0.9)) * (item.y - (playerY + 0.9)) +
            item.z * item.z;

          if (!item.collected && distSq < 1.65) {
            item.collected = true;
            spawnBurst(item.x, item.y, item.z, 6);

            if (item.kind === 'taka_coin') {
              const coinValue = powerUps.multiplier2x > 0 ? 10 : 5;
              takaCoins += coinValue;
              totalBankTaka += coinValue;
              comboCount += 1;
              score += 25 * (powerUps.multiplier2x > 0 ? 2 : 1);
              soundEngine.playCoinTaka(comboCount);
              callbacksRef.current.onMissionEvent('coins', coinValue);
            } else if (item.kind === 'cha_boost') {
              const chaBonus =
                customizationRef.current.presetId === 'rafi' ? 1.15 : 1.0;
              powerUps.chaBoost = 7.5 * chaBonus;
              soundEngine.playPowerUp();
            } else if (item.kind === 'magnet') {
              powerUps.magnet = 11;
              soundEngine.playPowerUp();
            } else if (item.kind === 'hoverboard_token') {
              hoverboardCharges = Math.min(5, hoverboardCharges + 1);
              powerUps.hoverboard = 12;
              playerRig.hoverboardSlot.visible = true;
              soundEngine.playRickshawBell();
              callbacksRef.current.onMissionEvent('hoverboard_uses', 1);
            } else if (item.kind === 'star_2x') {
              powerUps.multiplier2x = 12;
              soundEngine.playPowerUp();
            }

            collectibleContainer.remove(item.mesh);
            activeCollectibles.splice(i, 1);
            continue;
          }

          if (item.z > 12) {
            collectibleContainer.remove(item.mesh);
            activeCollectibles.splice(i, 1);
          }
        }

        // Advance & Recycle Roadside Scenery
        for (let i = activeScenery.length - 1; i >= 0; i--) {
          const sc = activeScenery[i];
          sc.z += stepZ;
          sc.mesh.position.z = sc.z;
          if (sc.z > 18) {
            sceneryContainer.remove(sc.mesh);
            activeScenery.splice(i, 1);
          }
        }

        // Spawn New Scenery & Obstacle Waves Ahead
        nextSceneryZ += stepZ;
        if (nextSceneryZ >= -165) {
          spawnSceneryPair(nextSceneryZ - 16, activeBiome, Math.floor(distanceRun));
          nextSceneryZ -= 16;
        }

        nextSpawnZ += stepZ;
        if (nextSpawnZ >= -135) {
          const waveSpacing = Math.max(21, 27 - runSpeed * 0.12);
          spawnProceduralWave(nextSpawnZ - waveSpacing);
          nextSpawnZ -= waveSpacing;
        }

        // Dynamic Chase Camera with Speed FOV Widening & Lane Tracking
        const targetFov = powerUps.chaBoost > 0 ? 74 : 62 + (runSpeed - 22) * 0.35;
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, dt);
        camera.updateProjectionMatrix();

        _camTargetPos.set(playerX * 0.62, 4.45 + playerY * 0.55, 6.8);
        _camLookAtPos.set(playerX * 0.45, 1.5 + playerY * 0.45, -8.5);
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-9 * dt));
        camera.lookAt(_camLookAtPos);

        // Throttled HUD Sync (every ~90ms for crisp 60fps React performance)
        if (elapsed - lastHudSync > 0.09) {
          lastHudSync = elapsed;
          syncHudNow();
        }
      }

      // Update Instanced Particle Bursts
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        if (p.active) {
          p.life -= dt;
          if (p.life <= 0) {
            p.active = false;
            dummyObj.scale.setScalar(0);
          } else {
            p.pos.addScaledVector(p.vel, dt);
            p.vel.y -= 18 * dt;
            dummyObj.position.copy(p.pos);
            dummyObj.scale.setScalar(p.life * 1.8);
            dummyObj.rotation.x += dt * 6;
            dummyObj.rotation.y += dt * 6;
          }
        } else {
          dummyObj.scale.setScalar(0);
        }
        dummyObj.updateMatrix();
        particleInstanced.setMatrixAt(i, dummyObj.matrix);
      }
      particleInstanced.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      soundEngine.stopBeat();
      window.removeEventListener('keydown', onKeyDown);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      className="fixed inset-0 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      aria-label="Dhaka Dash 3D Viewport"
    />
  );
};
