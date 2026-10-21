import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  const role = user?.role ?? 'CLIENT';
  const showBilling = role === 'CLIENT' || role === 'ADMIN';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#F5F5DC',
          borderTopColor: 'rgba(0, 86, 45, 0.12)',
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#00562D',
        tabBarInactiveTintColor: 'rgba(0, 86, 45, 0.45)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
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
