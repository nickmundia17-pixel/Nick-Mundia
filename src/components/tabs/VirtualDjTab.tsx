import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Disc3,
  ExternalLink,
  Play,
  Square,
  Upload,
  Radio,
  ShieldAlert,
  Download,
  RefreshCw,
  Sliders,
  Volume2,
  Flame,
  Zap,
  RotateCcw,
  Scissors,
  Activity,
  Mic,
  Music2,
} from 'lucide-react';
import {
  getAudioContext,
  renderGrooveBuffer,
  triggerBlobDownload,
} from '../../audio/studioAudio';

interface VirtualDjTabProps {
  userRole?: string;
}

interface DeckState {
  id: 'A' | 'B';
  title: string;
  baseBpm: number;
  camelotKey: string;
  playing: boolean;
  pitchPct: number; // -16 to +16
  lowEq: number; // -24 to +6
  midEq: number;
  highEq: number;
  filterSweep: number; // -1 (LPF) to +1 (HPF)
  echoWet: number; // 0 to 0.7
  flangerWet: number; // 0 to 0.8
  loopBeats: number | null;
  slipMode: boolean;
  reverse: boolean;
  quantize: boolean;
  hotCues: (number | null)[];
  stems: {
    vocals: number;
    drums: number;
    bass: number;
    melody: number;
  };
  buffer: AudioBuffer | null;
  scratching: boolean;
  scratchOffset: number;
}

const VINYL_IMG = '/src/assets/images/dj_deck_vinyl_1794573516670.jpg';

const INITIAL_DECK_A: DeckState = {
  id: 'A',
  title: 'Deck 1 · Afro-Tech Club Anthem',
  baseBpm: 122,
  camelotKey: '8A',
  playing: false,
  pitchPct: 0,
  lowEq: 0,
  midEq: 0,
  highEq: 0,
  filterSweep: 0,
  echoWet: 0,
  flangerWet: 0,
  loopBeats: null,
  slipMode: false,
  reverse: false,
  quantize: true,
  hotCues: [0, 1.5, 3.2, 6.0, null, null, null, null],
  stems: { vocals: 1, drums: 1, bass: 1, melody: 1 },
  buffer: null,
  scratching: false,
  scratchOffset: 0,
};

const INITIAL_DECK_B: DeckState = {
  id: 'B',
  title: 'Deck 2 · Peak Hour Tech-House Roller',
  baseBpm: 126,
  camelotKey: '9A',
  playing: false,
  pitchPct: 0,
  lowEq: 0,
  midEq: 0,
  highEq: 0,
  filterSweep: 0,
  echoWet: 0,
  flangerWet: 0,
  loopBeats: null,
  slipMode: false,
  reverse: false,
  quantize: true,
  hotCues: [0, 2.0, 4.0, 8.0, null, null, null, null],
  stems: { vocals: 1, drums: 1, bass: 1, melody: 1 },
  buffer: null,
  scratching: false,
  scratchOffset: 0,
};

interface DeckAudioNodes {
  source: AudioBufferSourceNode;
  masterGain: GainNode;
  lowFilter: BiquadFilterNode;
  midFilter: BiquadFilterNode;
  highFilter: BiquadFilterNode;
  colorFilter: BiquadFilterNode;
  stemBassGain: GainNode;
  stemMidGain: GainNode;
  stemHighGain: GainNode;
  delayGain: GainNode;
  flangerGain: GainNode;
  startedAt: number;
  startOffset: number;
}

