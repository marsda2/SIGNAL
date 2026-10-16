import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

import type { PipState } from '@/lib/agent/contracts';
import { palette } from '@/design/tokens';

/**
 * Pip, styled after "Sunee" from smontlouis/bible-strong-avatar-lab: a flattened apricot sphere ringed by eight
 * smaller spheres, two dark pill eyes painted on the face, and a head that turns in 3D between expressions.
 *
 * The renderer here is original (plain Views + Animated, works on web and native). The expression poses and
 * animation timelines below are transcribed (rounded) from the lab's default studio document, which is AGPL-3.0 —
 * review before shipping in a closed-source build (AGENTS.md "Avoid").
 */
const COLORS = { body: '#e69a5c', eyes: '#111316' } as const;

/** Body ellipsoid semi-axes (studio units): wide and tall, but shallow, so eyes slide a lot when the head turns. */
const BODY = { a: 183 / 2, b: 185.5 / 2, c: 50 };
/** Sun rays: [x, y, diameter] around the body, y down, z slightly behind the face. */
const RAYS: readonly [number, number, number][] = [
  [-94.5, -95.4, 60],
  [-6.4, -134, 59.6],
  [89.1, -114.3, 81.6],
  [132.2, -11.7, 70.1],
  [-138.1, -1.2, 61.9],
  [-103.3, 92.4, 61.1],
  [-2.5, 133.1, 61.7],
  [109.5, 84, 64.1],
];
const RAY_Z = -10;
/** Studio units shown across the component box; rays overflow the box slightly so the face stays readable at 34px. */
const VIEW_UNITS = 280;

/**
 * Expression = [headX (pitch, + up), headY (yaw, + right), headZ (roll, + clockwise), widthL, widthR, heightL, heightR,
 * spacing (between eye centres), posYL, posYR (+ down), angleL, angleR (+ clockwise)]. Degrees / studio units.
 */
type Expr = readonly [number, number, number, number, number, number, number, number, number, number, number, number];

const EXPRESSIONS = {
  neutral: [0, 0, 0, 20, 20, 50, 50, 35, -7, -7, 0, 0],
  'upward-side-glance': [7.3, 27.8, -16.1, 22.5, 22.5, 42.4, 42.4, 54.3, -20.5, -20.5, 0, 0],
  'downward-gaze': [-15.1, 0.1, -14.5, 22.4, 22.4, 54.6, 54.6, 57.7, 0, 0, 0, 0],
  'skeptical-right': [-16.5, -3.8, -13.7, 23.1, 49.9, 57.7, 12.4, 56.3, 0, 0, 0, 0],
  'small-attentive': [-4.2, 14.4, 11.2, 22.1, 22.1, 39.6, 39.6, 50.9, 0, 0, 0, 0],
  'wide-downward-gaze': [-19.2, 15.2, 11.8, 52.1, 53.1, 51.5, 52.2, 69.5, 0, 0, 0, 0],
  'surprised-left': [2.9, -16.1, -20.9, 51.7, 51.7, 51.7, 51.7, 70.9, 0, 0, 0, 0],
  'sleepy-squint': [3.4, 13.2, 9.0, 51.8, 51.8, 13.0, 13.0, 63.9, 0, 0, 0, 0],
  'angry-right': [8.1, 17.6, -11.1, 20.9, 20.9, 40.4, 40.4, 52.1, 0, 0, -30.9, 28.8],
  'curious-left': [-12.3, -17.6, 5.9, 20.6, 20.6, 47.8, 47.8, 54.9, 0, 0, 23.5, -24.0],
  'asymmetric-down-right': [-20.1, 12.6, -12.7, 42.5, 22.1, 41.8, 22.2, 61.7, 0, 0, 0, 0],
  'attentive-left': [1.4, 6.2, 10.6, 23.8, 23.8, 58.1, 58.1, 56.8, 0, 0, 0, 0],
  'joyful-wide': [-2.1, -15.9, -14.5, 34.2, 34.2, 85.3, 83.2, 59.4, 0, 0, 0, 0],
  'eyes-closed': [-8.8, -8.7, -10.8, 56.1, 56.1, 15.5, 15.2, 69.3, 0, 0, 0, 0],
  'joyful-down-right': [-15.3, 15.0, 12.8, 31.3, 31.3, 76.7, 76.7, 68.7, 0, 0, 0, 0],
  'skeptical-left': [3.5, -7.1, 9.8, 24.3, 48.9, 59.3, 13.4, 62.2, 0, 0, 0, 0],
  'far-right-glance': [0.3, 35.3, -10.9, 22.5, 22.5, 39.8, 39.8, 53.9, 0, 0, 0, 0],
  'angry-left': [-14.8, -19.4, 5.6, 19.6, 19.6, 48.6, 48.6, 55.1, 0, 0, -27.6, 26.1],
  'playful-right': [-4.4, 14.1, -16.1, 19.0, 19.0, 43.4, 43.4, 51.7, 0, 0, 26.3, -20.2],
  'asymmetric-up-left': [6.6, 4.7, 12.8, 42.1, 22.2, 41.7, 22.1, 60.4, 0, 0, 0, 0],
  'gentle-downward-gaze': [-6.1, -11.0, -14.0, 23.0, 23.0, 58.7, 58.7, 56.2, 0, 0, 0, 0],
  'wide-down-left': [-17.1, 18.1, 13.9, 35.5, 35.5, 79.1, 79.1, 70.8, 0, 0, 0, 0],
  'surprised-wide-left': [-5.4, -11.7, -13.5, 51.4, 50.5, 50.1, 49.4, 69, 0, 0, 0, 0],
  'drowsy-closed': [10.3, 3.4, 7.6, 55.7, 55.7, 14.6, 14.6, 68.4, 0, 0, 0, 0],
  'suspicious-right': [-17.8, 10, -10.9, 24.0, 53.6, 55.9, 13.3, 59.9, -9.8, -9.8, 0, 0],
  'shy-downward': [7.1, 7.8, 3.9, 21.5, 23.2, 32, 33.5, 51.2, 40, 40, 0, 0],
} as const satisfies Record<string, Expr>;
type ExprKey = keyof typeof EXPRESSIONS;

