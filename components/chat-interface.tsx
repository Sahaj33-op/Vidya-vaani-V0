"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Bot, User, Globe, HelpCircle, FileText, Mic, MicOff, Volume2, VolumeX } from "lucide-react"
import { useVoice } from "@/hooks/useVoice"

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
  language?: string
  sources?: string[]
  confidence?: number
}

const languages = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिंदी" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "mwr", name: "Marwari", native: "मारवाड़ी" },
]

const quickActions = [
  { text: "Admission Information", icon: FileText, query: "Tell me about admission process" },
  { text: "Fee Structure", icon: HelpCircle, query: "What are the fees?" },
  { text: "Timetable", icon: FileText, query: "Show me the timetable" },
  { text: "Contact Info", icon: HelpCircle, query: "How can I contact the college?" },
]

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your college assistant. I can help you with admissions, fees, timetables, and more. How can I assist you today?",
      sender: "bot",
      timestamp: new Date(),
      confidence: 1.0,
    },
  ])
  const [inputText, setInputText] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("en")
  const [isLoading, setIsLoading] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Voice functionality
  const handleTranscriptChange = useCallback((transcript: string) => {
    setInputText(transcript)
  }, [])

  const {
    transcript,
    isListening,
    hasRecognitionSupport,
    startListening,
    stopListening,
    resetTranscript,
    isSpeaking,
    speak,
    stopSpeaking,
    hasSpeechSynthesis,
  } = useVoice({ 
    onTranscriptChange: handleTranscriptChange,
    language: selectedLanguage 
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-speak bot responses if voice is enabled
  useEffect(() => {
    if (voiceEnabled && hasSpeechSynthesis && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.sender === 'bot' && !isLoading) {
        // Small delay to ensure message is rendered
        setTimeout(() => {
          speak(lastMessage.text, selectedLanguage)
        }, 500)
      }
    }
  }, [messages, voiceEnabled, hasSpeechSynthesis, speak, selectedLanguage, isLoading])

  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: "user",
      timestamp: new Date(),
      language: selectedLanguage,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText("")
    setIsLoading(true)

    try {
      // Simulate API call to chatbot backend
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "user_123",
          text: text.trim(),
          lang: selectedLanguage,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text:
            data.reply ||
            "I apologize, but I'm having trouble processing your request right now. Please try again later.",
          sender: "bot",
          timestamp: new Date(),
          sources: data.source_ids,
          confidence: data.confidence,
        }
        setMessages((prev) => [...prev, botMessage])
      } else {
        throw new Error("Failed to get response")
      }
    } catch (error) {
      console.error("[v0] Chat API error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having technical difficulties. Please try again in a moment or contact support if the problem persists.",
        sender: "bot",
        timestamp: new Date(),
        confidence: 0,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (query: string) => {
    handleSendMessage(query)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
  }

  const toggleVoiceOutput = () => {
    if (isSpeaking) {
      stopSpeaking()
    }
    setVoiceEnabled(!voiceEnabled)
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-card-foreground">College Assistant</h1>
              <p className="text-sm text-muted-foreground">Multilingual Education Support</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Controls */}
            <div className="flex items-center gap-1">
              {hasSpeechSynthesis && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleVoiceOutput}
                  className={`w-8 h-8 p-0 ${voiceEnabled ? 'text-primary' : 'text-muted-foreground'}`}
                  title={voiceEnabled ? 'Disable voice output' : 'Enable voice output'}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : 
                   voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              )}
            </div>
            
            <Globe className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.native}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground mb-3">Quick actions:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-auto p-3 flex flex-col items-center gap-2 text-xs bg-transparent"
                onClick={() => handleQuickAction(action.query)}
              >
                <action.icon className="w-4 h-4" />
                <span className="text-center leading-tight">{action.text}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            {message.sender === "bot" && (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            )}

            <div className={`max-w-[70%] ${message.sender === "user" ? "order-first" : ""}`}>
              <Card
                className={`p-3 ${
                  message.sender === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-card"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>

                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/20">
                    <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.sources.map((source, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {source.replace("doc:", "").replace(":", " - Page ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {message.confidence !== undefined && message.confidence < 0.7 && (
                  <div className="mt-2 pt-2 border-t border-border/20">
                    <p className="text-xs text-muted-foreground">
                      I'm not entirely sure about this answer. Would you like me to connect you with a human assistant?
                    </p>
                  </div>
                )}
              </Card>

              <p className="text-xs text-muted-foreground mt-1 px-1">
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {message.language && message.language !== "en" && (
                  <span className="ml-2">({languages.find((l) => l.code === message.language)?.native})</span>
                )}
              </p>
            </div>

            {message.sender === "user" && (
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <Card className="p-3 bg-card">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`${isListening ? 'Listening...' : `Type your message in ${languages.find((l) => l.code === selectedLanguage)?.native}...`}`}
            className={`flex-1 ${isListening ? 'border-primary animate-pulse' : ''}`}
            disabled={isLoading || isListening}
          />
          
          {/* Voice Input Button */}
          {hasRecognitionSupport && (
            <Button
              variant={isListening ? "default" : "outline"}
              size="icon"
              onClick={handleVoiceInput}
              disabled={isLoading}
              className={`${isListening ? 'bg-red-500 hover:bg-red-600' : ''}`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
          
          <Button 
            onClick={() => handleSendMessage()} 
            disabled={!inputText.trim() || isLoading || isListening} 
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground">Press Enter to send, Shift+Enter for new line</p>
            {hasRecognitionSupport && (
              <p className="text-xs text-muted-foreground">Click 🎤 for voice input</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <span className="text-xs text-primary animate-pulse">Speaking...</span>
            )}
            <Button variant="ghost" size="sm" className="text-xs">
              Request Human Help
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
