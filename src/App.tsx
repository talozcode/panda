import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type PandaAction = 'wiggle' | 'jump' | 'spin' | 'roll' | 'blink-fast' | 'surprised' | 'heart' | 'split';

type Panda = {
  id: number;
  x: number;
  y: number;
  size: number;
  depth: number;
  rotation: number;
  drift: number;
  sway: number;
  blinkDelay: number;
  giant?: boolean;
  mini?: boolean;
  action?: PandaAction;
  actionUntil?: number;
};

const INITIAL_PANDA_COUNT = 18;
const MAX_PANDAS = 160;
const LONG_PRESS_MS = 450;
const DOUBLE_TAP_MS = 320;

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
const chooseAction = (): PandaAction => {
  const actions: PandaAction[] = ['wiggle', 'jump', 'spin', 'roll', 'blink-fast', 'surprised', 'heart', 'split'];
  return actions[Math.floor(Math.random() * actions.length)];
};

const newPanda = (id: number, opts: Partial<Panda> = {}): Panda => ({
  id,
  x: opts.x ?? randomBetween(-8, 92),
  y: opts.y ?? randomBetween(-12, 94),
  size: opts.size ?? randomBetween(58, 128),
  depth: opts.depth ?? randomBetween(0, 1),
  rotation: opts.rotation ?? randomBetween(-14, 14),
  drift: opts.drift ?? randomBetween(3.2, 7.2),
  sway: opts.sway ?? randomBetween(2.8, 6.4),
  blinkDelay: opts.blinkDelay ?? randomBetween(0, 4),
  giant: opts.giant,
  mini: opts.mini,
  action: opts.action,
  actionUntil: opts.actionUntil
});

