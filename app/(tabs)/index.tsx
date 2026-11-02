import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Camera, Check, Heart, Search, ScanLine, User } from 'lucide-react-native';
import { PokeBinderLogo } from '@/components/PokeBinderLogo';
import { WebCamera } from '@/components/WebCamera';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useLanguage } from '@/providers/LanguageProvider';
import { t, translateCondition, getPriceHistoryLabels } from '@/lib/translations';
import { PriceHistoryModal } from '@/components/PriceHistoryModal';
import { ProfileModal } from '@/components/ProfileModal';
import { AdBanner } from '@/components/AdBanner';
import { BannedScreen } from '@/components/BannedScreen';

type Card = {
  id: number;
  apiId?: string;
  name: string;
  set: string;
  price: string;
  marketPrice?: number;
  tone: string;
  accent: string;
};

type CardCondition = 'Mint' | 'Near Mint' | 'Played';

type ApiCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set?: { name?: string };
  images?: { large?: string };
  tcgplayer?: { prices?: Record<string, { market?: number }> };
};

const conditionOptions: CardCondition[] = ['Mint', 'Near Mint', 'Played'];
const conditionMultipliers: Record<CardCondition, number> = { Mint: 1, 'Near Mint': 0.85, Played: 0.6 };

const initialCards: Card[] = [
  { id: 1, apiId: 'mock-pikachu', name: 'Pikachu', set: 'VIV 48', price: '$12.50', marketPrice: 12.5, tone: '#F7D64A', accent: '#F29C38' },
  { id: 2, apiId: 'mock-charizard', name: 'Charizard', set: 'BS 4', price: '$250.00', marketPrice: 250, tone: '#F5A06B', accent: '#E55745' },
  { id: 3, apiId: 'mock-mewtwo', name: 'Mewtwo', set: 'GEN 51', price: '$8.75', marketPrice: 8.75, tone: '#B8A5D7', accent: '#7861A8' },
  { id: 4, apiId: 'mock-eevee', name: 'Eevee', set: 'PR-SM 23', price: '$5.00', marketPrice: 5, tone: '#D8C39C', accent: '#8E7058' },
];

function MockCard({ card, compact = false }: { card: Card; compact?: boolean }) {
  return (
    <View style={[styles.mockCard, compact && styles.compactMockCard, { backgroundColor: card.tone }]}>
      <View style={[styles.mockCardArt, compact && styles.compactMockCardArt, { backgroundColor: card.accent }]}>
        <ScanLine color="#FFFFFF" size={compact ? 22 : 30} strokeWidth={1.5} />
      </View>
      <View style={styles.mockCardText}>
        <Text style={[styles.mockCardName, compact && styles.compactText]}>{card.name}</Text>
        <View style={styles.mockCardLines}>
          <View style={styles.mockCardLine} />
          <View style={[styles.mockCardLine, styles.shortLine]} />
        </View>
      </View>
    </View>
  );
}

function getMarketPriceValue(card: ApiCard): number | null {
  const prices = Object.values(card.tcgplayer?.prices ?? {});
  const marketPrice = prices.find((price) => typeof price.market === 'number')?.market;
  return typeof marketPrice === 'number' ? marketPrice : null;
}

function isApiCard(value: unknown): value is ApiCard {
  if (typeof value !== 'object' || value === null) return false;
  const card = value as Partial<ApiCard>;
  return typeof card.id === 'string' && typeof card.name === 'string' && typeof card.number === 'string';
}

