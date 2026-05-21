import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // 直接设置 localStorage 并跳转到 evaluate 页面
  await page.goto('http://localhost:10005/');
  await page.evaluate(() => {
    localStorage.setItem('fineval_user_info', JSON.stringify({
      name: '测试用户',
      financialLearningYears: '5',
      gender: '男',
      experience: '每周多次',
      startTime: new Date().toISOString()
    }));
    localStorage.setItem('fineval_selected_version', 'v2');
    localStorage.setItem('fineval_bucket_index', '0');
  });

  // 刷新页面后跳转到 evaluate
  await page.goto('http://localhost:10005/evaluate?version=v2&bucket=0');
  await page.waitForTimeout(3000);

  // 截图
  await page.screenshot({ path: 'evaluate-page.png', fullPage: false });
  console.log('evaluate 页面截图已保存');

  await browser.close();
})();
