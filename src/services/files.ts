import { http, FRAPPE_BASE } from './http'

export interface UploadedFile {
  // Frappe File doctype primary key — needed to delete the file later.
  id: string
  url: string
  name: string
}

export interface MyAsset {
  id: string
  url: string
  name: string
  fileType: string
  fileSize: number
  isPrivate: boolean
  createdAt: string
}

interface FrappeFileRow {
  name: string
  file_name?: string
  file_url?: string
  file_type?: string
  file_size?: number
  is_private?: number
  is_folder?: number
  creation?: string
  modified?: string
}

export interface FilesPage {
  files: MyAsset[]
  hasMore: boolean
}

interface UploadFileResponse {
  message?: { file_url?: string; file_name?: string; name?: string }
  exc?: string
  _server_messages?: string
}

export async function uploadFile(
  file: File,
  opts?: { isPrivate?: boolean; folder?: string },
): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('is_private', opts?.isPrivate ? '1' : '0')
  form.append('folder', opts?.folder ?? 'Home')

  const res = await http(`${FRAPPE_BASE}/api/method/upload_file`, {
    method: 'POST',
    body: form,
  })
  const data = (await res.json()) as UploadFileResponse
  if (!res.ok || !data.message?.file_url || !data.message?.name) {
    throw new Error(data.exc ?? data._server_messages ?? 'Failed to upload file.')
  }
  return {
    id: data.message.name,
    url: data.message.file_url,
    name: data.message.file_name ?? file.name,
  }
}

interface DeleteResponse {
  message?: unknown
  exc?: string
  _server_messages?: string
}

interface GetFilesInFolderResponse {
  message?: { files?: FrappeFileRow[]; has_more?: boolean }
  exc?: string
}

function toMyAsset(r: FrappeFileRow): MyAsset {
  return {
    id: r.name,
    url: r.file_url ?? '',
    name: r.file_name || r.name,
    fileType: r.file_type || '',
    fileSize: r.file_size || 0,
    isPrivate: r.is_private === 1,
    createdAt: r.creation || r.modified || '',
  }
}

export async function getFilesInFolder(
  folder = 'Home',
  start = 0,
  pageLength = 24,
): Promise<FilesPage> {
  const params = new URLSearchParams({
    folder,
    start: String(start),
    page_length: String(pageLength),
  })
  const res = await http(
    `${FRAPPE_BASE}/api/method/frappe.core.api.file.get_files_in_folder?${params}`,
  )
  const data = (await res.json()) as GetFilesInFolderResponse
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch files.')
  }
  const files = (data.message?.files ?? [])
    .filter((r) => !!r.file_url && r.is_folder !== 1)
    .map(toMyAsset)
  return { files, hasMore: !!data.message?.has_more }
}

export async function deleteFile(id: string): Promise<void> {
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ doctype: 'File', name: id }),
  })
  const data = (await res.json()) as DeleteResponse
  if (!res.ok) {
    throw new Error(data.exc ?? data._server_messages ?? 'Failed to delete file.')
  }
}