export default function ScannerScreen() {
  const { lang } = useLanguage();
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [captured, setCaptured] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState<ApiCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectionMessage, setCollectionMessage] = useState<string | null>(null);
  const [condition, setCondition] = useState<CardCondition>('Near Mint');
  const [saving, setSaving] = useState(false);
  const [wishlistSaving, setWishlistSaving] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [useLiveCamera, setUseLiveCamera] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { user, banned } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [collectionCount, setCollectionCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const loadCounts = async () => {
      const [cardsResult, wishlistResult] = await Promise.all([
        supabase.from('user_cards').select('id', { count: 'exact', head: true }),
        supabase.from('user_wishlist').select('id', { count: 'exact', head: true }),
      ]);
      setCollectionCount(cardsResult.count ?? 0);
      setWishlistCount(wishlistResult.count ?? 0);
    };
    void loadCounts();
  }, [user]);

  const getMarketPrice = (card: ApiCard): string => {
    const marketPrice = getMarketPriceValue(card);
    return typeof marketPrice === 'number' ? `${marketPrice.toFixed(2)}` : t(lang, 'scanner.priceUnavailable');
  };

  const getAdjustedMarketPrice = (card: ApiCard, cond: CardCondition): string => {
    const marketPrice = getMarketPriceValue(card);
    return typeof marketPrice === 'number' ? `${(marketPrice * conditionMultipliers[cond]).toFixed(2)}` : t(lang, 'scanner.priceUnavailable');
  };

  const getAdjustedMarketPriceValue = (card: ApiCard, cond: CardCondition): number => {
    return (getMarketPriceValue(card) ?? 0) * conditionMultipliers[cond];
  };

  const searchCard = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError(t(lang, 'scanner.errorEmpty'));
      return;
    }

    setLoading(true);
    setError(null);
    setCollectionMessage(null);
    setCaptured(true);

    try {
      const numericCode = trimmedQuery.match(/^(?:[a-z]+[- ]?)?(\d{1,3})(?:\/\d{1,3})?$/i)?.[1];
      const queryValue = numericCode ? `number:${numericCode}` : `name:${trimmedQuery.split(/\s+/).pop()}`;
      const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(queryValue)}&pageSize=20`);
      if (!response.ok) throw new Error(t(lang, 'scanner.errorUnavailable'));

      const payload: unknown = await response.json();
      const data = typeof payload === 'object' && payload !== null && 'data' in payload
        ? (payload as { data?: unknown }).data
        : null;
      const apiCards = Array.isArray(data) ? data.filter(isApiCard) : [];
      const setHint = numericCode ? '' : trimmedQuery.split(/\s+/).slice(0, -1).join(' ').toLowerCase();
      const firstCard = apiCards.find((card) => setHint && card.set?.name?.toLowerCase().includes(setHint)) ?? apiCards[0];
      if (!firstCard) throw new Error(t(lang, 'scanner.errorNotFound'));

      setResult(firstCard);
      setCards((current) => [
        { id: current.length + 1, apiId: firstCard.id, name: firstCard.name, set: firstCard.set?.name ?? t(lang, 'scanner.setUnknown'), price: getMarketPrice(firstCard), marketPrice: getMarketPriceValue(firstCard) ?? 0, tone: '#D8FF32', accent: '#7F9C22' },
        ...current,
      ].slice(0, 4));
    } catch (requestError) {
      setResult(null);
      setError(requestError instanceof Error ? requestError.message : t(lang, 'scanner.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const captureCard = () => {
    void searchCard(searchText || 'Base Set Charizard');
  };

  const onCameraCapture = (dataUrl: string) => {
    setUploadedImage(dataUrl);
    setCaptured(true);
    if (searchText.trim()) {
      void searchCard(searchText);
    }
  };

  const onGalleryUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (result) {
        setUploadedImage(result);
        setCaptured(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const addToCollection = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (!result?.images?.large) {
      setCollectionMessage(t(lang, 'scanner.errorNoImage'));
      return;
    }

    setSaving(true);
    setCollectionMessage(null);
    const marketPrice = getAdjustedMarketPriceValue(result, condition);
    const { error: insertError } = await supabase.from('user_cards').insert({
      card_id_api: result.id,
      name: result.name,
      image_url: result.images.large,
      set_name: result.set?.name ?? t(lang, 'scanner.setUnknown'),
      market_price: marketPrice,
      condition,
    });
    setSaving(false);

    if (insertError) {
      setCollectionMessage(t(lang, 'scanner.errorSaveCard'));
      return;
    }
    setCollectionMessage(t(lang, 'scanner.cardAdded'));
  };

  const addToWishlist = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (!result) return;

    setWishlistSaving(true);
    setCollectionMessage(null);
    const { error: insertError } = await supabase.from('user_wishlist').insert({
      card_id_api: result.id,
      name: result.name,
      image_url: result.images?.large ?? '',
      set_name: result.set?.name ?? t(lang, 'scanner.setUnknown'),
    });
    setWishlistSaving(false);

    if (insertError) {
      setCollectionMessage(t(lang, 'scanner.errorWishlist'));
      return;
    }
    setCollectionMessage(t(lang, 'scanner.wishlistAdded'));
  };

  if (banned) return <BannedScreen />;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PokeBinderLogo size={30} showText />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'profile.title')} onPress={() => user ? setShowProfile(true) : router.push('/auth')} style={styles.profileButton}>
            <User color="#141414" size={18} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>{t(lang, 'scanner.title')}</Text>
          <Text style={styles.subtitle}>{t(lang, 'scanner.subtitle')}</Text>
        </View>

        <View style={styles.searchRow}>
          <Search color="#8A8A8A" size={18} strokeWidth={2} />
          <TextInput
            accessibilityLabel={t(lang, 'scanner.searchAlt')}
            autoCapitalize="words"
            onChangeText={setSearchText}
            onSubmitEditing={() => void searchCard(searchText)}
            placeholder={t(lang, 'scanner.searchPlaceholder')}
            placeholderTextColor="#9A9A9A"
            returnKeyType="search"
            style={styles.searchInput}
            value={searchText}
          />
          <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'scanner.search')} disabled={loading} onPress={() => void searchCard(searchText)} style={({ pressed }) => [styles.searchButton, pressed && styles.searchButtonPressed]}>
            <Text style={styles.searchButtonText}>{t(lang, 'scanner.search')}</Text>
          </Pressable>
        </View>

        <View style={styles.cameraFrame}>
          {useLiveCamera && Platform.OS === 'web' ? (
            <WebCamera
              lang={lang}
              onCapture={onCameraCapture}
              onUpload={onGalleryUpload}
            />
          ) : (
            <>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
              {uploadedImage ? (
                <Image source={{ uri: uploadedImage }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.cardGuide}><MockCard card={initialCards[1]} /></View>
              )}
              <Text style={styles.frameHint}>{t(lang, 'scanner.frameHint')}</Text>
            </>
          )}
        </View>

        {!useLiveCamera && (
          <Pressable accessibilityRole="button" onPress={() => setUseLiveCamera(true)} style={({ pressed }) => [styles.activateCameraButton, pressed && styles.pressed]}>
            <Camera color="#141414" size={20} strokeWidth={2.4} />
            <Text style={styles.activateCameraText}>{t(lang, 'scanner.capture')}</Text>
          </Pressable>
        )}
        {useLiveCamera && Platform.OS === 'web' && (
          <Pressable accessibilityRole="button" onPress={() => setUseLiveCamera(false)} style={({ pressed }) => [styles.deactivateCameraButton, pressed && styles.pressed]}>
            <Text style={styles.deactivateCameraText}>{t(lang, 'common.close')}</Text>
          </Pressable>
        )}

        <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'scanner.capture')} disabled={loading} onPress={captureCard} style={({ pressed }) => [styles.captureButton, pressed && styles.captureButtonPressed, loading && styles.captureButtonDisabled]}>
          <View style={styles.captureInner}>
            {captured ? <Check color="#141414" size={27} strokeWidth={2.8} /> : <Camera color="#141414" size={27} strokeWidth={2.8} />}
          </View>
        </Pressable>
        <Text style={styles.captureLabel}>{loading ? t(lang, 'scanner.searching') : captured ? t(lang, 'scanner.captured') : t(lang, 'scanner.capture')}</Text>

        {loading && <ActivityIndicator color="#141414" size="small" style={styles.loader} />}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {result && !loading && (
          <View style={styles.resultCard}>
            {result.images?.large ? <Image accessibilityLabel={`${result.name}`} source={{ uri: result.images.large }} style={styles.resultImage} /> : <View style={[styles.resultImage, styles.resultImageFallback]}><ScanLine color="#8EA51E" size={30} /></View>}
            <View style={styles.resultDetails}>
              <Text style={styles.resultEyebrow}>{t(lang, 'scanner.cardFound')}</Text>
              <Text style={styles.resultName}>{result.name}</Text>
              <Text style={styles.resultSet}>{result.set?.name ?? t(lang, 'scanner.setUnknown')} · #{result.number}</Text>
              <View style={styles.detailGrid}>
                <View><Text style={styles.detailLabel}>{t(lang, 'scanner.rarity')}</Text><Text style={styles.detailValue}>{result.rarity ?? t(lang, 'scanner.rarityNone')}</Text></View>
                <View><Text style={styles.detailLabel}>{t(lang, 'scanner.price')}</Text><Text style={styles.detailValue}>{getAdjustedMarketPrice(result, condition)}</Text></View>
              </View>
              <Text style={styles.conditionLabel}>{t(lang, 'scanner.condition')}</Text>
              <View style={styles.conditionOptions}>
                {conditionOptions.map((option) => (
                  <Pressable key={option} accessibilityRole="button" onPress={() => setCondition(option)} style={[styles.conditionOption, condition === option && styles.conditionOptionActive]}>
                    <Text style={[styles.conditionOptionText, condition === option && styles.conditionOptionTextActive]}>{translateCondition(option, lang)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.priceNote}>{t(lang, 'scanner.priceNote', { condition: translateCondition(condition, lang) })}</Text>
              <View style={styles.actionRow}>
                <Pressable accessibilityRole="button" disabled={saving} onPress={() => void addToCollection()} style={({ pressed }) => [styles.collectionButton, pressed && styles.collectionButtonPressed, saving && styles.collectionButtonDisabled]}>
                  <Text style={styles.collectionButtonText}>{saving ? t(lang, 'scanner.saving') : t(lang, 'scanner.addToCollection')}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'scanner.wishlist')} disabled={wishlistSaving} onPress={() => void addToWishlist()} style={({ pressed }) => [styles.wishlistButton, pressed && styles.collectionButtonPressed, wishlistSaving && styles.collectionButtonDisabled]}>
                  <Heart color="#141414" size={17} strokeWidth={2.4} />
                  <Text style={styles.wishlistButtonText}>{wishlistSaving ? '...' : t(lang, 'scanner.wishlist')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        {collectionMessage && <Text style={styles.collectionMessage}>{collectionMessage}</Text>}

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>{t(lang, 'scanner.recentScans')}</Text>
          <Text style={styles.sectionCount}>{t(lang, 'scanner.cardsCount', { n: cards.length })}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
          {cards.map((card, index) => (
            <Pressable key={`${card.id}-${index}`} accessibilityRole="button" onPress={() => setSelectedCard(card)} style={styles.scanCard}>
              <MockCard card={card} compact />
              <Text style={styles.scanName}>{index + 1}. {card.name}</Text>
              <Text style={styles.scanSet}>{card.set}</Text>
              <Text style={styles.scanPrice}>{card.price}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <AdBanner placement="scanner" />
        {selectedCard && (
          <PriceHistoryModal
            cardId={selectedCard.apiId ?? String(selectedCard.id)}
            cardName={selectedCard.name}
            currentPrice={selectedCard.marketPrice ?? 0}
            onClose={() => setSelectedCard(null)}
            setName={selectedCard.set}
            visible
          />
        )}
      </View>

      <ProfileModal
        visible={showProfile}
        userEmail={user?.email}
        userId={user?.id ?? ''}
        collectionCount={collectionCount}
        wishlistCount={wishlistCount}
        onClose={() => setShowProfile(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, backgroundColor: '#FFFFFF' },
  page: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 18, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 34 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  profileButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#FFFFFF' },
  hero: { alignItems: 'center', marginTop: 42, marginBottom: 24 },
  title: { color: '#141414', fontSize: 42, lineHeight: 48, fontWeight: '800', letterSpacing: -1.5 },
  subtitle: { color: '#7E7E7E', fontSize: 16, marginTop: 7 },
  searchRow: { flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E6E6E6', backgroundColor: '#FAFAFA', marginBottom: 16 },
  searchInput: { flex: 1, minWidth: 0, marginLeft: 9, color: '#141414', fontSize: 14, paddingVertical: 0 },
  searchButton: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9, backgroundColor: '#141414' },
  searchButtonPressed: { opacity: 0.72 },
  searchButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  cameraFrame: { height: 290, borderRadius: 24, backgroundColor: '#F1F2F0', borderWidth: 1, borderColor: '#E6E7E4', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardGuide: { width: 150, height: 210, borderRadius: 10, borderWidth: 1.5, borderColor: '#A2A59F', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', opacity: 0.55 },
  mockCard: { width: 122, height: 172, borderRadius: 9, padding: 6, borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#222222', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  mockCardArt: { flex: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  mockCardText: { height: 38, paddingTop: 4 },
  mockCardName: { color: '#141414', fontSize: 12, fontWeight: '800' },
  mockCardLines: { marginTop: 4, gap: 3 },
  mockCardLine: { width: '76%', height: 2, borderRadius: 1, backgroundColor: 'rgba(20,20,20,0.22)' },
  shortLine: { width: '48%' },
  cornerTopLeft: { position: 'absolute', top: 18, left: 18, width: 25, height: 25, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#C0C3BC' },
  cornerTopRight: { position: 'absolute', top: 18, right: 18, width: 25, height: 25, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#C0C3BC' },
  cornerBottomLeft: { position: 'absolute', bottom: 18, left: 18, width: 25, height: 25, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#C0C3BC' },
  cornerBottomRight: { position: 'absolute', bottom: 18, right: 18, width: 25, height: 25, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#C0C3BC' },
  frameHint: { position: 'absolute', bottom: 18, color: '#8C8F88', fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  captureButton: { alignSelf: 'center', marginTop: 22, width: 72, height: 72, borderRadius: 36, backgroundColor: '#D8FF32', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#141414', shadowColor: '#141414', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  captureButtonPressed: { transform: [{ scale: 0.94 }], backgroundColor: '#C5EB29' },
  captureButtonDisabled: { opacity: 0.5 },
  captureInner: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  captureLabel: { alignSelf: 'center', marginTop: 9, color: '#6D6D6D', fontSize: 12, fontWeight: '600' },
  loader: { marginTop: 13 },
  errorText: { marginTop: 18, paddingHorizontal: 14, color: '#B42318', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  resultCard: { flexDirection: 'row', marginTop: 25, padding: 14, borderRadius: 20, backgroundColor: '#F8F9F5', borderWidth: 1, borderColor: '#E5E9D7' },
  resultImage: { width: 100, height: 140, borderRadius: 9, backgroundColor: '#EAF3BC' },
  resultImageFallback: { alignItems: 'center', justifyContent: 'center' },
  resultDetails: { flex: 1, minWidth: 0, marginLeft: 14 },
  resultEyebrow: { color: '#7A8D27', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  resultName: { marginTop: 4, color: '#141414', fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  resultSet: { marginTop: 3, color: '#707070', fontSize: 12, lineHeight: 17 },
  detailGrid: { flexDirection: 'row', gap: 20, marginTop: 15 },
  detailLabel: { color: '#8A8A8A', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  detailValue: { maxWidth: 120, marginTop: 2, color: '#141414', fontSize: 12, fontWeight: '700' },
  conditionLabel: { marginTop: 15, color: '#5F5F5F', fontSize: 11, fontWeight: '800' },
  conditionOptions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  conditionOption: { paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#DDE1D1', backgroundColor: '#FFFFFF' },
  conditionOptionActive: { borderColor: '#D8FF32', backgroundColor: '#D8FF32' },
  conditionOptionText: { color: '#777777', fontSize: 10, fontWeight: '700' },
  conditionOptionTextActive: { color: '#141414' },
  priceNote: { marginTop: 8, color: '#8A8A8A', fontSize: 10, lineHeight: 14 },
  collectionButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9, backgroundColor: '#D8FF32' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 15 },
  wishlistButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: '#DDE1D1', backgroundColor: '#FFFFFF' },
  wishlistButtonText: { color: '#141414', fontSize: 11, fontWeight: '800' },
  collectionButtonPressed: { opacity: 0.7 },
  collectionButtonDisabled: { opacity: 0.5 },
  collectionButtonText: { color: '#141414', fontSize: 11, fontWeight: '800' },
  collectionMessage: { marginTop: 10, color: '#7A8D27', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  recentHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 39, marginBottom: 14 },
  sectionTitle: { color: '#141414', fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  sectionCount: { color: '#A0A0A0', fontSize: 12, fontWeight: '600' },
  cardsRow: { gap: 12, paddingRight: 24 },
  scanCard: { width: 128, padding: 8, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEEEEE', shadowColor: '#222222', shadowOpacity: 0.08, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  compactMockCard: { width: 110, height: 138, borderRadius: 7, padding: 5, shadowOpacity: 0, elevation: 0 },
  compactMockCardArt: { borderRadius: 4 },
  compactText: { fontSize: 9 },
  scanName: { color: '#181818', fontSize: 13, fontWeight: '700', marginTop: 8 },
  scanSet: { color: '#8A8A8A', fontSize: 11, marginTop: 2 },
  scanPrice: { color: '#181818', fontSize: 13, fontWeight: '800', marginTop: 3 },
  uploadedImage: { width: 150, height: 210, borderRadius: 10, resizeMode: 'cover' as const },
  activateCameraButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'center', marginTop: 18, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: '#D8FF32', borderWidth: 2, borderColor: '#141414' },
  activateCameraText: { color: '#141414', fontSize: 13, fontWeight: '800' },
  deactivateCameraButton: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F2F3EF' },
  deactivateCameraText: { color: '#777777', fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
