import { chromium } from 'playwright';

async function auditLoginPage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const testViewports = [
    // Standard phone portrait
    { width: 320, height: 480, name: 'iPhone 4S / Short Phone (320x480)' },
    { width: 320, height: 568, name: 'iPhone 5/SE1 (320x568)' },
    { width: 360, height: 640, name: 'Android Galaxy S8 (360x640)' },
    { width: 360, height: 720, name: 'Android Common (360x720)' },
    { width: 375, height: 667, name: 'iPhone 8/SE2 (375x667)' },
    { width: 375, height: 812, name: 'iPhone X/XS/11Pro (375x812)' },
    { width: 390, height: 844, name: 'iPhone 12/13/14 (390x844)' },
    { width: 393, height: 852, name: 'iPhone 15 Pro (393x852)' },
    { width: 400, height: 800, name: 'Android Modern (400x800)' },
    { width: 412, height: 915, name: 'Pixel 7 (412x915)' },
    { width: 414, height: 896, name: 'iPhone XR/11/Plus (414x896)' },
    { width: 430, height: 932, name: 'iPhone 14/15 Pro Max (430x932)' },
    { width: 480, height: 900, name: 'Large Mobile (480x900)' },
    { width: 540, height: 960, name: 'Foldable Outer (540x960)' },
    { width: 600, height: 1024, name: 'Phablet 600px (600x1024)' },
    // Intermediate widths
    { width: 330, height: 700, name: 'Intermediate 330x700' },
    { width: 340, height: 740, name: 'Intermediate 340x740' },
    { width: 402, height: 820, name: 'Intermediate 402x820' },
    { width: 406, height: 860, name: 'Intermediate 406x860' },
    { width: 440, height: 880, name: 'Intermediate 440x880' },
    { width: 460, height: 900, name: 'Intermediate 460x900' },
    { width: 560, height: 900, name: 'Intermediate 560x900' },
    { width: 576, height: 900, name: 'Intermediate 576x900' },
    // Breakpoint boundary tests
    { width: 680, height: 800, name: 'Mobile Max 680x800' },
    { width: 681, height: 800, name: 'Desktop Min 681x800' },
    { width: 768, height: 1024, name: 'iPad Portrait 768x1024' },
    { width: 820, height: 1180, name: 'iPad Air 820x1180' },
    { width: 1024, height: 1366, name: 'iPad Pro 1024x1366' },
    // Landscape tests
    { width: 640, height: 360, name: 'Landscape 640x360' },
    { width: 844, height: 390, name: 'Landscape 844x390' },
    { width: 896, height: 414, name: 'Landscape 896x414' },
    { width: 915, height: 412, name: 'Landscape 915x412' },
  ];

  console.log('================================================================');
  console.log('PHASE 1: AUDIT OF LOGIN PAGE RESPONSIVENESS AND ROOT CAUSE');
  console.log('================================================================\n');

  for (const vp of testViewports) {
    console.log(`Auditing ${vp.name}...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(500);

    const auditData = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;

      // Check all elements in DOM
      const allElements = Array.from(document.querySelectorAll('*'));
      const overflowingElements: any[] = [];

      allElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const computed = window.getComputedStyle(el);

        // Check if element extends beyond viewport vertically or horizontally
        const extendsY = rect.bottom > window.innerHeight;
        const extendsX = rect.right > window.innerWidth;
        const scrollOverflowY = el.scrollHeight > el.clientHeight && el.clientHeight > 0;
        const scrollOverflowX = el.scrollWidth > el.clientWidth && el.clientWidth > 0;

        if (extendsY || extendsX || scrollOverflowY || scrollOverflowX) {
          const className = el.className && typeof el.className === 'string' ? el.className : '';
          const id = el.id || '';
          const tag = el.tagName.toLowerCase();
          const identifier = `${tag}${id ? '#' + id : ''}${className ? '.' + className.trim().split(/\s+/).join('.') : ''}`;

          // Only keep meaningful elements (not html/body if we already know)
          overflowingElements.push({
            identifier,
            rect: {
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            styles: {
              display: computed.display,
              position: computed.position,
              height: computed.height,
              minHeight: computed.minHeight,
              maxHeight: computed.maxHeight,
              marginTop: computed.marginTop,
              marginBottom: computed.marginBottom,
              paddingTop: computed.paddingTop,
              paddingBottom: computed.paddingBottom,
              overflowY: computed.overflowY,
              overflowX: computed.overflowX,
              flex: computed.flex,
              flexGrow: computed.flexGrow,
              flexShrink: computed.flexShrink,
            },
            extendsY,
            extendsX,
            scrollOverflowY,
            scrollOverflowX,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          });
        }
      });

      // Specific measurements
      const natureContainer = document.querySelector('.feeder-mobile-nature-container');
      const natureContainerRect = natureContainer ? natureContainer.getBoundingClientRect() : null;
      const natureContainerStyle = natureContainer ? window.getComputedStyle(natureContainer) : null;

      const heroWrap = document.querySelector('.feeder-mobile-hero-wrap');
      const heroWrapRect = heroWrap ? heroWrap.getBoundingClientRect() : null;

      const heroImg = document.querySelector('.feeder-mobile-hero-img');
      const heroImgRect = heroImg ? heroImg.getBoundingClientRect() : null;

      const authPanel = document.querySelector('.feeder-mobile-auth-panel');
      const authPanelRect = authPanel ? authPanel.getBoundingClientRect() : null;
      const authPanelStyle = authPanel ? window.getComputedStyle(authPanel) : null;

      const featuresRow = document.querySelector('.feeder-mobile-features-row');
      const featuresRowRect = featuresRow ? featuresRow.getBoundingClientRect() : null;

      const actionsStack = document.querySelector('.feeder-mobile-actions-stack');
      const actionsStackRect = actionsStack ? actionsStack.getBoundingClientRect() : null;

      const dotsRow = document.querySelector('.feeder-mobile-dots-row');
      const dotsRowRect = dotsRow ? dotsRow.getBoundingClientRect() : null;

      const footerWrap = document.querySelector('.feeder-mobile-footer-wrap');
      const footerWrapRect = footerWrap ? footerWrap.getBoundingClientRect() : null;

      return {
        doc: {
          scrollHeight: doc.scrollHeight,
          clientHeight: doc.clientHeight,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasVerticalScroll: doc.scrollHeight > doc.clientHeight,
          hasHorizontalScroll: doc.scrollWidth > doc.clientWidth,
          verticalOverflowPx: doc.scrollHeight - doc.clientHeight,
        },
        body: {
          scrollHeight: body.scrollHeight,
          clientHeight: body.clientHeight,
          scrollWidth: body.scrollWidth,
          clientWidth: body.clientWidth,
        },
        natureContainer: natureContainerRect
          ? {
              rect: natureContainerRect,
              scrollHeight: natureContainer?.scrollHeight,
              clientHeight: natureContainer?.clientHeight,
              hasScroll: (natureContainer?.scrollHeight || 0) > (natureContainer?.clientHeight || 0),
              overflowPx: (natureContainer?.scrollHeight || 0) - (natureContainer?.clientHeight || 0),
              minHeight: natureContainerStyle?.minHeight,
              height: natureContainerStyle?.height,
              overflowY: natureContainerStyle?.overflowY,
            }
          : null,
        heroWrap: heroWrapRect,
        heroImg: heroImgRect,
        authPanel: authPanelRect
          ? {
              rect: authPanelRect,
              marginTop: authPanelStyle?.marginTop,
              paddingTop: authPanelStyle?.paddingTop,
              paddingBottom: authPanelStyle?.paddingBottom,
              flex: authPanelStyle?.flex,
              flexGrow: authPanelStyle?.flexGrow,
              flexShrink: authPanelStyle?.flexShrink,
              height: authPanelStyle?.height,
            }
          : null,
        featuresRow: featuresRowRect,
        actionsStack: actionsStackRect,
        dotsRow: dotsRowRect,
        footerWrap: footerWrapRect,
        overflowingElements,
      };
    });

    console.log(`\n--- Viewport: ${vp.name} ---`);
    console.log(`Document: clientHeight=${auditData.doc.clientHeight}, scrollHeight=${auditData.doc.scrollHeight} -> Page Scroll: ${auditData.doc.hasVerticalScroll ? 'YES (+' + auditData.doc.verticalOverflowPx + 'px)' : 'NO'}`);
    console.log(`Document Width: clientWidth=${auditData.doc.clientWidth}, scrollWidth=${auditData.doc.scrollWidth} -> Horiz Scroll: ${auditData.doc.hasHorizontalScroll ? 'YES' : 'NO'}`);
    
    if (auditData.natureContainer) {
      console.log(`Container (.feeder-mobile-nature-container): clientHeight=${auditData.natureContainer.clientHeight}, scrollHeight=${auditData.natureContainer.scrollHeight} -> Container Internal Scroll: ${auditData.natureContainer.hasScroll ? 'YES (+' + auditData.natureContainer.overflowPx + 'px)' : 'NO'}`);
      console.log(`  CSS: minHeight=${auditData.natureContainer.minHeight}, height=${auditData.natureContainer.height}, overflowY=${auditData.natureContainer.overflowY}`);
    }
    if (auditData.heroWrap) {
      console.log(`  Hero Wrap height: ${Math.round(auditData.heroWrap.height)}px (top: ${Math.round(auditData.heroWrap.top)}, bottom: ${Math.round(auditData.heroWrap.bottom)})`);
    }
    if (auditData.heroImg) {
      console.log(`  Hero Img height: ${Math.round(auditData.heroImg.height)}px`);
    }
    // Capture screenshot
    const screenshotDir = 'C:/Users/Pachamuthu S/.gemini/antigravity-ide/brain/669b61c9-272a-40f4-aa74-29b3bad8a7ad/screenshots';
    const fs = await import('fs');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const cleanName = vp.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    await page.screenshot({ path: `${screenshotDir}/${cleanName}.png`, fullPage: false });

    // Test Email form if on mobile
    if (vp.width <= 680) {
      const emailBtn = await page.$('.feeder-mobile-btn-email');
      if (emailBtn) {
        await emailBtn.click();
        await page.waitForTimeout(300);

        const emailAudit = await page.evaluate(() => {
          const doc = document.documentElement;
          const container = document.querySelector('.feeder-mobile-nature-container');
          return {
            docScrollHeight: doc.scrollHeight,
            docClientHeight: doc.clientHeight,
            hasDocScroll: doc.scrollHeight > doc.clientHeight,
            containerScrollHeight: container?.scrollHeight,
            containerClientHeight: container?.clientHeight,
            hasContainerScroll: (container?.scrollHeight || 0) > (container?.clientHeight || 0),
          };
        });

        console.log(`  [Email Form Opened] Doc Scroll: ${emailAudit.hasDocScroll ? 'YES (' + emailAudit.docScrollHeight + 'px vs ' + emailAudit.docClientHeight + 'px)' : 'NO'}, Container Scroll: ${emailAudit.hasContainerScroll ? 'YES' : 'NO'}`);
        await page.screenshot({ path: `${screenshotDir}/${cleanName}_email_form.png`, fullPage: false });
      }
    }
  }

  await browser.close();
  console.log('\nAudit complete! Screenshots saved to artifacts directory.');
}

auditLoginPage().catch(console.error);
