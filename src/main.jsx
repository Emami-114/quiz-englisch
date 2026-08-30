import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { HashRouter as Router } from 'react-router-dom'
import Quiz from './quiz.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Quiz />
    </Router>
  </StrictMode>,
)
