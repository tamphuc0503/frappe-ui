import { useRef, useState } from 'react'
import { UploadCloud, FileText, Loader2, X, ExternalLink, ImageOff } from 'lucide-react'
import { uploadFile, deleteFile, type UploadedFile } from '../../services/files'

interface FileUploaderProps {
  value: UploadedFile | null
  onChange: (v: UploadedFile | null) => void
  accept?: string
  label?: string
  disabled?: boolean
  isPrivate?: boolean
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']

function fileExtension(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

function isImageName(name: string): boolean {
  return IMAGE_EXTENSIONS.includes(fileExtension(name))
}

// Validate a File against the accept attribute. Accept can mix MIME globs
// ("image/*", "image/png") and file extensions (".png"). Empty / "*" passes.
function matchesAccept(file: File, accept?: string): boolean {
  if (!accept || accept === '*' || accept === '*/*') return true
  const tokens = accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  if (tokens.length === 0) return true
  const ext = '.' + fileExtension(file.name)
  const type = file.type.toLowerCase()
  return tokens.some((t) => {
    if (t.startsWith('.')) return ext === t
    if (t.endsWith('/*')) return type.startsWith(t.slice(0, -1))
    return type === t
  })
}

export function FileUploader({
  value,
  onChange,
  accept,
  label = 'Drop a file here or click to browse',
  disabled = false,
  isPrivate = false,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewBroken, setPreviewBroken] = useState(false)

  async function handleRemove() {
    if (!value || deleting) return
    setError(null)
    setDeleting(true)
    try {
      await deleteFile(value.id)
      onChange(null)
      setPreviewBroken(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleFile(file: File) {
    setError(null)
    if (!matchesAccept(file, accept)) {
      setError(`Unsupported file type. Allowed: ${accept}`)
      return
    }
    setUploading(true)
    try {
      const uploaded = await uploadFile(file, { isPrivate })
      setPreviewBroken(false)
      onChange(uploaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) void handleFile(f)
  }

  function onDragEnter(e: React.DragEvent) {
    if (disabled || uploading) return
    e.preventDefault()
    dragCounter.current++
    setDragOver(true)
  }

  function onDragLeave(e: React.DragEvent) {
    if (disabled || uploading) return
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setDragOver(false)
    }
  }

  function onDragOver(e: React.DragEvent) {
    if (disabled || uploading) return
    e.preventDefault()
  }

  function onDrop(e: React.DragEvent) {
    if (disabled || uploading) return
    e.preventDefault()
    dragCounter.current = 0
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void handleFile(f)
  }

  // ─── Preview state ───────────────────────────────────────────────────────────
  if (value) {
    const isImage = isImageName(value.name) && !previewBroken
    return (
      <div className="relative w-full rounded-lg border border-gray-200 bg-gray-50/40 px-4 py-6 flex flex-col items-center gap-3">
        {!disabled && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={deleting}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Remove file"
            title="Remove"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </button>
        )}

        <div className="w-32 h-32 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
          {isImage ? (
            <img
              src={value.url}
              alt={value.name}
              className="w-full h-full object-contain"
              onError={() => setPreviewBroken(true)}
            />
          ) : isImageName(value.name) ? (
            <ImageOff className="w-10 h-10 text-gray-300" />
          ) : (
            <FileText className="w-10 h-10 text-blue-500" />
          )}
        </div>

        <div className="w-full min-w-0 flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-gray-900 truncate max-w-full" title={value.name}>
            {value.name}
          </p>
          <a
            href={value.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 max-w-full"
            title={value.url}
          >
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{value.url}</span>
          </a>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      </div>
    )
  }

  // ─── Drop zone ───────────────────────────────────────────────────────────────
  return (
    <div>
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={[
          'w-full rounded-lg border-2 border-dashed px-4 py-6 flex flex-col items-center justify-center gap-2 transition-colors',
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : error
              ? 'border-red-300 bg-red-50/40'
              : 'border-gray-200 bg-gray-50/40 hover:border-blue-300 hover:bg-blue-50/40',
          disabled || uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        {uploading ? (
          <>
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-600">Uploading…</span>
          </>
        ) : (
          <>
            <UploadCloud className={`w-6 h-6 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-600 text-center">{label}</span>
            {accept && (
              <span className="text-xs text-gray-400">{accept}</span>
            )}
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={onPick}
      />
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}
