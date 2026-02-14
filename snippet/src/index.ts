/**
 * Eagle B2B Commerce Engine - Shopify Snippet
 * Browser fingerprinting, rrweb session replay, cart tracking,
 * customer identity resolution, and multi-touch traffic attribution
 */

import { record } from '@rrweb/record';
import type { eventWithTime } from '@rrweb/types';

interface EagleConfig {
  apiUrl: string;
  shop: string;
  token?: string;
}

interface TrafficSource {
  // UTM parameters
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  // Ad platform click IDs
  gclid: string | null;   // Google Ads
  fbclid: string | null;  // Facebook/Meta
  ttclid: string | null;  // TikTok
  msclkid: string | null; // Microsoft/Bing Ads
  // Derived
  referrer: string;
  referrerDomain: string | null;
  channel: string;        // google_organic, google_ads, facebook_ads, direct, email, etc.
  landingPage: string;
}

declare global {
  interface Window {
    Shopify?: any;
    ShopifyAnalytics?: any;
    Eagle?: EagleSnippet;
  }
}

class EagleSnippet {
  private config: EagleConfig;
  private sessionId: string;
  private customerId: string | null = null;
  private cartToken: string | null = null;
  private fingerprintHash: string | null = null;
  private thumbmarkHash: string | null = null;
  private trafficSource: TrafficSource | null = null;

