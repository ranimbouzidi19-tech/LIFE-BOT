import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ title: 'LIFE-BOT Chat' }} />
      <Stack.Screen name="reminders" options={{ title: 'My Reminders' }} />
    </Stack>
  );
}