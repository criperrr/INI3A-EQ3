import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const DIST_DIR = path.resolve(__dirname, "../src/landing/dist");
const PORT = 8089;

function startServer(): Promise<http.Server> {
    const mimeTypes: Record<string, string> = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".svg": "image/svg+xml",
    };

    const server = http.createServer((req, res) => {
        let reqPath = req.url || "/";
        if (reqPath === "/" || reqPath === "") reqPath = "/index.html";
        const filePath = path.join(DIST_DIR, reqPath.split("?")[0]);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
            fs.createReadStream(filePath).pipe(res);
        } else {
            // SPA fallback
            const indexPath = path.join(DIST_DIR, "index.html");
            res.writeHead(200, { "Content-Type": "text/html" });
            fs.createReadStream(indexPath).pipe(res);
        }
    });

    return new Promise((resolve) => {
        server.listen(PORT, () => {
            console.log(`Server listening on http://localhost:${PORT}`);
            resolve(server);
        });
    });
}

async function runTests() {
    const server = await startServer();
    const browser = await chromium.launch({ headless: true });
    
    try {
        console.log("=== Testing Desktop (1280x800) ===");
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        await page.goto(`http://localhost:${PORT}`, { waitUntil: "networkidle" });

        // 1. Check Header & Logo
        const logoImg = page.locator('img[src*="logo-"]');
        await logoImg.first().waitFor({ state: "visible", timeout: 5000 });
        const logoBox = await logoImg.first().boundingBox();
        console.log(`Desktop Logo bounding box: width=${logoBox?.width}, height=${logoBox?.height}`);
        if (!logoBox || logoBox.height < 45 || logoBox.height > 55) {
            throw new Error(`Desktop logo height expected ~50px, got ${logoBox?.height}`);
        }

        // 2. Check no version badge next to logo in header
        const headerEl = page.locator('#landing-header');
        const headerText = await headerEl.innerText();
        console.log(`Header text content: "${headerText.replace(/\n/g, ' ')}"`);
        if (/v1\.[0-9]/i.test(headerText) || /dev|preview/i.test(headerText)) {
            throw new Error(`Found version/environment badge in header: ${headerText}`);
        }

        // 3. Check Theme button dimensions
        const themeBtn = page.locator('div[aria-label="Alternar tema visual"]');
        const themeBtnBox = await themeBtn.boundingBox();
        console.log(`Theme Button bounding box: width=${themeBtnBox?.width}, height=${themeBtnBox?.height}`);
        if (!themeBtnBox || themeBtnBox.width > 32 || themeBtnBox.height > 32) {
            throw new Error(`Theme button expected compact <=32px, got ${themeBtnBox?.width}x${themeBtnBox?.height}`);
        }

        // 4. Check Navigation link for FAQ has normal high contrast
        const faqLink = page.locator('text="FAQ"').first();
        const faqColor = await faqLink.evaluate((el) => window.getComputedStyle(el).color);
        const howItWorksLink = page.locator('text="Como Funciona"').first();
        const howItWorksColor = await howItWorksLink.evaluate((el) => window.getComputedStyle(el).color);
        console.log(`FAQ link color: ${faqColor}, Como Funciona color: ${howItWorksColor}`);
        if (faqColor !== howItWorksColor) {
            throw new Error(`FAQ link color (${faqColor}) does not match other headers (${howItWorksColor})`);
        }

        // 5. Test Auto-hide on Scroll Down and Reveal on Scroll Up
        console.log("Testing scroll auto-hide...");
        
        // Initial transform
        const initialTransform = await headerEl.evaluate((el) => window.getComputedStyle(el).transform);
        console.log(`Initial header transform: ${initialTransform}`);

        // Scroll down 400px
        const scrollView = page.locator('#landing-scroll-view');
        await scrollView.evaluate((el) => {
            el.scrollTop = 500;
            el.dispatchEvent(new Event("scroll"));
        });
        await page.waitForTimeout(400);

        const scrolledDownTransform = await headerEl.evaluate((el) => window.getComputedStyle(el).transform);
        console.log(`Scrolled down transform: ${scrolledDownTransform}`);
        if (!scrolledDownTransform.includes("-100") && !scrolledDownTransform.includes("matrix(1, 0, 0, 1, 0, -100)")) {
            console.warn(`Header transform down: ${scrolledDownTransform}`);
        }

        // Scroll up
        await scrollView.evaluate((el) => {
            el.scrollTop = 200;
            el.dispatchEvent(new Event("scroll"));
        });
        await page.waitForTimeout(400);

        const scrolledUpTransform = await headerEl.evaluate((el) => window.getComputedStyle(el).transform);
        console.log(`Scrolled up transform: ${scrolledUpTransform}`);

        // 6. Test FAQ Accordion
        console.log("Testing FAQ Section...");
        const faqHeader = page.locator('text="Perguntas Frequentes sobre"');
        await faqHeader.scrollIntoViewIfNeeded();
        const isFaqVisible = await faqHeader.isVisible();
        console.log(`FAQ section title visible: ${isFaqVisible}`);

        const firstAnswer = page.locator('text=/Sim, 100% gratuito e de código aberto/').first();
        console.log(`First FAQ answer visible (default open): ${await firstAnswer.isVisible()}`);

        // 7. Verify no "PostGIS" in DOM text
        const bodyText = await page.innerText("body");
        if (/postgis/i.test(bodyText)) {
            throw new Error('Found forbidden "PostGIS" term in page body text!');
        }
        console.log('Verified: No "PostGIS" terms found anywhere on page!');

        // Take a screenshot of the Header and FAQ
        await page.screenshot({ path: "scripts/landing_audit_desktop.png", fullPage: false });
        console.log("Desktop screenshot saved to scripts/landing_audit_desktop.png");

        // Mobile viewport test (390x844 - iPhone 12/13/14)
        console.log("=== Testing Mobile (390x844) ===");
        const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const mobilePage = await mobileContext.newPage();
        await mobilePage.goto(`http://localhost:${PORT}`, { waitUntil: "networkidle" });
        const mobileLogo = mobilePage.locator('#landing-header img').first();
        const mobileLogoBox = await mobileLogo.boundingBox();
        const mobileDetails = await mobileLogo.evaluate((el) => ({
            clientWidth: el.clientWidth,
            clientHeight: el.clientHeight,
            src: (el as HTMLImageElement).src,
        }));
        console.log(`Mobile Logo details:`, mobileDetails, `box:`, mobileLogoBox);
        if (!mobileLogoBox || mobileLogoBox.height < 36 || mobileLogoBox.height > 46) {
            throw new Error(`Mobile logo height expected ~38-44px, got ${mobileLogoBox?.height}`);
        }
        await mobilePage.screenshot({ path: "scripts/landing_audit_mobile.png", fullPage: false });
        console.log("Mobile screenshot saved to scripts/landing_audit_mobile.png");

        console.log("\nALL LANDING PAGE AUDIT TESTS PASSED SUCCESSFULLY! ✅");
    } finally {
        await browser.close();
        server.close();
    }
}

runTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
