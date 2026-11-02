import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, ImagePlus, ScanLine } from 'lucide-react-native';
import { useLanguage } from '@/providers/LanguageProvider';
import { t } from '@/lib/translations';
import type { Language } from '@/lib/translations';

type WebCameraProps = {
  onCapture: (dataUrl: string) => void;
  onUpload: (file: File) => void;
  lang: Language;
};

type CameraState = 'loading' | 'live' | 'error';

export function WebCamera({ onCapture, onUpload, lang }: WebCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraState, setCameraState] = useState<CameraState>('loading');

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          if (mounted) setCameraState('error');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraState('live');
      } catch {
        if (mounted) setCameraState('error');
      }
    };

    void startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL('image/jpeg', 0.85));
  };

  const pickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onUpload(file);
    if (event.target) event.target.value = '';
  };

  if (cameraState === 'loading') {
    return (
      <View style={styles.wrapper}>
        <View style={styles.centerContent}>
          <ActivityIndicator color="#141414" size="small" />
        </View>
      </View>
    );
  }

  if (cameraState === 'error') {
    return (
      <View style={styles.wrapper}>
        <View style={styles.errorContent}>
          <View style={styles.errorIcon}>
            <ScanLine color="#8A8A8A" size={28} strokeWidth={1.5} />
          </View>
          <Text style={styles.errorText}>{t(lang, 'scanner.cameraError')}</Text>
          <Pressable accessibilityRole="button" onPress={pickFile} style={({ pressed }) => [styles.galleryButton, pressed && styles.pressed]}>
            <ImagePlus color="#141414" size={18} />
            <Text style={styles.galleryButtonText}>{t(lang, 'scanner.uploadFromGallery')}</Text>
          </Pressable>
        </View>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <View style={styles.overlay}>
        <View style={styles.scanCorners}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(lang, 'scanner.capture')}
        onPress={takePhoto}
        style={({ pressed }) => [styles.captureButton, pressed && styles.pressed]}
      >
        <Camera color="#141414" size={24} strokeWidth={2.8} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(lang, 'scanner.uploadFromGallery')}
        onPress={pickFile}
        style={({ pressed }) => [styles.gallerySmallButton, pressed && styles.pressed]}
      >
        <ImagePlus color="#141414" size={18} />
      </Pressable>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCorners: {
    width: 180,
    height: 240,
  },
  cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#D8FF32' },
  cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#D8FF32' },
  cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#D8FF32' },
  cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#D8FF32' },
  captureButton: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D8FF32',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#141414',
  },
  gallerySmallButton: {
    position: 'absolute',
    bottom: 18,
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D8FF32',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#141414',
  },
  errorContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  errorIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F2F0', marginBottom: 16 },
  errorText: { color: '#777777', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 18 },
  galleryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#D8FF32' },
  galleryButtonText: { color: '#141414', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
