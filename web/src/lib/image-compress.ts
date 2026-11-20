const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

function replaceExtension(fileName: string, targetMime: string): string {
  const ext = targetMime === 'image/webp' ? 'webp' : targetMime === 'image/png' ? 'png' : 'jpg'
  if (/\.[^.]+$/.test(fileName)) {
    return fileName.replace(/\.[^.]+$/, `.${ext}`)
  }
  return `${fileName}.${ext}`
}

export async function compressImageFile(file: File): Promise<File> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Format foto harus JPG, PNG, atau WebP.')
  }

  if (file.size <= 450 * 1024) {
    return file
  }

  const bitmap = await createImageBitmap(file)
  const maxWidth = 1280
  const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    if (file.size > MAX_BYTES) {
      throw new Error('Ukuran foto melebihi batas maksimal 5 MB.')
    }
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const targetMime = file.type === 'image/png' ? 'image/webp' : file.type
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, targetMime, 0.8),
  )

  if (!blob) {
    if (file.size > MAX_BYTES) {
      throw new Error('Ukuran foto melebihi batas maksimal 5 MB.')
    }
    return file
  }

  const nextName =
    targetMime !== file.type ? replaceExtension(file.name, targetMime) : file.name

  const compressed = new File([blob], nextName, {
    type: targetMime,
    lastModified: Date.now(),
  })

  const chosen = compressed.size < file.size ? compressed : file
  if (chosen.size > MAX_BYTES) {
    throw new Error('Ukuran foto setelah kompresi masih melebihi 5 MB.')
  }

  return chosen
}
