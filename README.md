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
│   │   └── property_management_screen.dart
│   └── services/
│       └── (今後追加)
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

## 実装済み機能

### Phase 1 Week 1（完了）
- [x] プロジェクト構造作成
- [x] Supabase連携設定
- [x] ログイン/新規登録画面
- [x] オーナーダッシュボード（仮）
- [x] 物件管理画面（一覧表示・追加）

### Phase 1 Week 2（予定）
- [ ] 物件詳細画面（部屋一覧表示）
- [ ] 部屋追加機能
- [ ] 招待リンク発行
- [ ] UI/UX改善

### Phase 1 Week 3（予定）
- [ ] テナント機能
- [ ] クレーム投稿
- [ ] 写真添付（カメラ）

### Phase 1 Week 4（予定）
- [ ] 実機テスト
- [ ] バグ修正
- [ ] TestFlight準備

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

## 今後の開発

Flutter環境が整ったら、以下のコマンドで開発を続けてください：

```bash
flutter run --hot-reload  # ホットリロード付きで実行
```
