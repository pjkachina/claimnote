-- ClaimNote v2 データベーススキーマ
-- 作成日: 2026-04-04
-- 説明: オーナー/テナント/業者の3ロール対応版

-- ============================================
-- 1. profiles（ユーザープロファイル）
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('owner', 'tenant', 'contractor')),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- profilesテーブルのRLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- profilesのRLSポリシー
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. properties（物件）
-- ============================================
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- propertiesテーブルのRLSを有効化
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- propertiesのRLSポリシー（オーナーのみアクセス可能）
CREATE POLICY "properties_owner_all" ON properties
  FOR ALL USING (auth.uid() = owner_id);

-- ============================================
-- 3. units（部屋）
-- ============================================
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (property_id, unit_number)
);

-- ============================================
-- 4. tenant_assignments（テナント紐付け）
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE (unit_id, tenant_id)
);

-- ============================================
-- 5. invitations（招待トークン）
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by UUID NOT NULL REFERENCES profiles(id),
  used_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. claims（クレーム/チケット）
-- ============================================

-- 既存のclaimsテーブルがあれば削除（v1からの移行）
DROP TABLE IF EXISTS claims CASCADE;

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id),
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  category TEXT NOT NULL CHECK (category IN ('water', 'electric', 'equipment', 'noise', 'other')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. claim_comments（コメント）
-- ============================================
CREATE TABLE IF NOT EXISTS claim_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RLSポリシー（units - tenant_assignments作成後に設定）
-- ============================================
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- unitsのRLSポリシー（オーナー: 自分の物件の部屋のみ）
CREATE POLICY "units_owner_all" ON units
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = units.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- unitsのRLSポリシー（テナント: 自分が紐付いている部屋のみ閲覧可能）
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
-- RLSポリシー（tenant_assignments）
-- ============================================
ALTER TABLE tenant_assignments ENABLE ROW LEVEL SECURITY;

-- tenant_assignmentsのRLSポリシー（オーナー: 自分の物件のテナントのみ）
CREATE POLICY "tenant_assignments_owner_all" ON tenant_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM units
      JOIN properties ON properties.id = units.property_id
      WHERE units.id = tenant_assignments.unit_id
      AND properties.owner_id = auth.uid()
    )
  );

-- tenant_assignmentsのRLSポリシー（テナント: 自分の紐付けのみ閲覧可能）
CREATE POLICY "tenant_assignments_tenant_select" ON tenant_assignments
  FOR SELECT USING (tenant_id = auth.uid());

-- ============================================
-- RLSポリシー（invitations）
-- ============================================
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- invitationsのRLSポリシー（オーナー: 自分が作成した招待のみ）
CREATE POLICY "invitations_owner_all" ON invitations
  FOR ALL USING (created_by = auth.uid());

-- invitationsのRLSポリシー（使用時: トークン一致でアクセス可能）
CREATE POLICY "invitations_select_by_token" ON invitations
  FOR SELECT USING (true);

-- ============================================
-- RLSポリシー（claims）
-- ============================================
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- claimsのRLSポリシー（テナント: 自分の部屋のクレームのみ）
CREATE POLICY "claims_tenant_all" ON claims
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tenant_assignments
      WHERE tenant_assignments.unit_id = claims.unit_id
      AND tenant_assignments.tenant_id = auth.uid()
      AND tenant_assignments.is_active = true
    )
  );

-- claimsのRLSポリシー（オーナー: 自分の物件のクレームを閲覧・更新可能）
CREATE POLICY "claims_owner_select" ON claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM units
      JOIN properties ON properties.id = units.property_id
      WHERE units.id = claims.unit_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "claims_owner_update" ON claims
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM units
      JOIN properties ON properties.id = units.property_id
      WHERE units.id = claims.unit_id
      AND properties.owner_id = auth.uid()
    )
  );

-- ============================================
-- RLSポリシー（claim_comments）
-- ============================================
ALTER TABLE claim_comments ENABLE ROW LEVEL SECURITY;

-- claim_commentsのRLSポリシー（該当claimにアクセス権があるユーザー）
CREATE POLICY "claim_comments_select" ON claim_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM claims
      WHERE claims.id = claim_comments.claim_id
      AND (
        -- テナントの場合
        EXISTS (
          SELECT 1 FROM tenant_assignments
          WHERE tenant_assignments.unit_id = claims.unit_id
          AND tenant_assignments.tenant_id = auth.uid()
          AND tenant_assignments.is_active = true
        )
        OR
        -- オーナーの場合
        EXISTS (
          SELECT 1 FROM units
          JOIN properties ON properties.id = units.property_id
          WHERE units.id = claims.unit_id
          AND properties.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "claim_comments_insert" ON claim_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM claims
      WHERE claims.id = claim_comments.claim_id
      AND (
        -- テナントの場合
        EXISTS (
          SELECT 1 FROM tenant_assignments
          WHERE tenant_assignments.unit_id = claims.unit_id
          AND tenant_assignments.tenant_id = auth.uid()
          AND tenant_assignments.is_active = true
        )
        OR
        -- オーナーの場合
        EXISTS (
          SELECT 1 FROM units
          JOIN properties ON properties.id = units.property_id
          WHERE units.id = claims.unit_id
          AND properties.owner_id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- Auth Trigger（自動プロファイル作成）
-- ============================================

-- トリガー関数の作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの設定
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Realtime設定
-- ============================================

-- claimsテーブルをrealtimeに追加
ALTER PUBLICATION supabase_realtime ADD TABLE claims;

-- claim_commentsテーブルをrealtimeに追加
ALTER PUBLICATION supabase_realtime ADD TABLE claim_comments;

-- ============================================
-- インデックス作成（パフォーマンス向上）
-- ============================================

CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_tenant_assignments_unit_id ON tenant_assignments(unit_id);
CREATE INDEX idx_tenant_assignments_tenant_id ON tenant_assignments(tenant_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_unit_id ON invitations(unit_id);
CREATE INDEX idx_claims_unit_id ON claims(unit_id);
CREATE INDEX idx_claims_submitted_by ON claims(submitted_by);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claim_comments_claim_id ON claim_comments(claim_id);
