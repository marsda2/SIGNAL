import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

import type { PipState } from '@/lib/agent/contracts';
import { colors } from '@/constants/tokens';

const LABEL: Record<PipState, string> = {
  idle: 'Ready to help',
  listening: 'Listening',
  thinking: 'Checking…',
  helping: 'Helping',
  solved: 'Solved',
  escalating: 'Getting this reported',
};

type Mouth = 'soft' | 'small' | 'grin';

/**
 * Face data per state (docs/05 "MVP-friendly option"): eye openness 0–1, gaze offset (-1..1, shifts the whole eye),
 * mouth shape. Pip always smiles; the state shows in the eyes, the gaze and the motion. No pupils, no video/Lottie
 * assets, no AGPL code — original Views + Animated, works on web and native.
 */
const POSE: Record<PipState, { open: number; px: number; py: number; mouth: Mouth }> = {
  idle: { open: 0.92, px: 0, py: 0, mouth: 'soft' },
  listening: { open: 1, px: 0, py: 0, mouth: 'soft' },
  thinking: { open: 0.8, px: 0, py: -0.7, mouth: 'small' },
  helping: { open: 0.92, px: 0, py: 0.6, mouth: 'soft' },
  solved: { open: 0.2, px: 0, py: 0, mouth: 'grin' },
  escalating: { open: 0.72, px: 0, py: 0, mouth: 'small' },
};

/**
 * How much of the `roam` range each state may use. Roaming is subtle and only while Pip has nothing urgent to say:
 * wanders when idle, drifts a little while checking/helping, and eases back to its spot for listening / solved / escalating.
 */
const ROAM_FACTOR: Record<PipState, number> = {
  idle: 1,
  helping: 0.5,
  thinking: 0.3,
  listening: 0,
  solved: 0,
  escalating: 0,
};

const useNative = Platform.OS !== 'web';
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(v)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/**
 * Pip: capsule body, oversized plain eyes, small smile, signal spark.
 * Ambient: float (3px), random blink, gaze darting while thinking, spark pulse, hop when solved.
 * Roaming (`roam` = max drift in px from home): continuous, inertial wander (see the roam effect) with a lean into
 * the direction of travel. Honours reduce-motion (static pose, no loops). State is never conveyed by the face
 * alone — the label always renders.
 */
