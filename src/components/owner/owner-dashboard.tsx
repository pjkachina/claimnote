'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PropertyManager from './property-manager';

// 型定義
interface Claim {
  id: string;
  unit_id: string;
  submitted_by: string;
  category: string;
  priority: string;
  title: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  units: {
    unit_number: string;
    properties: {
      name: string;
    };
  };
}

const categoryLabels: Record<string, string> = {
  water: '水回り',
  electric: '電気',
  equipment: '設備',
  noise: '騒音・トラブル',
  other: 'その他',
};

const priorityLabels: Record<string, string> = {
  urgent: '緊急',
  high: '高',
  normal: '通常',
  low: '低',
};

const statusLabels: Record<string, string> = {
  pending: '未対応',
  in_progress: '対応中',
  completed: '完了',
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-800',
};

const statusColors: Record<string, string> = {
  pending: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

export default function OwnerDashboard() {
  const { user, profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'properties'>('dashboard');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // クレーム一覧を取得
  const fetchClaims = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('claims')
      .select(`
        *,
        units!inner(
          unit_number,
          properties!inner(name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching claims:', error);
    } else {
      setClaims(data || []);
    }
    setLoading(false);
  };

  // 初期読み込みとRealtime購読
  useEffect(() => {
    if (!user) return;

    fetchClaims();

    // Realtime購読
    const subscription = supabase
      .channel('claims_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'claims' },
        () => fetchClaims()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, refreshKey]);

  // ステータス更新
  const updateStatus = async (claimId: string, newStatus: string) => {
    const { error } = await supabase
      .from('claims')
      .update({ status: newStatus })
      .eq('id', claimId);

    if (error) {
      console.error('Error updating status:', error);
    }
  };

  // フィルタリング
  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ステータスカウント
  const claimCounts = {
    pending: claims.filter((c) => c.status === 'pending').length,
    in_progress: claims.filter((c) => c.status === 'in_progress').length,
    completed: claims.filter((c) => c.status === 'completed').length,
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-xl font-bold">ClaimNote</h1>
            <div className="flex items-center gap-4">
              <nav className="flex gap-2">
                <Button
                  variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('dashboard')}
                >
                  ダッシュボード
                </Button>
                <Button
                  variant={activeTab === 'properties' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('properties')}
                >
                  物件管理
                </Button>
              </nav>
              <span className="text-sm text-gray-600 hidden sm:inline">{profile?.display_name}</span>
              <Button variant="outline" onClick={logout} size="sm">
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            {/* ステータスカウント */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{claimCounts.pending}</p>
                <p className="text-sm text-red-600">未対応</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-600">{claimCounts.in_progress}</p>
                <p className="text-sm text-yellow-600">対応中</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{claimCounts.completed}</p>
                <p className="text-sm text-green-600">完了</p>
              </div>
            </div>

            {/* クレーム一覧 */}
            <Card>
              <CardHeader>
                <CardTitle>クレーム一覧</CardTitle>
              </CardHeader>
              <CardContent>
                {/* 検索・フィルタ */}
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || 'all')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="pending">未対応</SelectItem>
                      <SelectItem value="in_progress">対応中</SelectItem>
                      <SelectItem value="completed">完了</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* クレームリスト */}
                {loading ? (
                  <p className="text-center py-8">読み込み中...</p>
                ) : filteredClaims.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">クレームがありません</p>
                ) : (
                  <div className="space-y-3">
                    {filteredClaims.map((claim) => (
                      <div key={claim.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-gray-500">
                              {claim.units.properties.name} · {claim.units.unit_number}
                            </p>
                            <h3 className="font-semibold">{claim.title}</h3>
                            <p className="text-sm text-gray-500">
                              {categoryLabels[claim.category]} · {priorityLabels[claim.priority]}
                            </p>
                          </div>
                          <Badge className={priorityColors[claim.priority]}>
                            {priorityLabels[claim.priority]}
                          </Badge>
                        </div>
                        <p className="text-sm">{claim.content}</p>
                        <div className="flex justify-between items-center pt-2">
                          <Badge className={statusColors[claim.status]}>
                            {statusLabels[claim.status]}
                          </Badge>
                          <Select
                            value={claim.status}
                            onValueChange={(value) => value && updateStatus(claim.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">未対応</SelectItem>
                              <SelectItem value="in_progress">対応中</SelectItem>
                              <SelectItem value="completed">完了</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>物件管理</CardTitle>
            </CardHeader>
            <CardContent>
              <PropertyManager onRefresh={handleRefresh} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
