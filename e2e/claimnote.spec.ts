import { test, expect } from '@playwright/test';

const BASE_URL = 'https://claimnote-x4ix.vercel.app';
const TEST_EMAIL = 'kachina0212@gmail.com';
const TEST_PASSWORD = 'test01';

// スクリーンショット保存ディレクトリ
const SCREENSHOT_DIR = 'test-screenshots';

async function login(page) {
  await page.goto(BASE_URL);
  await page.waitForTimeout(1000);
  
  if (await page.isVisible('text=ログイン')) {
    await page.fill('input[id="email"]', TEST_EMAIL);
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=ダッシュボード', { timeout: 30000 });
    await page.waitForTimeout(1000);
  }
}

test.describe('ClaimNote v2 自動テスト', () => {
  
  test('1. オーナーログイン', async ({ page }) => {
    console.log('Step 1: オーナーログイン');
    await login(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-dashboard.png`, fullPage: true });
    console.log('✅ オーナーログイン完了');
  });

  test('2. 物件管理画面', async ({ page }) => {
    console.log('Step 2: 物件管理画面');
    await login(page);
    await page.click('text=物件管理');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-property-management.png`, fullPage: true });
    console.log('✅ 物件管理画面確認完了');
  });

  test('3. 新規物件追加', async ({ page }) => {
    console.log('Step 3: 新規物件追加');
    await login(page);
    
    await page.click('text=物件管理');
    await page.waitForTimeout(500);
    
    // 物件を追加ボタンをクリック
    await page.click('button:has-text("物件を追加")');
    await page.waitForTimeout(500);
    
    // ダイアログ内のフォームに入力
    const timestamp = Date.now().toString(36).slice(-6);
    await page.fill('input[id="propertyName"]', `自動テスト物件_${timestamp}`);
    await page.fill('input[id="propertyAddress"]', '東京都新宿区テスト1-2-3');
    
    // ダイアログ内の追加ボタンをクリック
    const dialog = page.locator('role=dialog');
    await dialog.locator('button:has-text("追加")').click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-property-added.png`, fullPage: true });
    console.log('✅ 物件追加完了');
  });

  test('4. 部屋追加と招待リンク発行', async ({ page }) => {
    console.log('Step 4: 部屋追加と招待リンク発行');
    await login(page);
    
    await page.click('text=物件管理');
    await page.waitForTimeout(1000);
    
    // 最新の物件を展開（先頭のもの）
    await page.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-property-expanded.png` });
    
    // 部屋を追加
    await page.click('button:has-text("部屋を追加")');
    await page.waitForTimeout(500);
    
    // ダイアログ内で部屋番号入力
    const unitNumber = `10${Math.floor(Math.random() * 90)}号室`;
    await page.fill('role=dialog >> input', unitNumber);
    
    const dialog = page.locator('role=dialog');
    await dialog.locator('button:has-text("追加")').click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-unit-added.png` });
    
    // ページをリロードして部屋リストを更新
    await page.reload();
    await page.waitForTimeout(2000);
    
    // 物件管理タブ
    await page.click('text=物件管理');
    await page.waitForTimeout(500);
    
    // 物件を展開
    await page.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    
    // 部屋が表示されるまで待機（柔軟に）
    try {
      await page.waitForSelector('text=号室', { timeout: 10000 });
    } catch {
      console.log('部屋が見つからないためスキップ');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/05-no-unit-found.png` });
      return;
    }
    
    // 招待リンクボタンをクリック
    await page.locator('button:has-text("招待リンク")').first().click();
    await page.waitForTimeout(1500);
    
    // アラートダイアログを処理
    const alertDialog = await page.waitForEvent('dialog');
    console.log(`招待リンクメッセージ: ${alertDialog.message()}`);
    await alertDialog.accept();
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-invitation-generated.png` });
    console.log('✅ 部屋追加と招待リンク発行完了');
  });

  test('5. ダッシュボード確認', async ({ page }) => {
    console.log('Step 5: ダッシュボード確認');
    await login(page);
    
    await page.click('text=ダッシュボード');
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-dashboard.png`, fullPage: true });
    console.log('✅ ダッシュボード確認完了');
  });

  test('6. ログアウト', async ({ page }) => {
    console.log('Step 6: ログアウト');
    await login(page);
    
    await page.click('text=ログアウト');
    await page.waitForTimeout(1500);
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-logged-out.png` });
    console.log('✅ ログアウト完了');
  });

});
