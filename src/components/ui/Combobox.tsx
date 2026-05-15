import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X, Loader2 } from 'lucide-react'

export type ComboboxOption = string | { value: string; label: string }

function valueOf(o: ComboboxOption): string {
  return typeof o === 'string' ? o : o.value
}
function labelOf(o: ComboboxOption): string {
  return typeof o === 'string' ? o : o.label
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string[]
  onChange: (value: string[]) => void
  max?: number
  placeholder?: string
  loading?: boolean
  disabled?: boolean
  error?: boolean
  clearable?: boolean
  size?: 'sm' | 'md'
  onOpen?: () => void
  onQueryChange?: (query: string) => void
}

export function Combobox({
  options,
  value,
  onChange,
  max = Infinity,
  placeholder = 'Select...',
  loading = false,
  disabled = false,
  error = false,
  clearable = true,
  size = 'md',
  onOpen,
  onQueryChange,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const onOpenRef = useRef(onOpen)
  const onQueryChangeRef = useRef(onQueryChange)
  useEffect(() => { onOpenRef.current = onOpen })
  useEffect(() => { onQueryChangeRef.current = onQueryChange })

  useEffect(() => {
    if (open) {
      onOpenRef.current?.()
      setDropdownRect(containerRef.current?.getBoundingClientRect() ?? null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function reposition() {
      setDropdownRect(containerRef.current?.getBoundingClientRect() ?? null)
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      const inContainer = containerRef.current?.contains(target) ?? false
      const inDropdown = dropdownRef.current?.contains(target) ?? false
      if (!inContainer && !inDropdown) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  const filtered = options.filter((o) => {
    const lbl = labelOf(o)
    return lbl.toLowerCase().includes(query.toLowerCase()) && !value.includes(valueOf(o))
  })

  function labelForValue(v: string): string {
    const found = options.find((o) => valueOf(o) === v)
    return found ? labelOf(found) : v
  }

  function pickOption(opt: ComboboxOption) {
    const v = valueOf(opt)
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v))
      return
    }
    if (max === 1) {
      onChange([v])
      setOpen(false)
      setQuery('')
      return
    }
    if (value.length >= max) return
    onChange([...value, v])
    setQuery('')
  }

  function removeChip(opt: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(value.filter((v) => v !== opt))
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation()
    onChange([])
    setQuery('')
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault()
        pickOption(filtered[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    } else if (e.key === 'Backspace' && query === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const showClear = clearable && value.length > 0 && !disabled
  const sizeClass =
    size === 'sm'
      ? 'min-h-[32px] px-2 py-1 text-xs'
      : 'min-h-[40px] px-3 py-2 text-sm'

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button[data-cb-stop]')) return
          if (!disabled) inputRef.current?.focus()
        }}
        className={[
          'flex items-center gap-1 w-full bg-white border rounded-lg cursor-text transition-shadow',
          max === 1 ? 'flex-nowrap overflow-hidden' : 'flex-wrap',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent',
          error ? 'border-red-400 focus-within:ring-red-400' : 'border-gray-200',
          disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : '',
          sizeClass,
        ].join(' ')}
      >
        {value.map((v) => {
          const lbl = labelForValue(v)
          return (
            <span
              key={v}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium min-w-0 max-w-full"
            >
              <span className="truncate">{lbl}</span>
              {!disabled && (
                <button
                  type="button"
                  data-cb-stop
                  onClick={(e) => removeChip(v, e)}
                  className="hover:bg-blue-100 rounded p-0.5 flex-shrink-0"
                  aria-label={`Remove ${lbl}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )
        })}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            onQueryChangeRef.current?.(e.target.value)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={value.length === 0 ? (loading ? 'Loading…' : placeholder) : ''}
          className={`flex-1 bg-transparent outline-none border-none p-0 placeholder:text-gray-400 ${value.length === 0 ? 'min-w-[60px]' : 'min-w-0 w-4'}`}
        />
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          {showClear && (
            <button
              type="button"
              data-cb-stop
              onClick={clearAll}
              className="text-gray-400 hover:text-gray-600 rounded p-0.5"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            data-cb-stop
            onClick={(e) => {
              e.stopPropagation()
              if (disabled) return
              setOpen((o) => !o)
              inputRef.current?.focus()
            }}
            className="text-gray-400 hover:text-gray-600 rounded p-0.5"
            aria-label="Toggle dropdown"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && !disabled && dropdownRect && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownRect.bottom + 4,
            left: dropdownRect.left,
            width: dropdownRect.width,
            zIndex: 9999,
          }}
          className="max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">
              {loading
                ? 'Loading…'
                : query
                  ? 'No matches'
                  : value.length === options.length && options.length > 0
                    ? 'All selected'
                    : 'No options'}
            </div>
          ) : (
            filtered.map((opt, i) => {
              const v = valueOf(opt)
              return (
                <button
                  key={v}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={(e) => {
                    e.stopPropagation()
                    pickOption(opt)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                    i === highlight ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{labelOf(opt)}</span>
                  {value.includes(v) && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              )
            })
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
