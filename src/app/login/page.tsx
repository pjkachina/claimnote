'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setSuccess('');
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, password);
        // 登録後すぐログインされるのでそのままダッシュボードへ
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
            {success && (
              <p className="text-sm text-green-700 bg-green-50 p-3 rounded">{success}</p>
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
            <Chrome className="mr-2 h-4 w-4" />
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
