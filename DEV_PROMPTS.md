# ClaimNote v2 — 開発プロンプト集

**使い方**: 各プロンプトをそのままKimiに送ってください。  
Phase 1 は 1-A → 1-B → 1-C の順に実行してください。  
各プロンプトは独立しており、出力されたコードをプロジェクトに適用してから次へ進みます。

> ⚠️ Kimiの出力が途中で切れた場合は「続けて」と送ってください。  
> ⚠️ 出力されたコードは必ず動作確認してからコミットしてください。

---

## Phase 1-A: DBマイグレーション

```
あなたはSupabase + Next.jsアプリの開発者です。
以下の要件でSupabaseのSQLマイグレーションファイルを1つ生成してください。

# プロジェクト概要
ClaimNote: 不動産オーナーがテナントのクレームをチケット管理するアプリ。
3つのロール（owner/tenant/contractor）が存在し、
オーナーは6物件以上を横断管理、テナントは自分の部屋のクレームのみ閲覧・投稿できる。

# 作成するテーブル

## 1. profiles
- id: UUID, PRIMARY KEY, auth.users(id)への外部キー（ON DELETE CASCADE）
- role: TEXT, NOT NULL, デフォルト'tenant', CHECK ('owner','tenant','contractor')
- display_name: TEXT
- created_at: TIMESTAMPTZ, デフォルトnow()

## 2. properties（物件）
- id: UUID, PRIMARY KEY, gen_random_uuid()
- owner_id: UUID, NOT NULL, profiles(id)への外部キー
- name: TEXT, NOT NULL（例：「山田ビル」）
- address: TEXT
- created_at: TIMESTAMPTZ, デフォルトnow()

## 3. units（部屋）
- id: UUID, PRIMARY KEY, gen_random_uuid()
- property_id: UUID, NOT NULL, properties(id)への外部キー（ON DELETE CASCADE）
- unit_number: TEXT, NOT NULL（例：「101号室」）
- created_at: TIMESTAMPTZ, デフォルトnow()
- UNIQUE制約: (property_id, unit_number)

## 4. tenant_assignments（テナント紐付け）
- id: UUID, PRIMARY KEY, gen_random_uuid()
- unit_id: UUID, NOT NULL, units(id)への外部キー（ON DELETE CASCADE）
- tenant_id: UUID, NOT NULL, profiles(id)への外部キー
- assigned_at: TIMESTAMPTZ, デフォルトnow()
- is_active: BOOLEAN, デフォルトtrue
- UNIQUE制約: (unit_id, tenant_id)

## 5. invitations（招待トークン）
- id: UUID, PRIMARY KEY, gen_random_uuid()
- unit_id: UUID, NOT NULL, units(id)への外部キー（ON DELETE CASCADE）
- token: TEXT, NOT NULL, UNIQUE, デフォルト encode(gen_random_bytes(32), 'hex')
- created_by: UUID, NOT NULL, profiles(id)への外部キー
- used_by: UUID, profiles(id)への外部キー（NULL可）
- expires_at: TIMESTAMPTZ, デフォルト (now() + interval '7 days')
- used_at: TIMESTAMPTZ（NULL可）
- created_at: TIMESTAMPTZ, デフォルトnow()

## 6. claims（クレーム/チケット）
- id: UUID, PRIMARY KEY, gen_random_uuid()
- unit_id: UUID, NOT NULL, units(id)への外部キー
- submitted_by: UUID, NOT NULL, profiles(id)への外部キー
- category: TEXT, NOT NULL, CHECK ('water','electric','equipment','noise','other')
- priority: TEXT, NOT NULL, デフォルト'normal', CHECK ('urgent','high','normal','low')
- title: TEXT, NOT NULL
- content: TEXT, NOT NULL
- status: TEXT, NOT NULL, デフォルト'pending', CHECK ('pending','in_progress','completed')
- created_at: TIMESTAMPTZ, デフォルトnow()
- updated_at: TIMESTAMPTZ, デフォルトnow()

## 7. claim_comments（コメント）
- id: UUID, PRIMARY KEY, gen_random_uuid()
- claim_id: UUID, NOT NULL, claims(id)への外部キー（ON DELETE CASCADE）
- author_id: UUID, NOT NULL, profiles(id)への外部キー
- content: TEXT, NOT NULL
- created_at: TIMESTAMPTZ, デフォルトnow()

# RLSポリシー（全テーブルでRLSを有効化）

## profiles
- SELECT: auth.uid() = id
- UPDATE: auth.uid() = id
- INSERT: auth.uid() = id

## properties
- ALL: auth.uid() = owner_id

## units
- ALL（オーナー）: propertiesテーブルを経由してowner_id = auth.uid()を確認
- SELECT（テナント）: tenant_assignmentsを経由してtenant_id = auth.uid() AND is_active = trueを確認

## claims
- ALL（テナント）: tenant_assignmentsを経由してtenant_id = auth.uid() AND is_active = trueを確認
- SELECT（オーナー）: units → properties を経由してowner_id = auth.uid()を確認
- UPDATE（オーナー）: 同上

## invitations
- ALL（オーナー）: created_by = auth.uid()
- SELECT（使用時）: token一致でアクセス可能（サインアップフロー用）

## claim_comments
- SELECT: 該当claimにアクセス権があるユーザー
- INSERT: 該当claimにアクセス権があるユーザー

# Auth Trigger
auth.usersにINSERT時、自動でprofilesレコードを作成するトリガー関数:
- roleはraw_user_meta_data->>'role'から取得、なければ'tenant'
- display_nameはraw_user_meta_data->>'display_name'から取得、なければemail
- SECURITY DEFINER で実行

# Realtime
claims, claim_comments テーブルをsupabase_realtimeパブリケーションに追加

# 既存テーブルについて
既存のclaimsテーブル（v1）はDROPしてから新規作成してください。

# 出力形式
SQLファイルの中身のみ出力してください。
ファイルパス: supabase/migrations/002_v2_schema.sql
コメントは日本語で書いてください。
```

