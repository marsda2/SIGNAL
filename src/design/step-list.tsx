import { StyleSheet, View } from 'react-native';

import { SignalText } from './signal-text';
import { palette } from './tokens';

/** Numbered steps ("Try this fix"): small frosted number badges + one line each. Only safe, operator-approved steps. */
export function StepList({ steps }: { steps: string[] }) {
  return (
    <View accessibilityRole="list" style={styles.list}>
      {steps.map((step, i) => (
        <View key={step} style={styles.row}>
          <View style={styles.badge}>
            <SignalText variant="meta" color="textSecondary" style={styles.number}>
              {i + 1}
            </SignalText>
          </View>
          <SignalText variant="label" style={styles.text}>
            {step}
          </SignalText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceSunken },
  number: { fontWeight: '600', lineHeight: 16 },
  text: { flex: 1, minWidth: 0, fontWeight: '400', lineHeight: 20 },
});
