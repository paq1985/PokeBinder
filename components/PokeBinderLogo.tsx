import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';
import { Text } from 'react-native';

type LogoProps = {
  size?: number;
  showText?: boolean;
};

export function PokeBinderLogo({ size = 36, showText = false }: LogoProps) {
  const iconSize = size;
  const fontSize = Math.round(size * 0.58);

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { width: iconSize, height: iconSize, borderRadius: iconSize * 0.3 }]}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
          {/* Binder silhouette (black, side profile) */}
          <Path
            d="M12 10 L12 38 L36 38 L36 14 L30 14 L30 10 Z"
            fill="#141414"
          />
          {/* Binder rings */}
          <Line x1="12" y1="18" x2="36" y2="18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <Circle cx="16" cy="18" r="2" fill="#FFFFFF" />
          <Circle cx="24" cy="18" r="2" fill="#FFFFFF" />
          <Circle cx="32" cy="18" r="2" fill="#FFFFFF" />
          {/* Pokéball emerging from cover - yellow */}
          <Circle cx="30" cy="28" r="7" fill="#D8FF32" />
          <Path d="M23 28 L37 28" stroke="#141414" strokeWidth="1.5" strokeLinecap="round" />
          <Circle cx="30" cy="28" r="2.5" fill="#141414" />
          <Circle cx="30" cy="28" r="1.2" fill="#D8FF32" />
        </Svg>
      </View>
      {showText && <Text style={[styles.text, { fontSize }]}>PokeBinder</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  text: { marginLeft: 10, color: '#141414', fontWeight: '800', letterSpacing: -0.6 },
});
