'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'owner' | 'tenant'>('owner');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      setError('Googleログインに失敗しました。もう一度お試しください。');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, password, role, displayName);
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Email not confirmed')) {
        setError('メールアドレスの確認が完了していません。届いた確認メールのリンクをクリックしてください。');
      } else if (message.includes('Invalid login credentials')) {
        setError('メールアドレスまたはパスワードが正しくありません。');
      } else if (message.includes('User already registered')) {
        setError('このメールアドレスはすでに登録されています。ログインしてください。');
      } else {
        setError('エラーが発生しました。もう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ClaimNote</CardTitle>
          <CardDescription>
            テナントクレーム管理ツール
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ロール選択（新規登録時のみ表示） */}
            {isSignup && (
              <>
                <div className="space-y-2">
                  <Label>アカウントタイプ</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={role === 'owner' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setRole('owner')}
                    >
                      物件オーナー
                    </Button>
                    <Button
                      type="button"
                      variant={role === 'tenant' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setRole('tenant')}
                    >
                      テナント
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">お名前</Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={role === 'owner' ? '例：山田不動産' : '例：山田太郎'}
                    required
                  />
                </div>

                {role === 'tenant' && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                    💡 テナントの方は、オーナーから届いた招待リンクからご登録いただくと、自動的に部屋と紐付けられます。
                  </p>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '処理中...' : isSignup ? '新規登録' : 'ログイン'}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">または</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Googleでログイン
          </Button>
          <p className="mt-4 text-center text-sm">
            {isSignup ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでないですか？'}
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="ml-1 text-blue-600 hover:underline"
            >
              {isSignup ? 'ログイン' : '新規登録'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
