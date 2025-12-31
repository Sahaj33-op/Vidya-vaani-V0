"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceInputProps {
    onTranscript: (text: string) => void
    disabled?: boolean
    language?: string
}

export function VoiceInput({ onTranscript, disabled = false, language = 'en' }: VoiceInputProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    // Check if browser supports MediaRecorder
    const isSupported = typeof window !== 'undefined' && 'MediaRecorder' in window

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (mediaRecorderRef.current && isRecording) {
                mediaRecorderRef.current.stop()
            }
        }
    }, [isRecording])

    const startRecording = async () => {
        try {
            setError(null)

            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            // Create MediaRecorder instance
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop())

                // Process the recorded audio
                await processAudio()
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (err) {
            console.error('Error starting recording:', err)
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError') {
                    setError('Microphone permission denied. Please allow microphone access.')
                } else if (err.name === 'NotFoundError') {
                    setError('No microphone found. Please connect a microphone.')
                } else {
                    setError('Failed to start recording. Please try again.')
                }
            }
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const processAudio = async () => {
        try {
            setIsProcessing(true)

            // Create audio blob
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })

            // Create FormData for upload
            const formData = new FormData()
            formData.append('audio', audioBlob, 'recording.webm')
            formData.append('language', language)

            // Send to backend for transcription
            const response = await fetch('/api/voice/transcribe', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Transcription failed')
            }

            const data = await response.json()

            if (data.text && data.text.trim()) {
                onTranscript(data.text)
                setError(null)
            } else {
                setError('No speech detected. Please try again.')
            }
        } catch (err) {
            console.error('Error processing audio:', err)
            setError('Failed to process audio. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleClick = () => {
        if (isRecording) {
            stopRecording()
        } else {
            startRecording()
        }
    }

    if (!isSupported) {
        return null // Don't render if browser doesn't support voice input
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <Button
                type="button"
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                onClick={handleClick}
                disabled={disabled || isProcessing}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                className={cn(
                    isRecording && "animate-pulse"
                )}
            >
                {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : isRecording ? (
                    <MicOff className="h-4 w-4" />
                ) : (
                    <Mic className="h-4 w-4" />
                )}
            </Button>
            {error && (
                <p className="text-xs text-destructive text-center max-w-xs">
                    {error}
                </p>
            )}
        </div>
    )
}
