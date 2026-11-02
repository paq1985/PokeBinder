import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeftRight, Bell, ChevronDown, ChevronUp, Flag, Mail, MapPin, MessageCircle, Plus, Send, Sparkles, Trash2, User, X } from 'lucide-react-native';
import { PokeBinderLogo } from '@/components/PokeBinderLogo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useLanguage } from '@/providers/LanguageProvider';
import { t, formatDistance, formatDate, translateCondition } from '@/lib/translations';
import { ChatModal } from '@/components/ChatModal';
import { ProfileModal } from '@/components/ProfileModal';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { AdBanner } from '@/components/AdBanner';
import { ReportModal } from '@/components/ReportModal';
import { BannedScreen } from '@/components/BannedScreen';
import { cleanText } from '@/lib/moderation';
import type { Language } from '@/lib/translations';

type Coordinates = { latitude: number; longitude: number };
type Radius = 5 | 50 | 500 | null;

type TradePost = {
  id: string;
  user_id: string;
  card_name: string;
  card_image_url: string;
  card_condition: string;
  card_set_name: string;
  card_market_price: number;
  wanted_card_name: string;
  note: string;
  latitude: number;
  longitude: number;
  created_at: string;
};

type TradeComment = {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
};

type WishlistEntry = { name: string; card_id_api: string };

type CollectionCard = {
  id: string;
  name: string;
  image_url: string;
  set_name: string;
  market_price: number;
  condition: string;
  card_id_api: string;
};

type ChatRoom = {
  id: string;
  user_one: string;
  user_two: string;
  created_at: string;
};

function requestLocation(lang: Language): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error(t(lang, 'trades.errorLocationDevice')));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error(t(lang, 'trades.errorLocationPermission'))),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  });
}

function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const latitudeOne = (from.latitude * Math.PI) / 180;
  const latitudeTwo = (to.latitude * Math.PI) / 180;
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitudeOne) * Math.cos(latitudeTwo);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function getDisplayName(email: string | undefined): string {
  if (!email) return 'Collector';
  return email.split('@')[0];
}

type CommentSectionProps = {
  postId: string;
  postOwnerId: string;
  currentUserId: string | undefined;
  displayName: string;
  lang: Language;
};

