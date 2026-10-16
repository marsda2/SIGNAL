import { Link, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Pip } from '@/components/Pip';
import { Button, Screen, text } from '@/components/ui';
import { colors } from '@/constants/tokens';

const HOME_ROAM = { x: 110, y: 55 } as const; // module-level so the object is stable across renders

export default function Home() {
  const router = useRouter();
  return (
    <Screen style={{ justifyContent: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      {/* Roaming stage: Pip drifts inside this box only, so it never covers the headline or the button. */}
      <View style={{ height: 250, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
        <Pip state="idle" size={96} roam={HOME_ROAM} />
      </View>
      <Text style={text.h1}>Every space has a memory.</Text>
      <Text style={text.body}>Tap. Ask. Resolve. A little help, exactly where you need it.</Text>
      <Button label="Open the demo room" onPress={() => router.push('/t')} />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Link href="/admin" style={{ color: colors.sea, fontWeight: '600' }}>
          Facilities view
        </Link>
        <Link href="/demo/maintenance" style={{ color: colors.sea, fontWeight: '600' }}>
          Demo maintenance portal
        </Link>
      </View>
    </Screen>
  );
}
