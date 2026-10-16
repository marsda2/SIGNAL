import { Link, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Pip } from '@/components/Pip';
import { Glyph, SignalButton, SignalText, SignalWordmark, palette } from '@/design';

const HOME_ROAM = { x: 110, y: 55 } as const; // module-level so the object is stable across renders

export default function Home() {
  const router = useRouter();
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.page}>
      <View style={styles.brand}>
        <SignalWordmark size="lg" />
      </View>
      {/* Roaming stage: Pip drifts inside this box only, so it never covers the headline or the button. */}
      <View style={styles.stage}>
        <Pip state="idle" size={96} roam={HOME_ROAM} />
      </View>
      <View style={styles.copy}>
        <SignalText variant="eyebrow" color="textSecondary">
          Tap. Ask. Resolve.
        </SignalText>
        <SignalText variant="display" accessibilityRole="header">
          Every space has a memory.
        </SignalText>
        <SignalText variant="hero" color="textSecondary">
          A little help, exactly where you need it.
        </SignalText>
      </View>
      <SignalButton label="Open the demo room" trailing={<Glyph name="arrow-right" color="onAccent" />} onPress={() => router.push('/t')} />
      <View style={styles.links}>
        <Link href="/admin" style={styles.link}>
          Facilities view
        </Link>
        <Text style={styles.sep}>·</Text>
        <Link href="/demo/maintenance" style={styles.link}>
          Demo maintenance portal
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  page: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 28, gap: 20 },
  brand: { alignItems: 'flex-start' },
  stage: { height: 230, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  copy: { gap: 10 },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10 },
  link: { color: palette.accentInk, fontWeight: '600', fontSize: 14, paddingVertical: 10 },
  sep: { color: palette.textMuted },
});
