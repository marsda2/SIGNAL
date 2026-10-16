import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

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

/** Placeholder mascot: capsule body + eyes, 6 states, visible text label (state is never conveyed by the face alone). */
export function Pip({ state = 'idle', size = 72 }: { state?: PipState; size?: number }) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const eyeH = state === 'solved' ? size * 0.12 : state === 'escalating' ? size * 0.3 : size * 0.34;
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={`Pip, ${LABEL[state]}`}>
      <Animated.View
        style={[
          styles.body,
          { width: size, height: size * 1.1, borderRadius: size / 2, transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] },
        ]}>
        <View style={styles.eyes}>
          <View style={[styles.eye, { width: size * 0.22, height: eyeH }]} />
          <View style={[styles.eye, { width: size * 0.22, height: eyeH }]} />
        </View>
        <View style={[styles.spark, { top: size * 0.14 }]} />
      </Animated.View>
      <Text style={styles.label}>{LABEL[state]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  body: { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  eyes: { flexDirection: 'row', gap: 10 },
  eye: { backgroundColor: colors.surface, borderRadius: 99 },
  spark: { position: 'absolute', right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.signal },
  label: { color: colors.muted, fontSize: 12 },
});
