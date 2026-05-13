'use client'

import { useCallback, useState } from 'react'

interface UploadedFile {
  file: File
  preview?: string
}

interface FileUploadZoneProps {
  files: UploadedFile[]
  onAdd: (files: UploadedFile[]) => void
  onRemove: (index: number) => void
  maxFiles?: number
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUploadZone({ files, onAdd, onRemove, maxFiles = 10 }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const processFiles = useCallback(
    (fileList: FileList) => {
      const newErrors: string[] = []
      const valid: UploadedFile[] = []

      Array.from(fileList).forEach((file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
          newErrors.push(`${file.name}: Invalid type. Only PDF, JPG, PNG allowed.`)
          return
        }
        if (file.size > MAX_SIZE) {
          newErrors.push(`${file.name}: Too large. Max 10MB.`)
          return
        }
        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        valid.push({ file, preview })
      })

      setErrors(newErrors)
      if (valid.length > 0) onAdd(valid)
    },
    [onAdd]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      processFiles(e.dataTransfer.files)
    },
    [processFiles]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          'border-2 border-dashed rounded-xl p-8 text-center transition-all',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 hover:border-gray-300 bg-gray-50',
        ].join(' ')}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Drop files here or{' '}
              <label className="text-primary cursor-pointer hover:underline">
                browse
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleChange}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — max 10MB each</p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-danger">{err}</p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((item, idx) => (
            <li
              key={idx}
              className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg"
            >
              {item.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 bg-red-50 rounded flex items-center justify-center text-red-500 text-xs font-bold">
                  PDF
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(item.file.size)}</p>
              </div>
              <button
                onClick={() => onRemove(idx)}
                className="text-gray-400 hover:text-danger transition-colors"
                aria-label="Remove file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
