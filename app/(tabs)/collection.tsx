import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Heart, Layers3, User } from 'lucide-react-native';
import { PokeBinderLogo } from '@/components/PokeBinderLogo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useLanguage } from '@/providers/LanguageProvider';
import { t, translateCondition } from '@/lib/translations';
import { PriceHistoryModal } from '@/components/PriceHistoryModal';
import { ProfileModal } from '@/components/ProfileModal';
import { AdBanner } from '@/components/AdBanner';
import { BannedScreen } from '@/components/BannedScreen';

type CardCondition = 'Mint' | 'Near Mint' | 'Played';
type CollectionTab = 'cards' | 'wishlist';

type UserCard = {
  id: string;
  name: string;
  image_url: string;
  set_name: string;
  market_price: number;
  condition: CardCondition;
};

type WishlistCard = {
  id: string;
  name: string;
  image_url: string;
  set_name: string;
  card_id_api: string;
};

export default function CollectionScreen() {
  const { lang } = useLanguage();
  const { user, loading: authLoading, banned } = useAuth();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [wishlist, setWishlist] = useState<WishlistCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [selectedWishlist, setSelectedWishlist] = useState<WishlistCard | null>(null);
  const [activeTab, setActiveTab] = useState<CollectionTab>('cards');
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (!user) {
        setCards([]);
        setWishlist([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const [cardsResult, wishlistResult] = await Promise.all([
        supabase.from('user_cards').select('id, name, image_url, set_name, market_price, condition').order('created_at', { ascending: false }),
        supabase.from('user_wishlist').select('id, name, image_url, set_name, card_id_api').order('created_at', { ascending: false }),
      ]);

      if (!active) return;
      setLoading(false);

      if (cardsResult.error || wishlistResult.error) {
        setError(t(lang, 'collection.errorLoad'));
        return;
      }
      setCards((cardsResult.data ?? []) as UserCard[]);
      setWishlist((wishlistResult.data ?? []) as WishlistCard[]);
    };

    void loadData();
    return () => {
      active = false;
    };
  }, [user, lang]);

  const totalValue = cards.reduce((total, card) => total + (Number(card.market_price) || 0), 0);

  if (banned) return <BannedScreen />;

  if (authLoading || loading) {
    return <View style={styles.center}><ActivityIndicator color="#141414" size="small" /></View>;
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <View style={styles.icon}><Layers3 color="#141414" size={28} strokeWidth={2} /></View>
        <Text style={styles.title}>{t(lang, 'collection.title')}</Text>
        <Text style={styles.subtitle}>{t(lang, 'collection.subtitle')}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/auth')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>{t(lang, 'collection.loginButton')}</Text>
          <ArrowRight color="#141414" size={17} strokeWidth={2.5} />
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <PokeBinderLogo size={28} showText />
            <Text style={styles.title}>{t(lang, 'collection.title')}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'profile.title')} onPress={() => user ? setShowProfile(true) : router.push('/auth')} style={styles.profileButton}>
            <User color="#141414" size={18} />
          </Pressable>
        </View>

        <View style={styles.valueCard}>
          <View>
            <Text style={styles.valueLabel}>{t(lang, 'collection.estimatedValue')}</Text>
            <Text style={styles.value}>${totalValue.toFixed(2)}</Text>
          </View>
          <View style={styles.valueBadge}><Text style={styles.valueBadgeText}>{cards.length} {cards.length === 1 ? t(lang, 'collection.cardSingular') : t(lang, 'collection.cardPlural')}</Text></View>
        </View>

        <View style={styles.tabToggle}>
          <Pressable accessibilityRole="button" onPress={() => setActiveTab('cards')} style={[styles.tabOption, activeTab === 'cards' && styles.tabOptionActive]}>
            <Text style={[styles.tabOptionText, activeTab === 'cards' && styles.tabOptionTextActive]}>{t(lang, 'collection.myCards')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setActiveTab('wishlist')} style={[styles.tabOption, activeTab === 'wishlist' && styles.tabOptionActive]}>
            <View style={styles.tabOptionInner}>
              <Heart color={activeTab === 'wishlist' ? '#141414' : '#777777'} size={13} strokeWidth={2.4} />
              <Text style={[styles.tabOptionText, activeTab === 'wishlist' && styles.tabOptionTextActive]}>{t(lang, 'collection.mySearches')}</Text>
            </View>
          </Pressable>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {activeTab === 'cards' && !error && (
          cards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{t(lang, 'collection.empty')}</Text>
              <Text style={styles.emptyText}>{t(lang, 'collection.emptyHint')}</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {cards.map((card) => (
                <Pressable key={card.id} accessibilityRole="button" onPress={() => setSelectedCard(card)} style={styles.card}>
                  <Image accessibilityLabel={card.name} source={{ uri: card.image_url }} style={styles.cardImage} />
                  <Text numberOfLines={1} style={styles.cardName}>{card.name}</Text>
                  <Text numberOfLines={1} style={styles.cardSet}>{card.set_name}</Text>
                  <View style={styles.cardMeta}><Text style={styles.cardCondition}>{translateCondition(card.condition, lang)}</Text><Text style={styles.cardPrice}>${(Number(card.market_price) || 0).toFixed(2)}</Text></View>
                </Pressable>
              ))}
            </View>
          )
        )}

        {activeTab === 'wishlist' && !error && (
          wishlist.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyWishlistIcon}><Heart color="#5E7515" size={22} strokeWidth={2.4} /></View>
              <Text style={styles.emptyTitle}>{t(lang, 'collection.wishlistEmpty')}</Text>
              <Text style={styles.emptyText}>{t(lang, 'collection.wishlistEmptyHint')}</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {wishlist.map((card) => (
                <Pressable key={card.id} accessibilityRole="button" onPress={() => setSelectedWishlist(card)} style={styles.card}>
                  {card.image_url ? <Image accessibilityLabel={card.name} source={{ uri: card.image_url }} style={styles.cardImage} /> : <View style={[styles.cardImage, styles.wishlistImageFallback]}><Heart color="#8FAE20" size={26} /></View>}
                  <Text numberOfLines={1} style={styles.cardName}>{card.name}</Text>
                  <Text numberOfLines={1} style={styles.cardSet}>{card.set_name}</Text>
                  <View style={styles.wishlistBadge}><Heart color="#5E7515" size={11} strokeWidth={2.6} /><Text style={styles.wishlistBadgeText}>{t(lang, 'collection.searching')}</Text></View>
                </Pressable>
              ))}
            </View>
          )
        )}

        <AdBanner placement="collection" />

        {selectedCard && (
          <PriceHistoryModal
            cardId={selectedCard.id}
            cardName={selectedCard.name}
            condition={selectedCard.condition}
            currentPrice={Number(selectedCard.market_price) || 0}
            imageUrl={selectedCard.image_url}
            onClose={() => setSelectedCard(null)}
            setName={selectedCard.set_name}
            visible
          />
        )}
        {selectedWishlist && (
          <PriceHistoryModal
            cardId={selectedWishlist.card_id_api}
            cardName={selectedWishlist.name}
            currentPrice={0}
            imageUrl={selectedWishlist.image_url || undefined}
            onClose={() => setSelectedWishlist(null)}
            setName={selectedWishlist.set_name}
            visible
          />
        )}

        <ProfileModal
          visible={showProfile}
          userEmail={user.email}
          userId={user.id}
          collectionCount={cards.length}
          wishlistCount={wishlist.length}
          onClose={() => setShowProfile(false)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, backgroundColor: '#FFFFFF' },
  page: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  icon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8FF32', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { marginTop: 5, color: '#141414', fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { maxWidth: 320, color: '#737373', fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 8 },
  logoutButton: { padding: 10, borderRadius: 12, backgroundColor: '#F3F3F1' },
  profileButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#FFFFFF' },
  valueCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, padding: 18, borderRadius: 18, backgroundColor: '#141414' },
  valueLabel: { color: '#BEBEBE', fontSize: 12, fontWeight: '600' },
  value: { marginTop: 3, color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.7 },
  valueBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: '#D8FF32' },
  valueBadgeText: { color: '#141414', fontSize: 11, fontWeight: '800' },
  tabToggle: { flexDirection: 'row', gap: 8, marginTop: 24, padding: 4, borderRadius: 12, backgroundColor: '#F2F3EF' },
  tabOption: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  tabOptionActive: { backgroundColor: '#FFFFFF', shadowColor: '#222222', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tabOptionInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabOptionText: { color: '#777777', fontSize: 12, fontWeight: '800' },
  tabOptionTextActive: { color: '#141414' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 },
  card: { width: '48%', padding: 9, borderRadius: 16, borderWidth: 1, borderColor: '#E9E9E9', backgroundColor: '#FFFFFF', shadowColor: '#222222', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cardImage: { width: '100%', height: 190, borderRadius: 10, backgroundColor: '#EEF2D9' },
  wishlistImageFallback: { alignItems: 'center', justifyContent: 'center' },
  cardName: { marginTop: 10, color: '#141414', fontSize: 15, fontWeight: '800' },
  cardSet: { marginTop: 3, color: '#858585', fontSize: 11 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  cardCondition: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, color: '#5E7515', backgroundColor: '#F0F5D8', fontSize: 10, fontWeight: '800' },
  cardPrice: { color: '#141414', fontSize: 14, fontWeight: '800' },
  wishlistBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F0F5D8' },
  wishlistBadgeText: { color: '#5E7515', fontSize: 10, fontWeight: '800' },
  emptyState: { alignItems: 'center', marginTop: 68, paddingHorizontal: 24 },
  emptyWishlistIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F5D8', marginBottom: 14 },
  emptyTitle: { color: '#141414', fontSize: 19, fontWeight: '800' },
  emptyText: { marginTop: 7, color: '#858585', fontSize: 14, textAlign: 'center' },
  error: { marginTop: 20, color: '#B42318', fontSize: 13, textAlign: 'center' },
  primaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 11, backgroundColor: '#D8FF32' },
  primaryButtonText: { color: '#141414', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
