import { useMemo } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, useWindowDimensions, View, Image } from 'react-native';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, ScanLine } from 'lucide-react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { generatePriceHistory, getTrendPercent } from '@/lib/priceHistory';
import { useLanguage } from '@/providers/LanguageProvider';
import { t, translateCondition, getPriceHistoryLabels } from '@/lib/translations';

type PriceHistoryModalProps = {
  visible: boolean;
  cardId: string;
  cardName: string;
  setName: string;
  imageUrl?: string;
  currentPrice: number;
  condition?: string;
  onClose: () => void;
};

export function PriceHistoryModal({ visible, cardId, cardName, setName, imageUrl, currentPrice, condition, onClose }: PriceHistoryModalProps) {
  const { lang } = useLanguage();
  const { width } = useWindowDimensions();
  const points = useMemo(() => generatePriceHistory(cardId, currentPrice), [cardId, currentPrice]);
  const trend = getTrendPercent(points);
  const labels = getPriceHistoryLabels(lang);
  const chartWidth = Math.min(Math.max(width - 80, 260), 440);
  const chartHeight = 190;
  const padding = { top: 18, right: 12, bottom: 22, left: 12 };
  const chartValues = points.map((point) => point.price);
  const minimum = Math.min(...chartValues);
  const maximum = Math.max(...chartValues);
  const valueRange = Math.max(maximum - minimum, maximum * 0.08, 0.01);
  const path = points.map((point, index) => {
    const x = padding.left + (index / (points.length - 1)) * (chartWidth - padding.left - padding.right);
    const y = padding.top + ((maximum - point.price) / valueRange) * (chartHeight - padding.top - padding.bottom);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  const pointCoordinates = points.map((point, index) => ({
    x: padding.left + (index / (points.length - 1)) * (chartWidth - padding.left - padding.right),
    y: padding.top + ((maximum - point.price) / valueRange) * (chartHeight - padding.top - padding.bottom),
  }));
  const trendUp = trend >= 0;
  const trendColor = trendUp ? '#4C7A1E' : '#B42318';

  const pointsWithLabels = points.map((point, index) => ({ ...point, label: labels[index] ?? point.label }));

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'priceHistory.closeAlt')} onPress={onClose} style={styles.closeButton}>
              <ArrowLeft color="#141414" size={20} />
            </Pressable>
            <Text style={styles.headerTitle}>{t(lang, 'priceHistory.title')}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.cardSummary}>
            {imageUrl ? <Image accessibilityLabel={cardName} source={{ uri: imageUrl }} style={styles.cardImage} /> : <View style={[styles.cardImage, styles.imageFallback]}><ScanLine color="#789019" size={30} /></View>}
            <View style={styles.cardCopy}>
              <Text style={styles.cardName}>{cardName}</Text>
              <Text style={styles.cardSet}>{setName}</Text>
              {condition && <Text style={styles.condition}>{translateCondition(condition, lang)}</Text>}
              <Text style={styles.currentLabel}>{t(lang, 'priceHistory.currentPrice')}</Text>
              <Text style={styles.currentPrice}>${currentPrice.toFixed(2)}</Text>
            </View>
            <View style={[styles.trendPill, { backgroundColor: trendUp ? '#E8F4D5' : '#FCE9E7' }]}>
              {trendUp ? <ArrowUpRight color={trendColor} size={15} /> : <ArrowDownRight color={trendColor} size={15} />}
              <Text style={[styles.trendText, { color: trendColor }]}>{trendUp ? '+' : ''}{trend.toFixed(1)}%</Text>
            </View>
          </View>

          <View style={styles.chartSection}>
            <View style={styles.chartHeading}>
              <View><Text style={styles.chartTitle}>{t(lang, 'priceHistory.chartTitle')}</Text><Text style={styles.chartSubtitle}>{t(lang, 'priceHistory.chartSubtitle')}</Text></View>
              <Text style={styles.chartRange}>±10%</Text>
            </View>
            <Svg height={chartHeight} width={chartWidth}>
              <Line stroke="#E5E8DE" strokeWidth="1" x1={padding.left} x2={chartWidth - padding.right} y1={chartHeight - padding.bottom} y2={chartHeight - padding.bottom} />
              <Path d={path} fill="none" stroke="#8FAE20" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              {pointCoordinates.map((point, index) => <Circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} fill="#D8FF32" r="5" stroke="#141414" strokeWidth="2" />)}
            </Svg>
            <View style={[styles.chartLabels, { width: chartWidth }]}>
              {pointsWithLabels.map((point) => <Text key={point.label} style={styles.chartLabel}>{point.label}</Text>)}
            </View>
          </View>

          <View style={styles.historyValues}>
            {pointsWithLabels.slice(0, 3).map((point) => <View key={point.label}><Text style={styles.historyLabel}>{point.label}</Text><Text style={styles.historyPrice}>${point.price.toFixed(2)}</Text></View>)}
          </View>
          <Text style={styles.disclaimer}>{t(lang, 'priceHistory.disclaimer')}</Text>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,20,20,0.42)' },
  sheet: { maxHeight: '92%', width: '100%', alignSelf: 'center', maxWidth: 600, paddingHorizontal: 24, paddingBottom: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#FFFFFF' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 18 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F2F3EE' },
  headerTitle: { color: '#141414', fontSize: 15, fontWeight: '800' },
  headerSpacer: { width: 36 },
  cardSummary: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, backgroundColor: '#F7F9EF' },
  cardImage: { width: 82, height: 114, borderRadius: 8, backgroundColor: '#EAF2C7' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, minWidth: 0, marginLeft: 13 },
  cardName: { color: '#141414', fontSize: 20, fontWeight: '800' },
  cardSet: { marginTop: 3, color: '#777777', fontSize: 12 },
  condition: { alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, color: '#5E7515', backgroundColor: '#EAF3BC', fontSize: 10, fontWeight: '800' },
  currentLabel: { marginTop: 10, color: '#8B8B8B', fontSize: 10, fontWeight: '700' },
  currentPrice: { marginTop: 2, color: '#141414', fontSize: 18, fontWeight: '800' },
  trendPill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9 },
  trendText: { fontSize: 11, fontWeight: '800' },
  chartSection: { marginTop: 25, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#ECEDE8', backgroundColor: '#FFFFFF' },
  chartHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  chartTitle: { color: '#141414', fontSize: 16, fontWeight: '800' },
  chartSubtitle: { marginTop: 4, color: '#8A8A8A', fontSize: 11 },
  chartRange: { color: '#8FAE20', fontSize: 11, fontWeight: '800' },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  chartLabel: { color: '#9A9A9A', fontSize: 9 },
  historyValues: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 17, paddingHorizontal: 5 },
  historyLabel: { color: '#999999', fontSize: 9, textAlign: 'center' },
  historyPrice: { marginTop: 3, color: '#3A3A3A', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  disclaimer: { marginTop: 18, color: '#999999', fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
