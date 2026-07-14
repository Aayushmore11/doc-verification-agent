/**
 * useFileUpload.js
 *
 * Custom hook that encapsulates ALL stateful logic for a file-upload dropzone.
 * The UploadBox component is a pure view — this hook owns everything else.
 *
 * State machine:
 *   idle  →  dragging  →  idle          (drag cancelled)
 *   idle  →  dragging  →  preview       (valid file dropped)
 *   idle  →  dragging  →  error         (invalid file dropped)
 *   idle  →  preview                    (file chosen via picker)
 *   idle  →  error                      (invalid file chosen via picker)
 *   preview / error  →  idle            (user clicks "clear")
 *
 * Props:
 *   accept     {string}   MIME type pattern, e.g. "image/*"          default: "image/*"
 *   maxSizeMB  {number}   Maximum allowed file size in megabytes      default: 10
 *   onFileSelect {fn}     Called with the File object on valid pick   optional
 *   onClear    {fn}       Called when the user removes the file       optional
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { formatFileSize } from '../utils/formatters'

/* ─── State machine constants ────────────────────────────────────────────── */
export const UPLOAD_STATE = Object.freeze({
  IDLE:     'idle',
  DRAGGING: 'dragging',
  PREVIEW:  'preview',
  ERROR:    'error',
})

/* ─── Accepted image MIME types ──────────────────────────────────────────── */
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
])

export function useFileUpload({
  accept    = 'image/*',
  maxSizeMB = 10,
  onFileSelect,
  onClear,
  allowedTypes = null,      // Optional array of allowed mime types or extensions
  customErrorMsg = null,    // Optional override for validation failure message
} = {}) {
  const [uploadState, setUploadState] = useState(UPLOAD_STATE.IDLE)
  const [file,        setFile]        = useState(null)
  const [previewUrl,  setPreviewUrl]  = useState(null)
  const [error,       setError]       = useState(null)

  /* Ref for the hidden <input type="file"> */
  const inputRef = useRef(null)

  /*
   * Drag-enter fires once per child element entered — we use a counter
   * instead of a boolean to avoid the drop zone flickering when the pointer
   * crosses child boundaries.
   */
  const dragDepth = useRef(0)

  /* ── Clean up object URL on unmount to prevent memory leaks ─────────── */
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  /* ── Validate a File object ──────────────────────────────────────────── */
  const validate = useCallback(
    (f) => {
      if (!f) return 'No file received.'

      /* Type check — must match allowedTypes if specified */
      if (allowedTypes) {
        const fileExt = f.name.split('.').pop().toLowerCase()
        const isMimeMatch = allowedTypes.includes(f.type)
        const isExtMatch = allowedTypes.some(t => {
          const cleanToken = t.toLowerCase().replace('.', '')
          return cleanToken === fileExt || cleanToken.includes(fileExt)
        })
        if (!isMimeMatch && !isExtMatch) {
          return customErrorMsg || `Unsupported file format.`
        }
      } else if (!IMAGE_TYPES.has(f.type) && !f.type.startsWith('image/')) {
        return `"${f.name}" is not an image. Accepted: JPG, PNG, WEBP, GIF.`
      }

      /* Size check */
      const limitBytes = maxSizeMB * 1024 * 1024
      if (f.size > limitBytes) {
        return `File is ${formatFileSize(f.size)} — exceeds the ${maxSizeMB} MB limit.`
      }

      return null // ← null means valid
    },
    [maxSizeMB, allowedTypes, customErrorMsg],
  )

  /* ── Process a File: validate → set state → create preview URL ───────── */
  const processFile = useCallback(
    (f) => {
      const errMsg = validate(f)

      if (errMsg) {
        /* Revoke any old preview */
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setFile(null)
        setError(errMsg)
        setUploadState(UPLOAD_STATE.ERROR)
        return
      }

      /* Valid file */
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      const url = URL.createObjectURL(f)
      setPreviewUrl(url)
      setFile(f)
      setError(null)
      setUploadState(UPLOAD_STATE.PREVIEW)
      onFileSelect?.(f)
    },
    [validate, previewUrl, onFileSelect],
  )

  /* ── Clear / reset ───────────────────────────────────────────────────── */
  const clear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFile(null)
    setError(null)
    setUploadState(UPLOAD_STATE.IDLE)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }, [previewUrl, onClear])

  /* ── Open the native file picker ─────────────────────────────────────── */
  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  /* ── <input onChange> ────────────────────────────────────────────────── */
  const handleInputChange = useCallback(
    (e) => {
      const f = e.target.files?.[0]
      if (f) processFile(f)
    },
    [processFile],
  )

  /* ── Drag event handlers ──────────────────────────────────────────────── */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current += 1
    if (dragDepth.current === 1) {
      setUploadState((s) =>
        s !== UPLOAD_STATE.PREVIEW ? UPLOAD_STATE.DRAGGING : s,
      )
    }
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current -= 1
    if (dragDepth.current === 0) {
      setUploadState((s) =>
        s === UPLOAD_STATE.DRAGGING ? UPLOAD_STATE.IDLE : s,
      )
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    /* Required to make the element a valid drop target */
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      dragDepth.current = 0

      const f = e.dataTransfer.files?.[0]
      if (f) {
        processFile(f)
      } else {
        setUploadState(UPLOAD_STATE.IDLE)
      }
    },
    [processFile],
  )

  /* ── Keyboard: Enter / Space opens picker when dropzone is focused ───── */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openPicker()
      }
    },
    [openPicker],
  )

  /* ── Derived booleans for the view ───────────────────────────────────── */
  const isDragging  = uploadState === UPLOAD_STATE.DRAGGING
  const hasPreview  = uploadState === UPLOAD_STATE.PREVIEW
  const hasError    = uploadState === UPLOAD_STATE.ERROR
  const isIdle      = uploadState === UPLOAD_STATE.IDLE

  return {
    /* State */
    uploadState,
    file,
    previewUrl,
    error,

    /* Derived flags */
    isDragging,
    hasPreview,
    hasError,
    isIdle,

    /* Refs */
    inputRef,
    accept,

    /* Actions */
    clear,
    openPicker,
    handleInputChange,

    /* Native drag handlers — spread onto the drop zone div */
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver:  handleDragOver,
      onDrop:      handleDrop,
    },

    /* Keyboard handler */
    handleKeyDown,
  }
}
