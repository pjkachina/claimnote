'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Home } from 'lucide-react';

// 型定義
interface UnitInfo {
  id: string;
  unit_number: string;
  properties: {
    name: string;
  };
}

interface Claim {
  id: string;
  unit_id: string;
  category: string;
  priority: string;
  title: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
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

export default function TenantDashboard() {
  const { user, profile, logout } = useAuth();
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // クレーム投稿フォーム
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [category, setCategory] = useState('water');
  const [priority, setPriority] = useState('normal');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 部屋情報を取得
  const fetchUnits = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('tenant_assignments')
      .select(`
        unit_id,
        units!inner(
          id,
          unit_number,
          properties!inner(name)
        )
      `)
      .eq('tenant_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching units:', error);
    } else {
      const formattedUnits = (data || []).map((item: unknown) => {
        const assignment = item as {
          unit_id: string;
          units: {
            id: string;
            unit_number: string;
            properties: { name: string };
          };
        };
        return {
          id: assignment.units.id,
          unit_number: assignment.units.unit_number,
          properties: assignment.units.properties,
        };
      });
      setUnits(formattedUnits);
      if (formattedUnits.length === 1) {
        setSelectedUnit(formattedUnits[0].id);
      }
    }
  };

  // クレーム一覧を取得
  const fetchClaims = async () => {
    if (!user || units.length === 0) return;

    const unitIds = units.map((u) => u.id);

    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .in('unit_id', unitIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching claims:', error);
    } else {
      setClaims(data || []);
    }
  };

  // 初期読み込み
  useEffect(() => {
    const loadData = async () => {
      await fetchUnits();
      setLoading(false);
    };
    loadData();
  }, [user]);

  // 部屋情報取得後にクレームを取得
  useEffect(() => {
    if (units.length > 0) {
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
    }
  }, [units, refreshKey]);

  // クレーム投稿
  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUnit) return;

    setSubmitting(true);

    const { error } = await supabase.from('claims').insert({
      unit_id: selectedUnit,
      submitted_by: user.id,
      category,
      priority,
      title: title.trim(),
      content: content.trim(),
    });

    if (error) {
      console.error('Error submitting claim:', error);
      alert('クレームの投稿に失敗しました');
    } else {
      setTitle('');
      setContent('');
      setIsDialogOpen(false);
      setRefreshKey((prev) => prev + 1);
    }

    setSubmitting(false);
  };

  // ステータスカウント
  const claimCounts = {
    pending: claims.filter((c) => c.status === 'pending').length,
    in_progress: claims.filter((c) => c.status === 'in_progress').length,
    completed: claims.filter((c) => c.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">ClaimNote</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">{profile?.display_name}</span>
            <Button variant="outline" onClick={logout} size="sm">
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* 部屋情報 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              お部屋
            </CardTitle>
          </CardHeader>
          <CardContent>
            {units.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-2">部屋に紐づいていません</p>
                <p className="text-sm text-gray-500">
                  オーナーからの招待リンクで登録してください
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {units.map((unit) => (
                  <div key={unit.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium">
                      {unit.properties.name} {unit.unit_number}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ステータスカウント */}
        {units.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
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
        )}

        {/* クレーム投稿ボタン */}
        {units.length > 0 && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger>
              <Button className="w-full mb-6">
                <Plus className="mr-2 h-4 w-4" />
                クレームを投稿
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>クレームを投稿</DialogTitle>
              </DialogHeader>
              <form onSubmit={submitClaim} className="space-y-4 pt-4">
                {/* 部屋選択（複数部屋がある場合） */}
                {units.length > 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="unit">部屋</Label>
                    <Select value={selectedUnit} onValueChange={(value) => setSelectedUnit(value || '')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.properties.name} {unit.unit_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="category">カテゴリ</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value || 'water')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water">水回り</SelectItem>
                      <SelectItem value="electric">電気</SelectItem>
                      <SelectItem value="equipment">設備</SelectItem>
                      <SelectItem value="noise">騒音・トラブル</SelectItem>
                      <SelectItem value="other">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">優先度</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value || 'normal')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">緊急（当日対応）</SelectItem>
                      <SelectItem value="high">高（1-2日以内）</SelectItem>
                      <SelectItem value="normal">通常（1週間以内）</SelectItem>
                      <SelectItem value="low">低（次回点検時）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">件名</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例：エアコンが故障しました"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">内容</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="詳細な内容を入力してください"
                    rows={4}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? '投稿中...' : '投稿'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* クレーム一覧 */}
        {units.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>クレーム一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {claims.length === 0 ? (
                <p className="text-gray-500 text-center py-8">まだクレームはありません</p>
              ) : (
                <div className="space-y-3">
                  {claims.map((claim) => (
                    <div key={claim.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
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
                        <span className="text-xs text-gray-400">
                          {new Date(claim.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
