-- 部屋追加のRLSポリシーを確認・修正

-- unitsテーブルのRLSポリシーを再確認
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除して再作成（オーナー）
DROP POLICY IF EXISTS "units_owner_all" ON units;

CREATE POLICY "units_owner_all" ON units
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = units.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- 確認用クエリ
-- SELECT * FROM pg_policies WHERE tablename = 'units';
