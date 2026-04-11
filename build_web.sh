#!/bin/bash

# ClaimNote Webビルドスクリプト

echo "=== ClaimNote Webビルド開始 ==="

# 依存関係チェック
echo "1. 依存関係をチェック中..."
flutter pub get

# Webビルド
echo "2. Webビルド実行中..."
flutter build web --release

# ビルド結果確認
if [ -d "build/web" ]; then
    echo ""
    echo "=== ビルド完了 ==="
    echo "出力先: build/web/"
    echo ""
    echo "ローカルでテストする場合:"
    echo "  cd build/web"
    echo "  python3 -m http.server 8080"
    echo ""
    echo "ブラウザで http://localhost:8080 を開いてください"
    echo ""
    echo "同じWiFi内のスマホからアクセスする場合:"
    echo "  http://$(hostname -I | awk '{print $1}'):8080"
else
    echo "エラー: ビルドに失敗しました"
    exit 1
fi