export function Pip({ state = 'idle', size = 72, roam }: { state?: PipState; size?: number; roam?: { x: number; y: number } }) {
  const reduced = useReducedMotion();
  const pose = POSE[state];
  const roamAmountRef = useRef(ROAM_FACTOR[state]);
  roamAmountRef.current = ROAM_FACTOR[state];

  const rx = useRef(new Animated.Value(0)).current;
  const ry = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const look = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const open = useRef(new Animated.Value(pose.open)).current;
  const px = useRef(new Animated.Value(pose.px)).current;
  const py = useRef(new Animated.Value(pose.py)).current;
  const dart = useRef(new Animated.Value(0)).current;
  const spark = useRef(new Animated.Value(1)).current;
  const phases = useRef(Array.from({ length: 4 }, () => Math.random() * Math.PI * 2)).current;

  const eyeW = size * 0.24;
  const eyeH = size * 0.38;
  const gaze = size * 0.05; // px the eyes shift for a full gaze offset

  // Expression transition (also the reduced-motion static pose: duration 0).
  useEffect(() => {
    const d = reduced ? 0 : 260;
    const t = (v: Animated.Value, to: number) =>
      Animated.timing(v, { toValue: to, duration: d, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: useNative });
    Animated.parallel([t(open, pose.open), t(px, pose.px), t(py, pose.py)]).start();
  }, [state, reduced, pose.open, pose.px, pose.py, open, px, py]);

  // Float loop.
  useEffect(() => {
    if (reduced) {
      float.setValue(0);
      return;
    }
    const speed = state === 'escalating' ? 900 : 1700;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
        Animated.timing(float, { toValue: 0, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, reduced, state]);

  // Random blink every 2.5–5s; ~1 in 5 is a quick double-blink. Skipped when eyes are already closed/happy.
  useEffect(() => {
    if (reduced || state === 'solved') return;
    let timer: ReturnType<typeof setTimeout>;
    const once = () =>
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.08, duration: 80, useNativeDriver: useNative }),
        Animated.timing(blink, { toValue: 1, duration: 130, useNativeDriver: useNative }),
      ]);
    const schedule = () => {
      timer = setTimeout(() => {
        (Math.random() < 0.2 ? Animated.sequence([once(), Animated.delay(120), once()]) : once()).start(schedule);
      }, 2500 + Math.random() * 2500);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [blink, reduced, state]);

  // Thinking: eyes dart side to side; spark pulses while thinking/listening.
  useEffect(() => {
    dart.setValue(0);
    if (reduced || state !== 'thinking') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dart, { toValue: 0.8, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: useNative }),
        Animated.delay(260),
        Animated.timing(dart, { toValue: -0.8, duration: 560, easing: Easing.inOut(Easing.ease), useNativeDriver: useNative }),
        Animated.delay(260),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dart, reduced, state]);

  useEffect(() => {
    spark.setValue(1);
    if (reduced || (state !== 'thinking' && state !== 'listening')) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spark, { toValue: 1.7, duration: 500, useNativeDriver: useNative }),
        Animated.timing(spark, { toValue: 1, duration: 500, useNativeDriver: useNative }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [spark, reduced, state]);

  // Solved: one-shot celebratory hop.
  useEffect(() => {
    if (reduced || state !== 'solved') return;
    Animated.sequence([
      Animated.timing(hop, { toValue: -size * 0.16, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: useNative }),
      Animated.spring(hop, { toValue: 0, friction: 4, tension: 160, useNativeDriver: useNative }),
    ]).start();
  }, [hop, reduced, state, size]);

  /**
   * Roam. A drifting target is built from two slow sine waves per axis with unrelated periods, so the path never
   * repeats or turns sharply; Pip chases the target with exponential smoothing (inertia), so it accelerates and
   * eases like something with weight. It leans into the direction of travel, and its eyes glance ahead. The roam
   * amount itself is smoothed, so a state change eases Pip in or back to its spot instead of snapping.
   */
  useEffect(() => {
    if (!roam || reduced) {
      Animated.parallel(
        [rx, ry, tilt, look].map((v) => Animated.timing(v, { toValue: 0, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: useNative })),
      ).start();
      return;
    }
    let raf = 0;
    let last = Date.now();
    let t = 0;
    let amount = 0;
    let x = 0;
    let y = 0;
    let lean = 0;
    let glance = 0;
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (dt > 0) {
        t += dt;
        amount += (roamAmountRef.current - amount) * (1 - Math.exp(-dt * 1.2));
        const tx = amount * roam.x * (0.62 * Math.sin(0.17 * t + phases[0]) + 0.38 * Math.sin(0.43 * t + phases[1]));
        const ty = amount * roam.y * (0.62 * Math.sin(0.26 * t + phases[2]) + 0.38 * Math.sin(0.57 * t + phases[3]));
        const k = 1 - Math.exp(-dt * 1.8);
        const nx = x + (tx - x) * k;
        const ny = y + (ty - y) * k;
        const vx = (nx - x) / dt;
        x = nx;
        y = ny;
        lean += (clamp(vx / 45, -1, 1) - lean) * (1 - Math.exp(-dt * 3));
        glance += (clamp(vx / 30, -1, 1) * 0.7 - glance) * (1 - Math.exp(-dt * 4));
        rx.setValue(x);
        ry.setValue(y);
        tilt.setValue(lean);
        look.setValue(glance);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [roam, reduced, rx, ry, tilt, look, phases]);

  const eyeScale = Animated.multiply(open, blink);
  const eyesX = Animated.multiply(Animated.add(Animated.add(px, dart), look), gaze);
  const eyesY = Animated.multiply(py, gaze);
  const bodyY = Animated.add(float.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }), hop);

  const eye = (
    <Animated.View style={[styles.eye, { width: eyeW, height: eyeH, borderRadius: eyeW / 2, transform: [{ scaleY: eyeScale }] }]} />
  );

  const stroke = Math.max(2, size * 0.04);
  const mouthW = size * (pose.mouth === 'grin' ? 0.34 : pose.mouth === 'small' ? 0.16 : 0.24);
  const mouth = (
    <View
      style={{
        width: mouthW,
        height: mouthW / 2,
        borderBottomLeftRadius: mouthW,
        borderBottomRightRadius: mouthW,
        borderBottomWidth: stroke,
        borderLeftWidth: stroke,
        borderRightWidth: stroke,
        borderColor: colors.surface,
        opacity: 0.92,
      }}
    />
  );

  return (
    <Animated.View
      style={[
        styles.wrap,
        { transform: [{ translateX: rx }, { translateY: ry }, { rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] }) }] },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Pip, ${LABEL[state]}`}>
      <Animated.View
        style={[styles.body, { width: size, height: size * 1.1, borderRadius: size / 2, transform: [{ translateY: bodyY }] }]}>
        <Animated.View style={[styles.eyes, { gap: size * 0.12, transform: [{ translateX: eyesX }, { translateY: eyesY }] }]}>
          {eye}
          {eye}
        </Animated.View>
        <View style={{ marginTop: size * 0.1, height: size * 0.18, justifyContent: 'center' }}>{mouth}</View>
        <Animated.View style={[styles.spark, { top: size * 0.12, right: size * 0.16, transform: [{ scale: spark }] }]} />
      </Animated.View>
      <Text style={styles.label}>{LABEL[state]}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  body: { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  eyes: { flexDirection: 'row', alignItems: 'center' },
  eye: { backgroundColor: colors.surface },
  spark: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.signal },
  label: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
