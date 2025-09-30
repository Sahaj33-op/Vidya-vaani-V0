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

    // Function to set voice and speak
    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices()

      // Try to find a suitable voice for the target language
      let preferredVoice = voices.find(voice =>
        voice.lang === utterance.lang
      )

      // If exact match not found, try partial match (language prefix)
      if (!preferredVoice) {
        preferredVoice = voices.find(voice =>
          voice.lang.startsWith(utterance.lang.split('-')[0])
        )
      }

      // If still no voice found, try any voice that supports the language
      if (!preferredVoice) {
        preferredVoice = voices.find(voice =>
          voice.lang.includes(utterance.lang.split('-')[0])
        )
      }

      if (preferredVoice) {
        utterance.voice = preferredVoice
        console.log(`Using voice: ${preferredVoice.name} (${preferredVoice.lang})`)
      } else {
        console.warn(`No suitable voice found for ${utterance.lang}, using default`)
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
    }

    // Check if voices are already loaded
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      // Voices are already loaded, proceed immediately
      setVoiceAndSpeak()
    } else {
      // Wait for voices to be loaded
      const handleVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
        setVoiceAndSpeak()
      }

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)

      // Fallback timeout in case voiceschanged never fires
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
        console.warn('Voice loading timeout, proceeding with available voices')
        setVoiceAndSpeak()
      }, 2000)
    }
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
