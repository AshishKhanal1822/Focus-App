import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { Capacitor } from '@capacitor/core'

// Only register service worker on web, NOT inside native Capacitor
// Service workers interfere with Capacitor's local file serving and cause the app to get stuck
if (!Capacitor.isNativePlatform()) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onOfflineReady() {
        console.log('PWA: App is ready to work offline')
      }
    })
  })
}

import { dnd } from './utils/dnd.js'

// Request notification permission on page load
dnd.checkAndRequestNotificationPermission().catch(err => {
  console.warn('Failed to request notification permission:', err);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