  private rrwebEvents: eventWithTime[] = [];
  private rrwebFlushInterval: ReturnType<typeof setInterval> | null = null;
  private rrwebStopFn: (() => void) | null | undefined = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: EagleConfig) {
    this.config = config;
    this.sessionId = this.getOrCreateSessionId();
    this.init();
  }

  private async init() {
    console.log('🦅 Eagle B2B Engine initialized');
    this.loadToken();
    this.detectCustomer();

    // Capture traffic source BEFORE anything else (UTM params may be in URL)
    this.trafficSource = this.captureTrafficSource();

    // Collect fingerprint (with ThumbmarkJS) - async, non-blocking
    this.collectFingerprint();

    // Send traffic attribution to backend
    this.sendTrafficAttribution();

    this.trackPageView();
    this.setupEventListeners();
    this.setupCartTracking();
    this.setupCustomerSync();
    this.setupCheckoutAutofill();

    // Start presence heartbeat & rrweb session recording
    this.startHeartbeat();
    this.startSessionRecording();
  }

  // ============================
  // REAL-TIME PRESENCE (Heartbeat)
  // ============================

  private startHeartbeat() {
    // Immediate first heartbeat
    this.sendHeartbeat();

    // Then every 30 seconds
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30000);

    // Stop on page unload
    window.addEventListener('beforeunload', () => {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      // Send final "offline" signal via sendBeacon
      const payload = JSON.stringify({
        shop: this.config.shop,
        sessionId: this.sessionId,
        fingerprintHash: this.fingerprintHash,
        status: 'offline',
        timestamp: Date.now(),
      });
      navigator.sendBeacon(`${this.config.apiUrl}/api/v1/fingerprint/heartbeat`, new Blob([payload], { type: 'application/json' }));
    });

    // Detect visibility changes (tab hidden = away)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.sendHeartbeat('away');
      } else {
        this.sendHeartbeat('online');
      }
    });
  }

  private async sendHeartbeat(status: string = 'online') {
    try {
      await fetch(`${this.config.apiUrl}/api/v1/fingerprint/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: this.config.shop,
          sessionId: this.sessionId,
          fingerprintHash: this.fingerprintHash,
          eagleToken: this.config.token || localStorage.getItem('eagle_token'),
          status,
          timestamp: Date.now(),
          page: {
            url: window.location.href,
            path: window.location.pathname,
            title: document.title,
            referrer: document.referrer,
          },
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollY: window.scrollY,
          },
        }),
        keepalive: true,
      });
    } catch { /* silent */ }
  }

  // ============================
  // SESSION RECORDING (rrweb — Clarity-grade)
  // ============================

  private async startSessionRecording() {
    try {
      // Step 1: Inline cross-origin stylesheets BEFORE rrweb takes its snapshot
      // Shopify CSS lives on cdn.shopify.com and rrweb can't capture cross-origin styles
      await this.inlineCrossOriginStyles();

      // Step 2: Start rrweb recording
      this.rrwebStopFn = record({
        emit: (event: eventWithTime) => {
          this.rrwebEvents.push(event);
        },
        // Privacy — mask user input
        maskAllInputs: true,
        maskTextSelector: '[data-eagle-mask]',
        // Performance — sample interactions
        sampling: {
          mousemove: 50,          // sample mousemove every 50ms (not every pixel)
          mouseInteraction: true, // capture clicks etc.
          scroll: 150,            // sample scroll every 150ms
          media: 800,
          input: 'last',
        },
        // Inline stylesheets for accurate replay
        inlineStylesheet: true,
        // Collect fonts for accurate typography
        collectFonts: true,
        // Block heavy elements
        blockSelector: '[data-eagle-block], .no-replay, iframe[src*="youtube"], iframe[src*="vimeo"]',
        // Slim mode — remove unnecessary head metadata
        slimDOMOptions: {
          script: true,
          comment: true,
          headFavicon: true,
          headWhitespace: true,
          headMetaDescKeywords: true,
          headMetaSocial: true,
          headMetaRobots: true,
          headMetaHttpEquiv: true,
          headMetaAuthorship: true,
          headMetaVerification: true,
        },
      });

      console.log('🦅 Eagle: Session recording started (rrweb)');

      // Flush rrweb events every 10 seconds
      this.rrwebFlushInterval = setInterval(() => this.flushRrwebEvents(), 10000);

      // Flush on page unload
      window.addEventListener('beforeunload', () => {
        if (this.rrwebFlushInterval) clearInterval(this.rrwebFlushInterval);
        if (this.rrwebStopFn) this.rrwebStopFn();
        this.flushRrwebEvents(true);
      });
    } catch (err) {
      console.warn('🦅 Eagle: Session recording failed to start', err);
    }
  }

  /**
   * Fetch cross-origin stylesheets and inject them as inline <style> elements
   * so rrweb can capture them in its FullSnapshot.
   * Shopify stores CSS on cdn.shopify.com which is cross-origin.
   */
  private async inlineCrossOriginStyles() {
    try {
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      const fetches: Promise<void>[] = [];

      links.forEach((link) => {
        const href = link.getAttribute('href');
        if (!href) return;

        // Check if cross-origin
        try {
          const url = new URL(href, window.location.origin);
          if (url.origin === window.location.origin) return; // same-origin, rrweb handles it
        } catch {
          return; // invalid URL
        }

        const fetchPromise = fetch(href, { mode: 'cors' })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
          })
          .then((cssText) => {
            // Create an inline <style> element with the CSS content
            const style = document.createElement('style');
            style.setAttribute('data-eagle-inlined', 'true');
            style.setAttribute('data-original-href', href);
            style.textContent = cssText;
            // Insert the inline style right after the original link
            link.parentNode?.insertBefore(style, link.nextSibling);
          })
          .catch(() => {
            // Silently skip stylesheets that can't be fetched (CORS blocked, etc.)
          });

        fetches.push(fetchPromise);
      });

      // Wait max 3 seconds for all fetches
      if (fetches.length > 0) {
        await Promise.race([
          Promise.allSettled(fetches),
          new Promise<void>((resolve) => setTimeout(resolve, 3000)),
        ]);
        console.log(`🦅 Eagle: Inlined ${fetches.length} cross-origin stylesheets`);
      }
    } catch {
      // Non-critical — recording will work, just without cross-origin styles
    }
  }

  private flushRrwebEvents(useBeacon: boolean = false) {
    if (this.rrwebEvents.length === 0) return;

    const events = this.rrwebEvents.splice(0); // Take all and clear
    const data = {
      shop: this.config.shop,
      sessionId: this.sessionId,
      fingerprintHash: this.fingerprintHash,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      pageUrl: window.location.href,
      events, // Full rrweb events
    };

    const payload = JSON.stringify(data);

    if (useBeacon) {
      navigator.sendBeacon(
        `${this.config.apiUrl}/api/v1/fingerprint/mouse`,
        new Blob([payload], { type: 'application/json' })
      );
    } else {
      fetch(`${this.config.apiUrl}/api/v1/fingerprint/mouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch((err) => {
        console.warn('🦅 Eagle: Failed to flush rrweb events', err);
      });
    }
  }

  // ============================
  // FINGERPRINT COLLECTION
  // ============================

  private async collectFingerprint() {
    try {
      // Collect ThumbmarkJS fingerprint in parallel with our own
      const [fp, thumbmark] = await Promise.all([
        this.generateFingerprint(),
        import('@thumbmarkjs/thumbmarkjs').then(m => m.getFingerprint()).catch(() => null),
      ]);

      this.fingerprintHash = fp.hash;
      this.thumbmarkHash = typeof thumbmark === 'string' ? thumbmark : null;

      // Get identity signals
      const email = this.detectEmail();
      const shopifyCustomerId = this.detectShopifyCustomerId();

      const payload = {
        shop: this.config.shop,
        fingerprintHash: fp.hash,
        thumbmarkHash: this.thumbmarkHash || undefined,
        sessionId: this.sessionId,
        eagleToken: this.config.token || undefined,
        email: email || undefined,
        shopifyCustomerId: shopifyCustomerId || undefined,
        ...fp.signals,
        signalCount: fp.signalCount,
        // Include traffic source in fingerprint collect
        trafficSource: this.trafficSource || undefined,
      };

      const response = await fetch(`${this.config.apiUrl}/api/v1/fingerprint/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.isReturning) {
          console.log(`🦅 Eagle: Returning visitor (visit #${result.visitCount})`);
        }
      }
    } catch (err) {
      console.error('🦅 Eagle: Fingerprint collection failed', err);
    }
  }

  private async generateFingerprint(): Promise<{ hash: string; signals: any; signalCount: number }> {
    const signals: any = {};
    let signalCount = 0;

    // === Canvas Fingerprint ===
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw complex pattern
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.font = '11pt Arial';
        ctx.fillText('Eagle B2B 🦅', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.font = '18pt Arial';
        ctx.fillText('Canvas FP', 4, 45);

        // Gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.5, '#00ff00');
        gradient.addColorStop(1, '#0000ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 60, canvas.width, 20);

        // Arc
        ctx.beginPath();
        ctx.arc(50, 100, 25, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        signals.canvasHash = await this.hashString(canvas.toDataURL());
        signalCount++;
      }
    } catch { /* silent */ }

    // === WebGL Fingerprint ===
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const glCtx = gl as WebGLRenderingContext;
        const debugInfo = glCtx.getExtension('WEBGL_debug_renderer_info');

        if (debugInfo) {
          signals.gpuVendor = glCtx.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          signals.gpuRenderer = glCtx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          signalCount += 2;
        }

        // WebGL params hash
        const params = [
          glCtx.getParameter(glCtx.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
          glCtx.getParameter(glCtx.MAX_CUBE_MAP_TEXTURE_SIZE),
          glCtx.getParameter(glCtx.MAX_FRAGMENT_UNIFORM_VECTORS),
          glCtx.getParameter(glCtx.MAX_RENDERBUFFER_SIZE),
          glCtx.getParameter(glCtx.MAX_TEXTURE_IMAGE_UNITS),
          glCtx.getParameter(glCtx.MAX_TEXTURE_SIZE),
          glCtx.getParameter(glCtx.MAX_VARYING_VECTORS),
          glCtx.getParameter(glCtx.MAX_VERTEX_ATTRIBS),
          glCtx.getParameter(glCtx.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
          glCtx.getParameter(glCtx.MAX_VERTEX_UNIFORM_VECTORS),
          glCtx.getParameter(glCtx.MAX_VIEWPORT_DIMS),
          glCtx.getParameter(glCtx.RENDERER),
          glCtx.getParameter(glCtx.VENDOR),
        ].join('|');

        signals.webglHash = await this.hashString(params);
        signalCount++;
      }
    } catch { /* silent */ }

    // === Audio Fingerprint ===
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const analyser = audioCtx.createAnalyser();
      const gainNode = audioCtx.createGain();
      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0; // Mute
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, audioCtx.currentTime);

      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start(0);

      const fingerprint = await new Promise<string>((resolve) => {
        scriptProcessor.onaudioprocess = (event) => {
          const data = event.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < data.length; i++) { sum += Math.abs(data[i]); }
          oscillator.disconnect();
          scriptProcessor.disconnect();
          gainNode.disconnect();
          audioCtx.close();
          resolve(sum.toString());
        };
      });

      signals.audioHash = await this.hashString(fingerprint);
      signalCount++;
    } catch { /* silent */ }

    // === Device & Browser Signals ===
    signals.userAgent = navigator.userAgent;
    signals.platform = navigator.platform;
    signals.language = navigator.language;
    signals.languages = navigator.languages?.join(',');
    signals.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    signals.timezoneOffset = new Date().getTimezoneOffset();
    signalCount += 6;

    // Screen
    signals.screenWidth = screen.width;
    signals.screenHeight = screen.height;
    signals.colorDepth = screen.colorDepth;
    signals.pixelRatio = window.devicePixelRatio;
    signals.touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    signalCount += 5;

    // Hardware
    signals.hardwareConcurrency = navigator.hardwareConcurrency || 0;
    signals.deviceMemory = (navigator as any).deviceMemory || null;
    signals.maxTouchPoints = navigator.maxTouchPoints || 0;
    signalCount += 3;

    // Browser features
    signals.cookiesEnabled = navigator.cookieEnabled;
    signals.doNotTrack = navigator.doNotTrack || (window as any).doNotTrack || null;
    signals.pluginCount = navigator.plugins?.length || 0;
    signalCount += 3;

    // Connection
    const conn = (navigator as any).connection;
    if (conn) {
      signals.connectionType = conn.effectiveType || conn.type;
      signalCount++;
    }

    // Font detection (quick subset)
    try {
      const testString = 'mmmmmmmmmmMLI';
      const baseFonts = ['monospace', 'sans-serif', 'serif'];
      const testFonts = [
        'Arial', 'Courier New', 'Georgia', 'Helvetica', 'Times New Roman',
        'Trebuchet MS', 'Verdana', 'Comic Sans MS', 'Impact', 'Lucida Console',
        'Tahoma', 'Palatino Linotype', 'Segoe UI', 'Roboto',
      ];

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const getWidth = (font: string) => {
          ctx.font = `72px ${font}`;
          return ctx.measureText(testString).width;
        };

        const baseWidths = baseFonts.map(f => getWidth(f));
        let detectedCount = 0;

        for (const font of testFonts) {
          for (let i = 0; i < baseFonts.length; i++) {
            if (getWidth(`'${font}', ${baseFonts[i]}`) !== baseWidths[i]) {
              detectedCount++;
              break;
            }
          }
        }
        signals.fontCount = detectedCount;
        signalCount++;
      }
    } catch { /* silent */ }

    // AdBlock detection
    try {
      const ad = document.createElement('div');
      ad.innerHTML = '&nbsp;';
      ad.className = 'adsbox ad-banner';
      ad.style.cssText = 'position:absolute;top:-999px;left:-999px;width:1px;height:1px;';
      document.body.appendChild(ad);
      await new Promise(r => setTimeout(r, 100));
      signals.adBlockDetected = ad.offsetHeight === 0 || ad.offsetParent === null;
      document.body.removeChild(ad);
      signalCount++;
    } catch { /* silent */ }

    // === Generate Composite Hash ===
    const compositeString = [
      signals.canvasHash,
      signals.webglHash,
      signals.audioHash,
      signals.platform,
      signals.timezone,
      signals.screenWidth,
      signals.screenHeight,
      signals.hardwareConcurrency,
      signals.gpuRenderer,
      signals.language,
      signals.colorDepth,
    ].filter(Boolean).join('|');

    const hash = await this.hashString(compositeString);

    return { hash, signals, signalCount };
  }

  private async hashString(str: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback for insecure contexts
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    }
  }

  // ============================
  // IDENTITY DETECTION
  // ============================

  private detectEmail(): string | null {
    // Try Shopify customer
    if (window.Shopify?.customer?.email) return window.Shopify.customer.email;
    // Try meta tag
    const meta = document.querySelector('meta[name="customer-email"]');
    if (meta) return meta.getAttribute('content');
    // Try checkout stored data
    const autofill = localStorage.getItem('eagle_checkout_autofill');
    if (autofill) {
      try { return JSON.parse(autofill).email; } catch { /* */ }
    }
    return null;
  }

  private detectShopifyCustomerId(): string | null {
    if (window.ShopifyAnalytics?.meta?.page?.customerId) {
      return window.ShopifyAnalytics.meta.page.customerId.toString();
    }
    if (window.Shopify?.customer?.id) {
      return window.Shopify.customer.id.toString();
    }
    return null;
  }

  private detectCustomer() {
    const customerId = this.detectShopifyCustomerId();
    if (customerId) {
      this.customerId = customerId;
      this.syncCustomerToEagle();
    }
  }

  // ============================
  // SESSION MANAGEMENT
  // ============================

  private getOrCreateSessionId(): string {
    const key = 'eagle_session_id';
    let sessionId = sessionStorage.getItem(key);
    if (!sessionId) {
      sessionId = `eagle-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem(key, sessionId);
    }
    return sessionId;
  }

  // ============================
  // EXISTING FUNCTIONALITY (PRESERVED)
  // ============================

  private async syncCustomerToEagle() {
    if (!this.customerId) return;
    try {
      await fetch(`${this.config.apiUrl}/api/v1/events/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: this.config.shop,
          sessionId: this.sessionId,
          eagleToken: this.config.token,
          shopifyCustomerId: this.customerId,
          eventType: 'customer_session',
          payload: {
            timestamp: new Date().toISOString(),
            fingerprintHash: this.fingerprintHash,
          },
        }),
      });
    } catch (err) {
      console.error('Eagle: Customer sync failed', err);
    }
  }

  private setupCartTracking() {
    if (typeof window !== 'undefined') {
      console.log('🦅 Eagle: Setting up cart tracking');

      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const url = args[0]?.toString() || '';
        if (url.includes('/cart/') || url.includes('/cart.js') || url.includes('/cart/add.js')) {
          setTimeout(() => this.syncCartToEagle(), 500);
        }
        return response;
      };

      setTimeout(() => this.syncCartToEagle(), 1000);
      setInterval(() => this.syncCartToEagle(), 30000);
      document.addEventListener('cart:updated', () => this.syncCartToEagle());
    }
  }

  private async syncCartToEagle() {
    try {
      const cartResponse = await fetch('/cart.js');
      if (!cartResponse.ok) return;

      const cart = await cartResponse.json();
      if (!cart.items || cart.items.length === 0 || !cart.token) return;

      this.cartToken = cart.token;
      let customerEmail = null;
      if (window.Shopify?.customer?.email) customerEmail = window.Shopify.customer.email;

      const payload = {
        cartToken: this.cartToken,
        shopDomain: this.config.shop,
        customerEmail,
        fingerprintHash: this.fingerprintHash,
        items: cart.items.map((item: any) => ({
          shopifyVariantId: item.variant_id,
          title: item.title,
          variantTitle: item.variant_title || undefined,
          quantity: item.quantity,
          price: item.price / 100,
          imageUrl: item.image || undefined,
        })),
        subtotal: cart.total_price / 100,
        total: cart.total_price / 100,
        currency: cart.currency,
        checkoutUrl: `/checkout`,
      };

      await fetch(`${this.config.apiUrl}/api/v1/abandoned-carts/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Eagle: Cart sync failed', err);
    }
  }

  private setupCustomerSync() {
    const checkCustomerLogin = () => {
      if (window.Shopify?.customer) {
        this.customerId = window.Shopify.customer.id?.toString();
        if (this.config.token) this.linkCustomerAccounts();
      }
    };
    checkCustomerLogin();
    setInterval(checkCustomerLogin, 5000);
  }

  private async linkCustomerAccounts() {
    if (!this.customerId || !this.config.token) return;
    try {
      await fetch(`${this.config.apiUrl}/api/v1/events/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: this.config.shop,
          sessionId: this.sessionId,
          eagleToken: this.config.token,
          shopifyCustomerId: this.customerId,
          eventType: 'customer_link',
          payload: {
            timestamp: new Date().toISOString(),
            action: 'link_accounts',
            fingerprintHash: this.fingerprintHash,
          },
        }),
      });
    } catch (err) {
      console.error('Eagle: Account linking failed', err);
    }
  }

  private loadToken() {
    const token = localStorage.getItem('eagle_token');
    if (token) this.config.token = token;
  }

  private async trackEvent(eventType: string, payload: any) {
    const eventData = {
      shop: this.config.shop,
      sessionId: this.sessionId,
      eagleToken: this.config.token,
      eventType,
      fingerprintHash: this.fingerprintHash,
      payload: { ...payload, fingerprintHash: this.fingerprintHash },
      timestamp: new Date().toISOString(),
    };

    try {
      // Send to events collector
      fetch(`${this.config.apiUrl}/api/v1/events/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      }).catch(() => {});

      // Send to fingerprint event archive
      fetch(`${this.config.apiUrl}/api/v1/fingerprint/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      }).catch(() => {});
    } catch (error) {
      console.error('Eagle: Failed to track event', error);
    }
  }

  private trackPageView() {
    this.trackEvent('page_view', {
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer,
      trafficChannel: this.trafficSource?.channel || 'unknown',
      utmSource: this.trafficSource?.utmSource || undefined,
      utmMedium: this.trafficSource?.utmMedium || undefined,
      utmCampaign: this.trafficSource?.utmCampaign || undefined,
    });
  }

  private setupEventListeners() {
    if (window.location.pathname.includes('/products/')) {
      this.trackProductView();
    }
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[name="add"]') || target.closest('.product-form__submit')) {
        this.trackAddToCart();
      }
    });
  }

  private trackProductView() {
    const productMeta = document.querySelector('meta[property="og:product_id"]');
    const productTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
      || document.querySelector('h1')?.textContent?.trim();
    const productPrice = document.querySelector('meta[property="og:price:amount"]')?.getAttribute('content')
      || document.querySelector('.price__regular .price-item--regular')?.textContent?.replace(/[^0-9.]/g, '');

    if (productMeta) {
      const productId = productMeta.getAttribute('content');
      const variantId = new URLSearchParams(window.location.search).get('variant');
      this.trackEvent('product_view', {
        productId,
        variantId,
        productTitle,
        productPrice: productPrice ? parseFloat(productPrice) : undefined,
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
      });
    }
  }

  private trackAddToCart() {
    // Try to get product context from Shopify globals
    const shopifyProduct = (window as any).ShopifyAnalytics?.meta?.product;
    const quantityInput = document.querySelector('input[name="quantity"]') as HTMLInputElement;
    const quantity = quantityInput ? parseInt(quantityInput.value, 10) : 1;

    this.trackEvent('add_to_cart', {
      url: window.location.href,
      path: window.location.pathname,
      productId: shopifyProduct?.id?.toString(),
      productTitle: shopifyProduct?.type || document.querySelector('h1')?.textContent?.trim(),
      quantity,
    });
  }

  public setToken(token: string) {
    this.config.token = token;
    localStorage.setItem('eagle_token', token);
    // Re-collect fingerprint with new identity
    this.collectFingerprint();
  }

  public clearToken() {
    this.config.token = undefined;
    localStorage.removeItem('eagle_token');
  }

  private setupCheckoutAutofill() {
    if (!window.location.href.includes('/checkout') && !window.location.href.includes('/checkouts')) return;

    const fillCheckoutForm = () => {
      try {
        const data = localStorage.getItem('eagle_checkout_autofill') || sessionStorage.getItem('eagle_checkout_autofill');
        if (!data) return false;
        const userInfo = JSON.parse(data);
        if (Date.now() - userInfo.timestamp > 300000) {
          localStorage.removeItem('eagle_checkout_autofill');
          sessionStorage.removeItem('eagle_checkout_autofill');
          return false;
        }

        let filledCount = 0;
        const fillInput = (selector: string, value: string) => {
          const el = document.querySelector(selector);
          if (el && value && !(el as HTMLInputElement).value) {
            (el as HTMLInputElement).value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          }
        };
        const fillSelect = (selector: string, value: string) => {
          const el = document.querySelector(selector) as HTMLSelectElement;
          if (el && value) {
            const opt = Array.from(el.options).find(o => o.value === value || o.textContent?.includes(value));
            if (opt && el.value !== opt.value) {
              el.value = opt.value;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              filledCount++;
            }
          }
        };

        fillInput('#email', userInfo.email);
        fillInput('input[name="email"]', userInfo.email);
        fillInput('input[autocomplete="email"]', userInfo.email);
        fillInput('input[autocomplete="shipping given-name"]', userInfo.firstName);
        fillInput('input[autocomplete="given-name"]', userInfo.firstName);
        fillInput('input[autocomplete="shipping family-name"]', userInfo.lastName);
        fillInput('input[autocomplete="family-name"]', userInfo.lastName);
        fillInput('input[autocomplete="shipping address-line1"]', userInfo.address1);
        fillInput('input[autocomplete="address-line1"]', userInfo.address1);
        if (userInfo.address2) fillInput('input[autocomplete="address-line2"]', userInfo.address2);
        fillInput('input[autocomplete="shipping address-level2"]', userInfo.city);
        fillInput('input[autocomplete="address-level2"]', userInfo.city);
        fillSelect('select[autocomplete="shipping address-level1"]', userInfo.state);
        fillSelect('select[autocomplete="address-level1"]', userInfo.state);
        fillInput('input[autocomplete="shipping postal-code"]', userInfo.zip);
        fillInput('input[autocomplete="postal-code"]', userInfo.zip);
        if (userInfo.country) fillSelect('select[autocomplete="country"]', userInfo.country);

        if (filledCount > 0) {
          setTimeout(() => {
            localStorage.removeItem('eagle_checkout_autofill');
            sessionStorage.removeItem('eagle_checkout_autofill');
          }, 10000);
        }
        return filledCount > 0;
      } catch { return false; }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(fillCheckoutForm, 500);
        setTimeout(fillCheckoutForm, 2000);
        setTimeout(fillCheckoutForm, 5000);
      });
    } else {
      fillCheckoutForm();
      setTimeout(fillCheckoutForm, 500);
      setTimeout(fillCheckoutForm, 2000);
    }

    const observer = new MutationObserver(() => fillCheckoutForm());
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 30000);
  }

  // ============================
  // TRAFFIC SOURCE & ATTRIBUTION
  // ============================

  private captureTrafficSource(): TrafficSource {
    const params = new URLSearchParams(window.location.search);

    // Parse UTM parameters
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    const utmContent = params.get('utm_content');
    const utmTerm = params.get('utm_term');

    // Parse ad platform click IDs
    const gclid = params.get('gclid');
    const fbclid = params.get('fbclid');
    const ttclid = params.get('ttclid');
    const msclkid = params.get('msclkid');

    // Parse referrer
    const referrer = document.referrer || '';
    let referrerDomain: string | null = null;
    try {
      if (referrer) referrerDomain = new URL(referrer).hostname.replace('www.', '');
    } catch { }

    // Classify the traffic channel
    const channel = this.classifyChannel({
      utmSource, utmMedium, gclid, fbclid, ttclid, msclkid, referrerDomain,
    });

    const source: TrafficSource = {
      utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
      gclid, fbclid, ttclid, msclkid,
      referrer, referrerDomain, channel,
      landingPage: window.location.pathname + window.location.search,
    };

    // Save first-touch attribution (persisted across sessions via localStorage)
    const firstTouchKey = 'eagle_first_touch';
    if (!localStorage.getItem(firstTouchKey)) {
      localStorage.setItem(firstTouchKey, JSON.stringify({
        ...source,
        timestamp: Date.now(),
      }));
    }

    // Save current touch for this session
    sessionStorage.setItem('eagle_current_touch', JSON.stringify(source));

    return source;
  }

  private classifyChannel(params: {
    utmSource: string | null; utmMedium: string | null;
    gclid: string | null; fbclid: string | null;
    ttclid: string | null; msclkid: string | null;
    referrerDomain: string | null;
  }): string {
    const { utmSource, utmMedium, gclid, fbclid, ttclid, msclkid, referrerDomain } = params;
    const src = (utmSource || '').toLowerCase();
    const med = (utmMedium || '').toLowerCase();
    const ref = (referrerDomain || '').toLowerCase();

    // 1. Ad platform click IDs (highest priority — definitive)
    if (gclid) return 'google_ads';
    if (fbclid) return 'facebook_ads';
    if (ttclid) return 'tiktok_ads';
    if (msclkid) return 'bing_ads';

    // 2. UTM medium = paid variations
    if (med === 'cpc' || med === 'ppc' || med === 'paid' || med === 'paidsearch') {
      if (src.includes('google')) return 'google_ads';
      if (src.includes('facebook') || src.includes('fb') || src.includes('meta')) return 'facebook_ads';
      if (src.includes('instagram') || src.includes('ig')) return 'instagram_ads';
      if (src.includes('tiktok')) return 'tiktok_ads';
      if (src.includes('bing') || src.includes('microsoft')) return 'bing_ads';
      return 'paid_other';
    }

    // 3. UTM medium = social
    if (med === 'social' || med === 'social-media') {
      if (src.includes('facebook') || src.includes('fb')) return 'facebook_organic';
      if (src.includes('instagram') || src.includes('ig')) return 'instagram_organic';
      if (src.includes('tiktok')) return 'tiktok_organic';
      if (src.includes('twitter') || src.includes('x.com')) return 'twitter_organic';
      if (src.includes('linkedin')) return 'linkedin_organic';
      return 'social_other';
    }

    // 4. UTM medium = email
    if (med === 'email' || med === 'e-mail' || src.includes('email') || src.includes('mailchimp') || src.includes('klaviyo')) {
      return 'email';
    }

    // 5. UTM medium = referral
    if (med === 'referral') return 'referral';

    // 6. Referrer-based classification (no UTM)
    if (ref) {
      // Search engines
      if (ref.includes('google.')) return 'google_organic';
      if (ref.includes('bing.') || ref.includes('msn.')) return 'bing_organic';
      if (ref.includes('yahoo.')) return 'yahoo_organic';
      if (ref.includes('duckduckgo.')) return 'duckduckgo_organic';
      if (ref.includes('yandex.')) return 'yandex_organic';
      if (ref.includes('baidu.')) return 'baidu_organic';

      // Social platforms
      if (ref.includes('facebook.') || ref.includes('fb.') || ref.includes('m.facebook.')) return 'facebook_organic';
      if (ref.includes('instagram.')) return 'instagram_organic';
      if (ref.includes('tiktok.')) return 'tiktok_organic';
      if (ref.includes('twitter.') || ref.includes('t.co') || ref.includes('x.com')) return 'twitter_organic';
      if (ref.includes('linkedin.')) return 'linkedin_organic';
      if (ref.includes('pinterest.')) return 'pinterest_organic';
      if (ref.includes('youtube.') || ref.includes('youtu.be')) return 'youtube_organic';
      if (ref.includes('reddit.')) return 'reddit';

      // Same domain = internal (shouldn't normally be first touch)
      if (ref.includes(window.location.hostname)) return 'internal';

      // Any other referrer
      return 'referral';
    }

    // 7. No referrer, no UTM = direct
    return 'direct';
  }

  private async sendTrafficAttribution() {
    if (!this.trafficSource) return;

    // Get first-touch data
    let firstTouch: TrafficSource | null = null;
    try {
      const raw = localStorage.getItem('eagle_first_touch');
      if (raw) firstTouch = JSON.parse(raw);
    } catch { }

    const payload = {
      shop: this.config.shop,
      sessionId: this.sessionId,
      fingerprintHash: this.fingerprintHash,
      // Current session touch
      currentTouch: this.trafficSource,
      // First ever touch for this device
      firstTouch: firstTouch || this.trafficSource,
    };

    try {
      await fetch(`${this.config.apiUrl}/api/v1/fingerprint/attribution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('🦅 Eagle: Traffic attribution failed', err);
    }
  }
}

// Initialize Eagle when DOM is ready
(function () {
  const scriptTag = document.currentScript as HTMLScriptElement;
  const apiUrl = scriptTag?.getAttribute('data-api-url') || '';

  let shop = scriptTag?.getAttribute('data-shop') || '';
  if (!shop && typeof window !== 'undefined') {
    if ((window as any).Shopify?.shop) shop = (window as any).Shopify.shop;
    else if (window.location.hostname.includes('.myshopify.com')) shop = window.location.hostname;
    else if ((window as any).Shopify?.Checkout?.apiHost) shop = (window as any).Shopify.Checkout.apiHost;
    else {
      const shopMeta = document.querySelector('meta[name="shopify-shop"]');
      if (shopMeta) shop = shopMeta.getAttribute('content') || '';
    }
  }

  if (!shop) console.warn('🦅 Eagle: Could not detect shop domain');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      (window as any).Eagle = new EagleSnippet({ apiUrl, shop });
    });
  } else {
    (window as any).Eagle = new EagleSnippet({ apiUrl, shop });
  }
})();
