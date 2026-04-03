'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface Claim {
  id: string;
  tenant_name: string;
  category: string;
  priority: string;
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

interface ClaimListProps {
  onRefresh?: () => void;
}

export default function ClaimList({ onRefresh }: ClaimListProps) {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;

    fetchClaims();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('claims_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'claims', filter: `user_id=eq.${user.id}` },
        () => fetchClaims()
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user]);

  const fetchClaims = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching claims:', error);
    } else {
      setClaims(data || []);
      setLoading(false);
      onRefresh?.();
    }
  };

  const updateStatus = async (claimId: string, newStatus: string) => {
    const { error } = await supabase
      .from('claims')
      .update({ status: newStatus })
      .eq('id', claimId);
    
    if (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredClaims = claims.filter((claim) => {
    const matchesSearch = 
      claim.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const claimCounts = {
    pending: claims.filter((c) => c.status === 'pending').length,
    in_progress: claims.filter((c) => c.status === 'in_progress').length,
    completed: claims.filter((c) => c.status === 'completed').length,
  };

  if (loading) {
    return <p className="text-center py-8">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
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

      <div className="flex gap-2">
        <Input
          placeholder="検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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

      {filteredClaims.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          クレームが見つかりません
        </p>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim) => (
            <div key={claim.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{claim.tenant_name}</h3>
                  <p className="text-sm text-gray-500">
                    {categoryLabels[claim.category]} · {priorityLabels[claim.priority]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className={priorityColors[claim.priority]}>
                    {priorityLabels[claim.priority]}
                  </Badge>
                </div>
              </div>
              <p className="text-sm">{claim.content}</p>
              <div className="flex justify-between items-center pt-2">
                <Badge className={statusColors[claim.status]}>
                  {statusLabels[claim.status]}
                </Badge>
                <Select
                  value={claim.status}
                  onValueChange={(value) => updateStatus(claim.id, value)}
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
    </div>
  );
}
