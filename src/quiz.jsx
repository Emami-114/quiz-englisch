import React, { useState, useEffect } from 'react'
import './quiz.css'
import questions from './questions.json'

export default function Quiz(){
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [randomize, setRandomize] = useState(false)
  const [mode, setMode] = useState('week') // Standard: 'week'
  const [weeklyQuestions, setWeeklyQuestions] = useState([])

  // Hilfsfunktion zur Berechnung der ISO-Wochenummer
  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  useEffect(() => {
    if (mode === 'week') {
      const now = new Date();
      const year = now.getFullYear();
      const week = getWeekNumber(now);
      const key = `weeklyQuestions_${year}_${week}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        setWeeklyQuestions(JSON.parse(stored));
      } else {
        // Generiere 20 neue zufällige Fragen, die nicht in der letzten Woche waren
        const lastWeek = week === 1 ? 52 : week - 1; // Einfache Annahme für letzte Woche
        const lastYear = week === 1 ? year - 1 : year;
        const lastKey = `weeklyQuestions_${lastYear}_${lastWeek}`;
        const lastStored = localStorage.getItem(lastKey);
        let lastQuestions = lastStored ? JSON.parse(lastStored) : [];
        let available = questions.filter(q => !lastQuestions.some(lq => lq.word === q.word));
        if (available.length < 20) {
          available = questions; // Fallback, wenn nicht genug verfügbar
        }
        const shuffled = [...available].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 20);
        localStorage.setItem(key, JSON.stringify(selected));
        setWeeklyQuestions(selected);
      }
    }
  }, [mode]);

  const currentQuestions = mode === 'all' ? questions : weeklyQuestions;
  const q = currentQuestions[index]
  if(!q) return <div className="quiz-root"><div className="quiz-card">Keine Fragen gefunden.</div></div>

  const options = Object.entries(q.meaning_de) // [['A','...'], ...]

  function handleSelect(key){
    if(revealed) return
    setSelected(key)
  }

  function handleReveal(){
    setRevealed(true)
  }

  function handleNext(){
    if(randomize){
      if(currentQuestions.length <= 1){
        setIndex(0)
      } else {
        let newIndex = index
        while(newIndex === index){
          newIndex = Math.floor(Math.random() * currentQuestions.length)
        }
        setIndex(newIndex)
      }
    } else {
      setIndex((i)=> (i + 1) % currentQuestions.length)
    }
    setSelected(null)
    setRevealed(false)
  }

  return (
    <div className="quiz-root">
      <div className="mode-buttons">
        <button className={`mode-btn ${mode === 'all' ? 'active' : ''}`} onClick={() => { setMode('all'); setIndex(0); setSelected(null); setRevealed(false); }}>All Words</button>
        <button className={`mode-btn ${mode === 'week' ? 'active' : ''}`} onClick={() => { setMode('week'); setIndex(0); setSelected(null); setRevealed(false); }}>The Week</button>
      </div>
      <div className="quiz-card">
        <div className="quiz-header">
          <div className="quiz-word">{q.word} ({index + 1} / {currentQuestions.length})</div>
        </div>
        <div className="quiz-sentence">{q.sentence_en}</div>

        <div className="options">
          {options.map(([key, text])=>{
            const isSelected = selected === key
            const isCorrect = q.correct === key
            const classes = ['option-btn']
            if(isSelected) classes.push('selected')
            if(revealed && isCorrect) classes.push('correct')
            if(revealed && isSelected && q.correct && !isCorrect) classes.push('wrong')
            return (
              <button key={key} className={classes.join(' ')} onClick={()=>handleSelect(key)}>
                <strong>{key}.</strong> {text}
              </button>
            )
          })}
        </div>

        <div className="controls">
          <label className="switch">
            <input type="checkbox" checked={randomize} onChange={() => setRandomize(r => !r)} />
            <span className="box"><span className="knob" /></span>
            <span className="switch-label">Zufällig</span>
          </label>

          <button className="btn ghost" onClick={handleReveal}>
            {revealed ? 'Antwort gezeigt' : 'Antwort zeigen'}
          </button>
          <button className="btn primary" onClick={handleNext}>Weiter</button>
        </div>

        { (revealed || selected) && (
          <div className="explanation">
            <div><strong>Erklärung:</strong> {q.explanation || 'Keine Erklärung vorhanden.'}</div>
            {q.meaning_fa && <div className="meta">Persisch: {q.meaning_fa}</div>}
          </div>
        ) }

      </div>
    </div>
  )
}
