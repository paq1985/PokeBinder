import { useState } from 'react';
import { router } from 'expo-router';
import { ArrowLeft, Check, Shield, X } from 'lucide-react-native';
import { PokeBinderLogo } from '@/components/PokeBinderLogo';
import { WebRecaptcha } from '@/components/WebRecaptcha';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/providers/LanguageProvider';
import { t } from '@/lib/translations';

export default function AuthScreen() {
  const { lang } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const canSubmit = isSignUp ? acceptedPrivacy && acceptedTerms && recaptchaToken !== null : true;

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 6) {
      setError(t(lang, 'auth.errorInvalid'));
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: normalizedEmail, password });
        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.rpc('accept_legal_terms', { p_user_id: data.user.id });
        }
        if (data.session) {
          router.replace('/(tabs)');
        } else {
          setMessage(t(lang, 'auth.signUpSuccess'));
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signInError) throw signInError;
        router.replace('/(tabs)');
      }
    } catch {
      setError(isSignUp ? t(lang, 'auth.errorSignUp') : t(lang, 'auth.errorSignIn'));
    } finally {
      setLoading(false);
    }
  };

  const toggleSwitch = () => {
    setIsSignUp((value) => !value);
    setError(null);
    setMessage(null);
    setAcceptedPrivacy(false);
    setAcceptedTerms(false);
    setRecaptchaToken(null);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'auth.back')} onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#141414" size={20} />
            <Text style={styles.backText}>{t(lang, 'auth.back')}</Text>
          </Pressable>

          <View style={styles.brandRow}>
            <PokeBinderLogo size={40} showText />
          </View>
          <Text style={styles.title}>{isSignUp ? t(lang, 'auth.signUpTitle') : t(lang, 'auth.signInTitle')}</Text>
          <Text style={styles.subtitle}>{isSignUp ? t(lang, 'auth.signUpSubtitle') : t(lang, 'auth.signInSubtitle')}</Text>

          <View style={styles.form}>
            <Text style={styles.label}>{t(lang, 'auth.email')}</Text>
            <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="nome@email.com" placeholderTextColor="#9A9A9A" style={styles.input} value={email} />
            <Text style={styles.label}>{t(lang, 'auth.password')}</Text>
            <TextInput autoComplete="password" onChangeText={setPassword} placeholder={t(lang, 'auth.passwordPlaceholder')} placeholderTextColor="#9A9A9A" secureTextEntry style={styles.input} value={password} />

            {isSignUp && (
              <View style={styles.checkboxes}>
                <View style={styles.checkboxRow}>
                  <Pressable accessibilityRole="checkbox" accessibilityLabel={t(lang, 'auth.privacyCheckbox')} onPress={() => setAcceptedPrivacy((value) => !value)} style={[styles.checkbox, acceptedPrivacy && styles.checkboxActive]}>
                    {acceptedPrivacy && <Check color="#141414" size={14} strokeWidth={3} />}
                  </Pressable>
                  <Pressable onPress={() => setShowPrivacy(true)} style={styles.checkboxLabelWrap}>
                    <Text style={styles.checkboxLabel}>
                      {t(lang, 'auth.privacyCheckbox')} <Text style={styles.linkText}>{t(lang, 'auth.readLink')}</Text>
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.checkboxRow}>
                  <Pressable accessibilityRole="checkbox" accessibilityLabel={t(lang, 'auth.termsCheckbox')} onPress={() => setAcceptedTerms((value) => !value)} style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
                    {acceptedTerms && <Check color="#141414" size={14} strokeWidth={3} />}
                  </Pressable>
                  <Pressable onPress={() => setShowTerms(true)} style={styles.checkboxLabelWrap}>
                    <Text style={styles.checkboxLabel}>
                      {t(lang, 'auth.termsCheckbox')} <Text style={styles.linkText}>{t(lang, 'auth.readLink')}</Text>
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {isSignUp && (
              <View style={styles.recaptchaContainer}>
                <WebRecaptcha
                  lang={lang}
                  onVerify={(token) => setRecaptchaToken(token)}
                  onExpire={() => setRecaptchaToken(null)}
                />
              </View>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
            {message && <Text style={styles.message}>{message}</Text>}
            <Pressable accessibilityRole="button" disabled={loading || !canSubmit} onPress={() => void submit()} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, (loading || !canSubmit) && styles.disabled]}>
              <Text style={styles.submitText}>{loading ? t(lang, 'auth.pleaseWait') : isSignUp ? t(lang, 'auth.signUpButton') : t(lang, 'auth.signInButton')}</Text>
            </Pressable>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{isSignUp ? t(lang, 'auth.haveAccount') : t(lang, 'auth.noAccount')}</Text>
            <Pressable onPress={toggleSwitch}>
              <Text style={styles.switchAction}>{isSignUp ? t(lang, 'auth.signInAction') : t(lang, 'auth.signUpAction')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setShowPrivacy(false)} transparent visible={showPrivacy}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Shield color="#5E7515" size={20} />
                <Text style={styles.modalTitle}>{t(lang, 'auth.privacyTitle')}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'common.close')} onPress={() => setShowPrivacy(false)} style={styles.modalClose}>
                <X color="#141414" size={20} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>{t(lang, 'auth.privacyBody')}</Text>
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setShowPrivacy(false)} style={({ pressed }) => [styles.modalButton, pressed && styles.pressed]}>
              <Text style={styles.modalButtonText}>{t(lang, 'auth.modalButton')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" onRequestClose={() => setShowTerms(false)} transparent visible={showTerms}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Shield color="#E55745" size={20} />
                <Text style={styles.modalTitle}>{t(lang, 'auth.termsTitle')}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'common.close')} onPress={() => setShowTerms(false)} style={styles.modalClose}>
                <X color="#141414" size={20} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>{t(lang, 'auth.termsBody')}</Text>
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setShowTerms(false)} style={({ pressed }) => [styles.modalButton, pressed && styles.pressed]}>
              <Text style={styles.modalButtonText}>{t(lang, 'auth.modalButton')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F2' },
  scrollContent: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 30 },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingVertical: 8 },
  backText: { color: '#5F5F5F', fontSize: 13, fontWeight: '700' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 48 },
  title: { marginTop: 32, color: '#141414', fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2 },
  subtitle: { maxWidth: 370, marginTop: 9, color: '#737373', fontSize: 16, lineHeight: 23 },
  form: { marginTop: 34, padding: 20, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E8E2' },
  label: { marginBottom: 8, color: '#292929', fontSize: 12, fontWeight: '800' },
  input: { height: 48, marginBottom: 18, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DFE0DB', color: '#141414', fontSize: 15, backgroundColor: '#FAFAF8' },
  checkboxes: { gap: 14, marginBottom: 18 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: '#C8C9C2', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxActive: { borderColor: '#D8FF32', backgroundColor: '#D8FF32' },
  checkboxLabelWrap: { flex: 1, minWidth: 0 },
  checkboxLabel: { color: '#454545', fontSize: 12, lineHeight: 17 },
  linkText: { color: '#5E7515', fontWeight: '800' },
  recaptchaContainer: { alignItems: 'center', marginBottom: 18, overflow: 'hidden' },
  error: { marginBottom: 14, color: '#B42318', fontSize: 13, lineHeight: 19 },
  message: { marginBottom: 14, color: '#5E7515', fontSize: 13, lineHeight: 19 },
  submitButton: { height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#141414' },
  submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.74 },
  disabled: { opacity: 0.45 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 22 },
  switchLabel: { color: '#737373', fontSize: 13 },
  switchAction: { color: '#141414', fontSize: 13, fontWeight: '800' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,20,20,0.5)' },
  modalSheet: { width: '88%', maxWidth: 440, maxHeight: '80%', borderRadius: 22, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { color: '#141414', fontSize: 17, fontWeight: '800' },
  modalClose: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F2F3EE' },
  modalBody: { paddingHorizontal: 18, paddingVertical: 18 },
  modalText: { color: '#555555', fontSize: 13, lineHeight: 20 },
  modalButton: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#141414', marginHorizontal: 18, marginBottom: 18 },
  modalButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
