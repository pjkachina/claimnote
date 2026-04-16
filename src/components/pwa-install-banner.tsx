"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // スタンドアロンモード（インストール済み）なら非表示
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true);

    if (isStandalone) return;

    // 過去に閉じた場合も非表示
    if (localStorage.getItem("pwa-banner-dismissed")) return;

    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);

    setIsIos(ios);
    setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem("pwa-banner-dismissed", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border border-blue-200 rounded-xl shadow-lg p-4">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        aria-label="閉じる"
      >
        <X size={18} />
      </button>
      <p className="text-sm font-semibold text-blue-700 mb-1">
        アプリとして使う
      </p>
      {isIos ? (
        <p className="text-xs text-gray-600">
          Safariの
          <span className="inline-block mx-1 px-1 bg-gray-100 rounded text-gray-700 font-medium">
            共有
          </span>
          ボタン →
          <span className="inline-block mx-1 px-1 bg-gray-100 rounded text-gray-700 font-medium">
            ホーム画面に追加
          </span>
          でインストールできます
        </p>
      ) : (
        <p className="text-xs text-gray-600">
          ブラウザメニューから「ホーム画面に追加」でインストールできます
        </p>
      )}
    </div>
  );
}
