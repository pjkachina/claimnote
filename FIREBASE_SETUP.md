# Firebase セットアップ手順

## 1. プロジェクト作成
1. https://console.firebase.google.com/ にアクセス
2. 「プロジェクトを作成」
3. プロジェクト名: `claimnote-prod`
4. Google Analytics: 無効（後で必要なら有効化）

## 2. Authentication 有効化
1. 左メニュー → Build → Authentication
2. 「始める」
3. 「メールアドレス/パスワード」 → 有効 → 保存

## 3. Firestore Database 作成
1. 左メニュー → Build → Firestore Database
2. 「データベースを作成」
3. ロケーション: asia-northeast1（東京）
4. セキュリティルール: 本番モード（後で変更）

## 4. Webアプリ追加
1. プロジェクト設定（歯車アイコン）
2. 「アプリ」→ 「ウェブ」
3. アプリ名: `claimnote-web`
4. 構成情報をコピー

## 5. 環境変数設定
`.env.local` に以下を設定:

```
NEXT_PUBLIC_FIREBASE_API_KEY=コピーした値
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=claimnote-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=claimnote-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=claimnote-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=コピーした値
NEXT_PUBLIC_FIREBASE_APP_ID=コピーした値
```

## 6. テストアカウント作成
1. Authentication → Users
2. 「ユーザーを追加」
3. メール: test@claimnote.app
4. パスワード: TestClaim123!

---
完了後、`npm run dev` でローカルテスト
