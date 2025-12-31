/**
 * File validation utilities for document uploads
 */

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
} as const

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

// Maximum files for bulk upload
export const MAX_BULK_UPLOAD_COUNT = 10

export interface FileValidationError {
  file: File
  error: string
}

export interface FileValidationResult {
  valid: File[]
  invalid: FileValidationError[]
}

/**
 * Validate a single file
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`
    const isExtensionAllowed = Object.values(ALLOWED_FILE_TYPES)
      .flat()
      .includes(extension)

    if (!isExtensionAllowed) {
      return {
        valid: false,
        error: `File type not supported. Allowed types: PDF, DOCX, DOC, TXT, MD`
      }
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)
    return {
      valid: false,
      error: `File size exceeds ${sizeMB}MB limit`
    }
  }

  // Check file is not empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty'
    }
  }

  return { valid: true }
}

/**
 * Validate multiple files for bulk upload
 */
export function validateFiles(files: File[]): FileValidationResult {
  const valid: File[] = []
  const invalid: FileValidationError[] = []

  // Check bulk upload limit
  if (files.length > MAX_BULK_UPLOAD_COUNT) {
    return {
      valid: [],
      invalid: files.map(file => ({
        file,
        error: `Bulk upload limit is ${MAX_BULK_UPLOAD_COUNT} files. Please upload in batches.`
      }))
    }
  }

  // Validate each file
  files.forEach(file => {
    const result = validateFile(file)
    if (result.valid) {
      valid.push(file)
    } else {
      invalid.push({
        file,
        error: result.error || 'Unknown error'
      })
    }
  })

  return { valid, invalid }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase()
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  if (Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
    return true
  }

  const extension = `.${getFileExtension(file.name)}`
  return Object.values(ALLOWED_FILE_TYPES).flat().includes(extension)
}
