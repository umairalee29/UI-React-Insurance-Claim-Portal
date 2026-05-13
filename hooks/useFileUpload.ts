'use client'

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface UploadedFile {
  file: File
  preview?: string
}

interface UseFileUploadReturn {
  files: UploadedFile[]
  addFiles: (incoming: UploadedFile[]) => void
  removeFile: (index: number) => void
  uploadAll: (claimId: string) => Promise<string[]>
  isUploading: boolean
  reset: () => void
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const addFiles = useCallback((incoming: UploadedFile[]) => {
    setFiles((prev) => [...prev, ...incoming])
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const next = [...prev]
      if (next[index]?.preview) {
        URL.revokeObjectURL(next[index].preview!)
      }
      next.splice(index, 1)
      return next
    })
  }, [])

  const uploadAll = useCallback(async (claimId: string): Promise<string[]> => {
    if (files.length === 0) return []
    setIsUploading(true)
    const docIds: string[] = []

    try {
      for (const item of files) {
        const formData = new FormData()
        formData.append('file', item.file)
        formData.append('claimId', claimId)

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        })

        const json = await res.json()
        if (!res.ok || !json.success) {
          toast.error(`Failed to upload ${item.file.name}`)
        } else {
          docIds.push(json.data._id)
        }
      }
    } finally {
      setIsUploading(false)
    }

    return docIds
  }, [files])

  const reset = useCallback(() => {
    files.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview) })
    setFiles([])
  }, [files])

  return { files, addFiles, removeFile, uploadAll, isUploading, reset }
}
