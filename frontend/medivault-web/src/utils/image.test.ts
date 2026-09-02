import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cropToSquare } from './image'

// jsdom ships no real canvas or image decoding, so stub the browser APIs
// cropToSquare relies on and assert on the geometry it asks the canvas to draw.
const drawImage = vi.fn()
const toBlob = vi.fn((cb: BlobCallback) => cb(new Blob(['jpeg-bytes'], { type: 'image/jpeg' })))

beforeEach(() => {
  drawImage.mockClear()
  toBlob.mockClear()
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1200, height: 800, close: vi.fn() })))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob as unknown as HTMLCanvasElement['toBlob'])
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('cropToSquare', () => {
  it('centre-crops a landscape image to a square and exports a JPEG File', async () => {
    const input = new File(['original'], 'holiday.png', { type: 'image/png' })

    const out = await cropToSquare(input, 512)

    expect(out).toBeInstanceOf(File)
    expect(out.name).toBe('holiday.jpg')
    expect(out.type).toBe('image/jpeg')

    // 1200x800 source: square side 800, centred => sx = (1200-800)/2 = 200, sy = 0,
    // drawn into the full 512x512 canvas.
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      200, 0, 800, 800,
      0, 0, 512, 512,
    )
  })

  it('falls back to the original file when the 2D context is unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const input = new File(['original'], 'avatar.webp', { type: 'image/webp' })

    const out = await cropToSquare(input)

    expect(out).toBe(input)
  })
})
