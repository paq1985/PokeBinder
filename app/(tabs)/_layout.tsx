import { Tabs } from 'expo-router';
import { ArrowLeftRight, Layers3, ScanLine } from 'lucide-react-native';
import { useLanguage } from '@/providers/LanguageProvider';
import { t } from '@/lib/translations';

const colors = {
  ink: '#141414',
  muted: '#858585',
  yellow: '#D8FF32',
  line: '#E8E8E8',
};

export default function TabsLayout() {
  const { lang } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 7,
        },
        tabBarStyle: {
          height: 78,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          backgroundColor: '#FFFFFF',
          elevation: 0,
        },
        tabBarIconStyle: { marginTop: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t(lang, 'tab.scanner'),
          tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: t(lang, 'tab.collection'),
          tabBarIcon: ({ color, size }) => <Layers3 color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="trades"
        options={{
          title: t(lang, 'tab.trades'),
          tabBarIcon: ({ color, size }) => <ArrowLeftRight color={color} size={size} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
