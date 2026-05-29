import React from 'react'
import ReactDOM from 'react-dom/client'

import { OptionsApp } from './App'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Expected #root container for chrome extension options page')
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
)
