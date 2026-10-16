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
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.paper },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* Visitor screens draw their own SIGNAL header (wordmark + back when there is history). */}
        <Stack.Screen name="t" options={{ title: 'SIGNAL', headerShown: false }} />
        <Stack.Screen name="s/[session]" options={{ title: 'Pip', headerShown: false }} />
        <Stack.Screen name="admin" options={{ title: 'Facilities' }} />
        <Stack.Screen name="demo/maintenance" options={{ title: 'Maintenance desk · SIGNAL', headerShown: false }} />
      </Stack>
    </>
  );
}
