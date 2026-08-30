import React, { useState, useEffect, useCallback, useMemo } from 'react'
import './quiz.css'
import questions from './questions.json'
import { speak, stopSpeaking } from './utils/speech'

// Helper for ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000

export default function Quiz() {
  const [mode, setMode] = useState('week') // 'week' | 'all' | 'due'
  const [deck, setDeck] = useState([])
  const [initialCount, setInitialCount] = useState(20)
  const [learnedCount, setLearnedCount] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [speakingWord, setSpeakingWord] = useState(false)
  const [speakingSentence, setSpeakingSentence] = useState(false)
  const [autoPronounce, setAutoPronounce] = useState(true)
  const [feedback, setFeedback] = useState(null) // 'ok' | 'repeat'
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResultsList, setShowSearchResultsList] = useState(false)

  // Load / initialize cards based on mode
  const initDeck = useCallback(() => {
    stopSpeaking()
    setIsFlipped(false)
    setFeedback(null)

    const now = new Date()
    const year = now.getFullYear()
    const week = getWeekNumber(now)
    const weekKey = `weeklyQuestions_${year}_${week}`

    let list = []

    if (mode === 'week') {
      const stored = localStorage.getItem(weekKey)
      if (stored) {
        list = JSON.parse(stored)
      } else {
        const lastWeek = week === 1 ? 52 : week - 1
        const lastYear = week === 1 ? year - 1 : year
        const lastKey = `weeklyQuestions_${lastYear}_${lastWeek}`
        const lastStored = localStorage.getItem(lastKey)
        const lastQuestions = lastStored ? JSON.parse(lastStored) : []

        let available = questions.filter((q) => !lastQuestions.some((lq) => lq.word === q.word))
        if (available.length < 20) {
          available = questions
        }
        const shuffled = [...available].sort(() => 0.5 - Math.random())
        list = shuffled.slice(0, 20)
        localStorage.setItem(weekKey, JSON.stringify(list))
      }
    } else if (mode === 'due') {
      // Due for repetition (nextReview <= now)
      const srsData = JSON.parse(localStorage.getItem('flashcard_srs_data') || '{}')
      list = questions.filter((q) => {
        const item = srsData[q.id || q.word]
        return item && item.nextReview && item.nextReview <= Date.now()
      })
      if (list.length === 0) {
        list = []
      }
    } else {
      // 'all' words
      list = [...questions]
    }

    setDeck(list)
    setInitialCount(list.length)
    setLearnedCount(0)
    setSearchQuery('')
    setShowSearchResultsList(false)
  }, [mode])

  useEffect(() => {
    initDeck()
  }, [initDeck])

  // Search filter across all questions
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []

    return questions.filter((q) => {
      const wordMatch = q.word && q.word.toLowerCase().includes(query)
      const sentenceMatch = q.sentence_en && q.sentence_en.toLowerCase().includes(query)
      const deMatch =
        q.meaning_de &&
        Object.values(q.meaning_de).some((val) => val && val.toLowerCase().includes(query))
      const faMatch = q.meaning_fa && q.meaning_fa.toLowerCase().includes(query)
      const expMatch = q.explanation && q.explanation.toLowerCase().includes(query)

      return wordMatch || sentenceMatch || deMatch || faMatch || expMatch
    })
  }, [searchQuery])

  // Handle Search Input Change
  function handleSearchChange(e) {
    const val = e.target.value
    setSearchQuery(val)
    stopSpeaking()
    setIsFlipped(false)

    if (val.trim().length > 0) {
      const filtered = questions.filter((q) => {
        const qLower = val.trim().toLowerCase()
        const wordMatch = q.word && q.word.toLowerCase().includes(qLower)
        const sentenceMatch = q.sentence_en && q.sentence_en.toLowerCase().includes(qLower)
        const deMatch =
          q.meaning_de &&
          Object.values(q.meaning_de).some((v) => v && v.toLowerCase().includes(qLower))
        const faMatch = q.meaning_fa && q.meaning_fa.toLowerCase().includes(qLower)
        const expMatch = q.explanation && q.explanation.toLowerCase().includes(qLower)
        return wordMatch || sentenceMatch || deMatch || faMatch || expMatch
      })
      setDeck(filtered)
      setInitialCount(filtered.length)
      setLearnedCount(0)
      setShowSearchResultsList(true)
    } else {
      // Reset to all words
      setDeck([...questions])
      setInitialCount(questions.length)
      setLearnedCount(0)
      setShowSearchResultsList(false)
    }
  }

  // Clear search
  function handleClearSearch() {
    setSearchQuery('')
    setShowSearchResultsList(false)
    setDeck([...questions])
    setInitialCount(questions.length)
    setLearnedCount(0)
    setIsFlipped(false)
  }

  // Select a specific card from search results list
  function handleSelectSearchResult(selectedWordItem) {
    stopSpeaking()
    setIsFlipped(false)
    // Put selected card at front of deck
    setDeck((prev) => {
      const rest = prev.filter((item) => (item.id || item.word) !== (selectedWordItem.id || selectedWordItem.word))
      return [selectedWordItem, ...rest]
    })
    setShowSearchResultsList(false)
  }

  // Current Card
  const currentCard = deck.length > 0 ? deck[0] : null

  // Pronounce current word when loaded if autoPronounce is enabled
  useEffect(() => {
    if (currentCard && autoPronounce && !searchQuery) {
      speak(currentCard.word, {
        onStart: () => setSpeakingWord(true),
        onEnd: () => setSpeakingWord(false),
        onError: () => setSpeakingWord(false),
      })
    }
  }, [currentCard, autoPronounce, searchQuery])

  // Pronounce word explicitly
  function handlePlayWord(e, wordToPlay) {
    if (e) e.stopPropagation()
    const targetWord = wordToPlay || (currentCard && currentCard.word)
    if (!targetWord) return
    speak(targetWord, {
      onStart: () => setSpeakingWord(true),
      onEnd: () => setSpeakingWord(false),
      onError: () => setSpeakingWord(false),
    })
  }

  // Pronounce sentence explicitly
  function handlePlaySentence(e) {
    if (e) e.stopPropagation()
    if (!currentCard || !currentCard.sentence_en) return
    speak(currentCard.sentence_en, {
      onStart: () => setSpeakingSentence(true),
      onEnd: () => setSpeakingSentence(false),
      onError: () => setSpeakingSentence(false),
    })
  }

  // Flip Card
  function handleFlip() {
    setIsFlipped((prev) => !prev)
  }

  // User presses ❌ Nein (Wird wiederholt)
  function handleRepeat(e) {
    if (e) e.stopPropagation()
    if (!currentCard) return

    setFeedback('repeat')
    stopSpeaking()

    setTimeout(() => {
      setFeedback(null)
      setIsFlipped(false)
      // Move current card to the end of the deck
      setDeck((prev) => {
        if (prev.length <= 1) return [...prev]
        const [first, ...rest] = prev
        return [...rest, first]
      })
    }, 220)
  }

  // User presses ✅ OK (In 2 Wochen wiederholen)
  function handleMastered(e) {
    if (e) e.stopPropagation()
    if (!currentCard) return

    setFeedback('ok')
    stopSpeaking()

    // Save SRS next review date in localStorage (14 days from now)
    const srsData = JSON.parse(localStorage.getItem('flashcard_srs_data') || '{}')
    const cardKey = currentCard.id || currentCard.word
    const nextReviewDate = Date.now() + TWO_WEEKS_MS
    srsData[cardKey] = {
      nextReview: nextReviewDate,
      lastReviewed: Date.now(),
      reviewCount: (srsData[cardKey]?.reviewCount || 0) + 1,
    }
    localStorage.setItem('flashcard_srs_data', JSON.stringify(srsData))

    setTimeout(() => {
      setFeedback(null)
      setIsFlipped(false)
      setLearnedCount((c) => c + 1)
      // Remove current card from deck
      setDeck((prev) => prev.slice(1))
    }, 220)
  }

  // Keyboard Shortcuts (Space: Flip, Left Arrow / 1: Nein, Right Arrow / 2: OK, A: Audio)
  useEffect(() => {
    function handleKeyDown(event) {
      // Don't trigger flashcard shortcuts when user is typing in search input
      if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
        return
      }

      if (deck.length === 0) return

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        handleFlip()
      } else if (event.key === 'ArrowLeft' || event.key === '1' || event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        handleRepeat()
      } else if (event.key === 'ArrowRight' || event.key === '2' || event.key === 'y' || event.key === 'Y') {
        event.preventDefault()
        handleMastered()
      } else if (event.key === 'a' || event.key === 'A') {
        event.preventDefault()
        handlePlayWord()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deck, isFlipped, currentCard])

  const progressPercent =
    initialCount > 0 ? Math.min(100, Math.round((learnedCount / initialCount) * 100)) : 100

  // German translation helper
  function getMeaning(card) {
    if (!card) return ''
    return card.meaning_de[card.correct] || Object.values(card.meaning_de)[0] || ''
  }

  const correctMeaning = currentCard ? getMeaning(currentCard) : ''

  return (
    <div className="flashcard-app">
      {/* Header & Modes */}
      <header className="app-header">
        <div className="app-badge">📚 Englisch Vokabeltrainer</div>
        <h1 className="app-title">Karteikarten</h1>

        <div className="mode-nav">
          <button
            className={`mode-tab ${mode === 'week' ? 'active' : ''}`}
            onClick={() => setMode('week')}
          >
            📅 Diese Woche (20)
          </button>
          <button
            className={`mode-tab ${mode === 'due' ? 'active' : ''}`}
            onClick={() => setMode('due')}
          >
            ⏰ Fällig (2 Wochen)
          </button>
          <button
            className={`mode-tab ${mode === 'all' ? 'active' : ''}`}
            onClick={() => setMode('all')}
          >
            📖 Alle Wörter ({questions.length})
          </button>
        </div>
      </header>

      {/* Search Bar (Available when in "Alle Wörter" mode or for quick lookup) */}
      {mode === 'all' && (
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Wort suchen (z.B. 'acts', 'interface', 'Haus')..."
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={handleClearSearch}
                title="Suche zurücksetzen"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Status & Match Count */}
          {searchQuery.trim() !== '' && (
            <div className="search-status-bar">
              <span className={`search-count-badge ${searchResults.length > 0 ? 'found' : 'not-found'}`}>
                {searchResults.length > 0
                  ? `✅ ${searchResults.length} ${searchResults.length === 1 ? 'Wort gefunden' : 'Wörter gefunden'}`
                  : `❌ Kein Wort für "${searchQuery}" gefunden`}
              </span>

              {searchResults.length > 0 && (
                <button
                  className="toggle-list-btn"
                  onClick={() => setShowSearchResultsList((prev) => !prev)}
                >
                  {showSearchResultsList ? '▲ Liste einklappen' : '▼ Gefundene Wörter anzeigen'}
                </button>
              )}
            </div>
          )}

          {/* Expandable Search Results List */}
          {searchQuery.trim() !== '' && showSearchResultsList && searchResults.length > 0 && (
            <div className="search-results-dropdown">
              <div className="search-results-header">Gefundene Vokabeln:</div>
              <div className="search-results-scroll">
                {searchResults.map((item) => (
                  <div
                    key={item.id || item.word}
                    className={`search-result-item ${currentCard && (currentCard.id || currentCard.word) === (item.id || item.word) ? 'active' : ''}`}
                    onClick={() => handleSelectSearchResult(item)}
                  >
                    <div className="result-item-main">
                      <strong className="result-word">{item.word}</strong>
                      <span className="result-meaning">{getMeaning(item)}</span>
                    </div>
                    <div className="result-item-actions">
                      <button
                        className="result-speaker-btn"
                        onClick={(e) => handlePlayWord(e, item.word)}
                        title="Aussprache anhören"
                      >
                        🔊
                      </button>
                      <button
                        className="result-learn-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectSearchResult(item)
                        }}
                      >
                        Als Karte öffnen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar & Session Stats */}
      <div className="progress-container">
        <div className="progress-info">
          <span>
            {searchQuery ? 'Suchergebnis:' : 'Fortschritt:'}{' '}
            <strong>{learnedCount}</strong> / {initialCount} {searchQuery ? 'Karten' : 'gelernt'}
          </span>
          <span className="remaining-badge">
            {deck.length} {deck.length === 1 ? 'Karte übrig' : 'Karten im Umlauf'}
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Main Flashcard Arena */}
      <main className="card-stage">
        {deck.length > 0 && currentCard ? (
          <div className="flashcard-wrapper">
            {/* The 3D Flip Card */}
            <div
              className={`flashcard ${isFlipped ? 'flipped' : ''} ${feedback === 'ok' ? 'card-ok' : ''} ${feedback === 'repeat' ? 'card-repeat' : ''}`}
              onClick={handleFlip}
              title="Klicken zum Umdrehen"
            >
              {/* FRONT SIDE */}
              <div className="card-face card-front">
                <div className="card-top-bar">
                  <span className="card-side-tag">🇬🇧 VORDERSEITE</span>
                  <button
                    className={`tts-btn ${speakingWord ? 'speaking' : ''}`}
                    onClick={handlePlayWord}
                    title="Wort aussprechen (Taste: A)"
                  >
                    🔊 {speakingWord ? 'Spielt...' : 'Aussprache'}
                  </button>
                </div>

                <div className="word-section">
                  <h2 className="english-word">{currentCard.word}</h2>
                </div>

                {currentCard.sentence_en && (
                  <div className="sentence-box" onClick={(e) => e.stopPropagation()}>
                    <p className="sentence-text">"{currentCard.sentence_en}"</p>
                    <button
                      className={`sentence-audio-btn ${speakingSentence ? 'speaking' : ''}`}
                      onClick={handlePlaySentence}
                      title="Beispielsatz vorlesen"
                    >
                      🔊 Satz anhören
                    </button>
                  </div>
                )}

                <div className="flip-hint">
                  <span>🔄 Klicken oder Leertaste zum Umdrehen</span>
                </div>
              </div>

              {/* BACK SIDE */}
              <div className="card-face card-back">
                <div className="card-top-bar">
                  <span className="card-side-tag de-tag">🇩🇪 RÜCKSEITE</span>
                  <button
                    className={`tts-btn ${speakingWord ? 'speaking' : ''}`}
                    onClick={handlePlayWord}
                    title="Nochmals anhören"
                  >
                    🔊 Aussprache
                  </button>
                </div>

                <div className="meaning-section">
                  <div className="meaning-label">Bedeutung:</div>
                  <h3 className="german-meaning">{correctMeaning}</h3>
                </div>

                {currentCard.explanation && (
                  <div className="explanation-box">
                    <strong>Erklärung:</strong> {currentCard.explanation}
                  </div>
                )}

                {currentCard.meaning_fa && (
                  <div className="persian-box">
                    <span className="fa-label">Persisch:</span> {currentCard.meaning_fa}
                  </div>
                )}

                <div className="flip-hint">
                  <span>🔄 Klicken zum Zurückdrehen</span>
                </div>
              </div>
            </div>

            {/* Action Buttons: ❌ NEIN & ✅ OK */}
            <div className="response-actions">
              <button
                className="action-btn btn-repeat"
                onClick={handleRepeat}
                title="Wort bleibt im Stapel und wird heute wiederholt (Taste: 1 oder Pfeil-Links)"
              >
                <span className="action-emoji">❌</span>
                <div className="action-text">
                  <strong>Nein</strong>
                  <small>Nochmals üben</small>
                </div>
              </button>

              <button
                className="action-btn btn-mastered"
                onClick={handleMastered}
                title="Wort gewusst! Wiederholung in 2 Wochen (Taste: 2 oder Pfeil-Rechts)"
              >
                <span className="action-emoji">✅</span>
                <div className="action-text">
                  <strong>OK</strong>
                  <small>In 2 Wochen wieder</small>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Completion or Empty Search State Screen */
          <div className="completion-card">
            {searchQuery && searchResults.length === 0 ? (
              <>
                <div className="completion-icon">🔍</div>
                <h2>Kein Wort gefunden</h2>
                <p className="completion-subtitle">
                  Das Wort "<strong>{searchQuery}</strong>" ist in der Datenbank nicht vorhanden.
                </p>
                <div className="completion-actions">
                  <button className="btn-primary" onClick={handleClearSearch}>
                    ✕ Suche löschen & Alle Wörter anzeigen
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="completion-icon">🎉</div>
                <h2>Hervorragend gemacht!</h2>
                <p className="completion-subtitle">
                  {mode === 'week'
                    ? 'Du hast alle 20 Wörter dieser Woche durchgearbeitet!'
                    : 'Du hast alle Karten dieser Lernrunde gemeistert!'}
                </p>

                <div className="completion-stats">
                  <div className="stat-item">
                    <span className="stat-number">{learnedCount}</span>
                    <span className="stat-label">Wörter beherrscht</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">14 Tage</span>
                    <span className="stat-label">Wiederholung in 2 Wochen</span>
                  </div>
                </div>

                <div className="completion-actions">
                  <button className="btn-primary" onClick={initDeck}>
                    🔄 Diese Runde nochmals üben
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setMode(mode === 'all' ? 'week' : 'all')}
                  >
                    {mode === 'all'
                      ? '📅 Zurück zu den 20 Wochenwörtern'
                      : '📖 Alle Wörter durchstöbern'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer Settings & Quick Guide */}
      <footer className="app-footer">
        <div className="footer-controls">
          <label className="toggle-label" title="Automatisches Vorlesen beim Aufdecken des Worts">
            <input
              type="checkbox"
              checked={autoPronounce}
              onChange={(e) => setAutoPronounce(e.target.checked)}
            />
            <span className="toggle-switch" />
            <span>Automatische Aussprache 🔊</span>
          </label>
        </div>
        <div className="keyboard-shortcuts">
          <span>
            ⌨️ Tastatur: <code>Leertaste</code> Umdrehen • <code>← / 1</code> Nein • <code>→ / 2</code> OK • <code>A</code> Audio
          </span>
        </div>
      </footer>
    </div>
  )
}
