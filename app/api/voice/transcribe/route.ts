import { NextRequest, NextResponse } from 'next/server'

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

/**
 * POST /api/voice/transcribe
 * Transcribe audio to text using STT service
 */
export async function POST(request: NextRequest) {
    try {
        // Get audio file and language from form data
        const formData = await request.formData()
        const audioFile = formData.get('audio') as File
        const language = formData.get('language') as string || 'en'

        if (!audioFile) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            )
        }

        // In dev mode, return mock transcription
        if (DEV_MODE) {
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 1000))

            const mockTranscriptions = [
                'What are the admission fees for engineering courses?',
                'When does the new semester start?',
                'How can I apply for a scholarship?',
                'What documents are required for admission?',
                'Tell me about the hostel facilities'
            ]

            const randomTranscription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)]

            return NextResponse.json({
                text: randomTranscription,
                language: language,
                confidence: 0.95,
                duration: 3.2,
                mock: true
            })
        }

        // In production mode, forward to backend
        const backendFormData = new FormData()
        backendFormData.append('audio_file', audioFile)
        backendFormData.append('language', language)

        const response = await fetch(`${BACKEND_URL}/api/v1/chat/voice/transcribe`, {
            method: 'POST',
            body: backendFormData,
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.detail || 'Transcription failed')
        }

        const data = await response.json()

        return NextResponse.json({
            text: data.text || data.transcription || '',
            language: data.language || language,
            confidence: data.confidence || 0.8,
            duration: data.duration || 0,
            mock: false
        })

    } catch (error) {
        console.error('Voice transcription error:', error)

        return NextResponse.json(
            {
                error: 'Failed to transcribe audio',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
