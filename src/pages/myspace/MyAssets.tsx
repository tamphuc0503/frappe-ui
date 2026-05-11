import { useEffect, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, Eye, FileText, RefreshCw, X, ExternalLink, Download, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { SkPageHeader, SkAssetGrid } from '../../components/ui/Skeleton'
import { getFilesInFolder, type MyAsset } from '../../services/files'

const PAGE_SIZE = 24

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

function isImageAsset(a: MyAsset): boolean {
  const t = a.fileType.toLowerCase()
  if (t && IMAGE_EXTS.includes(t)) return true
  return IMAGE_EXTS.includes(extOf(a.name))
}

function formatBytes(n: number): string {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

interface AssetTileProps {
  asset: MyAsset
  onOpen: () => void
}

function AssetTile({ asset, onOpen }: AssetTileProps) {
  const [broken, setBroken] = useState(false)
  const isImage = isImageAsset(asset)
  const showImage = isImage && !broken

  return (
    <button
      type="button"
      onClick={onOpen}
      className="card overflow-hidden text-left hover:shadow-md hover:border-blue-200 transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {showImage ? (
          <img
            src={asset.url}
            alt={asset.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <FileText className="w-12 h-12 text-gray-300" />
        )}
        <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-700">
          {isImage ? <Camera className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </div>
      </div>
      <div className="px-3 py-2.5 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-900 truncate" title={asset.name}>{asset.name}</p>
        <p className="text-xs text-gray-400 truncate">
          {asset.fileType ? asset.fileType.toUpperCase() : 'FILE'}
          {asset.fileSize ? ` · ${formatBytes(asset.fileSize)}` : ''}
        </p>
      </div>
    </button>
  )
}

interface PreviewModalProps {
  asset: MyAsset
  onClose: () => void
}

function PreviewModal({ asset, onClose }: PreviewModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isImage = isImageAsset(asset)

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 backdrop-enter"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden pointer-events-auto dialog-enter"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 truncate" title={asset.name}>{asset.name}</h2>
              <p className="text-xs text-gray-400 truncate">
                {asset.fileType ? asset.fileType.toUpperCase() : 'FILE'}
                {asset.fileSize ? ` · ${formatBytes(asset.fileSize)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <a
                href={asset.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Open in new tab"
                aria-label="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href={asset.url}
                download={asset.name}
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download"
                aria-label="Download"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
            {isImage ? (
              <div className="w-full min-h-[300px] flex items-center justify-center p-4">
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-md shadow-sm"
                />
              </div>
            ) : (
              <iframe
                src={asset.url}
                title={asset.name}
                className="w-full h-[70vh] bg-white"
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export function MyAssets() {
  const pageLoading = usePageLoad()
  const [assets, setAssets] = useState<MyAsset[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [paging, setPaging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<MyAsset | null>(null)

  async function load(nextPage: number, mode: 'initial' | 'paging') {
    if (mode === 'paging') setPaging(true)
    setError(null)
    try {
      const data = await getFilesInFolder('Home', nextPage * PAGE_SIZE, PAGE_SIZE)
      setAssets(data.files)
      setHasMore(data.hasMore)
      setPage(nextPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files.')
    } finally {
      setLoading(false)
      setPaging(false)
    }
  }

  useFetchOnce(() => { void load(0, 'initial') })

  if (pageLoading || loading) {
    return (
      <div className="h-full flex flex-col min-h-0">
        <SkPageHeader />
        <div className="flex-1 overflow-y-auto min-h-0">
          <SkAssetGrid count={12} />
        </div>
      </div>
    )
  }

  const rangeStart = assets.length === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = page * PAGE_SIZE + assets.length

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="My Assets"
        subtitle={
          assets.length === 0
            ? 'No files in this folder'
            : `Showing ${rangeStart}–${rangeEnd}${hasMore ? '+' : ''} · Page ${page + 1}`
        }
        action={
          <button
            type="button"
            onClick={() => void load(page, 'paging')}
            disabled={paging}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh"
            aria-label="Refresh files"
          >
            <RefreshCw className={`w-4 h-4 ${paging ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto min-h-0">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {assets.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 text-sm">
            <p>No files to show.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {assets.map((a) => (
                <AssetTile key={a.id} asset={a} onOpen={() => setActive(a)} />
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 px-1">
              <p className="text-xs text-gray-500">
                Page <span className="font-semibold text-gray-700">{page + 1}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void load(page - 1, 'paging')}
                  disabled={paging || page === 0}
                  className="btn-secondary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => void load(page + 1, 'paging')}
                  disabled={paging || !hasMore}
                  className="btn-secondary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paging ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {active && <PreviewModal asset={active} onClose={() => setActive(null)} />}
    </div>
  )
}
