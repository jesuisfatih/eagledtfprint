// Eagle B2B Service Worker - Auth & Offline Support
const CACHE_NAME = 'eagle-auth-v1';
// API_URL is injected at registration time via query param or defaults to origin
const API_URL = new URL(self.location).searchParams.get('apiUrl') || self.location.origin;

// Install
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

// Fetch - Add auth token to all API requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept API requests
  if (url.origin === API_URL) {
    event.respondWith(
      (async () => {
        try {
          // Get token from IndexedDB
          const db = await openDB();
          const token = await getFromDB(db, 'eagle_token');

          // Clone request and add auth header
          const headers = new Headers(event.request.headers);
          if (token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }

          const authRequest = new Request(event.request, { headers });

          // Fetch with auth
          const response = await fetch(authRequest);

          // If 401, try to refresh token
          if (response.status === 401) {
            const newToken = await refreshToken(token);
            if (newToken) {
              // Retry with new token
              headers.set('Authorization', `Bearer ${newToken}`);
              const retryRequest = new Request(event.request, { headers });
              return await fetch(retryRequest);
            }
          }

          return response;
        } catch (error) {
          console.error('Service Worker fetch error:', error);
          return fetch(event.request);
        }
      })()
    );
  }
});

// IndexedDB helpers
async function openDB() {
  return new Promise((resolve, reject) => {
    // Use version 2 to fix version error
    const request = indexedDB.open('eagle_auth_db', 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Create store if it doesn't exist
      if (!db.objectStoreNames.contains('auth_store')) {
        db.createObjectStore('auth_store', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Verify store exists, if not, upgrade
      if (!db.objectStoreNames.contains('auth_store')) {
        // Close and reopen with upgrade
        db.close();
        const upgradeRequest = indexedDB.open('eagle_auth_db', 2);
        upgradeRequest.onupgradeneeded = (e) => {
          const upgradeDb = e.target.result;
          if (!upgradeDb.objectStoreNames.contains('auth_store')) {
            upgradeDb.createObjectStore('auth_store', { keyPath: 'key' });
          }
        };
        upgradeRequest.onsuccess = () => resolve(upgradeRequest.result);
        upgradeRequest.onerror = () => reject(upgradeRequest.error);
      } else {
        resolve(db);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

async function getFromDB(db, key) {
  return new Promise((resolve, reject) => {
    try {
      // Verify store exists before transaction
      if (!db.objectStoreNames.contains('auth_store')) {
        console.warn('Service Worker: auth_store not found, returning null');
        resolve(null);
        return;
      }

      const transaction = db.transaction(['auth_store'], 'readonly');
      const store = transaction.objectStore('auth_store');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = () => {
        console.error('Service Worker: getFromDB error', request.error);
        resolve(null); // Return null instead of rejecting
      };
    } catch (error) {
      console.error('Service Worker: getFromDB exception', error);
      resolve(null); // Return null instead of rejecting
    }
  });
}

async function refreshToken(oldToken) {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: oldToken }),
    });

    if (response.ok) {
      const data = await response.json();

      if (data.token) {
        // Store new token
        const db = await openDB();
        await setInDB(db, 'eagle_token', data.token);
        return data.token;
      }
    }

    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

async function setInDB(db, key, value) {
  return new Promise((resolve, reject) => {
    try {
      // Verify store exists before transaction
      if (!db.objectStoreNames.contains('auth_store')) {
        console.warn('Service Worker: auth_store not found, cannot save');
        resolve(); // Resolve instead of rejecting
        return;
      }

      const transaction = db.transaction(['auth_store'], 'readwrite');
      const store = transaction.objectStore('auth_store');
      const request = store.put({ key, value, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Service Worker: setInDB error', request.error);
        resolve(); // Resolve instead of rejecting to prevent crashes
      };
    } catch (error) {
      console.error('Service Worker: setInDB exception', error);
      resolve(); // Resolve instead of rejecting
    }
  });
}
