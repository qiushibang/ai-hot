const { createDeflate } = require('node:zlib')
const { resolve } = require('node:path')
const { writeFileSync } = require('node:fs')

// --- CRC32 for PNG chunks ---
const crcTable = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}

const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const pngChunk = (type, data) => {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcVal = Buffer.alloc(4)
  crcVal.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([len, typeBytes, data, crcVal])
}

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

// --- color helpers ---
const BG = [15, 15, 35, 255]      // #0f0f23 deep navy
const GOLD = [201, 169, 110, 255] // #c9a96e
const GOLD_DIM = [160, 130, 80, 200]

const mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t))

const setPixel = (pixels, x, y, w, color) => {
  if (x < 0 || y < 0 || x >= w || y >= w) return
  const idx = (y * w + x) * 4
  pixels[idx] = color[0]
  pixels[idx + 1] = color[1]
  pixels[idx + 2] = color[2]
  pixels[idx + 3] = color[3]
}

// --- draw a filled circle ---
const fillCircle = (pixels, cx, cy, r, w, color) => {
  for (let y = Math.max(0, Math.ceil(cy - r)); y < Math.min(w, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.ceil(cx - r)); x < Math.min(w, Math.ceil(cx + r)); x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < r) {
        // soft AA edge
        const alpha = dist > r - 1 ? r - dist : 1
        const blended = mix(BG, color, alpha * (color[3] / 255))
        setPixel(pixels, x, y, w, [blended[0], blended[1], blended[2], 255])
      }
    }
  }
}

// --- draw a triangle (upward-pointing, for "trending") ---
const fillTriangle = (pixels, cx, cy, half, w, color) => {
  for (let y = Math.max(0, Math.ceil(cy - half)); y < Math.min(w, Math.ceil(cy + half)); y++) {
    const progress = (y - (cy - half)) / (2 * half)  // 0 at top, 1 at bottom
    const rowHalf = half * (0.3 + progress * 0.7)  // narrow at top, wide at bottom
    for (let x = Math.max(0, Math.ceil(cx - rowHalf)); x < Math.min(w, Math.ceil(cx + rowHalf)); x++) {
      const edgeDist = rowHalf - Math.abs(x - cx)
      const alpha = Math.min(1, edgeDist)
      const blended = mix(BG, color, alpha * (color[3] / 255))
      setPixel(pixels, x, y, w, [blended[0], blended[1], blended[2], 255])
    }
  }
}

const setPixels = (pixels, x, y, w, color) => {
  if (x < 0 || y < 0 || x >= w || y >= w) return
  const idx = (y * w + x) * 4
  pixels[idx] = color[0]
  pixels[idx + 1] = color[1]
  pixels[idx + 2] = color[2]
  pixels[idx + 3] = color[3]
}

// draw a circle with optional anti-aliased edge
const drawCircle = (pixels, cx, cy, r, w, color) => {
  for (let y = Math.max(0, Math.floor(cy - r - 1)); y <= Math.min(w - 1, Math.ceil(cy + r + 1)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r - 1)); x <= Math.min(w - 1, Math.ceil(cx + r + 1)); x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > r + 0.5) continue
      const alpha = dist < r - 0.5 ? 1 : Math.max(0, r + 0.5 - dist)
      const blended = mix(BG, color, alpha * (color[3] / 255))
      setPixels(pixels, x, y, w, [blended[0], blended[1], blended[2], 255])
    }
  }
}

const generateIcon = (size) => {
  const pixels = Buffer.alloc(size * size * 4, 0)

  // solid navy background
  for (let i = 0; i < size * size; i++) {
    const idx = i * 4
    pixels[idx] = BG[0]
    pixels[idx + 1] = BG[1]
    pixels[idx + 2] = BG[2]
    pixels[idx + 3] = BG[3]
  }

  const c = size / 2
  const unit = size / 16

  // main symbol: a large gold circle with a smaller inset
  const outerR = unit * 5.5
  drawCircle(pixels, c, c - unit * 1, outerR, size, GOLD)

  // inner navy cutout (to create a ring/donut look)
  const innerR = unit * 3
  drawCircle(pixels, c, c - unit * 1, innerR, size, BG)

  // gold dot in the center of the ring
  const dotR = size < 32 ? unit * 1 : unit * 1.5
  drawCircle(pixels, c, c - unit * 1, dotR, size, GOLD)

  // small "hot" accent below: warm dot
  const hotR = unit * 0.8
  drawCircle(pixels, c, c + unit * 4.5, hotR, size, [255, 140, 60, 255])

  return pixels
}

// --- PNG row filtering (filter byte 0 = None) ---
const encodeRows = (pixels, size) => {
  const rowLen = 1 + size * 4
  const rows = Buffer.alloc(size * rowLen)
  for (let y = 0; y < size; y++) {
    rows[y * rowLen] = 0  // filter: None
    pixels.copy(rows, y * rowLen + 1, y * size * 4, (y + 1) * size * 4)
  }
  return rows
}

const buildPng = (size) => {
  const pixels = generateIcon(size)
  const rawRows = encodeRows(pixels, size)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)      // width
  ihdr.writeUInt32BE(size, 4)      // height
  ihdr[8] = 8                       // bit depth
  ihdr[9] = 6                       // color type: RGBA
  ihdr[10] = 0                      // compression
  ihdr[11] = 0                      // filter
  ihdr[12] = 0                      // interlace

  // compress with zlib
  const deflate = createDeflate({ level: 9 })
  const chunks = []
  deflate.on('data', (c) => chunks.push(c))

  return new Promise((resolve, reject) => {
    deflate.on('end', () => {
      const compressed = Buffer.concat(chunks)
      const idat = pngChunk('IDAT', compressed)
      const iend = pngChunk('IEND', Buffer.alloc(0))
      resolve(Buffer.concat([PNG_SIG, pngChunk('IHDR', ihdr), idat, iend]))
    })
    deflate.on('error', reject)
    deflate.end(rawRows)
  })
}

const main = async () => {
  const outDir = resolve(__dirname, '..', 'src', 'icons')
  const { mkdirSync } = require('node:fs')
  mkdirSync(outDir, { recursive: true })

  for (const size of [16, 48, 128]) {
    const buf = await buildPng(size)
    const outFile = resolve(outDir, `icon${size}.png`)
    writeFileSync(outFile, buf)
    console.log(`Written: ${outFile} (${buf.length} bytes)`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })