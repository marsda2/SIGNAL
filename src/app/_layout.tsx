import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/tokens';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.paper },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="t" options={{ title: 'SIGNAL' }} />
        <Stack.Screen name="s/[session]" options={{ title: 'Pip' }} />
        <Stack.Screen name="admin" options={{ title: 'Facilities' }} />
        <Stack.Screen name="demo/maintenance" options={{ title: 'Maintenance portal (demo)' }} />
      </Stack>
    </>
  );
}
