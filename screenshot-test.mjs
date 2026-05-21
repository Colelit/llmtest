import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // 先访问测试页面
  await page.goto('http://localhost:10005/test-image.html');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-image-result.png', fullPage: true });
  console.log('测试页面截图已保存: test-image-result.png');

  await browser.close();
})();
