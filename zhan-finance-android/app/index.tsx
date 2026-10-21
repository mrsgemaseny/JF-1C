import { Redirect } from 'expo-router';
import { useMobileAuth } from '@/features/auth/AuthContext';

export default function Index() {
  const { user, isHydrating } = useMobileAuth();
  if (isHydrating) return null;
  return <Redirect href={user ? '/(app)' : '/(auth)/login'} />;
}
