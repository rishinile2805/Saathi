import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

// ==========================================
// API & Configuration
// ==========================================

const API = 'http://localhost:3000/api'
const USER_ID = 'ramesh-001'

async function api(path, options = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    return await res.json()
  } catch (err) {
    console.error('API Error:', err)
    return { success: false, error: 'Connection error' }
  }
}

export default function App() {
  // Robot Face State: 'idle' | 'listening' | 'thinking' | 'speaking'
  const [robotState, setRobotState] = useState('idle')
  const [mood, setMood] = useState('happy') // 'happy' | 'attentive' | 'calm'
  const [isBlinking, setIsBlinking] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Autonomous HUD Drawer: null | 'memories' | 'tasks' | 'family' | 'robot'
  const [activeDrawer, setActiveDrawer] = useState(null)
  const [newlyAddedId, setNewlyAddedId] = useState(null)

  // Speech & Conversation
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [lastResponse, setLastResponse] = useState('Hello! I am right here listening whenever you want to talk.')
  const [inputText, setInputText] = useState('')
  const [actionStep, setActionStep] = useState(null) // null | { title, step }

  // Theme Support ('light' | 'dark')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('saathi-theme') || 'light'
  })

  useEffect(() => {
    localStorage.setItem('saathi-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Language Support
  const [selectedLang, setSelectedLang] = useState('en') // 'en' | 'hi' | 'es' | 'fr' | 'de' | 'ta' | 'te' | 'bn' | 'mr'

  // Data Stores
  const [memories, setMemories] = useState([])
  const [tasks, setTasks] = useState([])
  const [familyData, setFamilyData] = useState(null)
  const [robotTelemetry, setRobotTelemetry] = useState({ battery: 94, mode: 'COMPANION CORE', state: 'ONLINE' })

  // ==========================================
  // Initial Data Load
  // ==========================================

  const refreshData = useCallback(async () => {
    const [memRes, taskRes, famRes, robRes] = await Promise.all([
      api(`/memory/${USER_ID}`),
      api(`/tasks/${USER_ID}`),
      api(`/family/${USER_ID}/dashboard`),
      api('/robot/status'),
    ])

    if (memRes.success) setMemories(memRes.memories || [])
    if (taskRes.success) setTasks(taskRes.tasks || [])
    if (famRes.success) setFamilyData(famRes.dashboard || null)
    if (robRes.success) setRobotTelemetry(prev => ({ ...prev, ...robRes.status }))
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  // ==========================================
  // Natural Robot Blinking Simulation
  // ==========================================

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 220)
    }, 4200)

    return () => clearInterval(blinkInterval)
  }, [])

  // Speech Recognition & Silence Detection
  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis || null)
  const silenceTimerRef = useRef(null)
  const pendingTranscriptRef = useRef('')
  const accumulatedTranscriptRef = useRef('')
  const fallbackIndexRef = useRef(0)

  // ==========================================
  // Text-To-Speech (Gentle, Soft, Soothing Voice Output in Selected Language)
  // ==========================================

  const speakText = useCallback((text) => {
    if (!soundEnabled || !synthRef.current) return

    synthRef.current.cancel() // Stop previous speech

    // Clean text of markdown/tags for speech
    const cleanSpeech = text.replace(/[*_#`~]/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(cleanSpeech)

    // Softer, gentler pace & tone (softer rate, comforting pitch)
    utterance.rate = 0.92 // Gentle, relaxed pace (less mechanical/rushed)
    utterance.pitch = 1.05 // Warm, inviting, uplifting pitch

    const langCodes = {
      en: 'en-US',
      hi: 'hi-IN',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      bn: 'bn-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
    }
    const targetLangCode = langCodes[selectedLang] || 'en-US'
    utterance.lang = targetLangCode

    // Find warm, soft, natural voice for the target language
    const voices = synthRef.current.getVoices()
    const langVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(selectedLang.toLowerCase()))

    let preferredVoice = null
    if (selectedLang === 'en') {
      // Prioritize soothing, natural, gentle voices
      preferredVoice = langVoices.find(v => 
        /natural|aria|jenny|samantha|karen|moira|victoria|serena|google\s*us\s*english/i.test(v.name)
      ) || langVoices[0] || voices[0]
    } else {
      preferredVoice = langVoices.find(v => /google|natural/i.test(v.name)) || langVoices[0] || voices[0]
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onstart = () => {
      setRobotState('speaking')
      setMood('happy')
    }

    utterance.onend = () => {
      setRobotState('idle')
    }

    utterance.onerror = () => {
      setRobotState('idle')
    }

    synthRef.current.speak(utterance)
  }, [soundEnabled, selectedLang])

  // ==========================================
  // Helper: Detect if user is asking a question or recall inquiry
  // ==========================================
  const isQuestionOrRecall = useCallback((text) => {
    const lower = text.toLowerCase().trim()
    if (lower.endsWith('?')) return true

    const questionStarters = [
      'what', 'who', 'when', 'where', 'why', 'how',
      'do you', 'did you', 'can you', 'could you', 'would you',
      'tell me', 'which', 'is', 'are', 'does', 'do i', 'am i'
    ]
    if (questionStarters.some(w => lower.startsWith(w + ' ') || lower === w)) return true

    if (
      lower.includes('what i like') ||
      lower.includes('what do i like') ||
      lower.includes('tell me what i like') ||
      lower.includes('remember what') ||
      lower.includes('remember that what') ||
      lower.includes('remember who') ||
      lower.includes('remember when') ||
      lower.includes('remember where') ||
      lower.includes('remember if') ||
      lower.includes('remember my') ||
      lower.includes('do you remember') ||
      lower.includes('did you remember') ||
      lower.includes('can you remember') ||
      lower.includes('what are my') ||
      lower.includes('what is my') ||
      lower.includes('what was my') ||
      lower.includes('tell me about')
    ) {
      return true
    }

    return false
  }, [])

  // ==========================================
  // Autonomous Voice Intent Router (Instant 0ms Intelligence)
  // ==========================================

  const handleVoiceCommand = useCallback(async (spokenText) => {
    if (!spokenText || !spokenText.trim()) return

    const raw = spokenText.trim()
    const lower = raw.toLowerCase()
    setTranscript(raw)
    setRobotState('thinking')

    const isQuestion = isQuestionOrRecall(raw)

    // ----------------------------------------------------
    // Command 0: EMERGENCY / LIFE-THREATENING DETECTION (highest priority)
    // ----------------------------------------------------
    const emergencyKeywords = [
      'chest pain', 'chest hurts', 'chest is hurting',
      'can\'t breathe', 'cannot breathe', 'hard to breathe', 'difficulty breathing',
      'heart attack', 'heart is pounding', 'my heart',
      'i fell', 'i have fallen', 'i am falling', 'fell down',
      'stroke', 'i feel faint', 'i am fainting', 'feeling faint',
      'help me', 'please help', 'emergency', 'call 911', 'call ambulance',
      'i am dying', 'i\'m dying', 'something is wrong with me',
      'i feel very sick', 'i feel terrible', 'i cannot move',
      'i\'m in pain', 'i am in pain', 'severe pain',
      'unconscious', 'dizzy and falling', 'call my son', 'call my daughter',
      'chhati me dard', 'dard ho raha', 'saans nahi aa rahi', 'gir gaya', 'bachao', 'madad karo'
    ]
    const isEmergency = emergencyKeywords.some(kw => lower.includes(kw))

    if (isEmergency) {
      setActiveDrawer('family')
      setMood('attentive')
      // Immediately trigger calls to all family members
      api(`/family/${USER_ID}/fam-001/call`, { method: 'POST' }).catch(console.error)
      api(`/family/${USER_ID}/fam-002/call`, { method: 'POST' }).catch(console.error)
      const reply = selectedLang === 'hi'
        ? 'मैं तुरंत आपके परिवार को सूचित कर रहा हूँ! प्रिया और अमित को तुरंत कॉल जा रही है। कृपया शांत रहें, मदद पहुँच रही है। क्या आप कहीं आराम से बैठ सकते हैं?'
        : 'I am alerting your family right now! Calling Priya and Amit immediately. Stay calm, help is on the way. Are you able to sit down somewhere safe?'
      setLastResponse(reply)
      speakText(reply)
      return
    }

    // ----------------------------------------------------
    // Command 1: Close / Dismiss Section
    // ----------------------------------------------------
    if (
      lower.includes('close') || 
      lower.includes('hide') || 
      lower.includes('dismiss') || 
      lower.includes('back to face') || 
      lower.includes('go home') ||
      lower === 'back' ||
      lower === 'band karo'
    ) {
      setActiveDrawer(null)
      const reply = selectedLang === 'hi' ? 'मुख्य स्क्रीन पर वापस आ गए। मैं यहीं हूँ।' : 'Returning to full screen. I am right here.'
      setLastResponse(reply)
      speakText(reply)
      return
    }

    // ----------------------------------------------------
    // Command 2: RECALL QUERY: "Remember what I like?", "What do I like?"
    // User is asking what they like — DO NOT SAVE A MEMORY!
    // ----------------------------------------------------
    const isRecallLikes = 
      isQuestion && (
        lower.includes('what i like') ||
        lower.includes('what do i like') ||
        lower.includes('tell me what i like') ||
        (lower.includes('remember') && lower.includes('like')) ||
        lower.includes('my preferences') ||
        lower.includes('my hobbies') ||
        lower.includes('kya pasand') ||
        lower.includes('pasand kya')
      )

    if (isRecallLikes) {
      setActiveDrawer('memories')
      await refreshData()
      // Read from ACTUAL saved memories DB — covers fishing, gardening, tea, etc.
      const prefList = memories.filter(m =>
        m.type === 'PREFERENCE' || m.type === 'HOBBY' ||
        (m.tags && (
          m.tags.includes('preference') || m.tags.includes('hobby') ||
          m.tags.includes('gardening') || m.tags.includes('tea') ||
          m.tags.includes('fishing') || m.tags.includes('snacks')
        ))
      )

      let reply
      if (prefList.length === 0) {
        reply = selectedLang === 'hi'
          ? 'मुझे अभी आपकी कोई पसंद याद नहीं है। आप मुझे बताएं, मैं हमेशा याद रखूँगा!'
          : 'I do not have any saved preferences yet. Tell me what you enjoy and I will remember it!'
      } else {
        const uniqueItems = [...new Set(prefList.map(m => m.content))].slice(0, 3)
        reply = selectedLang === 'hi'
          ? `हाँ, मुझे याद है! ${uniqueItems.join('. और ')}.`
          : `Yes, I remember! ${uniqueItems.join('. Also, ')}.`
      }

      setLastResponse(reply)
      speakText(reply)
      return
    }

    // ----------------------------------------------------
    // Command 3: RECALL QUERY: "What are my memories?", "Show my memories"
    // ----------------------------------------------------
    const isShowMemories = 
      lower.includes('show my memories') || 
      lower.includes('show memories') || 
      lower.includes('open memories') ||
      lower.includes('view memories') ||
      lower.includes('meri yaadein') ||
      (isQuestion && (lower.includes('what are my memories') || lower.includes('what do you remember')))

    if (isShowMemories) {
      setActiveDrawer('memories')
      await refreshData()
      let reply
      if (memories.length === 0) {
        reply = selectedLang === 'hi'
          ? 'आपकी मेमोरी वॉल्ट में अभी कुछ नहीं है। अपनी बातें साझा करें और मैं याद रखूँगा!'
          : 'Your memory vault is empty right now. Share your stories and I will remember them for you!'
      } else {
        const titles = memories.slice(0, 3).map(m => m.title || m.content.substring(0, 30))
        reply = selectedLang === 'hi'
          ? `आपकी मेमोरी वॉल्ट खोल दी है। आपके पास ${memories.length} यादें हैं, जैसे: ${titles.join(', ')}.`
          : `Opening your memory vault. You have ${memories.length} saved memories, including: ${titles.join(', ')}.`
      }
      setLastResponse(reply)
      speakText(reply)
      return
    }

    // ----------------------------------------------------
    // Command 4: RECALL QUERY: "What are my reminders?", "What are my tasks?"
    // ----------------------------------------------------
    const isShowTasks = 
      lower.includes('show tasks') || 
      lower.includes('show my tasks') || 
      lower.includes('open tasks') ||
      (isQuestion && (
        lower.includes('what are my tasks') ||
        lower.includes('what are my reminders') ||
        lower.includes('what do i have to do') ||
        lower.includes('when is my medicine') ||
        lower.includes('today routine')
      ))

    if (isShowTasks) {
      setActiveDrawer('tasks')
      refreshData()
      const pending = tasks.filter(t => !t.completed)
      let reply = selectedLang === 'hi' ? 'अभी कोई बाकी काम नहीं है।' : 'You have no pending tasks right now.'
      if (pending.length > 0) {
        reply = selectedLang === 'hi'
          ? `आपके ${pending.length} काम बाकी हैं। अगला है: ${pending[0].title}, ${pending[0].time} बजे।`
          : `You have ${pending.length} pending task${pending.length > 1 ? 's' : ''}. Next is ${pending[0].title} at ${pending[0].time}.`
      }
      setLastResponse(reply)
      speakText(reply)
      return
    }

    // ----------------------------------------------------
    // Command 5: SAVE NEW MEMORY (Only when NOT a question!)
    // ----------------------------------------------------
    const isSaveMemory = !isQuestion && (
      lower.startsWith('remember that ') ||
      lower.startsWith('save memory') ||
      lower.startsWith('add memory') ||
      lower.startsWith('store memory') ||
      lower.startsWith('please remember that ') ||
      lower.startsWith('note that ') ||
      lower.startsWith('i love ') ||
      lower.startsWith('i really love ') ||
      lower.startsWith('i like ') ||
      lower.startsWith('i really like ') ||
      lower.startsWith('i enjoy ') ||
      lower.startsWith('i prefer ') ||
      lower.startsWith('my hobby is ') ||
      lower.startsWith('my favorite ') ||
      lower.startsWith('my favourite ')
    )

    if (isSaveMemory) {
      let memoryContent = raw
      const prefixes = [
        'please remember that', 'remember that', 'save memory that',
        'save memory', 'add memory that', 'add memory', 'store memory that', 'store memory', 'note that'
      ]
      for (const p of prefixes) {
        if (lower.startsWith(p)) {
          memoryContent = raw.slice(p.length).trim()
          break
        }
      }

      // Auto-detect type and tags from content
      let memType = 'LIFE_STORY'
      let memTags = ['voice-saved']
      let memTitle = 'Voice Memory'
      if (lower.includes('love') || lower.includes('like') || lower.includes('enjoy') || lower.includes('prefer') || lower.includes('hobby')) {
        memType = 'PREFERENCE'
        memTags = ['voice-saved', 'preference']
        memTitle = 'Personal Preference'
      }
      if (lower.includes('fish')) { memTags.push('fishing') }
      if (lower.includes('garden') || lower.includes('rose')) { memTags.push('gardening'); memType = 'HOBBY' }
      if (lower.includes('tea') || lower.includes('chai')) { memTags.push('tea') }
      if (lower.includes('family') || lower.includes('priya') || lower.includes('amit')) { memTags.push('family') }
      if (lower.includes('railway') || lower.includes('train')) { memTags.push('railway') }

      const tempId = `mem_${Date.now()}`
      const newMemoryObj = {
        id: tempId,
        type: memType,
        title: memTitle,
        content: memoryContent,
        tags: memTags,
        createdAt: new Date().toISOString(),
      }

      setNewlyAddedId(tempId)
      setMemories(prev => [newMemoryObj, ...prev])
      setActiveDrawer('memories')
      const reply = selectedLang === 'hi'
        ? `मैंने यह सुरक्षित कर लिया है: "${memoryContent.substring(0, 50)}"। आपकी मेमोरी वॉल्ट खोल दी है।`
        : `Got it! I have saved: "${memoryContent.substring(0, 50)}". Opening your memory vault.`
      setLastResponse(reply)
      speakText(reply)

      // Persist to backend
      api(`/memory/${USER_ID}`, {
        method: 'POST',
        body: JSON.stringify(newMemoryObj),
      }).catch(console.error)
      return
    }

    // ----------------------------------------------------
    // Command 6: CREATE TASK / REMINDER (Only when NOT a question!)
    // ----------------------------------------------------
    const isTaskCommand = !isQuestion && (
      lower.startsWith('remind me to ') ||
      lower.startsWith('remind me ') ||
      lower.startsWith('add task ') ||
      lower.startsWith('set reminder ') ||
      lower.startsWith('set a reminder ') ||
      lower.startsWith('schedule ')
    )

    if (isTaskCommand) {
      setActionStep({ title: raw, step: 'Understanding request...' })
      setRobotState('thinking')
      setActiveDrawer('tasks')

      setTimeout(() => {
        setActionStep({ title: raw, step: 'Creating reminder...' })
      }, 700)

      const parseRes = await api(`/tasks/${USER_ID}/parse`, {
        method: 'POST',
        body: JSON.stringify({ message: raw }),
      })

      const taskTitle = parseRes.task?.title || raw
      const taskTime = parseRes.task?.time || '18:00'
      const taskPeriod = parseRes.task?.period || 'Evening'

      const saveRes = await api(`/tasks/${USER_ID}`, {
        method: 'POST',
        body: JSON.stringify({ title: taskTitle, time: taskTime, period: taskPeriod }),
      })

      if (saveRes.success && saveRes.task) {
        setNewlyAddedId(saveRes.task.id)
        setTasks(prev => [...prev, saveRes.task])
      }

      setActionStep({ title: taskTitle, step: 'Reminder set!' })

      const reply = selectedLang === 'hi'
        ? `हो गया! मैंने आपका रिमाइंडर ${taskTime} बजे के लिए सेट कर दिया है।`
        : `Done. I've set your reminder for ${taskTime}.`
      setLastResponse(reply)
      speakText(reply)

      setTimeout(() => {
        setActionStep(null)
      }, 3500)
      return
    }

    // ----------------------------------------------------
    // Command 7: Family Bridge & Auto-Opening
    // ----------------------------------------------------
    const isFamilyCommand = 
      lower.includes('family') ||
      lower.includes('priya') ||
      lower.includes('amit') ||
      lower.includes('call daughter') ||
      lower.includes('call son')

    if (isFamilyCommand) {
      setActiveDrawer('family')
      refreshData()

      let reply = selectedLang === 'hi' ? 'फैमिली कनेक्शन स्क्रीन खुल रही है।' : 'Opening family bridge.'
      if (lower.includes('call priya')) {
        api(`/family/${USER_ID}/fam-001/call`, { method: 'POST' })
        reply = selectedLang === 'hi' ? 'आपकी बेटी प्रिया को कॉल लगा रहे हैं।' : 'Initiating a call to Priya now.'
      } else if (lower.includes('message amit')) {
        api(`/family/${USER_ID}/fam-002/message`, { method: 'POST' })
        reply = selectedLang === 'hi' ? 'आपके बेटे अमित को संदेश भेजा जा रहा है।' : 'Sending a check-in message to Amit.'
      }

      setLastResponse(reply)
      speakText(reply)
      return
    }

    // ----------------------------------------------------
    // Command 8: Robot Hardware Telemetry
    // ----------------------------------------------------
    if (lower.includes('robot') || lower.includes('battery') || lower.includes('hardware') || lower.includes('telemetry')) {
      setActiveDrawer('robot')
      const reply = selectedLang === 'hi'
        ? `सिस्टम सामान्य रूप से कार्य कर रहा है। बैटरी ${robotTelemetry.battery} प्रतिशत है।`
        : `All systems are operating smoothly. Battery is at ${robotTelemetry.battery} percent.`
      setLastResponse(reply)
      speakText(reply)
      return
    }

    // ----------------------------------------------------
    // Command 9: Conversational AI (Gemini Brain with language support)
    // ----------------------------------------------------
    const chatRes = await api('/chat', {
      method: 'POST',
      body: JSON.stringify({ userId: USER_ID, message: raw, language: selectedLang }),
    })

    if (chatRes.success && chatRes.response) {
      setLastResponse(chatRes.response)
      speakText(chatRes.response)

      if (chatRes.openSection) {
        setActiveDrawer(chatRes.openSection)
      }

      if (chatRes.memorySaved && chatRes.memory) {
        setNewlyAddedId(chatRes.memory.id)
        setMemories(prev => [chatRes.memory, ...prev])
      }
    } else {
      // Soft varied fallbacks without repetitive name spam
      const englishFallbacks = [
        `I am listening carefully. Please feel free to tell me more.`,
        `That is interesting. Could you tell me a little more about that?`,
        `I am right here with you. What is on your mind today?`,
        `I am listening. Please go ahead.`,
        `Thank you for sharing that with me. Would you like to tell me more?`,
        `I understand. I am always right here whenever you need me.`,
      ]
      const hindiFallbacks = [
        `मैं आपकी बात ध्यान से सुन रहा हूँ। कृपया और बताइए।`,
        `यह बहुत दिलचस्प बात है। क्या आप इसके बारे में थोड़ा और बताएँगे?`,
        `मैं हमेशा आपके साथ हूँ। आज आपका दिन कैसा चल रहा है?`,
        `मैं सुन रहा हूँ, आप अपनी बात जारी रखें।`,
        `यह साझा करने के लिए धन्यवाद। मुझे आपकी बातें सुनना बहुत अच्छा लगता है।`,
        `मैं समझ गया। जब भी बात करनी हो, मैं यहीं हूँ।`,
      ]
      const fallbacks = selectedLang === 'hi' ? hindiFallbacks : englishFallbacks
      const fallback = fallbacks[fallbackIndexRef.current % fallbacks.length]
      fallbackIndexRef.current += 1
      setLastResponse(fallback)
      speakText(fallback)
    }
  }, [isQuestionOrRecall, speakText, refreshData, memories, tasks, robotTelemetry.battery, selectedLang])

  // ==========================================
  // Ultra-Fast Speech Recognition (450ms Silence Commit)
  // ==========================================

  const toggleListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge, or type in the command bar.')
      return
    }

    // If currently listening, tap mic to IMMEDIATELY commit with 0ms delay!
    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }
      setIsListening(false)

      const finalPhrase = pendingTranscriptRef.current.trim()
      pendingTranscriptRef.current = ''
      if (finalPhrase) {
        handleVoiceCommand(finalPhrase)
      } else {
        setRobotState('idle')
      }
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = true
      const langMap = {
        en: 'en-US',
        hi: 'hi-IN',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        bn: 'bn-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        mr: 'mr-IN',
      }
      recognition.lang = langMap[selectedLang] || 'en-US'
      // Reset both transcript buffers at the start of each new session
      pendingTranscriptRef.current = ''
      accumulatedTranscriptRef.current = ''

      recognition.onstart = () => {
        setIsListening(true)
        setRobotState('listening')
        setMood('attentive')
      }

      recognition.onresult = (event) => {
        let newFinalStr = ''
        let interimStr = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            newFinalStr += trans
          } else {
            interimStr += trans
          }
        }

        // Accumulate finalized chunks across the whole utterance
        if (newFinalStr) {
          accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + newFinalStr).trim()
        }

        // Show live transcript: accumulated finals + current interim
        const liveText = (accumulatedTranscriptRef.current + ' ' + interimStr).trim()
        if (liveText) {
          pendingTranscriptRef.current = liveText
          setTranscript(liveText)
        }

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.stop() } catch {}
          }
          setIsListening(false)
          const speechToProcess = pendingTranscriptRef.current.trim()
          pendingTranscriptRef.current = ''
          accumulatedTranscriptRef.current = ''
          if (speechToProcess) {
            handleVoiceCommand(speechToProcess)
          }
        }, 1800)
      }

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition notice:', event.error)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        if (robotState === 'listening') setRobotState('idle')
      }

      recognition.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setIsListening(false)
      setRobotState('idle')
    }
  }, [isListening, robotState, handleVoiceCommand, selectedLang])

  // Handle manual text submission
  const handleTextSubmit = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return
    const text = inputText
    setInputText('')
    handleVoiceCommand(text)
  }

  // Toggle Task Completion
  const toggleTask = async (taskId, currentStatus) => {
    const res = await api(`/tasks/${USER_ID}/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !currentStatus }),
    })
    if (res.success && res.task) {
      setTasks(prev => prev.map(t => t.id === taskId ? res.task : t))
      if (!currentStatus) {
        const reply = selectedLang === 'hi' 
          ? `शाबाश! "${res.task.title}" पूरा कर लिया गया है।`
          : `Wonderful! Marked "${res.task.title}" as completed.`
        speakText(reply)
      }
    }
  }

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className={`jarvis-robot-app theme-${theme}`}>
      {/* ---------------- 1. MORNING WINDOW LIVING BACKGROUND LAYERS ---------------- */}
      <div className="morning-room-background">
        {/* Soft morning sky & distant foliage outside window */}
        <div className="window-pane-backdrop">
          <div className="distant-trees"></div>
          <div className="morning-sun-beam"></div>
        </div>

        {/* Indoor Plants with subtle movement */}
        <div className="indoor-plant plant-left"></div>
        <div className="indoor-plant plant-right"></div>
        
        {/* Soft dust particles floating in sunlight */}
        <div className="floating-dust-particle p1"></div>
        <div className="floating-dust-particle p2"></div>
        <div className="floating-dust-particle p3"></div>

        {/* Foreground Warm Wooden Table Surface with objects */}
        <div className="foreground-desk-surface">
          <div className="desk-object notebook" title="Personal Journal"></div>
          <div className="desk-object tea-cup" title="Warm Tea"></div>
          <div className="desk-object reading-glasses" title="Reading Glasses"></div>
        </div>
      </div>

      {/* ---------------- 2. TOP HEADER BAR ---------------- */}
      <header className="morning-header">
        {/* TOP LEFT: Minimal Saathi Branding */}
        <div className="saathi-brand-header">
          <div className="brand-robot-icon">🤖</div>
          <div>
            <h1 className="brand-title">Saathi</h1>
            <p className="brand-subtitle">Always here. Always listening.</p>
          </div>
        </div>

        {/* TOP RIGHT: System Status & Time */}
        <div className="morning-system-info">
          <div className="online-indicator">
            <span className="status-dot"></span>
            Saathi Online
          </div>

          <div className="time-weather-pill">
            <span className="weather-sun">☀</span>
            <span className="time-text">06:45 AM</span>
            <span className="date-text">Mon, 12 May</span>
          </div>

          {/* Quick HUD Peeking Tabs */}
          <button 
            className="os-theme-btn"
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <button 
            className="hud-icon-btn"
            onClick={() => setActiveDrawer(activeDrawer === 'robot' ? null : 'robot')}
            title="System Settings & Diagnostics"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ---------------- 3. MAIN CENTRED SAATHI HERO ARENA ---------------- */}
      <main className="robot-arena">
        {/* LEFT PANEL: TODAY'S PLAN CARD */}
        <aside className="side-panel left-panel">
          <div className="panel-card plan-card">
            <div className="panel-card-header">
              <span className="panel-icon">📅</span>
              <h3>Today's Plan</h3>
            </div>
            <ul className="plan-list">
              <li className="plan-item done">
                <span className="plan-time">08:00</span>
                <span className="plan-text">Morning medicine</span>
                <span className="plan-status">✓ Done</span>
              </li>
              <li className="plan-item">
                <span className="plan-time">13:00</span>
                <span className="plan-text">Call Meena</span>
                <span className="plan-status upcoming">Upcoming</span>
              </li>
              <li className="plan-item">
                <span className="plan-time">17:30</span>
                <span className="plan-text">Evening walk</span>
                <span className="plan-status upcoming">Upcoming</span>
              </li>
              <li className="plan-item">
                <span className="plan-time">18:00</span>
                <span className="plan-text">Water plants</span>
                <span className="plan-status upcoming">Upcoming</span>
              </li>
            </ul>
            <button 
              className="panel-footer-btn"
              onClick={() => setActiveDrawer('tasks')}
            >
              View Full Schedule →
            </button>
          </div>
        </aside>

        {/* CENTER: SAATHI HERO ROBOT & GREETING */}
        <section className="center-robot-section">
          <div className={`robot-display-frame state-${robotState}`}>
            {/* Soft Breathing Halo */}
            <div className="robot-ambient-halo"></div>

            {/* UNCHANGED ROBOT FACE HARDWARE */}
            <div className="robot-head-pod">
              <div className="robot-pod-ear left-ear">
                <div className="ear-inner-glow"></div>
              </div>
              <div className="robot-pod-ear right-ear">
                <div className="ear-inner-glow"></div>
              </div>

              <div className="robot-forehead-groove"></div>
              
              <div className="robot-bezel-frame">
                <div className={`robot-face-stage mood-${mood}`}>
                  <div className="visor-gloss-reflection"></div>

                  <div className="robot-brows-row">
                    <div className="soft-brow left-brow"></div>
                    <div className="soft-brow right-brow"></div>
                  </div>

                  <div className="robot-eyes-row">
                    <div className="robot-eye-socket">
                      <div className={`robot-eye left-eye ${isBlinking ? 'blinking' : ''}`}>
                        <div className="eye-scanlines"></div>
                        <div className="eye-digital-gleam"></div>
                      </div>
                    </div>
                    <div className="robot-eye-socket">
                      <div className={`robot-eye right-eye ${isBlinking ? 'blinking' : ''}`}>
                        <div className="eye-scanlines"></div>
                        <div className="eye-digital-gleam"></div>
                      </div>
                    </div>
                  </div>

                  <div className="robot-mouth-socket">
                    {robotState === 'speaking' ? (
                      <div className="robot-mouth-wave">
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                      </div>
                    ) : robotState === 'thinking' ? (
                      <div className="robot-mouth-thinking">
                        <div className="think-dot"></div>
                        <div className="think-dot"></div>
                        <div className="think-dot"></div>
                      </div>
                    ) : (
                      <div className="robot-smile-filled">
                        <div className="smile-scanlines"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ROBOT GREETING */}
            <div className="robot-greeting-block">
              {robotState === 'listening' ? (
                <>
                  <h2 className="greeting-primary">I'm listening...</h2>
                  <p className="greeting-secondary">Speak naturally, Ramesh ji.</p>
                </>
              ) : robotState === 'thinking' ? (
                <>
                  <h2 className="greeting-primary">Let me take care of that.</h2>
                  <p className="greeting-secondary">Processing your request...</p>
                </>
              ) : (
                <>
                  <h2 className="greeting-primary">Good morning, Ramesh.</h2>
                  <p className="greeting-secondary">I'm here with you.</p>
                </>
              )}
            </div>

            {/* ACTION CARD STEP BANNER (When Saathi performs action) */}
            {actionStep && (
              <div className="action-step-card">
                <div className="action-card-header">
                  <span>⚡ Taking care of it</span>
                </div>
                <div className="action-card-title">"{actionStep.title}"</div>
                <div className="action-card-step">{actionStep.step}</div>
              </div>
            )}

            {/* LARGE VOICE MIC BUTTON */}
            <div className="voice-mic-container">
              <button 
                className={`main-mic-button ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
                aria-label="Tap to speak with Saathi"
              >
                {isListening ? (
                  <div className="mic-listening-waves">
                    <span className="mwave"></span>
                    <span className="mwave"></span>
                    <span className="mwave"></span>
                  </div>
                ) : (
                  <span className="mic-icon">🎙️</span>
                )}
              </button>
              <div className="mic-caption">
                {isListening ? 'Listening...' : 'Tap to talk'}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: CONTEXTUAL MEMORY CARDS */}
        <aside className="side-panel right-panel">
          <div className="panel-card memory-card">
            <div className="panel-card-header">
              <span className="panel-icon">🌹</span>
              <h3>Saathi remembers</h3>
            </div>
            <div className="memory-card-body">
              <p className="memory-text">Your roses are blooming beautifully this week.</p>
              <div className="memory-card-actions">
                <button 
                  className="memory-action-btn"
                  onClick={() => speakText("Your roses are blooming beautifully this week, Ramesh ji. You mentioned planting them last autumn.")}
                >
                  🔊 Listen
                </button>
                <button 
                  className="memory-action-btn secondary"
                  onClick={() => setActiveDrawer('memories')}
                >
                  Read more
                </button>
              </div>
            </div>
          </div>

          <div className="panel-card memory-card story-card">
            <div className="panel-card-header">
              <span className="panel-icon">🚂</span>
              <h3>Talk about</h3>
            </div>
            <div className="memory-card-body">
              <h4 className="story-title">Your railway days</h4>
              <p className="memory-text">You have such interesting stories from the northern lines...</p>
              <button 
                className="memory-action-btn"
                onClick={() => handleVoiceCommand("Tell me about my railway days")}
              >
                💬 Chat about this
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* ---------------- 4. BOTTOM COMPACT CONVERSATION BAR & PROMPTS ---------------- */}
      <footer className="morning-footer-bar">
        {/* Compact Transcript & Response Display */}
        <div className="compact-conversation-strip">
          <div className="dialogue-line user-line">
            <span className="dialogue-speaker">You:</span>
            <span className="dialogue-text">{transcript || "Remind me to call Meena at 6."}</span>
          </div>
          <div className="dialogue-divider">│</div>
          <div className="dialogue-line saathi-line">
            <span className="dialogue-speaker">Saathi:</span>
            <span className="dialogue-text">{lastResponse}</span>
          </div>
        </div>

        {/* Quick Context Voice Chips */}
        <div className="voice-chips-rack">
          <button 
            className="voice-chip"
            onClick={() => handleVoiceCommand('Remind me to call Meena at 6')}
          >
            "Remind me to call Meena at 6"
          </button>
          <button 
            className="voice-chip"
            onClick={() => handleVoiceCommand('Remember that I love roasted peanuts with tea')}
          >
            "Remember that I love roasted peanuts with tea"
          </button>
          <button 
            className="voice-chip"
            onClick={() => handleVoiceCommand('Show my memories')}
          >
            "Show my memories"
          </button>
          {activeDrawer && (
            <button 
              className="voice-chip close-chip"
              onClick={() => handleVoiceCommand('Close')}
            >
              ✕ Close section
            </button>
          )}
        </div>

        {/* Optional Manual Text Bar */}
        <form className="command-input-bar" onSubmit={handleTextSubmit}>
          <input
            type="text"
            placeholder="Or type a request..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </footer>

      {/* ================================================================
          AUTONOMOUS HUD DRAWER
          (Automatically slides open when voice command requests it)
          ================================================================ */}
      {activeDrawer && (
        <div className="hud-drawer-backdrop" onClick={() => setActiveDrawer(null)}>
          <div className="hud-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="hud-drawer-header">
              <div className="hud-drawer-title">
                <span className="drawer-icon">
                  {activeDrawer === 'memories' && '🧠'}
                  {activeDrawer === 'tasks' && '📅'}
                  {activeDrawer === 'family' && '👨‍👩‍👧'}
                  {activeDrawer === 'robot' && '🤖'}
                </span>
                <div>
                  <h2>
                    {activeDrawer === 'memories' && 'Memory Vault'}
                    {activeDrawer === 'tasks' && "Today's Routine & Tasks"}
                    {activeDrawer === 'family' && 'Family Connection Bridge'}
                    {activeDrawer === 'robot' && 'Robot Hardware Telemetry'}
                  </h2>
                  <p>Auto-opened by Saathi Voice Engine</p>
                </div>
              </div>
              <button 
                className="hud-drawer-close-btn"
                onClick={() => setActiveDrawer(null)}
                title="Return to full face"
              >
                ✕
              </button>
            </div>

            <div className="hud-drawer-content">
              {/* --- MEMORIES DRAWER CONTENT --- */}
              {activeDrawer === 'memories' && (
                <>
                  <div style={{ color: 'var(--robot-text-muted)', fontSize: '0.9rem' }}>
                    Saathi preserves your cherished life stories, preferences, and personal facts:
                  </div>

                  {memories.map((m) => (
                    <div 
                      key={m.id} 
                      className={`hud-card ${m.id === newlyAddedId ? 'newly-added' : ''}`}
                    >
                      <div className="hud-card-header">
                        <span className="hud-card-badge">
                          {m.id === newlyAddedId ? '✨ NEWLY RECORDED' : (m.type || 'MEMORY')}
                        </span>
                        <span className="hud-card-date">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="hud-card-title">{m.title}</div>
                      <div className="hud-card-body">{m.content}</div>
                      {m.tags && m.tags.length > 0 && (
                        <div className="hud-tags">
                          {m.tags.map((t, idx) => (
                            <span key={idx} className="hud-tag">#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* --- TASKS DRAWER CONTENT --- */}
              {activeDrawer === 'tasks' && (
                <>
                  <div style={{ color: 'var(--robot-text-muted)', fontSize: '0.9rem' }}>
                    Scheduled activities and medication reminders for Ramesh Patel:
                  </div>

                  {tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`hud-task-item ${task.completed ? 'completed' : ''} ${task.id === newlyAddedId ? 'newly-added' : ''}`}
                    >
                      <div className="hud-task-left">
                        <input
                          type="checkbox"
                          className="hud-task-checkbox"
                          checked={Boolean(task.completed)}
                          onChange={() => toggleTask(task.id, task.completed)}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: task.completed ? 'var(--robot-text-dim)' : '#FFF' }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--robot-text-dim)' }}>
                            {task.period || 'General'}
                          </div>
                        </div>
                      </div>
                      <div className="hud-task-time">{task.time}</div>
                    </div>
                  ))}
                </>
              )}

              {/* --- FAMILY DRAWER CONTENT --- */}
              {activeDrawer === 'family' && (
                <>
                  <div style={{ color: 'var(--robot-text-muted)', fontSize: '0.9rem' }}>
                    Loved ones connected to your companion system:
                  </div>

                  {familyData?.family?.map((member) => (
                    <div key={member.id} className="hud-family-member">
                      <div>
                        <div style={{ fontWeight: 600, color: '#FFF' }}>{member.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--robot-primary)' }}>{member.relation}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--robot-text-dim)' }}>{member.phone}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="hud-action-btn"
                          onClick={async () => {
                            await api(`/family/${USER_ID}/${member.id}/call`, { method: 'POST' })
                            speakText(`Simulating voice call with ${member.name}, Ramesh ji.`)
                          }}
                        >
                          📞 Call
                        </button>
                        <button 
                          className="hud-action-btn"
                          onClick={async () => {
                            await api(`/family/${USER_ID}/${member.id}/message`, { method: 'POST' })
                            speakText(`Sending a warm status message to ${member.name}, Ramesh ji.`)
                          }}
                        >
                          💬 Message
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="hud-card" style={{ marginTop: '1rem' }}>
                    <div className="hud-card-title">Daily Wellbeing Shared</div>
                    <div className="hud-card-body">
                      Mood today: <strong>{familyData?.mood || 'Cheerful'}</strong>. Completed {familyData?.completedTasks || 0} tasks. Family receives periodic reassurance updates.
                    </div>
                    <button 
                      className="hud-action-btn"
                      style={{ marginTop: '0.75rem', width: '100%' }}
                      onClick={async () => {
                        const res = await api(`/family/${USER_ID}/share-summary`, { method: 'POST' })
                        if (res.success) speakText('Shared your daily summary with Priya and Amit.')
                      }}
                    >
                      📤 Share Today's Summary Now
                    </button>
                  </div>
                </>
              )}

              {/* --- ROBOT HARDWARE CONTENT --- */}
              {activeDrawer === 'robot' && (
                <>
                  <div className="telemetry-grid">
                    <div className="telemetry-stat">
                      <div className="telemetry-stat-label">Power Level</div>
                      <div className="telemetry-stat-value">{robotTelemetry.battery}%</div>
                    </div>
                    <div className="telemetry-stat">
                      <div className="telemetry-stat-label">System State</div>
                      <div className="telemetry-stat-value" style={{ color: 'var(--robot-success)' }}>
                        {robotTelemetry.state?.toUpperCase()}
                      </div>
                    </div>
                    <div className="telemetry-stat">
                      <div className="telemetry-stat-label">AI Engine</div>
                      <div className="telemetry-stat-value" style={{ fontSize: '1rem' }}>
                        Gemini Flash Lite
                      </div>
                    </div>
                    <div className="telemetry-stat">
                      <div className="telemetry-stat-label">Voice Pipeline</div>
                      <div className="telemetry-stat-value" style={{ fontSize: '1rem' }}>
                        Active (STT + TTS)
                      </div>
                    </div>
                  </div>

                  <div className="hud-card">
                    <div className="hud-card-title">Physical Robot Integration</div>
                    <div className="hud-card-body">
                      This interface serves as the primary OLED display for the SAATHI companion robot. All voice recognition and autonomous actions run through the cloud intelligence layer.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