/** Looping timelines: each step eases to its expression over 500ms, then holds. */
const ANIMATIONS = {
  sleeping: { hold: 3600, steps: ['eyes-closed', 'drowsy-closed', 'sleepy-squint'] },
  waking: { hold: 2300, steps: ['eyes-closed'] },
  idle: { hold: 5200, steps: ['upward-side-glance', 'curious-left'] },
  listening: { hold: 2300, steps: ['attentive-left', 'downward-gaze', 'gentle-downward-gaze'] },
  thinking: { hold: 2300, steps: ['curious-left', 'angry-left', 'skeptical-left', 'playful-right', 'skeptical-right'] },
  searching: { hold: 2300, steps: ['far-right-glance', 'asymmetric-down-right', 'surprised-left', 'wide-down-left', 'wide-downward-gaze', 'asymmetric-up-left'] },
  working: { hold: 2300, steps: ['angry-right', 'angry-left', 'joyful-wide', 'attentive-left'] },
  excited: { hold: 2300, steps: ['joyful-down-right', 'playful-right', 'surprised-wide-left', 'surprised-left', 'joyful-wide'] },
  bored: { hold: 3600, steps: ['sleepy-squint', 'drowsy-closed', 'upward-side-glance'] },
  suspicious: { hold: 2300, steps: ['skeptical-left', 'skeptical-right', 'suspicious-right'] },
  angry: { hold: 2300, steps: ['angry-right', 'angry-left'] },
  drowsy: { hold: 3600, steps: ['sleepy-squint', 'drowsy-closed', 'eyes-closed'] },
  happy: { hold: 2300, steps: ['joyful-down-right', 'joyful-wide', 'playful-right', 'gentle-downward-gaze'] },
  curious: { hold: 2300, steps: ['surprised-left', 'surprised-wide-left', 'upward-side-glance', 'far-right-glance'] },
  confused: { hold: 2300, steps: ['skeptical-left', 'skeptical-right', 'curious-left'] },
  surprised: { hold: 2300, steps: ['surprised-left', 'surprised-wide-left'] },
  proud: { hold: 2300, steps: ['far-right-glance', 'curious-left', 'joyful-down-right'] },
  shy: { hold: 2300, steps: ['upward-side-glance', 'shy-downward', 'eyes-closed'] },
  sad: { hold: 3600, steps: ['sleepy-squint', 'eyes-closed', 'drowsy-closed'] },
  laughing: { hold: 2300, steps: ['joyful-down-right', 'joyful-wide', 'playful-right'] },
  scared: { hold: 2300, steps: ['surprised-left', 'surprised-wide-left'] },
  playful: { hold: 2300, steps: ['joyful-down-right', 'playful-right', 'joyful-wide', 'curious-left'] },
  celebrate: { hold: 2300, steps: ['joyful-down-right', 'curious-left', 'playful-right'] },
} as const satisfies Record<string, { hold: number; steps: readonly ExprKey[] }>;
export type PipAnimation = keyof typeof ANIMATIONS;
export const PIP_ANIMATIONS = Object.keys(ANIMATIONS) as PipAnimation[];
const TRANSITION_MS = 500;

