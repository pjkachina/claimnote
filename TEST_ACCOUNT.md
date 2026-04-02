# ClaimNote テストアカウント

## テスト用アカウント
メールアドレス: test@claimnote.app
パスワード: TestClaim123!

## Firebase設定手順
1. https://console.firebase.google.com/ でプロジェクト作成
2. Authentication → Email/Password を有効化
3. Firestore Database を作成
4. 設定 → 一般 → ウェブアプリ追加
5. 環境変数を .env.local に設定

## ローカル開発
```bash
cd claimnote
npm run dev
```

## 本番デプロイ
```bash
vercel --prod
```
