import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ExternalLink, Megaphone } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/providers/LanguageProvider';
import { t } from '@/lib/translations';

type AdData = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  click_url: string;
};

type AdBannerProps = {
  placement: 'scanner' | 'trades' | 'collection' | 'all';
};

const fallbackAd: AdData = {
  id: 'fallback',
  title: 'Il Covo del Pokémon',
  subtitle: 'Negozio online di carte collezionabili. Clicca per il 10% di sconto!',
  image_url: '',
  click_url: 'https://example.com',
};

export function AdBanner({ placement }: AdBannerProps) {
  const { lang } = useLanguage();
  const [ad, setAd] = useState<AdData>(fallbackAd);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('ad_banners')
        .select('id, title, subtitle, image_url, click_url')
        .eq('is_active', true)
        .or(`placement.eq.all,placement.eq.${placement}`)
        .order('created_at', { ascending: false })
        .limit(1);
      if (active && data && data.length > 0) {
        setAd(data[0] as AdData);
      }
    })();
    return () => {
      active = false;
    };
  }, [placement]);

  const handlePress = () => {
    if (ad.click_url) {
      void Linking.openURL(ad.click_url);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(lang, 'ad.sponsored')}: ${ad.title}`}
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.sponsoredTag}>
        <Text style={styles.sponsoredText}>{t(lang, 'ad.sponsored')}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Megaphone color="#7A8D27" size={20} strokeWidth={2} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>{ad.title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{ad.subtitle}</Text>
        </View>
        <ExternalLink color="#AAAAAA" size={16} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E9D7',
    backgroundColor: '#F8F9F1',
    overflow: 'hidden',
  },
  pressed: { opacity: 0.7 },
  sponsoredTag: {
    position: 'absolute',
    top: 6,
    right: 8,
    zIndex: 1,
  },
  sponsoredText: {
    color: '#AAAAAA',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8ECDA',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#141414',
    fontSize: 13,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: '#777777',
    fontSize: 11,
    lineHeight: 15,
  },
});
