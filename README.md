# ClaimNote Flutter iOS App

Phase 1 MVP開発プロジェクト

## プロジェクト構造

```
claimnote-flutter/
├── lib/
│   ├── main.dart                    # アプリエントリーポイント
│   ├── models/
│   │   └── models.dart              # データモデル
│   ├── screens/
│   │   ├── login_screen.dart        # ログイン画面
│   │   ├── owner_dashboard_screen.dart
│   │   ├── tenant_dashboard_screen.dart
│   │   ├── property_management_screen.dart
│   │   ├── property_detail_screen.dart  # 物件詳細（部屋管理）
│   │   └── claim_submission_screen.dart # クレーム投稿
│   └── services/
│       └── auth_service.dart        # 認証サービス
├── ios/                             # iOS設定
├── android/                         # Android設定
├── assets/                          # 画像・フォント
├── pubspec.yaml                     # 依存関係
└── README.md                        # このファイル
```

## セットアップ手順

### 1. Flutterインストール

```bash
# macOSの場合
brew install flutter

# または手動インストール
# https://docs.flutter.dev/get-started/install
```

### 2. プロジェクトセットアップ

```bash
cd /path/to/claimnote-flutter

# 依存関係インストール
flutter pub get

# iOSシミュレータ起動
open -a Simulator

# アプリ実行
flutter run
```

### 3. iOS実機ビルド（TestFlight配布用）

```bash
# iOSビルド
flutter build ios --release

# Xcodeで開く
cd ios
open Runner.xcworkspace
```

### 4. iOS権限設定（カメラ使用のため）

`ios/Runner/Info.plist` に以下を追加：

```xml
<key>NSCameraUsageDescription</key>
<string>クレームの写真添付のためカメラを使用します</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>写真ライブラリから画像を選択します</string>
```

## 実装済み機能

### Phase 1 Week 1 ✅ 完了
- [x] プロジェクト構造作成
- [x] Supabase連携設定
- [x] ログイン/新規登録画面
- [x] オーナーダッシュボード（仮）
- [x] 物件管理画面（一覧表示・追加）

### Phase 1 Week 2 ✅ 完了
- [x] 物件詳細画面（部屋一覧表示）
- [x] 部屋追加機能
- [x] 招待リンク発行
- [x] UI/UX改善

### Phase 1 Week 3 ✅ 完了
- [x] テナント機能
- [x] クレーム投稿
- [x] 写真添付（カメラ）

### Phase 1 Week 4（予定）
- [ ] 実機テスト
- [ ] バグ修正
- [ ] TestFlight準備
- [ ] App Store申請

## 機能一覧

### オーナー機能
1. **物件管理**
   - 物件の追加・一覧表示
   - 物件詳細（部屋一覧）
   - 部屋の追加
   - 招待リンク発行（クリップボードコピー）

2. **クレーム管理**
   - 全クレーム一覧表示
   - ステータス管理

### テナント機能
1. **部屋確認**
   - 自分の部屋一覧表示

2. **クレーム投稿**
   - カテゴリ選択（水回り・電気・設備・騒音・その他）
   - 優先度設定（緊急・高・通常・低）
   - 件名・内容入力
   - 写真添付（カメラ撮影）
   - 投稿履歴表示

## 技術スタック

- **Flutter 3.x** - UIフレームワーク
- **Riverpod** - 状態管理
- **Go Router** - 画面遷移
- **Supabase Flutter** - バックエンド連携
- **Image Picker** - カメラ機能

## 注意事項

1. **Supabase接続情報**は `lib/main.dart` にハードコードされています。本番環境では環境変数化してください。

2. **iOSデプロイメントターゲット**: iOS 14.0以上

3. **Dart SDK**: 3.0.0以上

4. **画像ストレージ**: Supabase Storageに`claim-images`バケットが必要です

## 今後の開発

Flutter環境が整ったら、以下のコマンドで開発を続けてください：

```bash
flutter run --hot-reload  # ホットリロード付きで実行
```

## テスト

```bash
# テスト実行
flutter test

# iOSビルドテスト
flutter build ios --simulator
```