function CommentSection({ postId, postOwnerId, currentUserId, displayName, lang }: CommentSectionProps) {
  const [comments, setComments] = useState<TradeComment[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sending, setSending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    setCommentError(null);
    const { data, error: queryError } = await supabase
      .from('trade_comments')
      .select('id, post_id, user_id, user_name, comment_text, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setLoadingComments(false);
    if (queryError) {
      setCommentError(t(lang, 'comments.errorLoad'));
      return;
    }
    setComments((data ?? []) as TradeComment[]);
  }, [postId, lang]);

  const toggleExpanded = () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    if (nextExpanded && comments.length === 0) {
      void loadComments();
    }
  };

  const sendComment = async () => {
    if (!currentUserId) {
      router.push('/auth');
      return;
    }
    if (!commentText.trim()) return;
    setSending(true);
    setCommentError(null);
    const { data, error: insertError } = await supabase
      .from('trade_comments')
      .insert({ post_id: postId, user_name: displayName, comment_text: cleanText(commentText.trim()) })
      .select('id, post_id, user_id, user_name, comment_text, created_at')
      .single();
    setSending(false);
    if (insertError || !data) {
      setCommentError(t(lang, 'comments.errorSend'));
      return;
    }
    setComments((current) => [...current, data as TradeComment]);
    setCommentText('');
    if (postOwnerId !== currentUserId) {
      void supabase.from('notifications').insert({
        user_id: postOwnerId,
        type: 'comment',
        title: t(lang, 'comments.newCommentNotif'),
        content: t(lang, 'comments.commentedNotif', { name: displayName }),
        link_id: postId,
      });
    }
  };

  const deleteComment = async (commentId: string) => {
    const { error: deleteError } = await supabase.from('trade_comments').delete().eq('id', commentId);
    if (deleteError) return;
    setComments((current) => current.filter((comment) => comment.id !== commentId));
  };

  const count = comments.length;

  return (
    <View style={styles.commentSection}>
      <Pressable accessibilityRole="button" onPress={toggleExpanded} style={styles.commentToggle}>
        <MessageCircle color="#777777" size={15} />
        <Text style={styles.commentToggleText}>{t(lang, 'comments.title', { count })}</Text>
        {expanded ? <ChevronUp color="#777777" size={15} /> : <ChevronDown color="#777777" size={15} />}
      </Pressable>

      {expanded && (
        <View style={styles.commentBody}>
          {loadingComments ? (
            <ActivityIndicator color="#999999" size="small" style={styles.commentLoader} />
          ) : commentError ? (
            <Text style={styles.commentErrorText}>{commentError}</Text>
          ) : count === 0 ? (
            <Text style={styles.commentEmpty}>{t(lang, 'comments.empty')}</Text>
          ) : (
            <View style={styles.commentList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{comment.user_name.slice(0, 1).toUpperCase()}</Text></View>
                  <View style={styles.commentCopy}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{comment.user_name || t(lang, 'trades.collector')}</Text>
                      <Text style={styles.commentDate}>{formatDate(comment.created_at, lang)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.comment_text}</Text>
                  </View>
                  {comment.user_id === currentUserId && (
                    <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'comments.deleteAlt')} onPress={() => void deleteComment(comment.id)} style={styles.commentDelete}>
                      <Trash2 color="#B42318" size={14} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}

          {currentUserId ? (
            <View style={styles.commentComposer}>
              <TextInput
                accessibilityLabel={t(lang, 'comments.writeAlt')}
                onChangeText={setCommentText}
                placeholder={t(lang, 'comments.placeholder')}
                placeholderTextColor="#9A9A9A"
                style={styles.commentInput}
                value={commentText}
              />
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'comments.sendAlt')} disabled={sending || !commentText.trim()} onPress={() => void sendComment()} style={({ pressed }) => [styles.commentSend, (sending || !commentText.trim()) && styles.commentSendDisabled, pressed && styles.pressed]}>
                <Send color="#FFFFFF" size={16} />
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => router.push('/auth')} style={styles.commentLoginPrompt}>
              <Text style={styles.commentLoginText}>{t(lang, 'comments.loginToComment')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const radiusOptions: Radius[] = [null, 5, 50, 500];

export default function TradesScreen() {
  const { lang } = useLanguage();
  const { user, loading: authLoading, banned } = useAuth();
  const [posts, setPosts] = useState<TradePost[]>([]);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [radius, setRadius] = useState<Radius>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [offeredCard, setOfferedCard] = useState<CollectionCard | null>(null);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [userCards, setUserCards] = useState<CollectionCard[]>([]);
  const [wantedCard, setWantedCard] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeChatLabel, setActiveChatLabel] = useState('');
  const [activeRecipientId, setActiveRecipientId] = useState('');
  const [showInbox, setShowInbox] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ userId: string; contentId: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collectionCount, setCollectionCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const displayName = getDisplayName(user?.email);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    const [postsResult, wishlistResult] = await Promise.all([
      supabase
        .from('trade_posts')
        .select('id, user_id, card_name, card_image_url, card_condition, card_set_name, card_market_price, wanted_card_name, note, latitude, longitude, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('user_wishlist').select('name, card_id_api'),
    ]);
    setLoading(false);
    if (postsResult.error) {
      setError(t(lang, 'trades.errorLoadPosts'));
      return;
    }
    setPosts((postsResult.data ?? []) as TradePost[]);
    setWishlist(!wishlistResult.error && wishlistResult.data ? (wishlistResult.data as WishlistEntry[]) : []);
    void loadChatRooms();
  };

  const loadChatRooms = async () => {
    const { data, error: roomError } = await supabase
      .from('chat_rooms')
      .select('id, user_one, user_two, created_at')
      .or(`user_one.eq.${user?.id},user_two.eq.${user?.id}`)
      .order('created_at', { ascending: false });
    if (roomError) return;
    setChatRooms((data ?? []) as ChatRoom[]);
  };

  const loadUnreadCount = async () => {
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user?.id ?? '')
      .eq('is_read', false);
    if (!countError && typeof count === 'number') {
      setUnreadCount(count);
    }
  };

  const loadCounts = async () => {
    if (!user) return;
    const [cardsResult, wishlistResult, collectionResult] = await Promise.all([
      supabase.from('user_cards').select('id', { count: 'exact', head: true }),
      supabase.from('user_wishlist').select('id', { count: 'exact', head: true }),
      supabase.from('user_cards').select('id, name, image_url, set_name, market_price, condition, card_id_api').order('created_at', { ascending: false }),
    ]);
    setCollectionCount(cardsResult.count ?? 0);
    setWishlistCount(wishlistResult.count ?? 0);
    if (!collectionResult.error && collectionResult.data) {
      setUserCards(collectionResult.data as CollectionCard[]);
    }
  };

  const refreshLocation = async () => {
    setLocationLoading(true);
    setError(null);
    try {
      const nextLocation = await requestLocation(lang);
      setLocation(nextLocation);
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : t(lang, 'trades.errorReadLocation'));
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadPosts();
    void refreshLocation();
    void loadUnreadCount();
    void loadCounts();
  }, [user]);

  const postsWithDistance = useMemo(() => posts.map((post) => ({
    post,
    distance: location ? haversineDistanceKm(location, { latitude: post.latitude, longitude: post.longitude }) : null,
    isMatch: wishlist.some((entry) => entry.name.toLowerCase() === post.card_name.toLowerCase()),
  })).sort((first, second) => {
    if (first.isMatch !== second.isMatch) return first.isMatch ? -1 : 1;
    if (first.distance === null && second.distance === null) return 0;
    if (first.distance === null) return 1;
    if (second.distance === null) return -1;
    return first.distance - second.distance;
  }), [location, posts, wishlist]);

  const visiblePosts = useMemo(() => postsWithDistance.filter(({ distance }) => radius === null || (distance !== null && distance <= radius)), [postsWithDistance, radius]);

  const openChat = async (postUserId: string) => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (postUserId === user.id) return;

    const { data: existing } = await supabase
      .from('chat_rooms')
      .select('id')
      .or(`and(user_one.eq.${user.id},user_two.eq.${postUserId}),and(user_one.eq.${postUserId},user_two.eq.${user.id})`)
      .maybeSingle();

    if (existing?.id) {
      setActiveRoomId(existing.id);
      setActiveChatLabel(t(lang, 'trades.collector'));
      setActiveRecipientId(postUserId);
      return;
    }

    const { data: newRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({ user_one: user.id, user_two: postUserId })
      .select('id')
      .single();
    if (roomError || !newRoom) return;
    setActiveRoomId(newRoom.id);
    setActiveChatLabel(t(lang, 'trades.collector'));
    setActiveRecipientId(postUserId);
    void loadChatRooms();
  };

  const publishPost = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (!offeredCard || !wantedCard.trim()) {
      setComposerError(t(lang, 'trades.errorEmptyFields'));
      return;
    }

    setComposerError(null);
    let currentLocation = location;
    if (!currentLocation) {
      try {
        currentLocation = await requestLocation(lang);
        setLocation(currentLocation);
      } catch (locationError) {
        setComposerError(locationError instanceof Error ? locationError.message : t(lang, 'trades.errorLocation'));
        return;
      }
    }

    const roundedLatitude = Math.round(currentLocation.latitude * 100) / 100;
    const roundedLongitude = Math.round(currentLocation.longitude * 100) / 100;
    const { error: insertError } = await supabase.from('trade_posts').insert({
      card_name: offeredCard.name,
      card_image_url: offeredCard.image_url,
      card_condition: offeredCard.condition,
      card_set_name: offeredCard.set_name,
      card_market_price: offeredCard.market_price,
      wanted_card_name: cleanText(wantedCard.trim()),
      note: cleanText(note.trim()),
      latitude: roundedLatitude,
      longitude: roundedLongitude,
    });

    if (insertError) {
      setComposerError(t(lang, 'trades.errorPublish'));
      return;
    }
    setOfferedCard(null);
    setWantedCard('');
    setNote('');
    setShowCardPicker(false);
    setShowComposer(false);
    await loadPosts();
  };

  if (authLoading) return <View style={styles.center}><ActivityIndicator color="#141414" /></View>;

  if (banned) return <BannedScreen />;

  if (!user) {
    return (
      <View style={styles.center}>
        <View style={styles.icon}><ArrowLeftRight color="#141414" size={28} strokeWidth={2} /></View>
        <Text style={styles.title}>{t(lang, 'trades.title')}</Text>
        <Text style={styles.subtitle}>{t(lang, 'trades.subtitle')}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/auth')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>{t(lang, 'trades.loginButton')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <PokeBinderLogo size={28} showText />
            <Text style={styles.title}>{t(lang, 'trades.title')}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'notifications.title')} onPress={() => setShowNotifications(true)} style={[styles.inboxButton, unreadCount > 0 && styles.bellButtonActive]}>
              <Bell color="#141414" size={18} />
              {unreadCount > 0 && <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>{unreadCount}</Text></View>}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'profile.title')} onPress={() => setShowProfile(true)} style={[styles.inboxButton, showProfile && styles.inboxButtonActive]}>
              <User color="#141414" size={18} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'trades.myConversations')} onPress={() => setShowInbox((v) => !v)} style={[styles.inboxButton, showInbox && styles.inboxButtonActive]}>
              <Mail color="#141414" size={18} />
              {chatRooms.length > 0 && <View style={styles.inboxBadge}><Text style={styles.inboxBadgeText}>{chatRooms.length}</Text></View>}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setShowComposer((value) => !value); setComposerError(null); }} style={styles.addButton}>
              {showComposer ? <X color="#141414" size={19} /> : <Plus color="#141414" size={19} />}
              <Text style={styles.addButtonText}>{showComposer ? t(lang, 'trades.close') : t(lang, 'trades.publish')}</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtitleLeft}>{t(lang, 'trades.subtitleLeft')}</Text>

        {showInbox && (
          <View style={styles.inbox}>
            <Text style={styles.inboxTitle}>{t(lang, 'trades.myConversations')}</Text>
            {chatRooms.length === 0 ? (
              <Text style={styles.inboxEmpty}>{t(lang, 'trades.noChats')}</Text>
            ) : (
              <View style={styles.inboxList}>
                {chatRooms.map((room) => {
                  const otherId = room.user_one === user.id ? room.user_two : room.user_one;
                  return (
                    <Pressable key={room.id} accessibilityRole="button" onPress={() => { setActiveRoomId(room.id); setActiveChatLabel(t(lang, 'trades.collector')); setActiveRecipientId(otherId); }} style={styles.inboxItem}>
                      <View style={styles.inboxAvatar}><Text style={styles.inboxAvatarText}>C</Text></View>
                      <View style={styles.inboxCopy}>
                        <Text style={styles.inboxName}>{t(lang, 'trades.collector')}</Text>
                        <Text style={styles.inboxSub}>{t(lang, 'trades.tapToOpen')}</Text>
                      </View>
                      <ChevronDown color="#AAAAAA" size={16} style={{ transform: [{ rotate: '-90deg' }] }} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {showComposer && (
          <View style={styles.composer}>
            <Text style={styles.composerTitle}>{t(lang, 'trades.createAd')}</Text>
            <Text style={styles.label}>{t(lang, 'trades.offer')}</Text>
            {userCards.length === 0 ? (
              <View style={styles.emptyBinderBox}>
                <Text style={styles.emptyBinderText}>{t(lang, 'trades.emptyBinder')}</Text>
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setShowCardPicker((v) => !v)} style={styles.cardPickerButton}>
                <Text style={offeredCard ? styles.cardPickerText : styles.cardPickerPlaceholder} numberOfLines={1}>
                  {offeredCard ? offeredCard.name : t(lang, 'trades.selectCard')}
                </Text>
                <ChevronDown color="#777777" size={18} style={showCardPicker ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </Pressable>
            )}
            {showCardPicker && userCards.length > 0 && (
              <View style={styles.cardPickerList}>
                <ScrollView nestedScrollEnabled style={styles.cardPickerScroll} showsVerticalScrollIndicator={false}>
                  {userCards.map((card) => (
                    <Pressable
                      key={card.id}
                      accessibilityRole="button"
                      onPress={() => { setOfferedCard(card); setShowCardPicker(false); }}
                      style={[styles.cardPickerItem, offeredCard?.id === card.id && styles.cardPickerItemActive]}
                    >
                      <View style={styles.cardPickerIcon}><Text style={styles.cardPickerIconText}>{card.name.slice(0, 1).toUpperCase()}</Text></View>
                      <View style={styles.cardPickerCopy}>
                        <Text style={styles.cardPickerName} numberOfLines={1}>{card.name}</Text>
                        <Text style={styles.cardPickerSub} numberOfLines={1}>{card.set_name} · {card.condition}</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            {offeredCard && (
              <View style={styles.cardInfoBox}>
                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>{t(lang, 'trades.setLabel')}</Text>
                  <Text style={styles.cardInfoValue}>{offeredCard.set_name}</Text>
                </View>
                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>{t(lang, 'trades.conditionLabel')}</Text>
                  <Text style={styles.cardInfoValue}>{translateCondition(offeredCard.condition, lang)}</Text>
                </View>
                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>{t(lang, 'trades.priceLabel')}</Text>
                  <Text style={styles.cardInfoValue}>${offeredCard.market_price.toFixed(2)}</Text>
                </View>
              </View>
            )}
            <Text style={styles.label}>{t(lang, 'trades.want')}</Text>
            <TextInput onChangeText={setWantedCard} placeholder="Blastoise" placeholderTextColor="#9A9A9A" style={styles.input} value={wantedCard} />
            <Text style={styles.label}>{t(lang, 'trades.noteOptional')}</Text>
            <TextInput multiline onChangeText={setNote} placeholder="..." placeholderTextColor="#9A9A9A" style={[styles.input, styles.noteInput]} value={note} />
            {composerError && <Text style={styles.error}>{composerError}</Text>}
            <Pressable accessibilityRole="button" disabled={userCards.length === 0} onPress={() => void publishPost()} style={({ pressed }) => [styles.publishButton, pressed && styles.pressed, userCards.length === 0 && styles.disabled]}>
              <Text style={styles.publishButtonText}>{t(lang, 'trades.publishButton')}</Text>
            </Pressable>
            <Text style={styles.privacyNote}>{t(lang, 'trades.privacyNote')}</Text>
          </View>
        )}

        <View style={styles.locationRow}>
          <View style={styles.locationIcon}><MapPin color="#5E7515" size={16} /></View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationTitle}>{location ? t(lang, 'trades.locationActive') : t(lang, 'trades.locationInactive')}</Text>
            <Text style={styles.locationText}>{location ? t(lang, 'trades.locationActiveSub') : t(lang, 'trades.locationInactiveSub')}</Text>
          </View>
          <Pressable accessibilityRole="button" disabled={locationLoading} onPress={() => void refreshLocation()}>
            <Text style={styles.refreshText}>{locationLoading ? '...' : t(lang, 'trades.refresh')}</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {radiusOptions.map((value) => {
            const label = value === null ? t(lang, 'filter.worldwide') : t(lang, `filter.${value}km`);
            return <Pressable key={label} onPress={() => setRadius(value)} style={[styles.filter, radius === value && styles.filterActive]}><Text style={[styles.filterText, radius === value && styles.filterTextActive]}>{label}</Text></Pressable>;
          })}
        </ScrollView>

        {error && <Text style={styles.error}>{error}</Text>}
        {loading ? <ActivityIndicator color="#141414" style={styles.feedLoader} /> : visiblePosts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><ArrowLeftRight color="#141414" size={22} /></View>
            <Text style={styles.emptyTitle}>{posts.length === 0 ? t(lang, 'trades.noPosts') : t(lang, 'trades.noPostsInRadius')}</Text>
            <Text style={styles.emptyText}>{posts.length === 0 ? t(lang, 'trades.noPostsHint') : t(lang, 'trades.noPostsInRadiusHint')}</Text>
          </View>
        ) : (
          <View style={styles.feed}>
            {visiblePosts.map(({ post, distance, isMatch }, index) => (
              <View key={post.id}>
                <View style={[styles.postCard, isMatch && styles.postCardMatch]}>
                  <View style={styles.cardVisual}>{post.card_image_url ? <Image source={{ uri: post.card_image_url }} style={styles.cardVisualImage} /> : <Text style={styles.cardVisualText}>{post.card_name.slice(0, 1).toUpperCase()}</Text>}</View>
                  <View style={styles.postContent}>
                    {isMatch && (
                      <View style={styles.matchBadge}>
                        <Sparkles color="#5E2A0E" size={13} />
                        <Text style={styles.matchBadgeText}>{t(lang, 'trades.matchBadge')}</Text>
                      </View>
                    )}
                    <View style={styles.distancePill}><MapPin color="#5E7515" size={13} /><Text style={styles.distanceText}>{formatDistance(distance, lang)}</Text></View>
                    <Text style={styles.offerLabel}>{t(lang, 'trades.offerLabel')}</Text>
                    <Text style={styles.postTitle}>{post.card_name}</Text>
                    {post.card_condition && <Text style={styles.postCondition}>{translateCondition(post.card_condition, lang)}</Text>}
                    <Text style={styles.wantedText}>{t(lang, 'trades.wantsLabel')} <Text style={styles.wantedStrong}>{post.wanted_card_name}</Text></Text>
                    {post.note ? <Text style={styles.postNote} numberOfLines={2}>{post.note}</Text> : null}
                    <View style={styles.postActions}>
                      <CommentSection postId={post.id} postOwnerId={post.user_id} currentUserId={user.id} displayName={displayName} lang={lang} />
                      <View style={styles.postActionRow}>
                        {post.user_id !== user.id && (
                          <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'trades.message')} onPress={() => void openChat(post.user_id)} style={styles.messageButton}>
                            <Mail color="#141414" size={15} />
                            <Text style={styles.messageButtonText}>{t(lang, 'trades.message')}</Text>
                          </Pressable>
                        )}
                        {post.user_id !== user.id && (
                          <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'trades.report')} onPress={() => setReportTarget({ userId: post.user_id, contentId: post.id })} style={styles.reportButton}>
                            <Flag color="#E55745" size={14} />
                            <Text style={styles.reportButtonText}>{t(lang, 'trades.report')}</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
                {index > 0 && index % 4 === 0 && <AdBanner placement="trades" />}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>

      <ChatModal
        visible={activeRoomId !== null}
        roomId={activeRoomId}
        currentUserId={user.id}
        otherUserLabel={activeChatLabel}
        recipientId={activeRecipientId}
        onClose={() => { setActiveRoomId(null); void loadUnreadCount(); }}
      />
      <ProfileModal
        visible={showProfile}
        userEmail={user.email}
        userId={user.id}
        collectionCount={collectionCount}
        wishlistCount={wishlistCount}
        onClose={() => setShowProfile(false)}
      />
      <NotificationsPanel
        visible={showNotifications}
        userId={user.id}
        onClose={() => { setShowNotifications(false); void loadUnreadCount(); }}
        onOpenChat={(roomId) => { const room = chatRooms.find((r) => r.id === roomId); setActiveRoomId(roomId); setActiveChatLabel(t(lang, 'trades.collector')); if (room) setActiveRecipientId(room.user_one === user.id ? room.user_two : room.user_one); }}
      />
      <ReportModal
        visible={reportTarget !== null}
        reportedUserId={reportTarget?.userId ?? ''}
        contentType="post"
        contentId={reportTarget?.contentId ?? ''}
        onClose={() => setReportTarget(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, backgroundColor: '#FFFFFF' },
  page: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  icon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8FF32', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { marginTop: 5, color: '#141414', fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { maxWidth: 330, color: '#737373', fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 8 },
  subtitleLeft: { marginTop: 7, color: '#737373', fontSize: 14 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, backgroundColor: '#D8FF32' },
  addButtonText: { color: '#141414', fontSize: 12, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 12, borderRadius: 14, backgroundColor: '#F8F9F1' },
  locationIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8FF32' },
  locationCopy: { flex: 1, minWidth: 0, marginLeft: 9 },
  locationTitle: { color: '#303030', fontSize: 12, fontWeight: '800' },
  locationText: { marginTop: 2, color: '#7E7E7E', fontSize: 11 },
  refreshText: { color: '#5E7515', fontSize: 12, fontWeight: '800' },
  filters: { gap: 8, paddingVertical: 18 },
  filter: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#FFFFFF' },
  filterActive: { borderColor: '#D8FF32', backgroundColor: '#D8FF32' },
  filterText: { color: '#777777', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#141414' },
  composer: { marginTop: 20, padding: 17, borderRadius: 18, backgroundColor: '#F8F9F1', borderWidth: 1, borderColor: '#E6E9D5' },
  composerTitle: { marginBottom: 16, color: '#141414', fontSize: 17, fontWeight: '800' },
  label: { marginBottom: 7, color: '#454545', fontSize: 11, fontWeight: '800' },
  input: { height: 44, marginBottom: 13, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E0E1D9', backgroundColor: '#FFFFFF', color: '#141414', fontSize: 13 },
  noteInput: { height: 70, paddingTop: 12, textAlignVertical: 'top' },
  publishButton: { alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#141414' },
  publishButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  privacyNote: { marginTop: 9, color: '#858585', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  disabled: { opacity: 0.5 },
  emptyBinderBox: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E8C0C0', backgroundColor: '#FDF5F4', marginBottom: 13 },
  emptyBinderText: { color: '#B42318', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  cardPickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 13, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E0E1D9', backgroundColor: '#FFFFFF' },
  cardPickerText: { flex: 1, color: '#141414', fontSize: 13, fontWeight: '700' },
  cardPickerPlaceholder: { flex: 1, color: '#9A9A9A', fontSize: 13 },
  cardPickerList: { marginBottom: 13, borderRadius: 12, borderWidth: 1, borderColor: '#E0E1D9', backgroundColor: '#FAFAFA', overflow: 'hidden' },
  cardPickerScroll: { maxHeight: 200 },
  cardPickerItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#ECECEC' },
  cardPickerItemActive: { backgroundColor: '#F0F5D8' },
  cardPickerIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8FF32' },
  cardPickerIconText: { color: '#5E7515', fontSize: 16, fontWeight: '900' },
  cardPickerCopy: { flex: 1, minWidth: 0 },
  cardPickerName: { color: '#141414', fontSize: 13, fontWeight: '700' },
  cardPickerSub: { marginTop: 2, color: '#9A9A9A', fontSize: 10 },
  cardInfoBox: { marginBottom: 13, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E6E9D5', backgroundColor: '#F8F9F1' },
  cardInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  cardInfoLabel: { color: '#777777', fontSize: 11, fontWeight: '700' },
  cardInfoValue: { color: '#141414', fontSize: 11, fontWeight: '800' },
  error: { marginTop: 12, color: '#B42318', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  feedLoader: { marginTop: 34 },
  emptyState: { alignItems: 'center', marginTop: 55, paddingHorizontal: 24 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8FF32', marginBottom: 14 },
  emptyTitle: { color: '#141414', fontSize: 18, fontWeight: '800' },
  emptyText: { marginTop: 7, color: '#858585', fontSize: 13, textAlign: 'center' },
  feed: { gap: 12 },
  postCard: { flexDirection: 'row', padding: 12, borderRadius: 17, borderWidth: 1, borderColor: '#E9E9E9', backgroundColor: '#FFFFFF', shadowColor: '#222222', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  postCardMatch: { borderColor: '#F5C842', backgroundColor: '#FFFBF0', shadowColor: '#E8A200', shadowOpacity: 0.16 },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#FFE9A8', marginBottom: 8 },
  matchBadgeText: { color: '#5E2A0E', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  cardVisual: { width: 72, height: 102, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8FF32', overflow: 'hidden' },
  cardVisualImage: { width: '100%', height: '100%', borderRadius: 9 },
  cardVisualText: { color: '#5E7515', fontSize: 34, fontWeight: '900' },
  postContent: { flex: 1, minWidth: 0, marginLeft: 13 },
  distancePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F0F5D8' },
  distanceText: { color: '#5E7515', fontSize: 10, fontWeight: '800' },
  offerLabel: { marginTop: 10, color: '#9A9A9A', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  postTitle: { marginTop: 2, color: '#141414', fontSize: 17, fontWeight: '800' },
  postCondition: { alignSelf: 'flex-start', marginTop: 5, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, color: '#5E7515', backgroundColor: '#EAF3BC', fontSize: 9, fontWeight: '800' },
  wantedText: { marginTop: 5, color: '#777777', fontSize: 12 },
  wantedStrong: { color: '#141414', fontWeight: '700' },
  postNote: { marginTop: 7, color: '#888888', fontSize: 11, lineHeight: 16 },
  commentSection: { marginTop: 12 },
  commentToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 9, backgroundColor: '#F4F5F0' },
  commentToggleText: { flex: 1, color: '#666666', fontSize: 12, fontWeight: '700' },
  commentBody: { marginTop: 10 },
  commentLoader: { marginVertical: 8 },
  commentErrorText: { color: '#B42318', fontSize: 11, lineHeight: 16 },
  commentEmpty: { color: '#9A9A9A', fontSize: 12, lineHeight: 17, paddingVertical: 6 },
  commentList: { gap: 10 },
  commentItem: { flexDirection: 'row', gap: 8 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8ECDA' },
  commentAvatarText: { color: '#5E7515', fontSize: 12, fontWeight: '800' },
  commentCopy: { flex: 1, minWidth: 0 },
  commentHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  commentAuthor: { color: '#141414', fontSize: 12, fontWeight: '800' },
  commentDate: { color: '#9A9A9A', fontSize: 9 },
  commentText: { marginTop: 3, color: '#444444', fontSize: 12, lineHeight: 17 },
  commentDelete: { padding: 4 },
  commentComposer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  commentInput: { flex: 1, height: 38, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E0E1D9', backgroundColor: '#FFFFFF', color: '#141414', fontSize: 12 },
  commentSend: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141414' },
  commentSendDisabled: { opacity: 0.35 },
  commentLoginPrompt: { alignItems: 'center', marginTop: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E0E1D9' },
  commentLoginText: { color: '#777777', fontSize: 12, fontWeight: '700' },
  primaryButton: { marginTop: 24, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 11, backgroundColor: '#D8FF32' },
  primaryButtonText: { color: '#141414', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inboxButton: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#FFFFFF' },
  inboxButtonActive: { borderColor: '#D8FF32', backgroundColor: '#F0F5D8' },
  inboxBadge: { position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, backgroundColor: '#141414' },
  inboxBadgeText: { color: '#D8FF32', fontSize: 9, fontWeight: '800' },
  inbox: { marginTop: 14, padding: 15, borderRadius: 17, borderWidth: 1, borderColor: '#E6E9D5', backgroundColor: '#F8F9F1' },
  inboxTitle: { marginBottom: 11, color: '#141414', fontSize: 15, fontWeight: '800' },
  inboxEmpty: { color: '#8A8A8A', fontSize: 12, lineHeight: 17 },
  inboxList: { gap: 8 },
  inboxItem: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E5' },
  inboxAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8FF32' },
  inboxAvatarText: { color: '#141414', fontSize: 14, fontWeight: '800' },
  inboxCopy: { flex: 1, minWidth: 0 },
  inboxName: { color: '#141414', fontSize: 13, fontWeight: '800' },
  inboxSub: { marginTop: 2, color: '#9A9A9A', fontSize: 10 },
  postActions: { marginTop: 8, gap: 8 },
  messageButton: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#DDE1D1', backgroundColor: '#FFFFFF' },
  messageButtonText: { color: '#141414', fontSize: 11, fontWeight: '800' },
  postActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  reportButton: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#F0D5D0', backgroundColor: '#FDF5F4' },
  reportButtonText: { color: '#E55745', fontSize: 11, fontWeight: '800' },
  bellButtonActive: { borderColor: '#E55745' },
  bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, backgroundColor: '#E55745' },
  bellBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
});
