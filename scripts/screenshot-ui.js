const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const outDir = path.resolve(__dirname, '..', 'public', 'assets', 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const pages = [
    { url: `file://${path.resolve(__dirname, '..', 'public', 'mixmaster1-pro.html')}`, name: 'mixmaster1.png' },
    { url: `file://${path.resolve(__dirname, '..', 'public', 'beat-forge.html')}`, name: 'beatmaker.png' },
    { url: `file://${path.resolve(__dirname, '..', 'public', 'index.html')}`, name: 'marketplace.png' }
  ];

  await page.setViewport({ width: 1200, height: 700, deviceScaleFactor: 1 });

  for (const p of pages) {
    console.log('Loading', p.url);
    try {
      await page.goto(p.url, { waitUntil: 'load', timeout: 60000 });
      // Small delay for UI initialization
      await new Promise(r => setTimeout(r, 1200));

      // Attempt to remove heavy scripts/elements to stabilize capture
      try {
        await page.evaluate(() => {
          // Remove spinner loaders
          document.querySelectorAll('.fa-spinner, .spinner, .loading').forEach(n => n.remove());
          // Remove script tags to prevent long-running JS that blocks capture
          document.querySelectorAll('script').forEach(s => s.remove());
          // Try to disable audio contexts if present
          if (window.Tone && Tone.Transport) {
            try { Tone.Transport.stop(); } catch (e) {}
          }
          // Prevent autoplaying media
          document.querySelectorAll('audio, video').forEach((media) => {
            try { media.pause(); media.src = ''; } catch (e) {}
          });
        });
      } catch (e) {
        // ignore
      }

      // Special handling for heavy pages: try fullPage capture, with retry
      const fullPath = path.join(outDir, p.name);
      try {
        page.setDefaultTimeout(120000);
        await page.screenshot({ path: fullPath, fullPage: true });
      } catch (innerErr) {
        console.warn('Primary screenshot method failed, retrying simple clip capture:', innerErr.message);
        // Attempt a simpler viewport-sized capture
        await page.setViewport({ width: 1200, height: 700 });
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: fullPath, fullPage: false });
      }

      console.log('Saved', fullPath);
    } catch (err) {
      console.error('Failed to capture', p.url, err.message);
    }
  }

  await browser.close();
})();