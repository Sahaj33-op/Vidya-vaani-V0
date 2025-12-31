"use client"

import { useState, useEffect, useRef } from 'react'
import { generateSessionId, type Message, loadMessagesFromLocalStorage, saveMessagesToLocalStorage } from '@/lib/chat-utils'

interface UseChatReturn {
    messages: Message[]
    isLoading: boolean
    error: string | null
    sessionId: string
    sendMessage: (content: string, language: string) => Promise<void>
    clearMessages: () => void
    retryLastMessage: () => Promise<void>
}

export function useChat(): UseChatReturn {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sessionId] = useState(() => generateSessionId())
    const lastUserMessageRef = useRef<{ content: string; language: string } | null>(null)

    // Load messages from localStorage on mount
    useEffect(() => {
        const savedMessages = loadMessagesFromLocalStorage()
        if (savedMessages.length > 0) {
            setMessages(savedMessages)
        }
    }, [])

    // Save messages to localStorage whenever they change
    useEffect(() => {
        if (messages.length > 0) {
            saveMessagesToLocalStorage(messages)
        }
    }, [messages])

    const sendMessage = async (content: string, language: string) => {
        if (!content.trim()) return

        setError(null)
        setIsLoading(true)

        // Store for retry
        lastUserMessageRef.current = { content, language }

        // Add user message
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: content.trim(),
            timestamp: new Date(),
            language
        }

        setMessages(prev => [...prev, userMessage])

        try {
            // Call chat API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: content.trim(),
                    language,
                    session_id: sessionId
                })
            })

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`)
            }

            const data = await response.json()

            // Add bot response
            const botMessage: Message = {
                id: `bot-${Date.now()}`,
                role: 'assistant',
                content: data.response || 'I apologize, but I could not generate a response.',
                timestamp: new Date(),
                language: data.language || language
            }

            setMessages(prev => [...prev, botMessage])
        } catch (err) {
            console.error('[useChat] Error:', err)
            setError('Failed to send message. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const retryLastMessage = async () => {
        if (lastUserMessageRef.current) {
            const { content, language } = lastUserMessageRef.current
            await sendMessage(content, language)
        }
    }

    const clearMessages = () => {
        setMessages([])
        saveMessagesToLocalStorage([])
        setError(null)
    }

    return {
        messages,
        isLoading,
        error,
        sessionId,
        sendMessage,
        clearMessages,
        retryLastMessage
    }
}
