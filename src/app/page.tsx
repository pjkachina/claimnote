'use client';

import { useAuth } from '@/lib/auth-context';
import LoginPage from './login/page';
import OwnerDashboard from '@/components/owner/owner-dashboard';
import { Button } from '@/components/ui/button';

// テナントダッシュボード（プレースホルダー）
function TenantDashboard() {
  const { profile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">ClaimNote</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{profile?.display_name}（テナント）</span>
            <Button variant="outline" onClick={logout} size="sm">
              ログアウト
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">テナント画面（準備中）</h2>
          <p className="text-gray-600 mb-4">
            クレーム投稿機能は現在開発中です。<br />
            Phase 3で実装予定です。
          </p>
          <Button variant="outline" onClick={logout}>
            ログアウト
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // ロール別に表示を切り替え
  if (role === 'owner') {
    return <OwnerDashboard />;
  }

  if (role === 'tenant') {
    return <TenantDashboard />;
  }

  // roleがnullの場合（ロード中やエラー時）はログイン画面に戻す
  return <LoginPage />;
}
