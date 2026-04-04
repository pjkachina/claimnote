'use client';

import { useAuth } from '@/lib/auth-context';
import LoginPage from './login/page';
import OwnerDashboard from '@/components/owner/owner-dashboard';
import TenantDashboard from '@/components/tenant/tenant-dashboard';

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
