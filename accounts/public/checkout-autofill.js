/**
 * Checkout Autofill Script
 * This script automatically fills checkout form with user data from localStorage
 * It should be injected into Shopify checkout page
 */
(function() {
  'use strict';
  
  // Only run on checkout pages
  if (!window.location.href.includes('/checkout') && !window.location.href.includes('/checkouts')) {
    return;
  }
  
  console.log('🦅 Eagle Checkout Autofill: Starting...');
  
  function fillCheckoutForm() {
    try {
      // Get user data from localStorage or sessionStorage
      const data = localStorage.getItem('eagle_checkout_autofill') || 
                   sessionStorage.getItem('eagle_checkout_autofill');
      
      if (!data) {
        console.log('🦅 Eagle Checkout Autofill: No user data found');
        return false;
      }
      
      const userInfo = JSON.parse(data);
      
      // Check if data is expired (5 minutes)
      if (Date.now() - userInfo.timestamp > 300000) {
        console.log('🦅 Eagle Checkout Autofill: Data expired');
        localStorage.removeItem('eagle_checkout_autofill');
        sessionStorage.removeItem('eagle_checkout_autofill');
        return false;
      }
      
      console.log('🦅 Eagle Checkout Autofill: Filling form with data', userInfo);
      
      let filledCount = 0;
      
      // Helper function to fill input
      function fillInput(selector, value, eventType = 'input') {
        const element = document.querySelector(selector);
        if (element && value && !element.value) {
          element.value = value;
          element.dispatchEvent(new Event(eventType, { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
          console.log(`🦅 Filled ${selector} with ${value}`);
          return true;
        }
        return false;
      }
      
      // Helper function to fill select
      function fillSelect(selector, value) {
        const element = document.querySelector(selector);
        if (element && value) {
          // Try exact match first
          if (element.value !== value) {
            const option = Array.from(element.options).find((opt: any) => 
              opt.value === value || 
              opt.textContent.trim() === value ||
              opt.textContent.includes(value)
            );
            if (option) {
              element.value = option.value;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              filledCount++;
              console.log(`🦅 Filled ${selector} with ${value}`);
              return true;
            }
          }
        }
        return false;
      }
      
      // Fill email
      fillInput('#email', userInfo.email);
      fillInput('input[name="email"]', userInfo.email);
      fillInput('input[autocomplete="shipping email"]', userInfo.email);
      
      // Fill first name
      fillInput('#TextField3225', userInfo.firstName);
      fillInput('input[name="firstName"]', userInfo.firstName);
      fillInput('input[autocomplete="shipping given-name"]', userInfo.firstName);
      
      // Fill last name
      fillInput('#TextField3226', userInfo.lastName);
      fillInput('input[name="lastName"]', userInfo.lastName);
      fillInput('input[autocomplete="shipping family-name"]', userInfo.lastName);
      
      // Fill address
      fillInput('#shipping-address1', userInfo.address1);
      fillInput('input[name="address1"]', userInfo.address1);
      fillInput('input[autocomplete="shipping address-line1"]', userInfo.address1);
      
      // Fill address 2
      if (userInfo.address2) {
        fillInput('#TextField3227', userInfo.address2);
        fillInput('input[name="address2"]', userInfo.address2);
        fillInput('input[autocomplete="shipping address-line2"]', userInfo.address2);
      }
      
      // Fill city
      fillInput('#TextField3228', userInfo.city);
      fillInput('input[name="city"]', userInfo.city);
      fillInput('input[autocomplete="shipping address-level2"]', userInfo.city);
      
      // Fill state
      fillSelect('#Select613', userInfo.state);
      fillSelect('select[name="zone"]', userInfo.state);
      fillSelect('select[autocomplete="shipping address-level1"]', userInfo.state);
      
      // Fill ZIP
      fillInput('#TextField3229', userInfo.zip);
      fillInput('input[name="postalCode"]', userInfo.zip);
      fillInput('input[autocomplete="shipping postal-code"]', userInfo.zip);
      
      // Fill country
      if (userInfo.country) {
        fillSelect('#Select612', userInfo.country);
        fillSelect('select[name="countryCode"]', userInfo.country);
        fillSelect('select[autocomplete="shipping country-name"]', userInfo.country);
      }
      
      console.log(`🦅 Eagle Checkout Autofill: Filled ${filledCount} fields`);
      
      // Clean up after successful fill
      if (filledCount > 0) {
        setTimeout(() => {
          localStorage.removeItem('eagle_checkout_autofill');
          sessionStorage.removeItem('eagle_checkout_autofill');
          console.log('🦅 Eagle Checkout Autofill: Cleaned up data');
        }, 10000); // Clean up after 10 seconds
      }
      
      return filledCount > 0;
    } catch (e) {
      console.error('🦅 Eagle Checkout Autofill: Error', e);
      return false;
    }
  }
  
  // Try to fill immediately
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
    setTimeout(fillCheckoutForm, 5000);
  }
  
  // Also listen for dynamic form updates
  const observer = new MutationObserver(() => {
    fillCheckoutForm();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  // Clean up observer after 30 seconds
  setTimeout(() => {
    observer.disconnect();
  }, 30000);
})();

