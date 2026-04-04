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
import { ChevronDown, ChevronUp, Plus, Copy, Trash2, User } from 'lucide-react';

// 型定義
interface Property {
  id: string;
  name: string;
  address: string;
  created_at: string;
}

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  created_at: string;
}

interface TenantInfo {
  unit_id: string;
  tenant_name: string;
}

interface PropertyManagerProps {
  onRefresh?: () => void;
}

export default function PropertyManager({ onRefresh }: PropertyManagerProps) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Record<string, Unit[]>>({});
  const [tenantInfo, setTenantInfo] = useState<Record<string, TenantInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  // 新規物件フォーム
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyAddress, setNewPropertyAddress] = useState('');
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);

  // 新規部屋フォーム
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [addingUnitToPropertyId, setAddingUnitToPropertyId] = useState<string | null>(null);

  // 物件一覧を取得
  const fetchProperties = async () => {
    if (!user) {
      console.log('fetchProperties: user is null');
      return;
    }

    console.log('Fetching properties for user:', user.id);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching properties:', error);
        alert('物件一覧の取得に失敗しました: ' + error.message);
      } else {
        console.log('Fetched properties:', data);
        setProperties(data || []);
      }
    } catch (err) {
      console.error('Exception fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  // 部屋一覧を取得
  const fetchUnits = async (propertyId: string) => {
    console.log('Fetching units for property:', propertyId);
    
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('property_id', propertyId)
      .order('unit_number');

    if (error) {
      console.error('Error fetching units:', error);
    } else {
      console.log('Fetched units:', data);
      setUnits((prev) => ({ ...prev, [propertyId]: data || [] }));
      // 各部屋のテナント情報も取得
      data?.forEach((unit) => fetchTenantInfo(unit.id));
    }
  };

  // テナント情報を取得
  const fetchTenantInfo = async (unitId: string) => {
    const { data, error } = await supabase
      .from('tenant_assignments')
      .select('unit_id, profiles(display_name)')
      .eq('unit_id', unitId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching tenant info:', error);
    } else if (data && data.profiles) {
      const profiles = data.profiles as unknown as { display_name: string };
      setTenantInfo((prev) => ({
        ...prev,
        [unitId]: [
          {
            unit_id: unitId,
            tenant_name: profiles.display_name,
          },
        ],
      }));
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    if (user) {
      fetchProperties();
    } else {
      setLoading(false);
    }
  }, [user]);

  // 物件追加
  const addProperty = async () => {
    if (!user || !newPropertyName.trim()) return;

    const { error } = await supabase.from('properties').insert({
      owner_id: user.id,
      name: newPropertyName.trim(),
      address: newPropertyAddress.trim() || null,
    });

    if (error) {
      console.error('Error adding property:', error);
      alert('物件の追加に失敗しました');
    } else {
      setNewPropertyName('');
      setNewPropertyAddress('');
      setIsAddPropertyOpen(false);
      fetchProperties();
      onRefresh?.();
    }
  };

  // 部屋追加
  const addUnit = async () => {
    if (!addingUnitToPropertyId || !newUnitNumber.trim()) {
      alert('部屋番号を入力してください');
      return;
    }

    if (!user) {
      alert('ログインが必要です');
      return;
    }

    const unitNumber = newUnitNumber.trim();

    try {
      const { data, error } = await supabase
        .from('units')
        .insert({
          property_id: addingUnitToPropertyId,
          unit_number: unitNumber,
          owner_id: user.id,  // owner_idを明示的に設定
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding unit:', error);
        alert('部屋の追加に失敗しました: ' + error.message);
        return;
      }

      console.log('Unit added successfully:', data);
      console.log('Adding to property ID:', addingUnitToPropertyId);

      // 即座にUIに反映（楽観的更新）
      setUnits((prev) => {
        const newUnits = {
          ...prev,
          [addingUnitToPropertyId]: [
            ...(prev[addingUnitToPropertyId] || []),
            data,
          ],
        };
        console.log('Updated units state:', newUnits);
        return newUnits;
      });

      setNewUnitNumber('');
      setAddingUnitToPropertyId(null);
      
      // バックグラウンドで最新データを取得
      await fetchUnits(addingUnitToPropertyId);
      onRefresh?.();
      
    } catch (err) {
      console.error('Exception adding unit:', err);
      alert('部屋の追加中にエラーが発生しました');
    }
  };

  // 物件削除
  const deleteProperty = async (propertyId: string) => {
    if (!confirm('この物件を削除してもよろしいですか？関連する部屋とクレームも全て削除されます。')) {
      return;
    }

    const { error } = await supabase.from('properties').delete().eq('id', propertyId);

    if (error) {
      console.error('Error deleting property:', error);
      alert('物件の削除に失敗しました');
    } else {
      fetchProperties();
      onRefresh?.();
    }
  };

  // 招待リンクを発行
  const generateInvitation = async (unitId: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        unit_id: unitId,
        created_by: user.id,
      })
      .select('token')
      .single();

    if (error) {
      console.error('Error generating invitation:', error);
      alert('招待リンクの発行に失敗しました');
      return;
    }

    const inviteUrl = `${window.location.origin}/invite/${data.token}`;

    // クリップボードにコピー
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert(`招待リンクをコピーしました！\n${inviteUrl}\n\nテナントにこのURLを共有してください。`);
    } catch {
      alert(`招待リンク:\n${inviteUrl}`);
    }
  };

  // 物件カード展開/折りたたみ
  const toggleProperty = (propertyId: string) => {
    if (expandedProperty === propertyId) {
      setExpandedProperty(null);
    } else {
      setExpandedProperty(propertyId);
      if (!units[propertyId]) {
        fetchUnits(propertyId);
      }
    }
  };

  if (loading) {
    return <p className="text-center py-8">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      {/* 物件追加ボタンとリロードボタン */}
      <div className="flex gap-2">
        <Dialog open={isAddPropertyOpen} onOpenChange={setIsAddPropertyOpen}>
          <DialogTrigger>
            <Button className="flex-1">
              <Plus className="mr-2 h-4 w-4" />
              物件を追加
            </Button>
          </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規物件を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="propertyName">物件名</Label>
              <Input
                id="propertyName"
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
                placeholder="例：山田ビル"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyAddress">住所</Label>
              <Input
                id="propertyAddress"
                value={newPropertyAddress}
                onChange={(e) => setNewPropertyAddress(e.target.value)}
                placeholder="例：東京都新宿区..."
              />
            </div>
            <Button onClick={addProperty} className="w-full" disabled={!newPropertyName.trim()}>
              追加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        <Button 
          variant="outline" 
          onClick={() => {
            fetchProperties();
            if (expandedProperty) {
              fetchUnits(expandedProperty);
            }
          }}
          disabled={loading}
        >
          更新
        </Button>
      </div>

      {/* 物件一覧 */}
      {properties.length === 0 ? (
        <p className="text-gray-500 text-center py-8">物件が登録されていません</p>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => (
            <Card key={property.id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleProperty(property.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">{property.name}</CardTitle>
                    {property.address && (
                      <p className="text-sm text-gray-500 mt-1">{property.address}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      部屋数: {units[property.id]?.length || 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProperty(property.id);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {expandedProperty === property.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {expandedProperty === property.id && (
                <CardContent className="border-t bg-gray-50">
                  {/* 部屋一覧 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">部屋一覧</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddingUnitToPropertyId(property.id)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        部屋を追加
                      </Button>

                      {/* 部屋追加ダイアログ */}
                      <Dialog
                        open={addingUnitToPropertyId === property.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setAddingUnitToPropertyId(null);
                            setNewUnitNumber('');
                          }
                        }}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>新規部屋を追加</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor={`unitNumber-${property.id}`}>部屋番号</Label>
                              <Input
                                id={`unitNumber-${property.id}`}
                                value={newUnitNumber}
                                onChange={(e) => setNewUnitNumber(e.target.value)}
                                placeholder="例：101号室"
                                autoFocus
                              />
                            </div>
                            <Button
                              onClick={addUnit}
                              className="w-full"
                              disabled={!newUnitNumber.trim()}
                            >
                              追加
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {units[property.id]?.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">
                        部屋が登録されていません
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {units[property.id]?.map((unit) => (
                          <div
                            key={unit.id}
                            className="bg-white border rounded-lg p-3 flex justify-between items-center"
                          >
                            <div>
                              <p className="font-medium">{unit.unit_number}</p>
                              {tenantInfo[unit.id]?.[0] && (
                                <p className="text-sm text-green-600 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {tenantInfo[unit.id][0].tenant_name}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateInvitation(unit.id)}
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              招待リンク
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