/** Which lab animation each agent state plays. */
const STATE_ANIMATION: Record<PipState, PipAnimation> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  helping: 'working',
  solved: 'happy',
  escalating: 'searching',
};

const LABEL: Record<PipState, string> = {
  idle: 'Ready to help',
  listening: 'Listening',
  thinking: 'Checking…',
  helping: 'Helping',
  solved: 'Solved',
  escalating: 'Getting this reported',
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
const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------------------------------------------
// Projection: expression -> 2D frame (studio units, origin at the body centre, y down).

type Vec3 = [number, number, number];
type EyeFrame = { x: number; y: number; w: number; h: number; rot: number };
type Frame = { eyes: [EyeFrame, EyeFrame]; rays: { x: number; y: number }[] };

/** Yaw (around y), then pitch (around x), then roll (in the screen plane). */
function rotate([x, y, z]: Vec3, pitch: number, yaw: number, roll: number): Vec3 {
  const [sy, cy] = [Math.sin(yaw * DEG), Math.cos(yaw * DEG)];
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const [sp, cp] = [Math.sin(pitch * DEG), Math.cos(pitch * DEG)];
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  const [sr, cr] = [Math.sin(roll * DEG), Math.cos(roll * DEG)];
  return [x1 * cr - y2 * sr, x1 * sr + y2 * cr, z2];
}

/** blink: 1 open → 0 shut (eyes squash to a 5-unit line, like the lab). glance: extra yaw in degrees. */
function project(e: Expr, blink = 1, glance = 0): Frame {
  const [hx, hy0, hz, wL, wR, hL, hR, spacing, pyL, pyR, aL, aR] = e;
  const hy = hy0 + glance;
  const { a, b, c } = BODY;
  const eye = (side: -1 | 1, w: number, h: number, py: number, angle: number): EyeFrame => {
    const ex = (side * spacing) / 2;
    const ey = py;
    const ez = c * Math.sqrt(Math.max(0, 1 - (ex / a) ** 2 - (ey / b) ** 2));
    const [px, ppy] = rotate([ex, ey, ez], hx, hy, hz);
    // Foreshorten with the surface normal, so eyes squash as they slide round the curve.
    const n: Vec3 = [ex / a ** 2, ey / b ** 2, ez / c ** 2];
    const len = Math.hypot(...n) || 1;
    const [nx, ny] = rotate([n[0] / len, n[1] / len, n[2] / len], hx, hy, hz);
    const open = 5 + (h - 5) * blink;
    return { x: px, y: ppy, w: w * Math.sqrt(1 - nx * nx), h: open * Math.sqrt(1 - ny * ny), rot: angle + hz };
  };
  return {
    eyes: [eye(-1, wL, hL, pyL, aL), eye(1, wR, hR, pyR, aR)],
    rays: RAYS.map(([x, y]) => {
      const [rx, ry] = rotate([x, y, RAY_Z], hx, hy, hz);
      return { x: rx, y: ry };
    }),
  };
}

const lerpExpr = (from: Expr, to: Expr, t: number) => from.map((v, i) => v + (to[i] - v) * t) as unknown as Expr;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// ---------------------------------------------------------------------------------------------------------------
// Rendering: one set of Animated values, written imperatively each frame (no React re-render per frame).

type EyeValues = { x: Animated.Value; y: Animated.Value; w: Animated.Value; h: Animated.Value; rot: Animated.Value };
type SpriteValues = { eyes: [EyeValues, EyeValues]; rays: { x: Animated.Value; y: Animated.Value }[] };

function makeValues(f: Frame): SpriteValues {
  const eye = (e: EyeFrame): EyeValues => ({
    x: new Animated.Value(e.x),
    y: new Animated.Value(e.y),
    w: new Animated.Value(e.w),
    h: new Animated.Value(e.h),
    rot: new Animated.Value(e.rot),
  });
  return { eyes: [eye(f.eyes[0]), eye(f.eyes[1])], rays: f.rays.map((r) => ({ x: new Animated.Value(r.x), y: new Animated.Value(r.y) })) };
}

function applyFrame(v: SpriteValues, f: Frame) {
  f.eyes.forEach((e, i) => {
    const t = v.eyes[i];
    t.x.setValue(e.x);
    t.y.setValue(e.y);
    t.w.setValue(e.w);
    t.h.setValue(e.h);
    t.rot.setValue(e.rot);
  });
  f.rays.forEach((r, i) => {
    v.rays[i].x.setValue(r.x);
    v.rays[i].y.setValue(r.y);
  });
}

function Sprite({ size, values }: { size: number; values: SpriteValues }) {
  const u = size / VIEW_UNITS;
  const half = size / 2;
  const bodyW = BODY.a * 2 * u;
  const bodyH = BODY.b * 2 * u;
  const px = (v: Animated.Value, offset: number) => Animated.add(Animated.multiply(v, u), offset);
  return (
    <View style={{ width: size, height: size }}>
      {values.rays.map((r, i) => {
        const d = RAYS[i][2] * u;
        return (
          <Animated.View
            key={i}
            style={[
              styles.layer,
              { width: d, height: d, borderRadius: d / 2, backgroundColor: COLORS.body, transform: [{ translateX: px(r.x, half - d / 2) }, { translateY: px(r.y, half - d / 2) }] },
            ]}
          />
        );
      })}
      <View style={[styles.layer, styles.body, { width: bodyW, height: bodyH, borderRadius: bodyW, left: half - bodyW / 2, top: half - bodyH / 2 }]}>
        {values.eyes.map((e, i) => {
          const w = Animated.multiply(e.w, u);
          const h = Animated.multiply(e.h, u);
          return (
            <Animated.View
              key={i}
              style={[
                styles.layer,
                styles.eye,
                {
                  width: w,
                  height: h,
                  borderRadius: size,
                  transform: [
                    { translateX: Animated.subtract(px(e.x, bodyW / 2), Animated.multiply(w, 0.5)) },
                    { translateY: Animated.subtract(px(e.y, bodyH / 2), Animated.multiply(h, 0.5)) },
                    { rotate: e.rot.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) },
                  ],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

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

const firstExpr = (anim: PipAnimation): Expr => EXPRESSIONS[ANIMATIONS[anim].steps[0]];

/**
 * Live Pip. Plays the lab animation for `state` (or an explicit `animation`), blinks every 2.5–6s, and roams inside
 * `roam` (max drift in px from home) with a lean and a head turn toward the direction of travel. Reduced motion:
 * first pose of the animation, no loops. The state label always renders, so state is never conveyed by the face alone.
 */
export function Pip({
  state = 'idle',
  size = 72,
  roam,
  animation,
}: {
  state?: PipState;
  size?: number;
  roam?: { x: number; y: number };
  /** Override the state's default animation with any lab animation (see PIP_ANIMATIONS). */
  animation?: PipAnimation;
}) {
  const reduced = useReducedMotion();
  const anim = animation ?? STATE_ANIMATION[state];
  const values = useRef<SpriteValues | null>(null);
  if (!values.current) values.current = makeValues(project(firstExpr(anim)));
  const sprite = values.current;

  const rx = useRef(new Animated.Value(0)).current;
  const ry = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const phases = useRef(Array.from({ length: 4 }, () => Math.random() * Math.PI * 2)).current;

  // Shared between the expression loop and the roam loop.
  const live = useRef({ shown: firstExpr(anim) as Expr, glance: 0, roamAmount: ROAM_FACTOR[state] });
  live.current.roamAmount = ROAM_FACTOR[state];

  // Expression timeline + blink.
  useEffect(() => {
    const { steps, hold } = ANIMATIONS[anim];
    if (reduced) {
      live.current.shown = EXPRESSIONS[steps[0]];
      applyFrame(sprite, project(live.current.shown));
      return;
    }
    let raf = 0;
    let index = 0;
    let from = live.current.shown;
    let to: Expr = EXPRESSIONS[steps[0]];
    let stepStart = Date.now();
    let nextBlink = stepStart + 1200 + Math.random() * 2500;
    const BLINK_MS = 180;
    const tick = () => {
      const now = Date.now();
      const elapsed = now - stepStart;
      const shown = elapsed < TRANSITION_MS ? lerpExpr(from, to, easeInOut(elapsed / TRANSITION_MS)) : to;
      live.current.shown = shown;
      if (steps.length > 1 && elapsed >= TRANSITION_MS + hold) {
        index = (index + 1) % steps.length;
        from = shown;
        to = EXPRESSIONS[steps[index]];
        stepStart = now;
      }
      let blink = 1;
      if (now >= nextBlink) {
        const p = (now - nextBlink) / BLINK_MS;
        if (p >= 1) nextBlink = now + 2500 + Math.random() * 3500;
        else blink = 1 - Math.sin(Math.PI * p);
      }
      applyFrame(sprite, project(shown, blink, live.current.glance));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim, reduced, sprite]);

  /**
   * Roam. A drifting target from two slow sine waves per axis with unrelated periods (never repeats or turns
   * sharply); Pip chases it with exponential smoothing (inertia), leans into the direction of travel and turns its
   * head toward it. The roam amount is smoothed, so a state change eases Pip in or back to its spot.
   */
  useEffect(() => {
    if (!roam || reduced) {
      live.current.glance = 0;
      Animated.parallel(
        [rx, ry, tilt].map((v) => Animated.timing(v, { toValue: 0, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: useNative })),
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
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (dt > 0) {
        t += dt;
        amount += (live.current.roamAmount - amount) * (1 - Math.exp(-dt * 2));
        const tx = amount * roam.x * (0.62 * Math.sin(0.33 * t + phases[0]) + 0.38 * Math.sin(0.79 * t + phases[1]));
        const ty = amount * roam.y * (0.62 * Math.sin(0.47 * t + phases[2]) + 0.38 * Math.sin(0.97 * t + phases[3]));
        const k = 1 - Math.exp(-dt * 1.8);
        const nx = x + (tx - x) * k;
        const ny = y + (ty - y) * k;
        const vx = (nx - x) / dt;
        x = nx;
        y = ny;
        lean += (clamp(vx / 45, -1, 1) - lean) * (1 - Math.exp(-dt * 3));
        live.current.glance += (clamp(vx / 30, -1, 1) * 12 - live.current.glance) * (1 - Math.exp(-dt * 4));
        rx.setValue(x);
        ry.setValue(y);
        tilt.setValue(lean);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [roam, reduced, rx, ry, tilt, phases]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        { transform: [{ translateX: rx }, { translateY: ry }, { rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] }) }] },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Pip, ${LABEL[state]}`}>
      <Sprite size={size} values={sprite} />
      <Text style={[styles.label, { maxWidth: Math.max(76, size * 1.6) }]}>{LABEL[state]}</Text>
    </Animated.View>
  );
}

/**
 * Static Pip face for chat avatars (no loops, no label): the first pose of the state's animation. Decorative: the
 * message beside it carries the meaning, and the live <Pip> elsewhere on screen announces the current state.
 */
export function PipAvatar({ size = 36, state = 'idle' }: { size?: number; state?: PipState }) {
  const values = useRef<SpriteValues | null>(null);
  if (!values.current) values.current = makeValues(project(firstExpr(STATE_ANIMATION[state])));
  useEffect(() => {
    if (values.current) applyFrame(values.current, project(firstExpr(STATE_ANIMATION[state])));
  }, [state]);
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Sprite size={size} values={values.current} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  layer: { position: 'absolute', left: 0, top: 0 },
  body: { backgroundColor: COLORS.body, overflow: 'hidden' },
  eye: { backgroundColor: COLORS.eyes },
  label: { color: palette.textMuted, fontSize: 11, lineHeight: 14, fontWeight: '500', textAlign: 'center' },
});
