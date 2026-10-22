import { Stack, Redirect } from 'expo-router';
import { useMobileAuth } from '@/features/auth/AuthContext';

export default function AuthLayout() {
  const { user, isHydrating } = useMobileAuth();

  if (!isHydrating && user) {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F5F5DC' },
        animation: 'fade',
      }}
    />
  );
}
