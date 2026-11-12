import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DhakaRunnerCanvas } from './components/DhakaRunnerCanvas';
import {
  BackGearId,
  BiomeId,
  CHARACTER_PRESETS,
  CharacterCustomization,
  CharacterPresetId,
  COLOR_SWATCHES,
  GameModeState,
  HeadgearId,
  HoverboardId,
  MissionItem,
  OutfitPatternId,
  RunTelemetry,
} from './types/game';
import { soundEngine } from './utils/soundEngine';

type DockTabId = 'run' | 'studio' | 'world' | 'missions';

const INITIAL_MISSIONS: MissionItem[] = [
  {
    id: 'm_coins',
    title: 'Collect 100 Taka across Dhaka lanes',
    target: 100,
    current: 0,
    rewardTaka: 150,
    completed: false,
    type: 'coins',
  },
  {
    id: 'm_trains',
    title: 'Climb onto 3 Metro Trains or BRTC Buses',
    target: 3,
    current: 0,
    rewardTaka: 200,
    completed: false,
    type: 'trains_climbed',
  },
  {
    id: 'm_board',
    title: 'Summon Rickshaw Hoverboard 2 times',
    target: 2,
    current: 0,
    rewardTaka: 180,
    completed: false,
    type: 'hoverboard_uses',
  },
  {
    id: 'm_dist',
    title: 'Sprint 500 meters without crashing',
    target: 500,
    current: 0,
    rewardTaka: 250,
    completed: false,
    type: 'distance',
  },
];

const BIOME_LABEL_MAP: Record<Exclude<BiomeId, 'auto'>, string> = {
  mirpur_metro: 'Uttara–Motijheel Metro',
  puran_dhaka: 'Puran Dhaka Festival',
  padma_bridge: 'Padma Bridge Expressway',
};

