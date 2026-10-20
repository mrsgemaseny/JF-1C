import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
          backgroundColor: '#18181b',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#a1a1aa',
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
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('nav.tasks'),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('nav.chat'),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: t('nav.billing'),
          href: showBilling ? '/(app)/billing' : null,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: t('nav.documents'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
        }}
      />
    </Tabs>
  );
}
