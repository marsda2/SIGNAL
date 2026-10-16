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

type Mouth = 'soft' | 'grin' | 'flat';

/**
 * Face data per state (docs/05 "MVP-friendly option"): eye openness 0–1, pupil offset in eye-widths (-1..1),
 * mouth shape. No video/Lottie assets, no AGPL code — original Views + Animated, works on web and native.
 */
const POSE: Record<PipState, { open: number; px: number; py: number; mouth: Mouth }> = {
  idle: { open: 0.92, px: 0, py: 0, mouth: 'soft' },
  listening: { open: 1, px: 0, py: 0, mouth: 'flat' },
  thinking: { open: 0.78, px: 0, py: -0.5, mouth: 'flat' },
  helping: { open: 0.92, px: 0, py: 0.45, mouth: 'soft' },
  solved: { open: 0.2, px: 0, py: 0, mouth: 'grin' },
  escalating: { open: 0.68, px: 0, py: 0, mouth: 'flat' },
};

/**
 * How much of the `roam` range each state may use. Roaming is subtle and only while Pip has nothing urgent to say:
 * wanders when idle, drifts a little while checking/helping, and settles in place for listening / solved / escalating.
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
 * Pip: capsule body, oversized eyes with pupils, small mouth, signal spark.
 * Ambient: float (3px), random blink, pupil darting while thinking, spark pulse, one-shot hop when solved.
 * Honours reduce-motion (static pose, no loops). State is never conveyed by the face alone — the label always renders.
 */
export function Pip({ state = 'idle', size = 72, roam }: { state?: PipState; size?: number; roam?: { x: number; y: number } }) {
  const reduced = useReducedMotion();
  const pose = POSE[state];
  const roamAmount = ROAM_FACTOR[state];
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

  const eyeW = size * 0.24;
  const eyeH = size * 0.38;
  const pupil = eyeW * 0.46;
  const range = (eyeW - pupil) / 2; // how far a pupil can travel inside the eye

  // Expression transition (also the reduced-motion static pose: duration 0).
  useEffect(() => {
    const d = reduced ? 0 : 220;
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
    const speed = state === 'escalating' ? 900 : 1600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: speed, easing: Easing.inOut(Easing.ease), useNativeDriver: useNative }),
        Animated.timing(float, { toValue: 0, duration: speed, easing: Easing.inOut(Easing.ease), useNativeDriver: useNative }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, reduced, state]);

  // Random blink every 2.5–5s (skipped when eyes are already closed/happy).
  useEffect(() => {
    if (reduced || state === 'solved') return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(blink, { toValue: 0.08, duration: 80, useNativeDriver: useNative }),
          Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: useNative }),
        ]).start(schedule);
      }, 2500 + Math.random() * 2500);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [blink, reduced, state]);

  // Thinking: pupils dart side to side; spark pulses while thinking/listening.
  useEffect(() => {
    dart.setValue(0);
    if (reduced || state !== 'thinking') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dart, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: useNative }),
        Animated.delay(260),
        Animated.timing(dart, { toValue: -1, duration: 560, easing: Easing.inOut(Easing.ease), useNativeDriver: useNative }),
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

  // Roam: slow, eased wander inside the `roam` box (never leaves it), small tilt and a glance toward the travel
  // direction. Settles back to centre when the state doesn't allow roaming or reduce-motion is on.
  useEffect(() => {
    const settle = () =>
      Animated.parallel(
        [rx, ry, tilt, look].map((v) => Animated.timing(v, { toValue: 0, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: useNative })),
      ).start();
    if (!roam || reduced || roamAmount === 0) {
      settle();
      return;
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let lastX = 0;
    const ease = Easing.inOut(Easing.sin);
    const hop = () => {
      if (stopped) return;
      const tx = (Math.random() * 2 - 1) * roam.x * roamAmount;
      const ty = (Math.random() * 2 - 1) * roam.y * roamAmount;
      const dir = Math.sign(tx - lastX) || 1;
      lastX = tx;
      const dur = 2800 + Math.random() * 2400;
      const move = (v: Animated.Value, to: number, d = dur) => Animated.timing(v, { toValue: to, duration: d, easing: ease, useNativeDriver: useNative });
      Animated.parallel([
        move(rx, tx),
        move(ry, ty),
        Animated.sequence([move(tilt, dir, dur * 0.45), move(tilt, 0, dur * 0.55)]),
        Animated.sequence([move(look, dir * 0.55, dur * 0.2), Animated.delay(dur * 0.5), move(look, 0, dur * 0.3)]),
      ]).start(({ finished }) => {
        if (finished && !stopped) timer = setTimeout(hop, 700 + Math.random() * 2000);
      });
    };
    hop();
    return () => {
      stopped = true;
      clearTimeout(timer);
      rx.stopAnimation();
      ry.stopAnimation();
    };
  }, [roam, reduced, roamAmount, rx, ry, tilt, look]);

  const eyeScale = Animated.multiply(open, blink);
  const pupilX = Animated.multiply(Animated.add(Animated.add(px, dart), look), range);
  const pupilY = Animated.multiply(py, range);
  const bodyY = Animated.add(float.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }), hop);

  const eye = (
    <Animated.View style={[styles.eye, { width: eyeW, height: eyeH, borderRadius: eyeW / 2, transform: [{ scaleY: eyeScale }] }]}>
      {state !== 'solved' && (
        <Animated.View
          style={{
            width: pupil,
            height: pupil,
            borderRadius: pupil / 2,
            backgroundColor: colors.ink,
            transform: [{ translateX: pupilX }, { translateY: pupilY }],
          }}
        />
      )}
    </Animated.View>
  );

  const mouthW = size * (pose.mouth === 'grin' ? 0.34 : 0.22);
  const mouth =
    pose.mouth === 'flat' ? (
      <View style={{ width: size * 0.16, height: Math.max(2, size * 0.035), borderRadius: 2, backgroundColor: colors.surface, opacity: 0.85 }} />
    ) : (
      <View
        style={{
          width: mouthW,
          height: mouthW / 2,
          borderBottomLeftRadius: mouthW,
          borderBottomRightRadius: mouthW,
          borderBottomWidth: Math.max(2, size * 0.04),
          borderLeftWidth: Math.max(2, size * 0.04),
          borderRightWidth: Math.max(2, size * 0.04),
          borderColor: colors.surface,
          opacity: 0.9,
        }}
      />
    );

  return (
    <Animated.View
      style={[
        styles.wrap,
        { transform: [{ translateX: rx }, { translateY: ry }, { rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] }) }] },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Pip, ${LABEL[state]}`}>
      <Animated.View
        style={[styles.body, { width: size, height: size * 1.1, borderRadius: size / 2, transform: [{ translateY: bodyY }] }]}>
        <View style={[styles.eyes, { gap: size * 0.12 }]}>
          {eye}
          {eye}
        </View>
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
  eye: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  spark: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.signal },
  label: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
