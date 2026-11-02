import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ShieldX } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/providers/LanguageProvider';
import { t } from '@/lib/translations';

export function BannedScreen() {
  const { lang } = useLanguage();
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <ShieldX color="#E55745" size={36} strokeWidth={2} />
      </View>
      <Text style={styles.title}>{t(lang, 'banned.title')}</Text>
      <Text style={styles.message}>{t(lang, 'banned.message')}</Text>
      <Pressable accessibilityRole="button" onPress={() => void handleLogout()} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>{t(lang, 'banned.logout')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: '#FFFFFF' },
  iconBox: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDF0EF', marginBottom: 24 },
  title: { color: '#141414', fontSize: 26, fontWeight: '800', letterSpacing: -0.7, textAlign: 'center' },
  message: { marginTop: 14, color: '#777777', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  button: { marginTop: 28, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, backgroundColor: '#141414' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