---

## Phase 1-B: 認証コンテキスト改修

```
あなたはNext.js 16 + Supabase + TypeScriptアプリの開発者です。
以下の既存コードを、マルチロール対応に改修した完全なコードを出力してください。

# プロジェクト概要
ClaimNote v2: オーナー（owner）とテナント（tenant）の2つのロールが存在。
Supabaseのprofilesテーブルにroleカラムがある。
認証状態に加えてrole情報もContextで管理する。

# 既存コード: src/lib/auth-context.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
 user: User | null;
 session: Session | null;
 loading: boolean;
 login: (email: string, password: string) => Promise<void>;
 signup: (email: string, password: string) => Promise<void>;
 logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
 const [user, setUser] = useState<User | null>(null);
 const [session, setSession] = useState<Session | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 supabase.auth.getSession().then(({ data: { session } }) => {
 setSession(session);
 setUser(session?.user ?? null);
 setLoading(false);
 });

 const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
 setSession(session);
 setUser(session?.user ?? null);
 setLoading(false);
 });

 return () => subscription.unsubscribe();
 }, []);

 const login = async (email: string, password: string) => {
 const { error } = await supabase.auth.signInWithPassword({ email, password });
 if (error) throw error;
 };

 const signup = async (email: string, password: string) => {
 const { error } = await supabase.auth.signUp({ email, password });
 if (error) throw error;
 const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
 if (loginError) throw loginError;
 };

 const logout = async () => {
 await supabase.auth.signOut();
 };

 return (
 <AuthContext.Provider value={{ user, session, loading, login, signup, logout }}>
 {children}
 </AuthContext.Provider>
 );
}

export function useAuth() {
 const context = useContext(AuthContext);
 if (context === undefined) {
 throw new Error('useAuth must be used within an AuthProvider');
 }
 return context;
}

# 改修要件

1. AuthContextTypeに以下を追加:
 - role: 'owner' | 'tenant' | 'contractor' | null
 - profile: { id, role, display_name } | null

2. signup関数を改修:
 - 引数に role と display_name を追加
 - supabase.auth.signUp の options.data に role と display_name を渡す
 （これによりAuth Triggerでprofilesに自動反映される）

3. ログイン時・セッション復元時に、profilesテーブルからroleを取得:
 - supabase.from('profiles').select('*').eq('id', user.id).single()
 - 取得したprofileをstateに保存

4. Google OAuth対応を維持（roleはデフォルトでownerにする）

# 出力形式
改修後の src/lib/auth-context.tsx の完全なコードを出力してください。
TypeScriptの型定義も含めてください。
```

---

## Phase 1-C: ログイン画面のロール選択 + ルーティング

```
あなたはNext.js 16 + Supabase + TypeScript + shadcn/uiアプリの開発者です。
以下の2ファイルの改修後コードを出力してください。

# プロジェクト概要
ClaimNote v2: ロール別（owner/tenant）に異なる画面を表示するアプリ。
UIはshadcn/uiを使用。日本語。

# 利用可能なshadcn/uiコンポーネント
- Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription
- Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- Dialog系

# 現在のSupabase設定
src/lib/supabase.ts は既存のまま（変更不要）。

# ファイル1: src/app/login/page.tsx

改修要件:
- 新規登録時にロール選択を追加（「物件オーナー」or「テナント」）
 - owner選択時: display_nameも入力
 - tenant選択時: display_nameも入力
- ロール選択はラジオボタンまたはタブ形式のUI
- signup()呼び出し時にroleとdisplay_nameを渡す
- Googleログインも維持
- 未使用のimport（Trash2）を削除
- エラーメッセージは日本語
- テナントが招待リンクなしで登録しようとした場合のガイダンス:
 「テナントの方はオーナーから届いた招待リンクからご登録ください」
 ※ただしテナントとしての直接登録も許可する（招待リンクは後から使える）

# ファイル2: src/app/page.tsx

改修要件:
- useAuth()からroleを取得
- ロール別に表示を切り替え:
 - role === 'owner' → <OwnerDashboard /> を表示
 - role === 'tenant' → <TenantDashboard /> を表示
 - role === null && !loading → <LoginPage /> を表示
- OwnerDashboardとTenantDashboardはまだ存在しないので、
 仮のプレースホルダーコンポーネントを同ファイル内に定義:
 - OwnerDashboard: 「オーナーダッシュボード（準備中）」と表示
 - TenantDashboard: 「テナント画面（準備中）」と表示
 - どちらもログアウトボタン付き

# 出力形式
2ファイルそれぞれの完全なコードを出力してください。
ファイルパスを明記してください。
```

---

## Phase 2-A: オーナー物件管理画面

```
あなたはNext.js 16 + Supabase + TypeScript + shadcn/uiアプリの開発者です。

# プロジェクト概要
ClaimNote v2: 不動産オーナー向けテナントクレーム管理アプリ。
オーナーは複数物件を登録し、物件内の部屋を管理し、テナントを招待する。

# 技術スタック
- Next.js 16.2.2（App Router, 'use client'でクライアントコンポーネント）
- Supabase（DB, Auth, Realtime）
- TypeScript
- Tailwind CSS + shadcn/ui

# DB構造（関連テーブルのみ）
properties: id(uuid), owner_id(uuid), name(text), address(text), created_at
units: id(uuid), property_id(uuid), unit_number(text), created_at
tenant_assignments: id(uuid), unit_id(uuid), tenant_id(uuid), is_active(boolean)
invitations: id(uuid), unit_id(uuid), token(text), created_by(uuid), used_by(uuid), expires_at, used_at

# Supabaseクライアント
import { supabase } from '@/lib/supabase'; で利用可能

# 認証コンテキスト
import { useAuth } from '@/lib/auth-context';
const { user, role, profile, logout } = useAuth();

# 利用可能なshadcn/uiコンポーネント
Button, Input, Label, Card, CardContent, CardHeader, CardTitle,
Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
Textarea, Badge

# 作成するファイル

## 1. src/components/owner/property-manager.tsx
物件と部屋の管理コンポーネント:
- 物件一覧の表示（カード形式、各カードに物件名・住所・部屋数を表示）
- 「物件を追加」ボタン → Dialogでフォーム表示（名前、住所）
- 物件カードをクリック → 部屋一覧を展開表示
- 部屋の追加（部屋番号入力）
- 各部屋に「招待リンクを発行」ボタン
 → invitationsテーブルにINSERT
 → URL `${window.location.origin}/invite/${token}` をクリップボードにコピー
 → コピー成功のフィードバック表示
- 各部屋に紐づくテナント名を表示（tenant_assignments + profilesをJOIN）
- 物件の削除（確認ダイアログ付き）

## 2. src/components/owner/owner-dashboard.tsx
オーナーのメインダッシュボード:
- ヘッダー: 「ClaimNote」ロゴ + ナビ（ダッシュボード | 物件管理）+ ユーザー名 + ログアウト
- タブまたはボタンで「ダッシュボード」と「物件管理」を切り替え
- ダッシュボード表示時:
 - 全物件横断のステータスカウント（未対応/対応中/完了）
 - 全クレーム一覧（新着順）
 - 各クレームに物件名・部屋番号を表示
 - フィルタ: ステータス（すべて/未対応/対応中/完了）
 - 検索: 内容・タイトルで部分一致
 - ステータス変更ドロップダウン（即座にDB更新）
 - Supabase Realtimeで自動更新
- 物件管理表示時:
 - PropertyManagerコンポーネントを表示

# クエリのヒント
クレーム一覧で物件名・部屋番号を取得するには:
supabase.from('claims').select('*, units(unit_number, properties(name))')

# UI方針
- レスポンシブ（PC: 広めのカード、スマホ: フルwidth）
- 日本語
- クレームがない場合は空状態メッセージ

# 出力形式
各ファイルの完全なコードを出力してください。
ファイルパスを明記してください。
```

---

## Phase 2-B: page.tsxの更新（オーナー画面の接続）

```
あなたはNext.js 16 + TypeScriptアプリの開発者です。

# タスク
src/app/page.tsx を更新して、
role === 'owner' の場合に OwnerDashboard コンポーネントを表示するようにしてください。

# インポート
import OwnerDashboard from '@/components/owner/owner-dashboard';

# 現在のpage.tsx構造
- useAuth()からuser, loading, roleを取得
- loading中はスピナー表示
- !user → LoginPage表示
- role === 'owner' → OwnerDashboard表示
- role === 'tenant' → TenantDashboard（まだプレースホルダー）

# 出力形式
src/app/page.tsx の完全なコードを出力してください。
```

---

## Phase 3-A: 招待受け入れページ

```
あなたはNext.js 16 + Supabase + TypeScript + shadcn/uiアプリの開発者です。

# プロジェクト概要
ClaimNote v2: テナントがオーナーから受け取った招待リンクでアプリに参加するフロー。

# 技術スタック
Next.js 16.2.2（App Router）, Supabase, TypeScript, Tailwind CSS, shadcn/ui

# 招待の仕組み
1. オーナーが部屋ごとに招待リンクを発行（invitationsテーブルにトークン保存）
2. テナントに https://claimnote-x4ix.vercel.app/invite/{token} を共有
3. テナントがリンクをクリック → サインアップ or ログイン
4. 認証後、自動的にtenant_assignmentsで部屋に紐付け
5. invitationsのused_by, used_atを更新
6. テナント画面にリダイレクト

# DB構造（関連テーブル）
invitations: id, unit_id, token, created_by, used_by, expires_at, used_at, created_at
tenant_assignments: id, unit_id, tenant_id, assigned_at, is_active
units: id, property_id, unit_number
properties: id, owner_id, name, address

# Supabaseクライアント
import { supabase } from '@/lib/supabase';

# 認証コンテキスト
import { useAuth } from '@/lib/auth-context';
const { user, role, signup, login } = useAuth();
signup(email, password, role, displayName) で新規登録

# 作成するファイル: src/app/invite/[token]/page.tsx

要件:
1. URLパラメータからtokenを取得
2. トークンの検証:
 - invitationsテーブルからtokenで検索
 - 存在しない → 「無効な招待リンクです」
 - used_atがnullでない → 「この招待リンクは使用済みです」
 - expires_atが現在時刻より前 → 「この招待リンクは期限切れです」
 - 有効 → 物件名・部屋番号を表示
3. ユーザーが未ログインの場合:
 - 物件名・部屋番号を表示して「この部屋に入居者として登録します」
 - ログイン or 新規登録フォームを表示（タブ切り替え）
 - 新規登録時: role='tenant'で自動設定、ロール選択UI不要
4. ユーザーがログイン済みの場合:
 - 「{物件名} {部屋番号}に紐づけます。よろしいですか？」確認画面
 - 「参加する」ボタン
5. 紐付け処理:
 - tenant_assignmentsにINSERT
 - invitationsのused_by, used_atを更新
 - 完了後 → / にリダイレクト（ルーティングでテナント画面に遷移）
6. エラーハンドリング: すべて日本語メッセージ

# 注意
- invitationsテーブルへのSELECTは、RLSの関係で
 supabaseの.rpc()やサーバーサイドでの検証が必要になる場合がある。
 まずはクライアントサイドで試し、RLSで弾かれる場合は
 Supabase Database Functionを作成する方針で。

# 出力形式
src/app/invite/[token]/page.tsx の完全なコードを出力してください。
```

