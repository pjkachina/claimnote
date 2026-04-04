'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// 型定義
interface InvitationData {
  id: string;
  unit_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  units: {
    unit_number: string;
    properties: {
      name: string;
    };
  };
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { user, login, signup } = useAuth();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // ログインフォーム
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // 招待情報を取得
  useEffect(() => {
    const fetchInvitation = async () => {
      // RPCを使用してRLSをバイパスして招待情報を取得
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          id,
          unit_id,
          token,
          expires_at,
          used_at,
          used_by,
          units!inner(
            unit_number,
            properties!inner(name)
          )
        `)
        .eq('token', token)
        .single();

      if (error || !data) {
        setError('無効な招待リンクです');
        setLoading(false);
        return;
      }

      const invitationData = data as unknown as InvitationData;

      // 使用済みチェック
      if (invitationData.used_at) {
        setError('この招待リンクは使用済みです');
        setLoading(false);
        return;
      }

      // 期限切れチェック
      if (new Date(invitationData.expires_at) < new Date()) {
        setError('この招待リンクは期限切れです');
        setLoading(false);
        return;
      }

      setInvitation(invitationData);
      setLoading(false);
    };

    fetchInvitation();
  }, [token]);

  // 参加処理（ログイン済みユーザー）
  const handleJoin = async () => {
    if (!user || !invitation) return;

    setIsJoining(true);

    try {
      // tenant_assignmentsにINSERT
      const { error: assignError } = await supabase.from('tenant_assignments').insert({
        unit_id: invitation.unit_id,
        tenant_id: user.id,
      });

      if (assignError) throw assignError;

      // invitationsを更新
      const { error: inviteError } = await supabase
        .from('invitations')
        .update({
          used_by: user.id,
          used_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (inviteError) throw inviteError;

      // ダッシュボードへリダイレクト
      router.push('/');
    } catch (err) {
      console.error('Error joining:', err);
      setError('参加処理に失敗しました。もう一度お試しください。');
      setIsJoining(false);
    }
  };

  // 新規登録して参加
  const handleSignupAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    setAuthLoading(true);
    setError('');

    try {
      // テナントとして新規登録
      await signup(email, password, 'tenant', displayName);

      // 登録後、自動的に参加処理を実行
      //（useEffectでuserが更新された後に実行される）
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('User already registered')) {
        setError('このメールアドレスはすでに登録されています。ログインしてください。');
      } else {
        setError('登録に失敗しました。もう一度お試しください。');
      }
      setAuthLoading(false);
    }
  };

  // ログインして参加
  const handleLoginAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    setAuthLoading(true);
    setError('');

    try {
      await login(email, password);
      // ログイン後、useEffectでuserが更新されたら参加処理
    } catch {
      setError('メールアドレスまたはパスワードが正しくありません。');
      setAuthLoading(false);
    }
  };

  // ユーザーが変更されたら参加処理を実行
  useEffect(() => {
    if (user && invitation && !invitation.used_at) {
      handleJoin();
    }
  }, [user, invitation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button className="w-full mt-4" onClick={() => router.push('/')}>
              トップページへ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  const propertyName = invitation.units.properties.name;
  const unitNumber = invitation.units.unit_number;

  // ログイン済みの場合
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>部屋への参加</CardTitle>
            <CardDescription>
              {propertyName} {unitNumber}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              この部屋に入居者として登録します。
              <br />
              よろしいですか？
            </p>
            <Button onClick={handleJoin} className="w-full" disabled={isJoining}>
              {isJoining ? '処理中...' : '参加する'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 未ログインの場合
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>部屋への参加</CardTitle>
          <CardDescription>
            {propertyName} {unitNumber}
            <br />
            入居者として登録します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* タブ切り替え */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={isLoginMode ? 'ghost' : 'default'}
              className="flex-1"
              onClick={() => setIsLoginMode(false)}
            >
              新規登録
            </Button>
            <Button
              variant={isLoginMode ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => setIsLoginMode(true)}
            >
              ログイン
            </Button>
          </div>

          {isLoginMode ? (
            // ログインフォーム
            <form onSubmit={handleLoginAndJoin} className="space-y-4">
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
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? '処理中...' : 'ログインして参加'}
              </Button>
            </form>
          ) : (
            // 新規登録フォーム
            <form onSubmit={handleSignupAndJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">お名前</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例：山田太郎"
                  required
                />
              </div>
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
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? '処理中...' : '登録して参加'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