export default function App() {
  const [pandas, setPandas] = useState<Panda[]>([]);
  const [burstAt, setBurstAt] = useState(0);
  const [maxMode, setMaxMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const idRef = useRef(1);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPandaTapRef = useRef<{ id: number; at: number } | null>(null);
  const [glowingPandas, setGlowingPandas] = useState<Set<number>>(new Set());

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      audioContextRef.current = new AudioCtx();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, durationMs: number, wave: OscillatorType, gainLevel: number, startAt: number) => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainLevel, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationMs / 1000);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + durationMs / 1000 + 0.02);
  }, [getAudioContext]);

  const playPandaSound = useCallback((kind: 'cute' | 'ouch') => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    const playNow = () => {
      const now = audioContext.currentTime + 0.01;
      if (kind === 'cute') {
        playTone(820, 90, 'triangle', 0.12, now);
        playTone(1080, 130, 'sine', 0.1, now + 0.1);
        return;
      }

      playTone(300, 130, 'square', 0.11, now);
      playTone(210, 190, 'sawtooth', 0.1, now + 0.09);
    };

    if (audioContext.state === 'suspended') {
      void audioContext.resume().then(playNow).catch(playNow);
      return;
    }

    playNow();
  }, [getAudioContext, playTone]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener('change', sync);

    setPandas(Array.from({ length: INITIAL_PANDA_COUNT }, () => newPanda(idRef.current++)));

    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => () => {
    if (audioContextRef.current) {
      void audioContextRef.current.close();
    }
  }, []);

  useEffect(() => {
    if (!maxMode) return;
    const timer = window.setTimeout(() => setMaxMode(false), 2600);
    return () => window.clearTimeout(timer);
  }, [maxMode]);

  const addPandas = useCallback((count: number, anchor?: { x: number; y: number }, forceGiant = false) => {
    setPandas((prev) => {
      const next = [...prev];
      for (let i = 0; i < count; i += 1) {
        const giant = forceGiant && i === 0;
        const panda = newPanda(idRef.current++, {
          x: anchor ? anchor.x + randomBetween(-8, 8) : undefined,
          y: anchor ? anchor.y + randomBetween(-8, 8) : undefined,
          size: giant ? randomBetween(180, 240) : undefined,
          giant,
          depth: giant ? 1 : undefined,
          drift: giant ? randomBetween(1.8, 3.8) : undefined,
          sway: giant ? randomBetween(1.8, 3.6) : undefined
        });
        next.push(panda);
      }
      return next.slice(-MAX_PANDAS);
    });
    setBurstAt(Date.now());
  }, []);

  const triggerMaximumMode = useCallback(() => {
    setMaxMode(true);
    addPandas(16);
  }, [addPandas]);

  const onMorePandas = useCallback(() => {
    const addCount = Math.round(randomBetween(4, 9));
    addPandas(addCount);
    setTapCount((prev) => {
      const next = prev + 1;
      if (next > 0 && next % 7 === 0) triggerMaximumMode();
      return next;
    });
  }, [addPandas, triggerMaximumMode]);

  const applyAction = useCallback((id: number, action: PandaAction) => {
    const until = Date.now() + 900;
    setPandas((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, action, actionUntil: until } : p));
      if (action !== 'split') return updated;
      const target = updated.find((p) => p.id === id);
      if (!target) return updated;
      const miniA = newPanda(idRef.current++, {
        x: target.x + randomBetween(-4, 4),
        y: target.y + randomBetween(-4, 4),
        size: Math.max(34, target.size * 0.55),
        mini: true
      });
      const miniB = newPanda(idRef.current++, {
        x: target.x + randomBetween(-4, 4),
        y: target.y + randomBetween(-4, 4),
        size: Math.max(34, target.size * 0.55),
        mini: true
      });
      return [...updated, miniA, miniB].slice(-MAX_PANDAS);
    });
    window.setTimeout(() => {
      setPandas((prev) => prev.map((p) => (p.id === id && p.actionUntil === until ? { ...p, action: undefined, actionUntil: undefined } : p)));
    }, 950);
  }, []);

  const triggerGlow = useCallback((id: number) => {
    setGlowingPandas((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    window.setTimeout(() => {
      setGlowingPandas((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1000);
  }, []);

  const onSceneTap = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('.panda') || target.closest('.more-btn')) return;
    const { clientX, clientY, currentTarget } = event;
    const rect = currentTarget.getBoundingClientRect();
    addPandas(1, {
      x: (clientX - rect.left) / rect.width * 100,
      y: (clientY - rect.top) / rect.height * 100
    });
  }, [addPandas]);

  const startPress = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('.more-btn')) return;
    const { clientX, clientY, currentTarget } = event;
    const rect = currentTarget.getBoundingClientRect();
    const anchor = { x: (clientX - rect.left) / rect.width * 100, y: (clientY - rect.top) / rect.height * 100 };
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => addPandas(1, anchor, true), LONG_PRESS_MS);
  }, [addPandas]);

  const stopPress = useCallback(() => {
    if (!pressTimer.current) return;
    window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }, []);

  const sparkles = useMemo(() => Array.from({ length: 22 }, (_, i) => i), []);

  return (
    <main className={`scene ${maxMode ? 'max-mode' : ''} ${reducedMotion ? 'reduced-motion' : ''}`} onPointerDown={startPress} onPointerUp={stopPress} onPointerCancel={stopPress} onPointerMove={stopPress} onClick={onSceneTap}>
      <div className="bg-aurora" aria-hidden />
      <div className="cloud cloud-a" aria-hidden />
      <div className="cloud cloud-b" aria-hidden />

      {sparkles.map((sparkle) => (
        <span key={sparkle} className="sparkle" style={{ ['--i' as string]: sparkle }} aria-hidden />
      ))}

      {pandas.map((panda) => (
        <button
          key={panda.id}
          className={`panda ${panda.giant ? 'giant' : ''} ${panda.mini ? 'mini' : ''} ${panda.action ? `act-${panda.action}` : ''} ${glowingPandas.has(panda.id) ? 'glow' : ''}`}
          style={{
            left: `${panda.x}%`,
            top: `${panda.y}%`,
            width: `${panda.size}px`,
            height: `${panda.size * 0.94}px`,
            zIndex: panda.giant ? 40 : Math.round(panda.depth * 30),
            transform: `rotate(${panda.rotation}deg)`,
            ['--drift' as string]: `${panda.drift}s`,
            ['--sway' as string]: `${panda.sway}s`,
            ['--blink-delay' as string]: `${panda.blinkDelay}s`
          }}
          onClick={(event) => {
            event.stopPropagation();
            const now = Date.now();
            const lastTap = lastPandaTapRef.current;
            const isDoubleTap = lastTap?.id === panda.id && now - lastTap.at <= DOUBLE_TAP_MS;
            playPandaSound(isDoubleTap ? 'ouch' : 'cute');
            lastPandaTapRef.current = { id: panda.id, at: now };
            triggerGlow(panda.id);
            applyAction(panda.id, chooseAction());
          }}
          aria-label="Panda friend"
          type="button"
        >
          <span className="panda-body" />
          <span className="panda-eye left" />
          <span className="panda-eye right" />
          <span className="panda-ear left" />
          <span className="panda-ear right" />
          <span className="panda-nose" />
          <span className="heart" aria-hidden>💗</span>
        </button>
      ))}

      <button type="button" className={`more-btn ${burstAt > Date.now() - 300 ? 'bursting' : ''}`} onClick={(event) => {
        event.stopPropagation();
        onMorePandas();
      }}>
        More Pandas
      </button>
    </main>
  );
}
