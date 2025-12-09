import React, { useState } from 'react'
import './quiz.css'
import questions from './questions.json'

export default function Quiz(){
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [randomize, setRandomize] = useState(false)

  const q = questions[index]
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
      if(questions.length <= 1){
        setIndex(0)
      } else {
        let newIndex = index
        while(newIndex === index){
          newIndex = Math.floor(Math.random() * questions.length)
        }
        setIndex(newIndex)
      }
    } else {
      setIndex((i)=> (i + 1) % questions.length)
    }
    setSelected(null)
    setRevealed(false)
  }

  return (
    <div className="quiz-root">
      <div className="quiz-card">
        <div className="quiz-header">
          <div className="quiz-word">{q.word}</div>
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
