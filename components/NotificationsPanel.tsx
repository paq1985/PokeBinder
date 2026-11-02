import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, MessageCircle, Send, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/providers/LanguageProvider';
import { t, formatDate, getNotificationTitle } from '@/lib/translations';

type AppNotification = {
  id: string;
  type: string;
  title: string;
  content: string;
  is_read: boolean;
  link_id: string;
  created_at: string;
};

type NotificationsPanelProps = {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onOpenChat: (roomId: string) => void;
};

export function NotificationsPanel({ visible, userId, onClose, onOpenChat }: NotificationsPanelProps) {
  const { lang } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, content, is_read, link_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) return;
    setNotifications((data ?? []) as AppNotification[]);
  }, [userId]);

  useEffect(() => {
    if (visible && userId) {
      void loadNotifications();
    }
  }, [visible, userId, loadNotifications]);

  const markAsRead = async (notification: AppNotification) => {
    if (!notification.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
      );
    }
    if (notification.type === 'message' && notification.link_id) {
      onOpenChat(notification.link_id);
    }
    onClose();
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unread.map((n) => n.id));
    setNotifications((current) => current.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Bell color="#141414" size={20} />
              <Text style={styles.title}>{t(lang, 'notifications.title')}</Text>
              {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
            </View>
            <View style={styles.headerRight}>
              {unreadCount > 0 && (
                <Pressable accessibilityRole="button" onPress={() => void markAllRead()} style={styles.markAllButton}>
                  <Text style={styles.markAllText}>{t(lang, 'notifications.markAll')}</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'common.close')} onPress={onClose} style={styles.closeButton}>
                <X color="#141414" size={20} />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.centerBody}><Text style={styles.emptyText}>{t(lang, 'chat.loading')}</Text></View>
          ) : notifications.length === 0 ? (
            <View style={styles.centerBody}>
              <View style={styles.emptyIcon}><Bell color="#CCCCCC" size={28} /></View>
              <Text style={styles.emptyTitle}>{t(lang, 'notifications.empty')}</Text>
              <Text style={styles.emptyText}>{t(lang, 'notifications.emptyHint')}</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {notifications.map((notification) => (
                <Pressable
                  key={notification.id}
                  accessibilityRole="button"
                  onPress={() => void markAsRead(notification)}
                  style={[styles.item, !notification.is_read && styles.itemUnread]}
                >
                  <View style={[styles.itemIcon, notification.type === 'message' ? styles.itemIconMessage : styles.itemIconComment]}>
                    {notification.type === 'message' ? <Send color="#FFFFFF" size={15} /> : <MessageCircle color="#FFFFFF" size={15} />}
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemTitle}>{getNotificationTitle(notification.type, lang)}</Text>
                    <Text style={styles.itemContent} numberOfLines={2}>{notification.content}</Text>
                    <Text style={styles.itemTime}>{formatDate(notification.created_at, lang)}</Text>
                  </View>
                  {!notification.is_read && <View style={styles.unreadDot} />}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,20,20,0.42)' },
  sheet: { height: '80%', width: '100%', alignSelf: 'center', maxWidth: 600, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#141414', fontSize: 20, fontWeight: '800' },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, backgroundColor: '#E55745' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markAllButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F0F5D8' },
  markAllText: { color: '#5E7515', fontSize: 11, fontWeight: '700' },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F2F3EE' },
  centerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F3EE', marginBottom: 14 },
  emptyTitle: { color: '#141414', fontSize: 18, fontWeight: '800' },
  emptyText: { marginTop: 7, color: '#999999', fontSize: 13, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  item: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 15, borderWidth: 1, borderColor: '#EEEEEE', backgroundColor: '#FFFFFF' },
  itemUnread: { borderColor: '#D8FF32', backgroundColor: '#FCFEEF' },
  itemIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemIconComment: { backgroundColor: '#7F9C22' },
  itemIconMessage: { backgroundColor: '#141414' },
  itemCopy: { flex: 1, minWidth: 0 },
  itemTitle: { color: '#141414', fontSize: 14, fontWeight: '800' },
  itemContent: { marginTop: 4, color: '#666666', fontSize: 13, lineHeight: 18 },
  itemTime: { marginTop: 6, color: '#AAAAAA', fontSize: 10 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4, backgroundColor: '#E55745' },
});
