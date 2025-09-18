import { useState, useCallback, useEffect } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

interface UseVoiceProps {
  onTranscriptChange?: (transcript: string) => void
  language?: string
}

interface UseVoiceReturn {
  // Speech Recognition
  transcript: string
  isListening: boolean
  hasRecognitionSupport: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  
  // Speech Synthesis
  isSpeaking: boolean
  speak: (text: string, language?: string) => void
  stopSpeaking: () => void
  hasSpeechSynthesis: boolean
}

export const useVoice = ({ onTranscriptChange, language = 'en-US' }: UseVoiceProps = {}): UseVoiceReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [hasSpeechSynthesis, setHasSpeechSynthesis] = useState(false)

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  // Check for speech synthesis support
  useEffect(() => {
    setHasSpeechSynthesis('speechSynthesis' in window)
  }, [])

  // Notify parent component of transcript changes
  useEffect(() => {
    if (transcript && onTranscriptChange) {
      onTranscriptChange(transcript)
    }
  }, [transcript, onTranscriptChange])

  // Speech Recognition functions
  const startListening = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      console.warn('Browser does not support speech recognition')
      return
    }

    const languageMap: Record<string, string> = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'mr': 'mr-IN',
      'mwr': 'hi-IN', // Fallback to Hindi for Marwari
    }

    const recognitionLanguage = languageMap[language] || 'en-US'

    SpeechRecognition.startListening({
      continuous: false,
      language: recognitionLanguage,
    })
  }, [browserSupportsSpeechRecognition, language])

  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening()
  }, [])

  // Speech Synthesis functions
  const speak = useCallback((text: string, voiceLanguage?: string) => {
    if (!hasSpeechSynthesis || !text.trim()) return

    // Stop any current speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    
    // Language mapping for speech synthesis
    const synthLanguageMap: Record<string, string> = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'mr': 'mr-IN',
      'mwr': 'hi-IN', // Fallback to Hindi for Marwari
    }

    const synthLanguage = voiceLanguage || language
    utterance.lang = synthLanguageMap[synthLanguage] || 'en-US'

    // Try to find a suitable voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith(utterance.lang.split('-')[0])
    )
    
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    // Set speech parameters
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1

    // Event handlers
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error)
      setIsSpeaking(false)
    }

    window.speechSynthesis.speak(utterance)
  }, [hasSpeechSynthesis, language])

  const stopSpeaking = useCallback(() => {
    if (hasSpeechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [hasSpeechSynthesis])

  return {
    // Speech Recognition
    transcript,
    isListening: listening,
    hasRecognitionSupport: browserSupportsSpeechRecognition,
    startListening,
    stopListening,
    resetTranscript,
    
    // Speech Synthesis
    isSpeaking,
    speak,
    stopSpeaking,
    hasSpeechSynthesis,
  }
}