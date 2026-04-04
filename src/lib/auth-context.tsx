'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

// プロファイル型定義
interface Profile {
  id: string;
  role: 'owner' | 'tenant' | 'contractor';
  display_name: string;
}

// 認証コンテキストの型定義
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: 'owner' | 'tenant' | 'contractor' | null;
  profile: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'owner' | 'tenant' | 'contractor' | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // プロファイル情報を取得する関数
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return data as Profile;
  };

  useEffect(() => {
    // 初期セッションの取得
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        if (profileData) {
          setProfile(profileData);
          setRole(profileData.role);
        }
      }
      
      setLoading(false);
    });

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        if (profileData) {
          setProfile(profileData);
          setRole(profileData.role);
        }
      } else {
        setProfile(null);
        setRole(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signup = async (email: string, password: string, userRole: string, displayName: string) => {
    // Supabase Authにユーザー登録（metadataにroleとdisplay_nameを含める）
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: userRole,
          display_name: displayName,
        },
      },
    });
    
    if (error) throw error;
    
    // 登録後すぐにログイン
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) throw loginError;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, profile, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
