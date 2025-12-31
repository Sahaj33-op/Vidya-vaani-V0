"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatTimestamp, type Message } from '@/lib/chat-utils'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
    message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const [copied, setCopied] = useState(false)
    const isUser = message.role === 'user'

    const copyToClipboard = () => {
        navigator.clipboard.writeText(message.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className={cn(
            "flex w-full mb-4 gap-3",
            isUser ? "justify-end" : "justify-start"
        )}>
            <div className={cn(
                "flex flex-col max-w-[80%] md:max-w-[70%]",
                isUser && "items-end"
            )}>
                <Card className={cn(
                    "p-4 relative group",
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                )}>
                    <div className="pr-8">
                        <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                        </p>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                            isUser ? "text-primary-foreground hover:bg-primary-foreground/20" : ""
                        )}
                        onClick={copyToClipboard}
                        aria-label="Copy message"
                    >
                        {copied ? (
                            <Check className="h-3 w-3" />
                        ) : (
                            <Copy className="h-3 w-3" />
                        )}
                    </Button>
                </Card>

                <span className="text-xs text-muted-foreground mt-1 px-1">
                    {formatTimestamp(message.timestamp, true)}
                </span>
            </div>
        </div>
    )
}
