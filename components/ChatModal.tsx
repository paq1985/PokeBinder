import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, Flag, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { cleanText } from '@/lib/moderation';
import { ReportModal } from '@/components/ReportModal';
import { useLanguage } from '@/providers/LanguageProvider';
import { t, formatTimeOnly } from '@/lib/translations';

type ChatMessage = {
  id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
};

type ChatModalProps = {
  visible: boolean;
  roomId: string | null;
  currentUserId: string;
  otherUserLabel: string;
  recipientId: string;
  onClose: () => void;
};

export function ChatModal({ visible, roomId, currentUserId, otherUserLabel, recipientId, onClose }: ChatModalProps) {
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadMessages = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('chat_messages')
      .select('id, sender_id, message_text, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    setLoading(false);
    if (queryError) {
      setError(t(lang, 'chat.errorLoad'));
      return;
    }
    setMessages((data ?? []) as ChatMessage[]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [roomId, lang]);

  useEffect(() => {
    if (visible && roomId) {
      void loadMessages();
    }
  }, [visible, roomId, loadMessages]);

  const sendMessage = async () => {
    if (!roomId || !inputText.trim()) return;
    setSending(true);
    setError(null);
    const cleanMsg = cleanText(inputText.trim());
    const { data, error: insertError } = await supabase
      .from('chat_messages')
      .insert({ room_id: roomId, message_text: cleanMsg })
      .select('id, sender_id, message_text, created_at')
      .single();
    setSending(false);
    if (insertError || !data) {
      setError(t(lang, 'chat.errorSend'));
      return;
    }
    setMessages((current) => [...current, data as ChatMessage]);
    setInputText('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    void supabase.from('notifications').insert({
      user_id: recipientId,
      type: 'message',
      title: t(lang, 'chat.newMessageNotif'),
      content: cleanMsg.slice(0, 80),
      link_id: roomId,
    });
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.sheetInner}>
            <View style={styles.header}>
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'chat.closeAlt')} onPress={onClose} style={styles.closeButton}>
                <ArrowLeft color="#141414" size={20} />
              </Pressable>
              <View style={styles.headerInfo}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{otherUserLabel.slice(0, 1).toUpperCase()}</Text></View>
                <Text style={styles.headerTitle} numberOfLines={1}>{otherUserLabel}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'chat.reportAlt')} onPress={() => setShowReport(true)} style={styles.reportChatButton}>
                <Flag color="#E55745" size={18} />
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.centerBody}><Text style={styles.loadingText}>{t(lang, 'chat.loading')}</Text></View>
            ) : error ? (
              <View style={styles.centerBody}><Text style={styles.errorText}>{error}</Text></View>
            ) : messages.length === 0 ? (
              <View style={styles.centerBody}><Text style={styles.emptyText}>{t(lang, 'chat.empty')}</Text></View>
            ) : (
              <ScrollView ref={scrollRef} contentContainerStyle={styles.messagesList} showsVerticalScrollIndicator={false}>
                {messages.map((message) => {
                  const isMine = message.sender_id === currentUserId;
                  return (
                    <View key={message.id} style={[styles.messageRow, isMine && styles.messageRowMine]}>
                      <View style={[styles.messageBubble, isMine ? styles.messageBubbleMine : styles.messageBubbleTheirs]}>
                        <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextTheirs]}>{message.message_text}</Text>
                      </View>
                      <Text style={styles.messageTime}>{formatTimeOnly(message.created_at, lang)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.inputBar}>
              <TextInput
                accessibilityLabel={t(lang, 'chat.writeAlt')}
                onChangeText={setInputText}
                placeholder={t(lang, 'chat.placeholder')}
                placeholderTextColor="#9A9A9A"
                style={styles.input}
                value={inputText}
              />
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'chat.sendAlt')} disabled={sending || !inputText.trim()} onPress={() => void sendMessage()} style={({ pressed }) => [styles.sendButton, (sending || !inputText.trim()) && styles.sendButtonDisabled, pressed && styles.pressed]}>
                <Send color="#FFFFFF" size={18} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
      <ReportModal
        visible={showReport}
        reportedUserId={recipientId}
        contentType="chat"
        contentId={roomId ?? ''}
        onClose={() => setShowReport(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,20,20,0.42)' },
  sheet: { height: '90%', width: '100%', alignSelf: 'center', maxWidth: 600, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#FFFFFF' },
  sheetInner: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F2F3EE' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, marginLeft: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8FF32' },
  avatarText: { color: '#141414', fontSize: 14, fontWeight: '800' },
  headerTitle: { flex: 1, minWidth: 0, color: '#141414', fontSize: 16, fontWeight: '800' },
  reportChatButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FDF5F4' },
  centerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingText: { color: '#999999', fontSize: 13 },
  errorText: { color: '#B42318', fontSize: 13, textAlign: 'center' },
  emptyText: { color: '#999999', fontSize: 13, textAlign: 'center' },
  messagesList: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  messageRow: { maxWidth: '78%', alignSelf: 'flex-start' },
  messageRowMine: { alignSelf: 'flex-end' },
  messageBubble: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16 },
  messageBubbleMine: { backgroundColor: '#D8FF32' },
  messageBubbleTheirs: { backgroundColor: '#F2F3EE' },
  messageText: { fontSize: 14, lineHeight: 19 },
  messageTextMine: { color: '#141414' },
  messageTextTheirs: { color: '#333333' },
  messageTime: { marginTop: 4, color: '#AAAAAA', fontSize: 9 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  input: { flex: 1, height: 42, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E0E1D9', backgroundColor: '#FAFAFA', color: '#141414', fontSize: 14 },
  sendButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141414' },
  sendButtonDisabled: { opacity: 0.35 },
  pressed: { opacity: 0.72 },
});
