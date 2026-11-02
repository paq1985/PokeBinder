import { useRef } from 'react';
import { View } from 'react-native';
import ReCAPTCHA from 'react-google-recaptcha';
import { localeMap } from '@/lib/translations';
import type { Language } from '@/lib/translations';

const TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

type WebRecaptchaProps = {
  lang: Language;
  onVerify: (token: string) => void;
  onExpire: () => void;
};

export function WebRecaptcha({ lang, onVerify, onExpire }: WebRecaptchaProps) {
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleChange = (token: string | null) => {
    if (token) {
      onVerify(token);
    } else {
      onExpire();
    }
  };

  return (
    <View style={{ alignItems: 'center', marginBottom: 18 }}>
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={TEST_SITE_KEY}
        onChange={handleChange}
        onExpired={onExpire}
        hl={localeMap[lang].split('-')[0]}
        theme="light"
      />
    </View>
  );
}
