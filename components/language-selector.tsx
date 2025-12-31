"use client"

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getLanguageFlag, getLanguageName, saveLanguagePreference, loadLanguagePreference } from '@/lib/chat-utils'
import { Globe } from 'lucide-react'

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'mr', name: 'Marathi' },
    { code: 'mwr', name: 'Marwari' }
]

interface LanguageSelectorProps {
    value: string
    onChange: (language: string) => void
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleChange = (newLanguage: string) => {
        onChange(newLanguage)
        saveLanguagePreference(newLanguage)
    }

    if (!mounted) return null

    return (
        <Select value={value} onValueChange={handleChange}>
            <SelectTrigger className="w-[180px]" aria-label="Select language">
                <Globe className="w-4 h-4 mr-2" />
                <SelectValue>
                    {getLanguageFlag(value)} {getLanguageName(value)}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-2">
                            <span>{getLanguageFlag(lang.code)}</span>
                            <span>{lang.name}</span>
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
