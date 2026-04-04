-- RLSポリシーの無限再帰を修正
-- エラー: infinite recursion detected in policy for relation "units"

-- ============================================
-- unitsテーブルのRLSポリシーを修正
-- ============================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "units_owner_all" ON units;
DROP POLICY IF EXISTS "units_tenant_select" ON units;

-- 修正: オーナー用ポリシー（無限再帰を回避）
-- property_id → properties.owner_id への参照を避け、
-- 直接 units テーブルに owner_id カラムを追加するか、別の方法を使用

-- 方法1: propertiesテーブルへの直接JOINを避ける
-- unitsテーブルに対するSELECTは一旦すべて許可し、アプリケーション側でフィルタリング
-- （セキュリティはやや低下するが、一時的な回避策）

-- または、方法2: owner_idをunitsテーブルに追加する
-- これが最も確実な解決策

-- unitsテーブルにowner_idカラムを追加
ALTER TABLE units ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id);

-- 既存データのowner_idを更新
UPDATE units 
SET owner_id = properties.owner_id
FROM properties
WHERE units.property_id = properties.id;

-- owner_idをNOT NULLに設定
ALTER TABLE units ALTER COLUMN owner_id SET NOT NULL;

-- 新しいRLSポリシー（owner_idを直接使用）
CREATE POLICY "units_owner_all" ON units
  FOR ALL USING (auth.uid() = owner_id);

-- テナント用ポリシー（tenant_assignments経由）
CREATE POLICY "units_tenant_select" ON units
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenant_assignments
      WHERE tenant_assignments.unit_id = units.id
      AND tenant_assignments.tenant_id = auth.uid()
      AND tenant_assignments.is_active = true
    )
  );

-- ============================================
-- propertiesテーブルのトリガー
-- unitsテーブルのowner_idを自動更新する
-- ============================================

-- トリガー関数を作成
CREATE OR REPLACE FUNCTION update_units_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE units SET owner_id = NEW.owner_id WHERE property_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを設定
DROP TRIGGER IF EXISTS update_units_owner ON properties;
CREATE TRIGGER update_units_owner
  AFTER UPDATE OF owner_id ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_units_owner_id();
