import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('PWA: App is ready to work offline')
  }
})

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