---

## Phase 3-B: テナント画面

```
あなたはNext.js 16 + Supabase + TypeScript + shadcn/uiアプリの開発者です。

# プロジェクト概要
ClaimNote v2: テナント（入居者）が自分の部屋のクレームを投稿・確認する画面。

# 技術スタック
Next.js 16.2.2, Supabase, TypeScript, Tailwind CSS, shadcn/ui

# DB構造
claims: id, unit_id, submitted_by, category, priority, title, content, status, created_at, updated_at
tenant_assignments: id, unit_id, tenant_id, is_active
units: id, property_id, unit_number
properties: id, name

# カテゴリ定義
water: 水回り, electric: 電気, equipment: 設備, noise: 騒音・トラブル, other: その他

# 優先度定義
urgent: 緊急（当日対応）, high: 高（1-2日以内）, normal: 通常（1週間以内）, low: 低（次回点検時）

# ステータス定義
pending: 未対応, in_progress: 対応中, completed: 完了

# Supabaseクライアント
import { supabase } from '@/lib/supabase';

# 認証コンテキスト
import { useAuth } from '@/lib/auth-context';
const { user, role, profile, logout } = useAuth();

# 利用可能なshadcn/uiコンポーネント
Button, Input, Label, Card, CardContent, CardHeader, CardTitle,
Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
Textarea, Badge

# 作成するファイル: src/components/tenant/tenant-dashboard.tsx

要件:
1. ヘッダー: 「ClaimNote」+ ユーザー名 + ログアウトボタン
2. 自分の部屋情報を表示:
 - tenant_assignmentsからunit_idを取得（tenant_id = user.id, is_active = true）
 - unitsとpropertiesをJOINして物件名・部屋番号を取得
 - 「{物件名} {部屋番号}」と表示
 - 複数部屋に紐づく可能性あり（その場合は全部表示）
3. 「クレームを投稿」ボタン → Dialogでフォーム表示:
 - 部屋選択（複数部屋がある場合のみ表示、1つなら自動選択）
 - カテゴリ選択（上記定義）
 - 優先度選択（上記定義、デフォルト: normal）
 - 件名（テキスト入力、必須）
 - 内容（テキストエリア、必須）
 - 投稿ボタン → claimsテーブルにINSERT
4. 自分のクレーム一覧:
 - 新着順
 - カード形式（件名、カテゴリ、優先度バッジ、ステータスバッジ、投稿日時）
 - ステータスの色分け: pending=赤系, in_progress=黄系, completed=緑系
 - テナントはステータス変更不可（閲覧のみ）
5. ステータスカウント: 未対応/対応中/完了の件数表示
6. Supabase Realtimeで自動更新
7. クレームがない場合: 「まだクレームはありません」メッセージ
8. 部屋に紐づいていない場合: 「オーナーからの招待リンクで登録してください」メッセージ

# UI方針
- シンプルで分かりやすい
- レスポンシブ
- 日本語

# 出力形式
src/components/tenant/tenant-dashboard.tsx の完全なコードを出力してください。
```

---

## 適用手順まとめ

### Phase 1（順番厳守）
1. **1-A** → 出力されたSQLを `supabase/migrations/002_v2_schema.sql` に保存
 → Supabaseダッシュボードの SQL Editor で実行、またはsupabase db push
2. **1-B** → 出力コードで `src/lib/auth-context.tsx` を上書き
3. **1-C** → 出力コードで `src/app/login/page.tsx` と `src/app/page.tsx` を上書き
4. 動作確認: オーナーとしてサインアップ → ログイン → プレースホルダー画面表示

### Phase 2
5. **2-A** → `src/components/owner/property-manager.tsx` と `src/components/owner/owner-dashboard.tsx` を作成
6. **2-B** → `src/app/page.tsx` を更新
7. 動作確認: 物件登録 → 部屋追加 → 招待リンク発行

### Phase 3
8. **3-A** → `src/app/invite/[token]/page.tsx` を作成
9. **3-B** → `src/components/tenant/tenant-dashboard.tsx` を作成 + page.tsxにインポート追加
10. 動作確認: 招待リンク → テナント登録 → クレーム投稿 → オーナー側で確認
