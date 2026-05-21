import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // 拦截所有请求，记录图片请求
  const failedRequests = [];
  page.on('requestfailed', request => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText });
  });
  
  page.on('response', response => {
    if (response.url().includes('images/') && response.status() !== 200) {
      console.log('图片响应异常:', response.status(), response.url());
    }
  });

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

  await page.goto('http://localhost:10005/evaluate?version=v2&bucket=0');
  await page.waitForTimeout(3000);

  // 获取 iframe 中的图片 src
  const iframeSrc = await page.evaluate(() => {
    const iframes = document.querySelectorAll('iframe');
    const results = [];
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const imgs = doc.querySelectorAll('img');
          for (const img of imgs) {
            results.push({
              src: img.src,
              alt: img.alt,
              complete: img.complete,
              naturalWidth: img.naturalWidth
            });
          }
        }
      } catch (e) {
        results.push({ error: e.message });
      }
    }
    return results;
  });

  console.log('iframe 中的图片信息:');
  console.log(JSON.stringify(iframeSrc, null, 2));

  console.log('\n失败的请求:');
  console.log(JSON.stringify(failedRequests, null, 2));

  await browser.close();
})();
