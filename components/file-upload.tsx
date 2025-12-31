"use client"

import { useState, useRef, ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import {
  validateFiles,
  formatFileSize,
  getFileExtension,
  MAX_FILE_SIZE,
  MAX_BULK_UPLOAD_COUNT,
  type FileValidationError
} from '@/lib/file-validation'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onUploadComplete?: () => void
  maxFiles?: number
}

interface UploadingFile {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export function FileUpload({ onUploadComplete, maxFiles = MAX_BULK_UPLOAD_COUNT }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [validationErrors, setValidationErrors] = useState<FileValidationError[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length === 0) return

    // Validate files
    const { valid, invalid } = validateFiles(files)

    setSelectedFiles(valid)
    setValidationErrors(invalid)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)

    // Initialize uploading files state
    const initialUploadingFiles: UploadingFile[] = selectedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }))

    setUploadingFiles(initialUploadingFiles)

    // Upload files sequentially (could be parallelized for better performance)
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]

      try {
        // Update status to uploading
        setUploadingFiles(prev => prev.map((uf, idx) =>
          idx === i ? { ...uf, status: 'uploading' } : uf
        ))

        // Create form data
        const formData = new FormData()
        formData.append('file', file)

        // Simulate progress (in production, use XMLHttpRequest or a library that supports progress)
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => prev.map((uf, idx) =>
            idx === i && uf.progress < 90
              ? { ...uf, progress: uf.progress + 10 }
              : uf
          ))
        }, 100)

        // Upload to backend
        const response = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData
        })

        clearInterval(progressInterval)

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Upload failed' }))
          throw new Error(error.error || 'Upload failed')
        }

        // Mark as success
        setUploadingFiles(prev => prev.map((uf, idx) =>
          idx === i ? { ...uf, progress: 100, status: 'success' } : uf
        ))

      } catch (error) {
        // Mark as error
        setUploadingFiles(prev => prev.map((uf, idx) =>
          idx === i ? {
            ...uf,
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed'
          } : uf
        ))
      }
    }

    setIsUploading(false)

    // Clear selected files after upload
    setTimeout(() => {
      setSelectedFiles([])
      setUploadingFiles([])
      setValidationErrors([])
      onUploadComplete?.()
    }, 2000)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files)

    if (files.length === 0) return

    // Validate files
    const { valid, invalid } = validateFiles(files)

    setSelectedFiles(valid)
    setValidationErrors(invalid)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <Card
        className={cn(
          "border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          "hover:border-primary hover:bg-accent/50"
        )}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium">Click to upload or drag and drop</p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF, DOCX, DOC, TXT, MD (max {formatFileSize(MAX_FILE_SIZE)})
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Up to {maxFiles} files at once
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
        />
      </Card>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Some files could not be added:</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {validationErrors.map((error, idx) => (
                <li key={idx}>
                  {error.file.name}: {error.error}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Selected files */}
      {selectedFiles.length > 0 && uploadingFiles.length === 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Selected Files ({selectedFiles.length})</h3>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload All
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {selectedFiles.map((file, idx) => (
              <Card key={idx} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} · {getFileExtension(file.name).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFile(idx)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Uploading files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Uploading ({uploadingFiles.length})</h3>

          <div className="space-y-2">
            {uploadingFiles.map((uploadingFile, idx) => (
              <Card key={idx} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{uploadingFile.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(uploadingFile.file.size)}
                        </p>
                      </div>
                    </div>
                    {uploadingFile.status === 'success' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {uploadingFile.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    {uploadingFile.status === 'uploading' && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </div>

                  {uploadingFile.status !== 'pending' && (
                    <Progress value={uploadingFile.progress} className="h-2" />
                  )}

                  {uploadingFile.error && (
                    <p className="text-sm text-destructive">{uploadingFile.error}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
