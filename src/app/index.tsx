import { Link, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Pip } from '@/components/Pip';
import { Button, Screen, text } from '@/components/ui';
import { colors } from '@/constants/tokens';

export default function Home() {
  const router = useRouter();
  return (
    <Screen style={{ justifyContent: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Pip state="idle" size={96} />
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
