"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { MessageBubble } from "@/components/message-bubble";
import { LanguageSelector } from "@/components/language-selector";
import { VoiceInput } from "@/components/voice-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Loader2, Trash2, GraduationCap } from "lucide-react";
import { loadLanguagePreference } from "@/lib/chat-utils";

export function ChatInterface() {
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("en");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage,
  } = useChat();

  // Load language preference on mount
  useEffect(() => {
    setLanguage(loadLanguagePreference());
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    await sendMessage(input, language);
    setInput("");
  };

  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      clearMessages();
    }
  };

  const handleVoiceTranscript = async (text: string) => {
    // Set the transcribed text in the input and auto-send
    setInput(text);
    await sendMessage(text, language);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-full p-2">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Vidya Vaani</h1>
              <p className="text-sm text-muted-foreground">
                Multilingual Education Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector value={language} onChange={setLanguage} />
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                aria-label="Clear chat history"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="bg-primary/10 rounded-full p-6 mb-4">
                <GraduationCap className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome to Vidya Vaani!
              </h2>
              <p className="text-muted-foreground max-w-md mb-8">
                Ask me anything about admissions, courses, fees, or college
                policies. I can help you in English, Hindi, Marathi, or Marwari.
              </p>

              {/* Suggested Questions */}
              <div className="w-full max-w-2xl">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Try asking:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {language === "en" && (
                    <>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("What is the admission process?");
                          sendMessage(
                            "What is the admission process?",
                            language,
                          );
                        }}
                      >
                        <span className="text-sm">
                          What is the admission process?
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("How much are the fees?");
                          sendMessage("How much are the fees?", language);
                        }}
                      >
                        <span className="text-sm">How much are the fees?</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("Tell me about scholarships");
                          sendMessage("Tell me about scholarships", language);
                        }}
                      >
                        <span className="text-sm">
                          Tell me about scholarships
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("What courses do you offer?");
                          sendMessage("What courses do you offer?", language);
                        }}
                      >
                        <span className="text-sm">
                          What courses do you offer?
                        </span>
                      </Button>
                    </>
                  )}
                  {language === "hi" && (
                    <>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("प्रवेश प्रक्रिया क्या है?");
                          sendMessage("प्रवेश प्रक्रिया क्या है?", language);
                        }}
                      >
                        <span className="text-sm">
                          प्रवेश प्रक्रिया क्या है?
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("फीस कितनी है?");
                          sendMessage("फीस कितनी है?", language);
                        }}
                      >
                        <span className="text-sm">फीस कितनी है?</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("छात्रवृत्ति के बारे में बताएं");
                          sendMessage(
                            "छात्रवृत्ति के बारे में बताएं",
                            language,
                          );
                        }}
                      >
                        <span className="text-sm">
                          छात्रवृत्ति के बारे में बताएं
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("कौन से कोर्स उपलब्ध हैं?");
                          sendMessage("कौन से कोर्स उपलब्ध हैं?", language);
                        }}
                      >
                        <span className="text-sm">
                          कौन से कोर्स उपलब्ध हैं?
                        </span>
                      </Button>
                    </>
                  )}
                  {language === "mr" && (
                    <>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("प्रवेश प्रक्रिया काय आहे?");
                          sendMessage("प्रवेश प्रक्रिया काय आहे?", language);
                        }}
                      >
                        <span className="text-sm">
                          प्रवेश प्रक्रिया काय आहे?
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("फी किती आहे?");
                          sendMessage("फी किती आहे?", language);
                        }}
                      >
                        <span className="text-sm">फी किती आहे?</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("शिष्यवृत्तीबद्दल सांगा");
                          sendMessage("शिष्यवृत्तीबद्दल सांगा", language);
                        }}
                      >
                        <span className="text-sm">शिष्यवृत्तीबद्दल सांगा</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("कोणते अभ्यासक्रम उपलब्ध आहेत?");
                          sendMessage(
                            "कोणते अभ्यासक्रम उपलब्ध आहेत?",
                            language,
                          );
                        }}
                      >
                        <span className="text-sm">
                          कोणते अभ्यासक्रम उपलब्ध आहेत?
                        </span>
                      </Button>
                    </>
                  )}
                  {language === "mwr" && (
                    <>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("दाखिला प्रक्रिया क्या है?");
                          sendMessage("दाखिला प्रक्रिया क्या है?", language);
                        }}
                      >
                        <span className="text-sm">
                          दाखिला प्रक्रिया क्या है?
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("फीस कितनी है?");
                          sendMessage("फीस कितनी है?", language);
                        }}
                      >
                        <span className="text-sm">फीस कितनी है?</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("छात्रवृत्ति के बारे में बताओ");
                          sendMessage("छात्रवृत्ति के बारे में बताओ", language);
                        }}
                      >
                        <span className="text-sm">
                          छात्रवृत्ति के बारे में बताओ
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="text-left justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setInput("कौनसे कोर्स मिलेंगे?");
                          sendMessage("कौनसे कोर्स मिलेंगे?", language);
                        }}
                      >
                        <span className="text-sm">कौनसे कोर्स मिलेंगे?</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <Card className="p-4 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </Card>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={retryLastMessage}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder={`Type your message in ${language === "en" ? "English" : language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "Marwari"}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1"
              autoFocus
            />
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              disabled={isLoading}
              language={language}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Powered by AI · Your conversations are stored locally
          </p>
        </div>
      </footer>
    </div>
  );
}