export function VirtualDjTab({ userRole }: VirtualDjTabProps) {
  const [djModeVerified, setDjModeVerified] = useState(userRole === 'dj');
  const [deckA, setDeckA] = useState<DeckState>(INITIAL_DECK_A);
  const [deckB, setDeckB] = useState<DeckState>(INITIAL_DECK_B);
  const [crossfader, setCrossfader] = useState(0.5); // 0 = full A, 1 = full B
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [headphoneVolume, setHeadphoneVolume] = useState(0.7);
  const [cueMix, setCueMix] = useState(0.5); // 0 = cue, 1 = master
  const [recordingMix, setRecordingMix] = useState(false);
  const [recordedMixUrl, setRecordedMixUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [activeFxMode, setActiveFxMode] = useState<'echo' | 'flanger' | 'filter' | 'roll'>('echo');

  const deckNodesRef = useRef<{ A: DeckAudioNodes | null; B: DeckAudioNodes | null }>({
    A: null,
    B: null,
  });
  const masterBusRef = useRef<GainNode | null>(null);
  const mixDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const mixRecorderRef = useRef<MediaRecorder | null>(null);
  const mixChunksRef = useRef<Blob[]>([]);

  // Scratch drag tracking refs
  const scratchRef = useRef<{
    activeDeck: 'A' | 'B' | null;
    startX: number;
    startY: number;
    lastRate: number;
  }>({
    activeDeck: null,
    startX: 0,
    startY: 0,
    lastRate: 1,
  });

  // Preload grooves & initialize audio bus
  useEffect(() => {
    let mounted = true;
    Promise.all([
      renderGrooveBuffer('afro', 122, 6),
      renderGrooveBuffer('house', 126, 6),
    ]).then(([bufA, bufB]) => {
      if (!mounted) return;
      setDeckA((d) => (d.buffer ? d : { ...d, buffer: bufA }));
      setDeckB((d) => (d.buffer ? d : { ...d, buffer: bufB }));
    });
    return () => {
      mounted = false;
      stopDeck('A');
      stopDeck('B');
    };
  }, []);

  const ensureMasterBus = () => {
    const ctx = getAudioContext();
    if (!masterBusRef.current) {
      const bus = ctx.createGain();
      bus.gain.value = masterVolume;
      bus.connect(ctx.destination);
      const dest = ctx.createMediaStreamDestination();
      bus.connect(dest);
      masterBusRef.current = bus;
      mixDestRef.current = dest;
    } else {
      masterBusRef.current.gain.setTargetAtTime(masterVolume, ctx.currentTime, 0.02);
    }
    return { ctx, bus: masterBusRef.current, dest: mixDestRef.current! };
  };

  // Update live DSP parameters when state changes
  useEffect(() => {
    const applyLiveParams = (deck: DeckState, xfGain: number) => {
      const nodes = deckNodesRef.current[deck.id];
      if (!nodes) return;
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const effectiveRate = deck.scratching
        ? 0
        : (1 + deck.pitchPct / 100) * (deck.reverse ? -1 : 1);
      nodes.source.playbackRate.setTargetAtTime(effectiveRate, now, 0.02);
      nodes.masterGain.gain.setTargetAtTime(xfGain * masterVolume, now, 0.02);

      nodes.lowFilter.gain.setTargetAtTime(deck.lowEq, now, 0.02);
      nodes.midFilter.gain.setTargetAtTime(deck.midEq, now, 0.02);
      nodes.highFilter.gain.setTargetAtTime(deck.highEq, now, 0.02);

      // 4-Stem Crossover Gains
      nodes.stemBassGain.gain.setTargetAtTime(deck.stems.bass * 0.95 + deck.stems.drums * 0.35, now, 0.02);
      nodes.stemMidGain.gain.setTargetAtTime(deck.stems.vocals * 0.7 + deck.stems.melody * 0.7, now, 0.02);
      nodes.stemHighGain.gain.setTargetAtTime(deck.stems.drums * 0.7 + deck.stems.vocals * 0.45, now, 0.02);

      nodes.delayGain.gain.setTargetAtTime(deck.echoWet, now, 0.02);
      nodes.flangerGain.gain.setTargetAtTime(deck.flangerWet, now, 0.02);

      if (Math.abs(deck.filterSweep) < 0.05) {
        nodes.colorFilter.type = 'allpass';
      } else if (deck.filterSweep < 0) {
        nodes.colorFilter.type = 'lowpass';
        const freq = 150 + (1 + deck.filterSweep) * 16000;
        nodes.colorFilter.frequency.setTargetAtTime(Math.max(80, freq), now, 0.02);
        nodes.colorFilter.Q.setTargetAtTime(3.0, now, 0.02);
      } else {
        nodes.colorFilter.type = 'highpass';
        const freq = 40 + deck.filterSweep * 5500;
        nodes.colorFilter.frequency.setTargetAtTime(freq, now, 0.02);
        nodes.colorFilter.Q.setTargetAtTime(3.0, now, 0.02);
      }
    };

    const gainA = Math.cos(crossfader * Math.PI * 0.5);
    const gainB = Math.sin(crossfader * Math.PI * 0.5);
    applyLiveParams(deckA, gainA);
    applyLiveParams(deckB, gainB);
  }, [deckA, deckB, crossfader, masterVolume]);

  const stopDeck = (id: 'A' | 'B') => {
    const existing = deckNodesRef.current[id];
    if (existing) {
      try {
        existing.source.stop();
      } catch {
        // ignored
      }
      deckNodesRef.current[id] = null;
    }
    const setter = id === 'A' ? setDeckA : setDeckB;
    setter((d) => ({ ...d, playing: false, scratching: false }));
  };

  const startDeck = (deck: DeckState, offsetSec = 0) => {
    if (!deck.buffer) return;
    stopDeck(deck.id);

    const { ctx, bus } = ensureMasterBus();
    const src = ctx.createBufferSource();
    src.buffer = deck.buffer;
    src.loop = true;
    const effectiveRate = (1 + deck.pitchPct / 100) * (deck.reverse ? -1 : 1);
    src.playbackRate.value = effectiveRate;

    if (deck.loopBeats && deck.loopBeats > 0) {
      const loopDur = (60 / deck.baseBpm) * deck.loopBeats;
      src.loopStart = Math.max(0, offsetSec);
      src.loopEnd = Math.min(deck.buffer.duration, offsetSec + loopDur);
    }

    // 3-Band EQ Filters
    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = 'lowshelf';
    lowFilter.frequency.value = 220;
    lowFilter.gain.value = deck.lowEq;

    const midFilter = ctx.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 1200;
    midFilter.Q.value = 1.2;
    midFilter.gain.value = deck.midEq;

    const highFilter = ctx.createBiquadFilter();
    highFilter.type = 'highshelf';
    highFilter.frequency.value = 4000;
    highFilter.gain.value = deck.highEq;

    const colorFilter = ctx.createBiquadFilter();
    colorFilter.type = 'allpass';

    // 4-Stem Crossover Splitter
    const stemLP = ctx.createBiquadFilter();
    stemLP.type = 'lowpass';
    stemLP.frequency.value = 220;
    const stemBassGain = ctx.createGain();
    stemBassGain.gain.value = deck.stems.bass * 0.95 + deck.stems.drums * 0.35;

    const stemBP = ctx.createBiquadFilter();
    stemBP.type = 'bandpass';
    stemBP.frequency.value = 1250;
    stemBP.Q.value = 0.8;
    const stemMidGain = ctx.createGain();
    stemMidGain.gain.value = deck.stems.vocals * 0.7 + deck.stems.melody * 0.7;

    const stemHP = ctx.createBiquadFilter();
    stemHP.type = 'highpass';
    stemHP.frequency.value = 3500;
    const stemHighGain = ctx.createGain();
    stemHighGain.gain.value = deck.stems.drums * 0.7 + deck.stems.vocals * 0.45;

    const masterGain = ctx.createGain();
    const xfGain = deck.id === 'A' ? Math.cos(crossfader * Math.PI * 0.5) : Math.sin(crossfader * Math.PI * 0.5);
    masterGain.gain.value = xfGain * masterVolume;

    // FX Nodes
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = (60 / deck.baseBpm) * 0.75;
    const delayGain = ctx.createGain();
    delayGain.gain.value = deck.echoWet;

    const flanger = ctx.createDelay(0.05);
    flanger.delayTime.value = 0.005;
    const flangerGain = ctx.createGain();
    flangerGain.gain.value = deck.flangerWet;

    src.connect(lowFilter);
    lowFilter.connect(midFilter);
    midFilter.connect(highFilter);
    highFilter.connect(colorFilter);

    colorFilter.connect(stemLP).connect(stemBassGain).connect(masterGain);
    colorFilter.connect(stemBP).connect(stemMidGain).connect(masterGain);
    colorFilter.connect(stemHP).connect(stemHighGain).connect(masterGain);

    masterGain.connect(bus);
    masterGain.connect(delay).connect(delayGain).connect(bus);
    masterGain.connect(flanger).connect(flangerGain).connect(bus);

    const safeOffset = Math.max(0, offsetSec % Math.max(0.1, deck.buffer.duration));
    src.start(ctx.currentTime, safeOffset);

    deckNodesRef.current[deck.id] = {
      source: src,
      masterGain,
      lowFilter,
      midFilter,
      highFilter,
      colorFilter,
      stemBassGain,
      stemMidGain,
      stemHighGain,
      delayGain,
      flangerGain,
      startedAt: ctx.currentTime,
      startOffset: safeOffset,
    };

    const setter = deck.id === 'A' ? setDeckA : setDeckB;
    setter((d) => ({ ...d, playing: true }));
  };

  // Vinyl Scratching Interactions
  const handleScratchStart = (deckId: 'A' | 'B', e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    scratchRef.current = {
      activeDeck: deckId,
      startX: clientX,
      startY: clientY,
      lastRate: 1,
    };

    const setter = deckId === 'A' ? setDeckA : setDeckB;
    setter((d) => {
      if (!d.playing && d.buffer) {
        startDeck(d, 0);
      }
      return { ...d, scratching: true };
    });
  };

  const handleScratchMove = useCallback((e: MouseEvent | TouchEvent) => {
    const { activeDeck, startX, startY } = scratchRef.current;
    if (!activeDeck) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    const scratchVelocity = (deltaX - deltaY) * 0.08;
    const clampedRate = Math.max(-4, Math.min(4, scratchVelocity));

    const nodes = deckNodesRef.current[activeDeck];
    if (nodes) {
      try {
        nodes.source.playbackRate.value = clampedRate;
      } catch {
        // ignored
      }
    }
  }, []);

  const handleScratchEnd = useCallback(() => {
    const { activeDeck } = scratchRef.current;
    if (!activeDeck) return;
    scratchRef.current.activeDeck = null;

    const setter = activeDeck === 'A' ? setDeckA : setDeckB;
    setter((d) => {
      const nodes = deckNodesRef.current[activeDeck];
      if (nodes) {
        try {
          const normalRate = (1 + d.pitchPct / 100) * (d.reverse ? -1 : 1);
          nodes.source.playbackRate.value = normalRate;
        } catch {
          // ignored
        }
      }
      return { ...d, scratching: false };
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleScratchMove);
    window.addEventListener('mouseup', handleScratchEnd);
    window.addEventListener('touchmove', handleScratchMove);
    window.addEventListener('touchend', handleScratchEnd);
    return () => {
      window.removeEventListener('mousemove', handleScratchMove);
      window.removeEventListener('mouseup', handleScratchEnd);
      window.removeEventListener('touchmove', handleScratchMove);
      window.removeEventListener('touchend', handleScratchEnd);
    };
  }, [handleScratchMove, handleScratchEnd]);

  const handleSyncDeck = (targetId: 'A' | 'B') => {
    const target = targetId === 'A' ? deckA : deckB;
    const source = targetId === 'A' ? deckB : deckA;
    const sourceLiveBpm = source.baseBpm * (1 + source.pitchPct / 100);
    const requiredPitchPct = ((sourceLiveBpm / target.baseBpm) - 1) * 100;
    const clamped = Math.max(-16, Math.min(16, Number(requiredPitchPct.toFixed(1))));
    const setter = targetId === 'A' ? setDeckA : setDeckB;
    setter((d) => ({ ...d, pitchPct: clamped }));
    setStatusMsg(`Deck ${targetId} BPM matched harmonically to ${sourceLiveBpm.toFixed(1)} BPM (${source.camelotKey} -> ${target.camelotKey}).`);
  };

  const handleLoadDeckFile = async (id: 'A' | 'B', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const ctx = getAudioContext();
      const decoded = await ctx.decodeAudioData(ab);
      const setter = id === 'A' ? setDeckA : setDeckB;
      setter((d) => ({
        ...d,
        buffer: decoded,
        title: `Deck ${id === 'A' ? '1' : '2'} · ${file.name.replace(/\.[^/.]+$/, '')}`,
      }));
      setStatusMsg(`Loaded "${file.name}" onto Deck ${id === 'A' ? '1' : '2'}.`);
    } catch {
      setStatusMsg('Could not decode audio file for deck.');
    }
  };

  const handleToggleRecordMix = () => {
    if (recordingMix) {
      mixRecorderRef.current?.stop();
      setRecordingMix(false);
      return;
    }
    const { dest } = ensureMasterBus();
    const rec = new MediaRecorder(dest.stream);
    mixChunksRef.current = [];
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) mixChunksRef.current.push(ev.data);
    };
    rec.onstop = () => {
      const blob = new Blob(mixChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedMixUrl(url);
      triggerBlobDownload(blob, 'sounddeck-dj-live-mix.webm');
      setStatusMsg('Live DJ mix recorded and downloaded successfully.');
    };
    mixRecorderRef.current = rec;
    rec.start();
    setRecordingMix(true);
  };

  if (!djModeVerified) {
    return (
      <div className="rounded-2xl bg-[#13161B] border border-[#232833] p-10 max-w-2xl mx-auto my-12 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.25)]">
          <ShieldAlert className="w-7 h-7 text-amber-400" />
        </div>
        <div className="space-y-3">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
            Pro DJ Console — DJ Booth Access
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
            Experience an authentic physical DJ hardware setup (Pioneer CDJ / DJM controller layout) complete with vinyl scratching, 4-stem isolation, Camelot harmonic sync, and real-time FX.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setDjModeVerified(true)}
            className="px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all shadow-lg hover:shadow-amber-500/20"
          >
            Enter Physical DJ Booth
          </button>
          <a
            href="https://www.virtualdj.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl bg-[#1B2028] hover:bg-[#252B36] text-slate-200 text-sm font-medium border border-[#2A313E] inline-flex items-center gap-2 transition-colors"
          >
            <span>VirtualDJ Official</span>
            <ExternalLink className="w-4 h-4 text-amber-400" />
          </a>
        </div>
      </div>
    );
  }

  const renderDeckHardware = (deck: DeckState, setDeck: React.Dispatch<React.SetStateAction<DeckState>>) => {
    const liveBpm = (deck.baseBpm * (1 + deck.pitchPct / 100)).toFixed(1);

    return (
      <div className="rounded-2xl bg-[#0f131a] border border-[#222834] p-5 space-y-5 shadow-xl relative overflow-hidden">
        {/* Deck Header & Jog Display */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">
                DECK {deck.id === 'A' ? '1' : '2'}
              </span>
              <span className="text-xs font-mono text-amber-400 tabular-nums font-semibold">
                {liveBpm} BPM · KEY {deck.camelotKey}
              </span>
            </div>
            <h3 className="font-display text-base font-semibold text-slate-100 truncate mt-1">
              {deck.title}
            </h3>
          </div>
          <label className="px-3 py-1.5 rounded-lg bg-[#141820] hover:bg-[#1e2330] text-slate-200 text-xs border border-[#293040] flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Load</span>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => handleLoadDeckFile(deck.id, e)}
              className="hidden"
            />
          </label>
        </div>

        {/* CDJ Touchscreen Waveform Display */}
        <div className="h-16 rounded-xl bg-[#080a0f] border border-[#1b2230] p-2.5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
          <div className="flex items-center gap-2 z-10">
            <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-mono text-[11px] text-slate-300 tabular-nums">
              {deck.playing ? (deck.scratching ? 'SCRATCHING...' : 'PLAYING') : 'READY / CUE'}
            </span>
          </div>
          <div className="flex items-center gap-3 z-10 text-[11px] font-mono text-slate-400">
            <span className="text-amber-400">SYNC: ON</span>
            <span className="text-cyan-400">QUANTIZE: {deck.quantize ? '1/2 BEAT' : 'OFF'}</span>
          </div>
        </div>

        {/* Jog Wheel Platter with Scratch Physics */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div
            onMouseDown={(e) => handleScratchStart(deck.id, e)}
            onTouchStart={(e) => handleScratchStart(deck.id, e)}
            title="Click and drag / swipe to scratch vinyl"
            className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-[#181d28] shadow-2xl shrink-0 bg-[#080a0f] cursor-grab active:cursor-grabbing group select-none"
          >
            <img
              src={VINYL_IMG}
              alt={`Deck ${deck.id} vinyl platter`}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover pointer-events-none transition-transform ${
                deck.playing ? (deck.scratching ? 'scale-105' : 'animate-vinyl') : 'animate-vinyl-paused'
              }`}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Center Jog Ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-[#0a0d14] border-2 border-amber-500/70 flex items-center justify-center shadow-lg">
                <Disc3 className="w-6 h-6 text-amber-400 animate-spin-slow" />
              </div>
            </div>
            <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-black/70 px-2 py-1 rounded">
                SCRATCH
              </span>
            </div>
          </div>

          {/* Transport & Performance Buttons */}
          <div className="flex-1 w-full space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => (deck.playing ? stopDeck(deck.id) : startDeck(deck, 0))}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  deck.playing
                    ? 'bg-red-500/20 text-red-200 border border-red-500/50 hover:bg-red-500/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {deck.playing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{deck.playing ? 'PAUSE / STOP' : 'PLAY / PAUSE'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSyncDeck(deck.id)}
                className="px-3.5 py-2.5 rounded-xl bg-[#141820] hover:bg-[#1e2330] text-amber-400 text-xs font-semibold border border-[#293040] flex items-center gap-1.5 shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>BEAT SYNC</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextRev = !deck.reverse;
                  const updated = { ...deck, reverse: nextRev };
                  setDeck(updated);
                  if (deck.playing) startDeck(updated, 0);
                }}
                className={`px-3 py-2.5 rounded-xl text-xs font-mono font-semibold border transition-colors ${
                  deck.reverse
                    ? 'bg-red-500/25 border-red-500 text-red-200'
                    : 'bg-[#141820] border-[#293040] text-slate-300 hover:text-white'
                }`}
                title="Reverse playback direction"
              >
                REV
              </button>

              <button
                type="button"
                onClick={() => setDeck((d) => ({ ...d, quantize: !d.quantize }))}
                className={`px-3 py-2.5 rounded-xl text-xs font-mono font-semibold border transition-colors ${
                  deck.quantize
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                    : 'bg-[#141820] border-[#293040] text-slate-400'
                }`}
                title="Toggle Beat Quantize"
              >
                Q
              </button>
            </div>

            {/* Loop Beats Selector */}
            <div className="flex items-center gap-1.5 bg-[#0a0d14] p-1.5 rounded-xl border border-[#1d2432]">
              <span className="text-[11px] font-mono text-slate-400 px-2">LOOP:</span>
              {[1, 2, 4, 8, 16].map((beats) => (
                <button
                  key={beats}
                  type="button"
                  onClick={() => {
                    const nextLoop = deck.loopBeats === beats ? null : beats;
                    const updated = { ...deck, loopBeats: nextLoop };
                    setDeck(updated);
                    if (deck.playing) startDeck(updated, 0);
                  }}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                    deck.loopBeats === beats
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow'
                      : 'bg-[#141820] text-slate-300 border-[#293040] hover:bg-[#1e2330]'
                  }`}
                >
                  {beats}B
                </button>
              ))}
            </div>

            {/* Pitch / Tempo Fader */}
            <div className="flex items-center gap-3 text-xs bg-[#0a0d14] p-2 rounded-xl border border-[#1d2432]">
              <span className="text-slate-400 font-mono w-12 text-[11px]">TEMPO</span>
              <input
                type="range"
                min={-16}
                max={16}
                step={0.2}
                value={deck.pitchPct}
                onChange={(e) => setDeck((d) => ({ ...d, pitchPct: Number(e.target.value) }))}
                className="studio-slider flex-1"
              />
              <span className="font-mono text-amber-400 w-14 text-right tabular-nums text-xs">
                {deck.pitchPct > 0 ? `+${deck.pitchPct}` : deck.pitchPct}%
              </span>
            </div>
          </div>
        </div>

        {/* 4-Stem Isolation Section */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1b2230] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time 4-Stem Isolation (VDJ 2.0)</span>
            </span>
            <button
              type="button"
              onClick={() =>
                setDeck((d) => ({
                  ...d,
                  stems: { vocals: 1, drums: 1, bass: 1, melody: 1 },
                }))
              }
              className="text-[11px] text-amber-400 hover:underline"
            >
              Reset Stems
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['vocals', 'drums', 'bass', 'melody'] as const).map((stemKey) => (
              <div key={stemKey} className="space-y-1 bg-[#10141e] p-2 rounded-lg border border-[#1f2738]">
                <div className="flex items-center justify-between text-[11px] capitalize">
                  <span className="text-slate-300 font-medium">{stemKey}</span>
                  <span className="font-mono text-amber-400 tabular-nums">
                    {Math.round(deck.stems[stemKey] * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={deck.stems[stemKey]}
                  onChange={(e) =>
                    setDeck((d) => ({
                      ...d,
                      stems: { ...d.stems, [stemKey]: Number(e.target.value) },
                    }))
                  }
                  className="studio-slider w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 3-Band Kill EQ & 8 Hot Cue Pads */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-1">
          <div className="sm:col-span-5 space-y-2.5 bg-[#0a0d14] p-3 rounded-xl border border-[#1d2432]">
            <div className="text-[11px] font-mono text-slate-400 font-semibold mb-1">3-BAND EQ &amp; KILL</div>
            {(
              [
                { key: 'highEq', label: 'HIGH' },
                { key: 'midEq', label: 'MID' },
                { key: 'lowEq', label: 'LOW' },
              ] as const
            ).map((band) => (
              <div key={band.key} className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    setDeck((d) => ({
                      ...d,
                      [band.key]: d[band.key] <= -20 ? 0 : -24,
                    }))
                  }
                  className={`w-12 py-1 rounded font-mono font-bold border transition-colors ${
                    deck[band.key] <= -20
                      ? 'bg-red-500/25 border-red-500 text-red-300'
                      : 'bg-[#141820] border-[#293040] text-slate-400 hover:text-white'
                  }`}
                  title={`Kill ${band.label}`}
                >
                  {band.label}
                </button>
                <input
                  type="range"
                  min={-24}
                  max={6}
                  step={1}
                  value={deck[band.key]}
                  onChange={(e) => setDeck((d) => ({ ...d, [band.key]: Number(e.target.value) }))}
                  className="studio-slider flex-1"
                />
              </div>
            ))}
          </div>

          <div className="sm:col-span-7 grid grid-cols-4 gap-1.5 bg-[#0a0d14] p-3 rounded-xl border border-[#1d2432]">
            <div className="col-span-4 text-[11px] font-mono text-slate-400 font-semibold mb-1">HOT CUE PADS (1-8)</div>
            {deck.hotCues.map((cueTime, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (cueTime !== null) {
                    startDeck(deck, cueTime);
                  } else {
                    const nextCues = [...deck.hotCues];
                    nextCues[idx] = Number(((idx * 1.2) % Math.max(1, deck.buffer?.duration || 6)).toFixed(2));
                    setDeck((d) => ({ ...d, hotCues: nextCues }));
                  }
                }}
                className={`py-2 px-1 rounded-lg text-[11px] font-mono border font-bold transition-all ${
                  cueTime !== null
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30 shadow'
                    : 'bg-[#141820] border-[#293040] text-slate-500 hover:text-slate-300'
                }`}
              >
                {cueTime !== null ? `CUE ${idx + 1}` : `SET ${idx + 1}`}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#232833] pb-5">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-2.5">
            <Disc3 className="w-7 h-7 text-amber-400 animate-spin-slow" />
            <span>Virtual DJ Pro Physical Hardware Console</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Pro dual-deck controller featuring real vinyl scratch physics, 4-stem real-time separation, Camelot harmonic key sync, Color/Beat FX, and live mix recording.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://www.virtualdj.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-[#1B2028] hover:bg-[#252B36] text-amber-400 text-xs font-semibold border border-amber-500/30 flex items-center gap-1.5 transition-colors shadow"
          >
            <span>VirtualDJ.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://www.virtualdj.com/products/virtualdj/stems.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-[#13161B] hover:bg-[#1b2028] text-slate-200 text-xs font-medium border border-[#232833] flex items-center gap-1.5 transition-colors shadow"
          >
            <span>VDJ Stems 2.0</span>
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          </a>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-[#13161B] border border-amber-500/40 text-xs text-amber-200 shadow flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Main DJ Console Chassis */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Deck 1 */}
        <div className="xl:col-span-5">
          {renderDeckHardware(deckA, setDeckA)}
        </div>

        {/* Central DJM Mixer Console */}
        <div className="xl:col-span-2 rounded-2xl bg-[#0f131a] border border-[#222834] p-4 space-y-5 shadow-2xl flex flex-col justify-between">
          <div className="space-y-3 text-center">
            <div className="text-[11px] font-mono font-bold tracking-wider text-amber-400">DJM MASTER MIXER</div>
            
            {/* Master Volume */}
            <div className="space-y-1 bg-[#0a0d14] p-3 rounded-xl border border-[#1d2432]">
              <div className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
                <span>MASTER</span>
                <span className="text-amber-400">{Math.round(masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.05}
                value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                className="studio-slider w-full"
              />
            </div>

            {/* Color FX & Beat FX Selector */}
            <div className="space-y-2 bg-[#0a0d14] p-3 rounded-xl border border-[#1d2432] text-left">
              <div className="text-[10px] font-mono text-slate-400 font-semibold">BEAT FX ENGINE</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['echo', 'flanger', 'filter', 'roll'] as const).map((fx) => (
                  <button
                    key={fx}
                    type="button"
                    onClick={() => setActiveFxMode(fx)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-mono uppercase border font-bold transition-all ${
                      activeFxMode === fx
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                        : 'bg-[#141820] text-slate-300 border-[#293040] hover:bg-[#1e2330]'
                    }`}
                  >
                    {fx}
                  </button>
                ))}
              </div>
            </div>

            {/* Deck 1 & Deck 2 Filter Sweeps */}
            <div className="space-y-2.5 bg-[#0a0d14] p-3 rounded-xl border border-[#1d2432] text-left">
              <div className="text-[10px] font-mono text-slate-400 font-semibold">COLOR FX (SWEEP)</div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400">Deck 1 Filter</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={deckA.filterSweep}
                  onChange={(e) => setDeckA((d) => ({ ...d, filterSweep: Number(e.target.value) }))}
                  className="studio-slider w-full"
                />
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-slate-400">Deck 2 Filter</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={deckB.filterSweep}
                  onChange={(e) => setDeckB((d) => ({ ...d, filterSweep: Number(e.target.value) }))}
                  className="studio-slider w-full"
                />
              </div>
            </div>
          </div>

          {/* Master Crossfader with Reactive Signal Animation */}
          <div className="space-y-3 bg-[#0a0d14] p-4 rounded-xl border border-[#1d2432] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
            <div className="flex items-center justify-between text-[11px] font-mono font-bold z-10 relative">
              <span className="text-amber-400 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${deckA.playing ? 'bg-amber-400 animate-ping' : 'bg-amber-600'}`} />
                DECK 1 ({Math.round(Math.cos(crossfader * Math.PI * 0.5) * 100)}%)
              </span>
              <span className="text-slate-300">CROSSFADER</span>
              <span className="text-cyan-400 flex items-center gap-1">
                DECK 2 ({Math.round(Math.sin(crossfader * Math.PI * 0.5) * 100)}%)
                <span className={`w-2 h-2 rounded-full ${deckB.playing ? 'bg-cyan-400 animate-ping' : 'bg-cyan-600'}`} />
              </span>
            </div>

            {/* Reactive Signal Balance Bar */}
            <div className="h-2 rounded-full bg-[#141820] overflow-hidden flex relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-75 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                style={{ width: `${(1 - crossfader) * 100}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-75 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                style={{ width: `${crossfader * 100}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_12px_#fff] transition-all duration-75 -translate-x-1/2"
                style={{ left: `${crossfader * 100}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.005}
              value={crossfader}
              onChange={(e) => setCrossfader(Number(e.target.value))}
              className="studio-slider w-full cursor-pointer"
            />
          </div>

          {/* Live DJ Set Recording */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleToggleRecordMix}
              className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                recordingMix
                  ? 'bg-red-500/25 text-red-200 border border-red-500 animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>{recordingMix ? 'STOP & SAVE MIX' : 'RECORD LIVE DJ MIX'}</span>
            </button>

            {recordedMixUrl && (
              <a
                href={recordedMixUrl}
                download="sounddeck-dj-live-mix.webm"
                className="w-full py-2.5 rounded-xl bg-[#141820] text-slate-100 text-xs font-medium border border-[#293040] flex items-center justify-center gap-1.5 transition-colors shadow"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Download Mix File</span>
              </a>
            )}
          </div>
        </div>

        {/* Deck 2 */}
        <div className="xl:col-span-5">
          {renderDeckHardware(deckB, setDeckB)}
        </div>
      </div>
    </div>
  );
}
