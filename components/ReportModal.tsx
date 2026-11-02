import { useState } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Flag, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/providers/LanguageProvider';
import { t } from '@/lib/translations';

type ReportModalProps = {
  visible: boolean;
  reportedUserId: string;
  contentType: 'post' | 'chat';
  contentId: string;
  onClose: () => void;
};

type Reason = 'offensive' | 'scam' | 'other';

const reasonKeys: Record<Reason, string> = {
  offensive: 'report.reasonOffensive',
  scam: 'report.reasonScam',
  other: 'report.reasonOther',
};

export function ReportModal({ visible, reportedUserId, contentType, contentId, onClose }: ReportModalProps) {
  const { lang } = useLanguage();
  const [reason, setReason] = useState<Reason>('offensive');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonLabels: Record<Reason, string> = {
    offensive: t(lang, 'report.reasonOffensive'),
    scam: t(lang, 'report.reasonScam'),
    other: t(lang, 'report.reasonOther'),
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from('reports').insert({
      reported_user_id: reportedUserId,
      content_type: contentType,
      content_id: contentId,
      reason: reasonLabels[reason],
      description: description.trim(),
    });
    setSubmitting(false);
    if (insertError) {
      setError(t(lang, 'report.error'));
      return;
    }
    setSubmitted(true);
  };

  const handleClose = () => {
    setReason('offensive');
    setDescription('');
    setError(null);
    setSubmitted(false);
    onClose();
  };

  const reasonOptions: Reason[] = ['offensive', 'scam', 'other'];

  return (
    <Modal animationType="fade" onRequestClose={handleClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Flag color="#E55745" size={20} />
              <Text style={styles.title}>{t(lang, 'report.title')}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'common.close')} onPress={handleClose} style={styles.closeButton}>
              <X color="#141414" size={20} />
            </Pressable>
          </View>

          {submitted ? (
            <View style={styles.body}>
              <View style={styles.successIcon}><Flag color="#5E7515" size={28} /></View>
              <Text style={styles.successTitle}>{t(lang, 'report.successTitle')}</Text>
              <Text style={styles.successText}>{t(lang, 'report.successText')}</Text>
              <Pressable accessibilityRole="button" onPress={handleClose} style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}>
                <Text style={styles.doneButtonText}>{t(lang, 'report.done')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.body}>
              <Text style={styles.label}>{t(lang, 'report.reason')}</Text>
              <View style={styles.reasonRow}>
                {reasonOptions.map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    onPress={() => setReason(option)}
                    style={[styles.reasonOption, reason === option && styles.reasonOptionActive]}
                  >
                    <Text style={[styles.reasonText, reason === option && styles.reasonTextActive]}>{reasonLabels[option]}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>{t(lang, 'report.description')}</Text>
              <TextInput
                accessibilityLabel={t(lang, 'report.descriptionAlt')}
                multiline
                onChangeText={setDescription}
                placeholder={t(lang, 'report.descriptionPlaceholder')}
                placeholderTextColor="#9A9A9A"
                style={styles.textArea}
                value={description}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void submit()} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, submitting && styles.disabled]}>
                <Text style={styles.submitButtonText}>{submitting ? t(lang, 'report.submitting') : t(lang, 'report.submit')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,20,20,0.5)' },
  sheet: { width: '88%', maxWidth: 420, borderRadius: 22, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#141414', fontSize: 18, fontWeight: '800' },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F2F3EE' },
  body: { paddingHorizontal: 18, paddingVertical: 20 },
  label: { marginBottom: 8, color: '#454545', fontSize: 12, fontWeight: '800' },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  reasonOption: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#E0E1D9', backgroundColor: '#FFFFFF' },
  reasonOptionActive: { borderColor: '#E55745', backgroundColor: '#FDF0EF' },
  reasonText: { color: '#777777', fontSize: 12, fontWeight: '700' },
  reasonTextActive: { color: '#E55745' },
  textArea: { height: 80, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E1D9', backgroundColor: '#FAFAFA', color: '#141414', fontSize: 13, textAlignVertical: 'top', marginBottom: 16 },
  error: { marginBottom: 12, color: '#B42318', fontSize: 12, textAlign: 'center' },
  submitButton: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#E55745' },
  submitButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
  successIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F5D8', alignSelf: 'center', marginBottom: 16 },
  successTitle: { color: '#141414', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  successText: { marginTop: 7, color: '#858585', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  doneButton: { alignItems: 'center', paddingVertical: 13, borderRadius: 12, backgroundColor: '#141414' },
  doneButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
