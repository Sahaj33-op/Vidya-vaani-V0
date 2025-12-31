"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX, Loader2 } from 'lucide-react'

interface TextToSpeechProps {
    text: string
    language?: string
    autoPlay?: boolean
}

export function TextToSpeech({ text, language = 'en', autoPlay = false }: TextToSpeechProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null)

    // Check if browser supports Web Speech API
    const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

    useEffect(() => {
        if (!isSupported || !text) return

        // Create utterance
        const newUtterance = new SpeechSynthesisUtterance(text)

        // Set language based on selected language
        const languageMap: { [key: string]: string } = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'mr': 'mr-IN',
            'mwr': 'hi-IN' // Marwari fallback to Hindi
        }

        newUtterance.lang = languageMap[language] || 'en-US'
        newUtterance.rate = 0.9 // Slightly slower for clarity
        newUtterance.pitch = 1.0
        newUtterance.volume = 1.0

        // Event handlers
        newUtterance.onstart = () => {
            setIsPlaying(true)
            setIsLoading(false)
        }

        newUtterance.onend = () => {
            setIsPlaying(false)
        }

        newUtterance.onerror = (event) => {
            console.error('Speech synthesis error:', event)
            setIsPlaying(false)
            setIsLoading(false)
            setError('Failed to play audio')
        }

        setUtterance(newUtterance)

        // Auto-play if enabled
        if (autoPlay) {
            // Small delay to ensure utterance is ready
            setTimeout(() => {
                playAudio(newUtterance)
            }, 100)
        }

        // Cleanup
        return () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel()
            }
        }
    }, [text, language, isSupported, autoPlay])

    const playAudio = (utt: SpeechSynthesisUtterance) => {
        try {
            setError(null)
            setIsLoading(true)

            // Cancel any ongoing speech
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel()
            }

            // Start speaking
            window.speechSynthesis.speak(utt)
        } catch (err) {
            console.error('Error playing audio:', err)
            setError('Failed to play audio')
            setIsLoading(false)
        }
    }

    const stopAudio = () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel()
            setIsPlaying(false)
        }
    }

    const handleClick = () => {
        if (isPlaying) {
            stopAudio()
        } else if (utterance) {
            playAudio(utterance)
        }
    }

    if (!isSupported || !text) {
        return null // Don't render if browser doesn't support TTS or no text
    }

    return (
        <div className="flex items-center gap-1">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClick}
                disabled={isLoading}
                aria-label={isPlaying ? "Stop audio" : "Play audio"}
                className="h-8 px-2"
            >
                {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : isPlaying ? (
                    <VolumeX className="h-3 w-3" />
                ) : (
                    <Volume2 className="h-3 w-3" />
                )}
                <span className="ml-1 text-xs">
                    {isPlaying ? 'Stop' : 'Listen'}
                </span>
            </Button>
            {error && (
                <span className="text-xs text-destructive">{error}</span>
            )}
        </div>
    )
}
