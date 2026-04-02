'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClaimForm from './claim-form';
import ClaimList from './claim-list';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">ClaimNote</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">{user?.email}</span>
            <Button variant="outline" onClick={logout} size="sm">
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>クレーム管理</CardTitle>
          </CardHeader>
          <CardContent>
            <ClaimForm onSuccess={handleRefresh} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>クレーム一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <ClaimList key={refreshKey} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
