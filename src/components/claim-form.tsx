'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const categories = [
  { value: 'water', label: '水回り（漏水、詰まり）' },
  { value: 'electric', label: '電気（停電、故障）' },
  { value: 'equipment', label: '設備（エアコン、鍵）' },
  { value: 'noise', label: '騒音・トラブル' },
  { value: 'other', label: 'その他' },
];

const priorities = [
  { value: 'urgent', label: '緊急（当日対応）' },
  { value: 'high', label: '高（1-2日以内）' },
  { value: 'normal', label: '通常（1週間以内）' },
  { value: 'low', label: '低（次回点検時）' },
];

interface ClaimFormProps {
  onSuccess?: () => void;
}

export default function ClaimForm({ onSuccess }: ClaimFormProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tenant_name: '',
    category: '',
    priority: 'normal',
    content: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('claims').insert({
        user_id: user.id,
        ...formData,
        status: 'pending',
      });
      
      if (error) throw error;
      
      setFormData({ tenant_name: '', category: '', priority: 'normal', content: '' });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding claim:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="w-full">新規クレーム登録</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>クレーム登録</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenant_name">テナント名 / 部屋番号</Label>
            <Input
              id="tenant_name"
              value={formData.tenant_name}
              onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
              placeholder="例：山田さん 101号室"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">カテゴリ</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value || '' })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">優先度</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value || 'normal' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((pri) => (
                  <SelectItem key={pri.value} value={pri.value}>
                    {pri.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">内容</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="クレームの詳細を入力"
              rows={4}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '登録中...' : '登録'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
