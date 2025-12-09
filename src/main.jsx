import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { HashRouter as Router} from 'react-router-dom'; // Neue Version
import quiz from './quiz.jsx';
import Quiz from './quiz.jsx';
createRoot(document.getElementById('root')).render(
  <Router>
    <Quiz />
  </Router>,
)

