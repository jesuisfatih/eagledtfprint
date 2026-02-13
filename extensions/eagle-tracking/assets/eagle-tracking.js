/**
 * Eagle B2B Engine — Theme App Extension JS
 * This file provides supplementary functionality for the extension block.
 * The main tracking logic lives in the CDN snippet (snippet.iife.js).
 * This file handles extension-specific integration with Shopify theme context.
 */
(function() {
  'use strict';

  // Wait for Eagle snippet to initialize
  function waitForEagle(callback, maxWait) {
    maxWait = maxWait || 10000;
    var start = Date.now();
    var check = setInterval(function() {
      if (window.Eagle) {
        clearInterval(check);
        callback(window.Eagle);
      } else if (Date.now() - start > maxWait) {
        clearInterval(check);
        console.warn('🦅 Eagle: Snippet not loaded within timeout');
      }
    }, 100);
  }

  // Expose Shopify context to Eagle for deeper integration
  waitForEagle(function(eagle) {
    // Inject Shopify page-level data
    var meta = window.ShopifyAnalytics && window.ShopifyAnalytics.meta;
    if (meta && meta.page) {
      eagle.trackEvent && eagle.trackEvent('shopify_page_meta', {
        pageType: meta.page.pageType,
        resourceType: meta.page.resourceType,
        resourceId: meta.page.resourceId,
      });
    }

    // Detect product page and track product view
    if (meta && meta.product) {
      eagle.trackEvent && eagle.trackEvent('product_view', {
        productId: meta.product.id,
        productTitle: meta.product.title || document.title,
        productVendor: meta.product.vendor,
        productType: meta.product.type,
        productPrice: meta.product.price,
        productVariants: meta.product.variants ? meta.product.variants.length : 0,
        url: window.location.href,
        path: window.location.pathname,
      });
    }

    // Detect collection page
    if (meta && meta.page && meta.page.pageType === 'collection') {
      eagle.trackEvent && eagle.trackEvent('collection_view', {
        collectionId: meta.page.resourceId,
        collectionTitle: document.title,
        url: window.location.href,
        path: window.location.pathname,
      });
    }

    // Detect search
    if (meta && meta.page && meta.page.pageType === 'search') {
      var searchParams = new URLSearchParams(window.location.search);
      eagle.trackEvent && eagle.trackEvent('search', {
        query: searchParams.get('q') || '',
        url: window.location.href,
      });
    }

    // Track form submissions (newsletter, contact, etc.)
    document.querySelectorAll('form').forEach(function(form) {
      form.addEventListener('submit', function() {
        var action = form.getAttribute('action') || '';
        if (action.includes('/contact') || action.includes('/newsletter')) {
          eagle.trackEvent && eagle.trackEvent('form_submit', {
            formAction: action,
            formId: form.id || undefined,
            url: window.location.href,
          });
        }
      });
    });

    console.log('🦅 Eagle B2B Extension: Shopify context synced');
  });
})();