export default function App() {
  const [gameMode, setGameMode] = useState<GameModeState>('studio');
  const [activeTab, setActiveTab] = useState<DockTabId>('studio');
  const [studioCategory, setStudioCategory] = useState<
    'runner' | 'attire' | 'colors' | 'gear' | 'board'
  >('runner');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [customization, setCustomization] = useState<CharacterCustomization>(
    CHARACTER_PRESETS[0].defaultConfig
  );
  const [selectedBiome, setSelectedBiome] = useState<BiomeId>('auto');
  const [levelSeed, setLevelSeed] = useState<string>('DHAKA-2026');
  const [runTriggerId, setRunTriggerId] = useState<number>(0);
  const [hoverboardTriggerId, setHoverboardTriggerId] = useState<number>(0);

  const [missions, setMissions] = useState<MissionItem[]>(INITIAL_MISSIONS);

  const [telemetry, setTelemetry] = useState<RunTelemetry>({
    score: 0,
    highScore: Number(localStorage.getItem('dhaka_dash_highscore') || '0'),
    takaCoins: 0,
    totalBankTaka: Number(localStorage.getItem('dhaka_dash_bank') || '250'),
    distanceMeters: 0,
    speedKmh: 74,
    multiplier: 1,
    comboCount: 0,
    activeBiome: 'mirpur_metro',
    stumbleWarning: 0,
    hoverboardCharges: 3,
    powerUps: {
      chaBoost: 0,
      magnet: 0,
      multiplier2x: 0,
      hoverboard: 0,
    },
  });

  // Keyboard shortcut 'H' to collapse/expand bottom dock
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleStartRun = useCallback(() => {
    setGameMode('playing');
    setActiveTab('run');
    setRunTriggerId((prev) => prev + 1);
  }, []);

  const handleOpenNavTab = (tab: DockTabId) => {
    setActiveTab(tab);
    setDockCollapsed(false);
    if (tab === 'studio') {
      soundEngine.stopBeat();
      setGameMode('studio');
    } else if (tab === 'run' && gameMode === 'studio') {
      setGameMode('menu');
    }
  };

  const handleSelectPreset = (presetId: CharacterPresetId) => {
    const found = CHARACTER_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCustomization({ ...found.defaultConfig });
      soundEngine.playLaneSwitch();
    }
  };

  const handleRandomizeDrip = () => {
    const patterns: OutfitPatternId[] = [
      'cricket_tiger',
      'street_hoodie',
      'jamdani_royal',
      'boishakh_festive',
    ];
    const headgears: HeadgearId[] = [
      'snapback_cap',
      'boishakhi_bandana',
      'cricket_helmet',
      'cyber_visor',
      'none',
    ];
    const backGears: BackGearId[] = [
      'cricket_bat',
      'rickshaw_shield',
      'folk_dotara',
      'jet_pack',
      'none',
    ];
    const boards: HoverboardId[] = [
      'rickshaw_neon',
      'bengal_tiger',
      'padma_gold',
      'ilish_silver',
    ];

    const c1 = COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)].hex;
    let c2 = COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)].hex;
    if (c2 === c1) c2 = '#F59E0B';

    setCustomization((prev) => ({
      ...prev,
      outfitPattern: patterns[Math.floor(Math.random() * patterns.length)],
      primaryColor: c1,
      secondaryColor: c2,
      shoeColor: c2,
      headgear: headgears[Math.floor(Math.random() * headgears.length)],
      backGear: backGears[Math.floor(Math.random() * backGears.length)],
      hoverboard: boards[Math.floor(Math.random() * boards.length)],
    }));
    soundEngine.playRickshawBell();
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  const handleTelemetryUpdate = useCallback((nextTelemetry: RunTelemetry) => {
    setTelemetry(nextTelemetry);
  }, []);

  const handleGameOver = useCallback((finalTelemetry: RunTelemetry) => {
    setTelemetry(finalTelemetry);
    setGameMode('gameover');
    setDockCollapsed(false);
  }, []);

  const handleMissionEvent = useCallback(
    (
      type: 'coins' | 'distance' | 'jumps' | 'rolls' | 'trains_climbed' | 'hoverboard_uses',
      amount: number
    ) => {
      setMissions((prev) =>
        prev.map((m) => {
          if (m.completed || m.type !== type) return m;
          const nextVal = Math.min(m.target, m.current + amount);
          const nowCompleted = nextVal >= m.target;
          if (nowCompleted && !m.completed) {
            const currentBank = Number(localStorage.getItem('dhaka_dash_bank') || '250');
            localStorage.setItem('dhaka_dash_bank', String(currentBank + m.rewardTaka));
          }
          return {
            ...m,
            current: nextVal,
            completed: nowCompleted,
          };
        })
      );
    },
    []
  );

  const activePresetInfo =
    CHARACTER_PRESETS.find((p) => p.id === customization.presetId) ||
    CHARACTER_PRESETS[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090D16] text-slate-100 select-none">
      {/* 3D WebGL Viewport (100% Full-Screen Unobstructed Center) */}
      <DhakaRunnerCanvas
        gameMode={gameMode}
        customization={customization}
        selectedBiome={selectedBiome}
        levelSeed={levelSeed}
        runTriggerId={runTriggerId}
        hoverboardTriggerId={hoverboardTriggerId}
        onTelemetryUpdate={handleTelemetryUpdate}
        onGameOver={handleGameOver}
        onMissionEvent={handleMissionEvent}
      />

      {/* Top Bar Contract: Strictly 3 Zones separated by gap-8 */}
      <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#090D16]/90 border-b border-white/10">
        {/* Zone 1: Single text element brand wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleOpenNavTab('studio');
          }}
          className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Dhaka Dash
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => handleOpenNavTab('run')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'run'
                ? 'text-white border-emerald-400'
                : 'border-transparent hover:text-white'
            }`}
          >
            Run Dashboard
          </button>
          <button
            type="button"
            onClick={() => handleOpenNavTab('studio')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'studio'
                ? 'text-white border-emerald-400'
                : 'border-transparent hover:text-white'
            }`}
          >
            Character Studio
          </button>
          <button
            type="button"
            onClick={() => handleOpenNavTab('world')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'world'
                ? 'text-white border-emerald-400'
                : 'border-transparent hover:text-white'
            }`}
          >
            Biome & Seed
          </button>
          <button
            type="button"
            onClick={() => handleOpenNavTab('missions')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'missions'
                ? 'text-white border-emerald-400'
                : 'border-transparent hover:text-white'
            }`}
          >
            Dhaka Missions
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleStartRun}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#006A4E] hover:bg-[#008260] border border-emerald-400/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {gameMode === 'playing' ? 'Restart Run' : 'Start Dhaka Run'}
          </button>
        </div>
      </header>

      {/* Minimal Top-Center Telemetry Strip During Active Gameplay (Unboxed Metadata with · Separators) */}
      {gameMode === 'playing' && (
        <div className="relative z-10 pointer-events-none flex flex-col items-center pt-3 px-4">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-4 px-5 py-2 rounded-xl bg-[#090D16]/90 border border-white/10 text-xs text-slate-300">
            <span className="font-mono-num text-base font-bold text-white">
              {telemetry.score.toLocaleString()} pts
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num text-amber-400 font-semibold">
              ৳ {telemetry.takaCoins} Taka
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num text-emerald-400 font-semibold">
              {telemetry.multiplier}x Combo
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">
              {telemetry.distanceMeters} m
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">
              {telemetry.speedKmh} km/h
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-200 font-medium">
              {BIOME_LABEL_MAP[telemetry.activeBiome]}
            </span>
          </div>

          {/* Active Power-Up Status Line (Clean unboxed text, zero pills) */}
          {(telemetry.powerUps.chaBoost > 0 ||
            telemetry.powerUps.hoverboard > 0 ||
            telemetry.powerUps.magnet > 0 ||
            telemetry.powerUps.multiplier2x > 0 ||
            telemetry.stumbleWarning > 0.15) && (
            <div className="mt-2 px-4 py-1 rounded-lg bg-[#090D16]/90 border border-white/10 text-xs font-mono-num flex items-center gap-3">
              {telemetry.powerUps.chaBoost > 0 && (
                <span className="text-amber-300 font-semibold">
                  Tong-er Cha Turbo: {telemetry.powerUps.chaBoost.toFixed(1)}s
                </span>
              )}
              {telemetry.powerUps.hoverboard > 0 && (
                <span className="text-cyan-300 font-semibold">
                  Hoverboard Shield: {telemetry.powerUps.hoverboard.toFixed(1)}s
                </span>
              )}
              {telemetry.powerUps.magnet > 0 && (
                <span className="text-rose-400 font-semibold">
                  Chumbok Magnet: {telemetry.powerUps.magnet.toFixed(1)}s
                </span>
              )}
              {telemetry.powerUps.multiplier2x > 0 && (
                <span className="text-yellow-300 font-semibold">
                  2x Boishakhi Star: {telemetry.powerUps.multiplier2x.toFixed(1)}s
                </span>
              )}
              {telemetry.stumbleWarning > 0.15 && (
                <span className="text-red-400 font-semibold">
                  Sergeant Mama Chasing ({Math.round(telemetry.stumbleWarning * 100)}%)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Game Over Summary Overlay */}
      {gameMode === 'gameover' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/65">
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1322] border border-white/15 p-6 shadow-2xl">
            <div className="text-xs text-slate-400 mb-1">
              {BIOME_LABEL_MAP[telemetry.activeBiome]} · Seed {levelSeed}
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-1">
              Run Ended in Dhaka Traffic
            </h2>
            <p className="text-sm text-rose-300 mb-5">
              {telemetry.crashReason || 'Stopped on the highway'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-white/10 mb-5">
              <div>
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="font-mono-num text-xl font-bold text-white">
                  {telemetry.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Best Record</div>
                <div className="font-mono-num text-xl font-bold text-emerald-400">
                  {telemetry.highScore.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Run Taka</div>
                <div className="font-mono-num text-xl font-bold text-amber-400">
                  ৳ {telemetry.takaCoins}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Distance</div>
                <div className="font-mono-num text-xl font-bold text-cyan-300">
                  {telemetry.distanceMeters} m
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleOpenNavTab('studio')}
                className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Customize Runner
              </button>
              <button
                type="button"
                onClick={handleStartRun}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#F42A41] hover:bg-rose-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Run Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-[min(940px,94vw)] transition-transform duration-200"
        style={{
          transform: dockCollapsed
            ? 'translate(-50%, calc(100% - 34px))'
            : 'translate(-50%, 0)',
        }}
      >
        {/* Collapse / Expand Handle Bar */}
        <div className="flex items-center justify-between px-2 mb-1.5">
          <div className="px-3 py-1 rounded-t-lg bg-[#090D16]/90 border border-b-0 border-white/10 text-xs text-slate-400">
            <span>{activePresetInfo.name}</span>
            <span aria-hidden="true"> · </span>
            <span>{activePresetInfo.title}</span>
            <span aria-hidden="true"> · </span>
            <span className="font-mono-num text-amber-400">
              Bank: ৳ {telemetry.totalBankTaka}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMute}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#090D16]/90 border border-white/10 text-xs text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Toggle Tabla & Rickshaw Bell Audio"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'Audio Muted' : 'Tabla & SFX On'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDockCollapsed((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#090D16]/90 border border-white/10 text-xs font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show Controls (H)</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Hide Controls (H)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Dock Surface */}
        <div className="rounded-2xl bg-[#090D16]/95 border border-white/15 p-4 shadow-2xl">
          {/* Segmented Dock Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-white/5">
              {(
                [
                  { id: 'studio', label: 'Character Studio' },
                  { id: 'world', label: 'Biome & Level Seed' },
                  { id: 'missions', label: 'Dhaka Missions' },
                  { id: 'run', label: 'Run Controls' },
                ] as { id: DockTabId; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleOpenNavTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#006A4E] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {gameMode === 'playing' ? (
                <button
                  type="button"
                  onClick={() => setHoverboardTriggerId((p) => p + 1)}
                  disabled={
                    telemetry.hoverboardCharges <= 0 || telemetry.powerUps.hoverboard > 0
                  }
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Summon Hoverboard ({telemetry.hoverboardCharges} left · E / Double-Space)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRandomizeDrip}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Randomize Dhaka Drip</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleStartRun}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#F42A41] hover:bg-rose-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{gameMode === 'playing' ? 'Restart Run' : 'Launch Run'}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: CHARACTER & OUTFIT STUDIO */}
          {activeTab === 'studio' && (
            <div className="space-y-3">
              {/* Sub-category selector + Drag hint */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      { id: 'runner', label: '01. Runner Preset' },
                      { id: 'attire', label: '02. Bangladeshi Attire' },
                      { id: 'colors', label: '03. Color Swatches' },
                      { id: 'gear', label: '04. Head & Back Gear' },
                      { id: 'board', label: '05. Hoverboard Deck' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setStudioCategory(cat.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        studioCategory === cat.id
                          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400">
                  Drag character in 3D viewport to rotate 360° · {activePresetInfo.perkLabel}
                </span>
              </div>

              {/* Category 1: Character Presets */}
              {studioCategory === 'runner' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CHARACTER_PRESETS.map((preset) => {
                    const isSelected = customization.presetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800/90 border-emerald-400'
                            : 'bg-slate-900/70 border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="font-display text-sm font-bold text-white">
                          {preset.name}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {preset.title} · {preset.hometown}
                        </div>
                        <div className="mt-1 text-[11px] text-emerald-400 truncate">
                          {preset.perkLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Category 2: Attire Pattern */}
              {studioCategory === 'attire' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      {
                        id: 'cricket_tiger',
                        name: 'Tiger Cricket #75',
                        desc: 'Bangladesh National Jersey with Bengal stripes',
                      },
                      {
                        id: 'jamdani_royal',
                        name: 'Jamdani Panjabi & Koti',
                        desc: 'Traditional geometric weave with gold buttons',
                      },
                      {
                        id: 'boishakh_festive',
                        name: 'Pohela Boishakh Kurta',
                        desc: 'Festive Alpona spiral motif for Nabobarsho',
                      },
                      {
                        id: 'street_hoodie',
                        name: 'Dhanmondi Cyber Hoodie',
                        desc: 'Reflective chevron zip hoodie for night runs',
                      },
                    ] as { id: OutfitPatternId; name: string; desc: string }[]
                  ).map((pat) => (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() =>
                        setCustomization((prev) => ({ ...prev, outfitPattern: pat.id }))
                      }
                      className={`text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        customization.outfitPattern === pat.id
                          ? 'bg-slate-800/90 border-emerald-400'
                          : 'bg-slate-900/70 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">{pat.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {pat.desc}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Category 3: Primary & Secondary Color Swatches */}
              {studioCategory === 'colors' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1.5">
                      Primary Tunic / Jersey Color
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {COLOR_SWATCHES.map((sw) => (
                        <button
                          key={sw.id}
                          type="button"
                          onClick={() =>
                            setCustomization((prev) => ({ ...prev, primaryColor: sw.hex }))
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            customization.primaryColor === sw.hex
                              ? 'bg-slate-800 border-white text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: sw.hex }}
                          />
                          <span>{sw.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1.5">
                      Secondary Trim & Sneaker Accent
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {COLOR_SWATCHES.map((sw) => (
                        <button
                          key={sw.id}
                          type="button"
                          onClick={() =>
                            setCustomization((prev) => ({
                              ...prev,
                              secondaryColor: sw.hex,
                              shoeColor: sw.hex,
                            }))
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            customization.secondaryColor === sw.hex
                              ? 'bg-slate-800 border-white text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: sw.hex }}
                          />
                          <span>{sw.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Category 4: Headgear & Back Gear */}
              {studioCategory === 'gear' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1.5">Headgear Style</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: 'snapback_cap', label: 'Mirpur Snapback' },
                          { id: 'boishakhi_bandana', label: 'Boishakhi Bandana' },
                          { id: 'cricket_helmet', label: 'Tiger Cricket Helmet' },
                          { id: 'cyber_visor', label: 'Dhaka Neon Visor' },
                          { id: 'none', label: 'No Headgear' },
                        ] as { id: HeadgearId; label: string }[]
                      ).map((hg) => (
                        <button
                          key={hg.id}
                          type="button"
                          onClick={() =>
                            setCustomization((prev) => ({ ...prev, headgear: hg.id }))
                          }
                          className={`px-2.5 py-1 text-xs rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            customization.headgear === hg.id
                              ? 'bg-emerald-950/80 border-emerald-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          {hg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1.5">Back Accessory</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: 'cricket_bat', label: 'Tape-Ball Cricket Bat' },
                          { id: 'rickshaw_shield', label: 'Rickshaw Art Shield' },
                          { id: 'folk_dotara', label: 'Baul Folk Dotara' },
                          { id: 'jet_pack', label: 'Padma Jet Thruster' },
                          { id: 'none', label: 'None' },
                        ] as { id: BackGearId; label: string }[]
                      ).map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() =>
                            setCustomization((prev) => ({ ...prev, backGear: bg.id }))
                          }
                          className={`px-2.5 py-1 text-xs rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            customization.backGear === bg.id
                              ? 'bg-emerald-950/80 border-emerald-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Category 5: Custom Hoverboard Deck */}
              {studioCategory === 'board' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      {
                        id: 'rickshaw_neon',
                        name: 'Neon Rickshaw Board',
                        desc: 'Hand-painted folk lotus art with front brass bell',
                      },
                      {
                        id: 'bengal_tiger',
                        name: 'Royal Bengal Skimmer',
                        desc: 'Sundarbans tiger stripes with dual amber thrusters',
                      },
                      {
                        id: 'padma_gold',
                        name: 'Padma Steel Glider',
                        desc: 'Anodized gold metallic truss deck with cyan jets',
                      },
                      {
                        id: 'ilish_silver',
                        name: 'Silver Ilish Hydro-Deck',
                        desc: 'Mirror-chrome Hilsa finish with magenta plasma cores',
                      },
                    ] as { id: HoverboardId; name: string; desc: string }[]
                  ).map((bd) => (
                    <button
                      key={bd.id}
                      type="button"
                      onClick={() => {
                        setCustomization((prev) => ({ ...prev, hoverboard: bd.id }));
                        soundEngine.playRickshawBell();
                      }}
                      className={`text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        customization.hoverboard === bd.id
                          ? 'bg-slate-800/90 border-emerald-400'
                          : 'bg-slate-900/70 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">{bd.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {bd.desc}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROCEDURAL BIOME & SHAREABLE SEED */}
          {activeTab === 'world' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <div className="text-xs text-slate-400 mb-1.5">
                  Select Bangladesh Procedural Biome
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      {
                        id: 'auto',
                        name: 'All Dhaka Tour',
                        sub: 'Cycles every 380m',
                      },
                      {
                        id: 'mirpur_metro',
                        name: 'Mirpur Metro Rail',
                        sub: 'Viaducts & Krishnachura',
                      },
                      {
                        id: 'puran_dhaka',
                        name: 'Puran Dhaka Bazaar',
                        sub: 'Heritage & Lanterns',
                      },
                      {
                        id: 'padma_bridge',
                        name: 'Padma Expressway',
                        sub: 'Steel Truss & River',
                      },
                    ] as { id: BiomeId; name: string; sub: string }[]
                  ).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBiome(b.id)}
                      className={`text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        selectedBiome === b.id
                          ? 'bg-slate-800 border-emerald-400'
                          : 'bg-slate-900 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">{b.name}</div>
                      <div className="text-[11px] text-slate-400">{b.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="seed-input"
                  className="block text-xs text-slate-400 mb-1.5"
                >
                  Shareable Level Seed (Challenge Friends)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="seed-input"
                    type="text"
                    value={levelSeed}
                    onChange={(e) => setLevelSeed(e.target.value.toUpperCase())}
                    placeholder="DHAKA-2026"
                    className="w-full px-3 py-1.5 text-xs font-mono-num uppercase bg-slate-900 border border-white/15 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const seeds = [
                        'MIRPUR-10',
                        'SHAHBAG-EXPRESS',
                        'PADMA-TURBO',
                        'PURAN-SULTAN',
                        'BOISHAKH-1433',
                      ];
                      setLevelSeed(seeds[Math.floor(Math.random() * seeds.length)]);
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    New Seed
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DAILY DHAKA MISSIONS */}
          {activeTab === 'missions' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {missions.map((m) => {
                const pct = Math.min(100, Math.round((m.current / m.target) * 100));
                return (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl border ${
                      m.completed
                        ? 'bg-emerald-950/40 border-emerald-500/40'
                        : 'bg-slate-900/80 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-medium text-white">
                      <span className="truncate">{m.title}</span>
                      <span className="font-mono-num text-amber-400 shrink-0">
                        +৳{m.rewardTaka}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-transform duration-200 origin-left"
                        style={{ transform: `scaleX(${pct / 100})` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono-num">
                      <span>
                        {Math.floor(m.current)} / {m.target}
                      </span>
                      <span>{m.completed ? 'Completed' : `${pct}%`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: RUN CONTROLS & HOW TO PLAY */}
          {activeTab === 'run' && (
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-slate-400">Switch Lanes: </span>
                  <span className="font-mono-num text-white">A / D or Left / Right Arrows</span>
                </div>
                <span aria-hidden="true">·</span>
                <div>
                  <span className="text-slate-400">Jump / Climb Ramp: </span>
                  <span className="font-mono-num text-white">W / Up / Space</span>
                </div>
                <span aria-hidden="true">·</span>
                <div>
                  <span className="text-slate-400">Parkour Slide: </span>
                  <span className="font-mono-num text-white">S / Down Arrow</span>
                </div>
                <span aria-hidden="true">·</span>
                <div>
                  <span className="text-slate-400">Hoverboard Shield: </span>
                  <span className="font-mono-num text-emerald-400">
                    E or Double-Tap Space
                  </span>
                </div>
              </div>

              <div className="font-mono-num text-slate-400">
                Best Score: <span className="text-white font-semibold">{telemetry.highScore.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
