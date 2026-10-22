import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Receipt,
  FileText,
  User,
} from 'lucide-react-native';
import { useMobileAuth } from '@/features/auth/AuthContext';

export default function AppTabLayout() {
  const { t } = useTranslation();
  const { user } = useMobileAuth();
  const insets = useSafeAreaInsets();

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const role = user?.role ?? 'CLIENT';
  const showBilling = role === 'CLIENT' || role === 'ADMIN';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 56 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#00562D',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.overview'),
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('nav.tasks'),
          tabBarIcon: ({ color, size }) => (
            <CheckSquare color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('nav.chat'),
          tabBarIcon: ({ color, size }) => (
            <MessageSquare color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: t('nav.billing'),
          href: showBilling ? '/(app)/billing' : null,
          tabBarIcon: ({ color, size }) => (
            <Receipt color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: t('nav.documents'),
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size ?? 22} />
          ),
        }}
      />
    </Tabs>
  );
}
