import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  banned: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        if (!data.session) setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        if (!nextSession) {
          setBanned(false);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setBanned(false);
      return;
    }

    let active = true;

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!active) return;

      if (data?.is_banned) {
        setBanned(true);
        await supabase.auth.signOut();
      } else {
        setBanned(false);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const value = useMemo(() => ({ session, user: session?.user ?? null, loading, banned }), [banned, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
