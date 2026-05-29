import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from './App'
import { fetchTodayFeed } from './lib/fetchTodayFeed'
import { ThemeProvider } from './lib/ThemeContext'
import './theme.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Expected #root container for chrome extension new tab')
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ThemeProvider>
      <App loadTodayFeed={fetchTodayFeed} />
    </ThemeProvider>
  </React.StrictMode>
)