import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertTriangle, ChevronDown, LogOut, Trash2, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/providers/LanguageProvider';
import { t, languages } from '@/lib/translations';

type ProfileModalProps = {
  visible: boolean;
  userEmail: string | undefined;
  userId: string;
  collectionCount: number;
  wishlistCount: number;
  onClose: () => void;
};

const avatarOptions = ['⭐', '🔥', '🌿', '⚡', '💧', '🪨', '🦋', '🌙', '❄️', '🧪'];

export function ProfileModal({ visible, userEmail, userId, collectionCount, wishlistCount, onClose }: ProfileModalProps) {
  const { lang, setLang } = useLanguage();
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('⭐');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    if (!visible || !userId) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_emoji, language')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setUsername(data.username || '');
        setAvatar(data.avatar_emoji || '⭐');
        if (data.language) {
          setLang(data.language as typeof lang);
        }
      }
      setMessage(null);
    })();
  }, [visible, userId, setLang]);

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    const trimmed = username.trim();
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmed, avatar_emoji: avatar })
        .eq('id', userId);
      setSaving(false);
      if (error) {
        setMessage(t(lang, 'profile.usernameInUse'));
        return;
      }
    } else {
      const { error } = await supabase
        .from('profiles')
        .insert({ id: userId, username: trimmed, avatar_emoji: avatar });
      setSaving(false);
      if (error) {
        setMessage(t(lang, 'profile.errorSave'));
        return;
      }
    }
    setMessage(t(lang, 'profile.updated'));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setDeleteError(t(lang, 'profile.deleteErrorSession'));
        setDeleting(false);
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        setDeleteError(t(lang, 'profile.deleteError'));
        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();
      setShowDelete(false);
      setDeleteConfirm('');
      setDeleting(false);
      setToast(t(lang, 'profile.deleteSuccess'));
      setTimeout(() => {
        setToast(null);
        onClose();
        router.replace('/auth');
      }, 2000);
    } catch {
      setDeleteError(t(lang, 'profile.deleteErrorCatch'));
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDelete(false);
    setDeleteConfirm('');
    setDeleteError(null);
  };

  return (
    <>
      <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible && !toast}>
        <View style={styles.overlay}>
          <SafeAreaView style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>{t(lang, 'profile.title')}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'common.close')} onPress={onClose} style={styles.closeButton}>
                <X color="#141414" size={20} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <View style={styles.avatarPreview}>
                <Text style={styles.avatarEmoji}>{avatar}</Text>
              </View>

              <Text style={styles.label}>{t(lang, 'profile.email')}</Text>
              <View style={styles.emailBox}>
                <Text style={styles.emailText}>{userEmail ?? '—'}</Text>
              </View>

              <Text style={styles.label}>{t(lang, 'profile.username')}</Text>
              <TextInput
                accessibilityLabel={t(lang, 'profile.username')}
                onChangeText={setUsername}
                placeholder={t(lang, 'profile.usernamePlaceholder')}
                placeholderTextColor="#9A9A9A"
                style={styles.input}
                value={username}
              />

              <Text style={styles.label}>{t(lang, 'profile.avatar')}</Text>
              <View style={styles.avatarGrid}>
                {avatarOptions.map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    onPress={() => setAvatar(option)}
                    style={[styles.avatarOption, avatar === option && styles.avatarOptionActive]}
                  >
                    <Text style={styles.avatarOptionText}>{option}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>{t(lang, 'profile.language')}</Text>
              <Pressable accessibilityRole="button" onPress={() => setShowLangPicker((v) => !v)} style={styles.langButton}>
                <Text style={styles.langButtonText}>
                  {languages.find((l) => l.code === lang)?.flag} {languages.find((l) => l.code === lang)?.label}
                </Text>
                <ChevronDown color="#777777" size={18} style={showLangPicker ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </Pressable>
              {showLangPicker && (
                <View style={styles.langPicker}>
                  {languages.map((l) => (
                    <Pressable
                      key={l.code}
                      accessibilityRole="button"
                      onPress={() => { setLang(l.code); setShowLangPicker(false); }}
                      style={[styles.langOption, lang === l.code && styles.langOptionActive]}
                    >
                      <Text style={styles.langOptionFlag}>{l.flag}</Text>
                      <Text style={[styles.langOptionLabel, lang === l.code && styles.langOptionLabelActive]}>{l.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{collectionCount}</Text>
                  <Text style={styles.statLabel}>{t(lang, 'profile.inCollection')}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{wishlistCount}</Text>
                  <Text style={styles.statLabel}>{t(lang, 'profile.inWishlist')}</Text>
                </View>
              </View>

              {message && <Text style={[styles.message, message.includes('Errore') || message.includes('uso') || message.includes('error') || message.includes('in use') || message.includes('Fehler') || message.includes('Error') ? styles.messageError : styles.messageOk]}>{message}</Text>}

              <Pressable accessibilityRole="button" disabled={saving} onPress={() => void saveProfile()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, saving && styles.disabled]}>
                <Text style={styles.saveButtonText}>{saving ? t(lang, 'profile.saving') : t(lang, 'profile.save')}</Text>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={() => void handleLogout()} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
                <LogOut color="#B42318" size={17} />
                <Text style={styles.logoutText}>{t(lang, 'profile.logout')}</Text>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={() => setShowDelete(true)} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                <Trash2 color="#FFFFFF" size={16} />
                <Text style={styles.deleteButtonText}>{t(lang, 'profile.deleteAccount')}</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal animationType="fade" onRequestClose={closeDeleteModal} transparent visible={showDelete}>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteSheet}>
            <View style={styles.deleteHeader}>
              <View style={styles.deleteHeaderLeft}>
                <AlertTriangle color="#B42318" size={22} />
                <Text style={styles.deleteTitle}>{t(lang, 'profile.deleteTitle')}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'common.close')} onPress={closeDeleteModal} style={styles.deleteClose}>
                <X color="#141414" size={20} />
              </Pressable>
            </View>

            <ScrollView style={styles.deleteBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.deleteWarning}>{t(lang, 'profile.deleteWarning')}</Text>

              <Text style={styles.deleteLabel}>{t(lang, 'profile.deleteConfirmLabel')}</Text>
              <TextInput
                accessibilityLabel={t(lang, 'profile.deleteConfirmAlt')}
                autoCapitalize="characters"
                onChangeText={setDeleteConfirm}
                placeholder={t(lang, 'profile.deletePlaceholder')}
                placeholderTextColor="#C0C0C0"
                style={styles.deleteInput}
                value={deleteConfirm}
              />

              {deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}

              <Pressable
                accessibilityRole="button"
                disabled={deleting || deleteConfirm.trim().toUpperCase() !== t(lang, 'profile.deletePlaceholder').toUpperCase()}
                onPress={() => void handleDeleteAccount()}
                style={({ pressed }) => [
                  styles.deleteConfirmButton,
                  pressed && styles.pressed,
                  (deleting || deleteConfirm.trim().toUpperCase() !== t(lang, 'profile.deletePlaceholder').toUpperCase()) && styles.disabled,
                ]}
              >
                <Trash2 color="#FFFFFF" size={16} />
                <Text style={styles.deleteConfirmText}>{deleting ? t(lang, 'profile.deleting') : t(lang, 'profile.deleteConfirm')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={toast !== null}>
        <View style={styles.toastOverlay}>
          <View style={styles.toastBox}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,20,20,0.42)' },
  sheet: { height: '88%', width: '100%', alignSelf: 'center', maxWidth: 600, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  title: { color: '#141414', fontSize: 20, fontWeight: '800' },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F2F3EE' },
  body: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  avatarPreview: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F5D8', marginBottom: 20 },
  avatarEmoji: { fontSize: 36 },
  label: { marginBottom: 7, color: '#454545', fontSize: 12, fontWeight: '800' },
  emailBox: { paddingVertical: 13, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: '#E0E1D9', backgroundColor: '#FAFAFA', marginBottom: 16 },
  emailText: { color: '#777777', fontSize: 14 },
  input: { height: 46, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: '#E0E1D9', backgroundColor: '#FFFFFF', color: '#141414', fontSize: 14, marginBottom: 16 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  avatarOption: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E5E5E5', backgroundColor: '#FAFAFA' },
  avatarOptionActive: { borderColor: '#7F9C22', backgroundColor: '#F0F5D8' },
  avatarOptionText: { fontSize: 24 },
  langButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 46, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: '#E0E1D9', backgroundColor: '#FAFAFA', marginBottom: 16 },
  langButtonText: { color: '#141414', fontSize: 14, fontWeight: '700' },
  langPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  langOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#FAFAFA' },
  langOptionActive: { borderColor: '#7F9C22', backgroundColor: '#F0F5D8' },
  langOptionFlag: { fontSize: 18 },
  langOptionLabel: { color: '#777777', fontSize: 13, fontWeight: '700' },
  langOptionLabelActive: { color: '#141414' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, backgroundColor: '#F8F9F1' },
  statValue: { color: '#141414', fontSize: 26, fontWeight: '800' },
  statLabel: { marginTop: 4, color: '#777777', fontSize: 11, fontWeight: '700' },
  message: { marginBottom: 14, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  messageOk: { color: '#5E7515' },
  messageError: { color: '#B42318' },
  saveButton: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#141414', marginBottom: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E8C0C0' },
  logoutText: { color: '#B42318', fontSize: 14, fontWeight: '800' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, paddingVertical: 14, borderRadius: 12, backgroundColor: '#B42318' },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
  deleteOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,20,20,0.5)' },
  deleteSheet: { width: '88%', maxWidth: 420, borderRadius: 22, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  deleteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  deleteHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteTitle: { color: '#B42318', fontSize: 18, fontWeight: '800' },
  deleteClose: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F2F3EE' },
  deleteBody: { paddingHorizontal: 18, paddingVertical: 18 },
  deleteWarning: { color: '#555555', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  deleteLabel: { marginBottom: 8, color: '#454545', fontSize: 12, fontWeight: '800' },
  deleteInput: { height: 46, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: '#E0E1D9', backgroundColor: '#FAFAFA', color: '#B42318', fontSize: 15, fontWeight: '800', marginBottom: 16, textTransform: 'uppercase' },
  deleteError: { marginBottom: 12, color: '#B42318', fontSize: 12, textAlign: 'center' },
  deleteConfirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#B42318', marginBottom: 4 },
  deleteConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  toastOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,20,20,0.5)' },
  toastBox: { paddingHorizontal: 24, paddingVertical: 18, borderRadius: 16, backgroundColor: '#141414' },
  toastText: { color: '#D8FF32', fontSize: 15, fontWeight: '800', textAlign: 'center' },
});
