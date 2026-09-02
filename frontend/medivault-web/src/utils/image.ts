// Downscale and centre-crop an image file to a square JPEG before it is uploaded
// as a profile photo. Phone photos and webcam frames are often several thousand
// pixels wide and rarely square; normalising them here keeps stored avatars at a
// predictable size and aspect ratio, and shrinks the upload. Runs entirely in
// the browser.

const DEFAULT_SIZE = 512
const JPEG_QUALITY = 0.9

export async function cropToSquare(file: File, size = DEFAULT_SIZE): Promise<File> {
  const image = await loadImage(file)
  const source = Math.min(image.width, image.height)
  const sx = (image.width - source) / 2
  const sy = (image.height - source) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(image, sx, sy, source, source, 0, 0, size, size)
  if ('close' in image) image.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) return file

  const name = file.name.replace(/\.[^./\\]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode the selected image.'))
    img.src = URL.createObjectURL(file)
  })
}
