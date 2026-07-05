import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store'
import App from './App'
import 'react-grid-layout/css/styles.css'
import './assets/main.css'

if (import.meta.env.DEV) {
  // Debugging escape hatch for driving the app over CDP in development
  ;(window as unknown as Record<string, unknown>).__store = store
}

// Privacy blur for recordings/screenshots (see main.css .blur-names)
if (localStorage.getItem('blurNames') === '1') {
  document.body.classList.add('blur-names')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
)
