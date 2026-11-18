/**
 * Pure TypeScript ISO/IEC 18004 QR Code Matrix Generator (Byte Mode, Error Correction Level L).
 * Zero external dependencies — works offline and renders crisp SVG for machine QR stickers (B-07).
 */

interface VersionSpec {
  version: number
  size: number
  totalDataCodewords: number
  ecCodewordsPerBlock: number
  numBlocksGroup1: number
  dataCodewordsGroup1: number
  numBlocksGroup2: number
  dataCodewordsGroup2: number
  alignmentCenters: number[]
}

// ISO/IEC 18004 Table 9 — EC Level L specifications for Versions 1..10
const VERSION_SPECS_L: VersionSpec[] = [
  { version: 1, size: 21, totalDataCodewords: 19, ecCodewordsPerBlock: 7, numBlocksGroup1: 1, dataCodewordsGroup1: 19, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [] },
  { version: 2, size: 25, totalDataCodewords: 34, ecCodewordsPerBlock: 10, numBlocksGroup1: 1, dataCodewordsGroup1: 34, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 18] },
  { version: 3, size: 29, totalDataCodewords: 55, ecCodewordsPerBlock: 15, numBlocksGroup1: 1, dataCodewordsGroup1: 55, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 22] },
  { version: 4, size: 33, totalDataCodewords: 80, ecCodewordsPerBlock: 20, numBlocksGroup1: 1, dataCodewordsGroup1: 80, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 26] },
  { version: 5, size: 37, totalDataCodewords: 108, ecCodewordsPerBlock: 26, numBlocksGroup1: 1, dataCodewordsGroup1: 108, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 30] },
  { version: 6, size: 41, totalDataCodewords: 136, ecCodewordsPerBlock: 18, numBlocksGroup1: 2, dataCodewordsGroup1: 68, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 34] },
  { version: 7, size: 45, totalDataCodewords: 156, ecCodewordsPerBlock: 20, numBlocksGroup1: 2, dataCodewordsGroup1: 78, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 22, 38] },
  { version: 8, size: 49, totalDataCodewords: 194, ecCodewordsPerBlock: 24, numBlocksGroup1: 2, dataCodewordsGroup1: 97, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 24, 42] },
  { version: 9, size: 53, totalDataCodewords: 232, ecCodewordsPerBlock: 30, numBlocksGroup1: 2, dataCodewordsGroup1: 116, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 26, 46] },
  { version: 10, size: 57, totalDataCodewords: 274, ecCodewordsPerBlock: 18, numBlocksGroup1: 2, dataCodewordsGroup1: 68, numBlocksGroup2: 2, dataCodewordsGroup2: 69, alignmentCenters: [6, 28, 50] },
]

// Precomputed 15-bit Format Information strings for EC Level L (01) and masks 0..7
const FORMAT_INFO_BITS_L: number[] = [
  0x77c4, // Mask 0
  0x72f3, // Mask 1
  0x7daa, // Mask 2
  0x789d, // Mask 3
  0x662f, // Mask 4
  0x6318, // Mask 5
  0x6c41, // Mask 6
  0x6976, // Mask 7
]

// Precomputed 18-bit Version Information strings for versions 7..10
const VERSION_INFO_BITS: Record<number, number> = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
}

function gfMul(x: number, y: number): number {
  let result = 0
  let a = x
  let b = y
  for (let i = 0; i < 8; i++) {
    if ((b & 1) !== 0) {
      result ^= a
    }
    const hiBit = a & 0x80
    a = (a << 1) & 0xff
    if (hiBit !== 0) {
      a ^= 0x11d
    }
    b >>= 1
  }
  return result
}

function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root)
      if (j + 1 < degree) {
        result[j] ^= result[j + 1]
      }
    }
    root = gfMul(root, 0x02)
  }
  return result
}

function reedSolomonRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0)
  for (const byte of data) {
    const factor = byte ^ result[0]
    result.shift()
    result.push(0)
    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= gfMul(divisor[i], factor)
    }
  }
  return result
}

function appendBits(val: number, len: number, bitBuffer: number[]): void {
  for (let i = len - 1; i >= 0; i--) {
    bitBuffer.push((val >>> i) & 1)
  }
}

function selectVersion(byteLength: number): VersionSpec {
  for (const spec of VERSION_SPECS_L) {
    const charCountBits = spec.version <= 9 ? 8 : 16
    const maxBits = spec.totalDataCodewords * 8
    const neededBits = 4 + charCountBits + byteLength * 8
    if (neededBits <= maxBits) {
      return spec
    }
  }
  return VERSION_SPECS_L[VERSION_SPECS_L.length - 1]
}

function buildCodewords(bytes: Uint8Array, spec: VersionSpec): number[] {
  const bitBuffer: number[] = []
  const charCountBits = spec.version <= 9 ? 8 : 16

  // Mode indicator for Byte Mode: 0100 (4)
  appendBits(0b0100, 4, bitBuffer)
  appendBits(bytes.length, charCountBits, bitBuffer)

  for (const b of bytes) {
    appendBits(b, 8, bitBuffer)
  }

  const capacityBits = spec.totalDataCodewords * 8
  appendBits(0, Math.min(4, capacityBits - bitBuffer.length), bitBuffer)
  appendBits(0, (8 - (bitBuffer.length % 8)) % 8, bitBuffer)

  let padToggle = 0
  while (bitBuffer.length < capacityBits) {
    appendBits(padToggle % 2 === 0 ? 0xec : 0x11, 8, bitBuffer)
    padToggle++
  }

  const dataCodewords: number[] = []
  for (let i = 0; i < bitBuffer.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bitBuffer[i + j]
    }
    dataCodewords.push(byte)
  }

  const divisor = reedSolomonDivisor(spec.ecCodewordsPerBlock)
  const dataBlocks: number[][] = []
  const ecBlocks: number[][] = []

  let offset = 0
  for (let i = 0; i < spec.numBlocksGroup1; i++) {
    const block = dataCodewords.slice(offset, offset + spec.dataCodewordsGroup1)
    offset += spec.dataCodewordsGroup1
    dataBlocks.push(block)
    ecBlocks.push(reedSolomonRemainder(block, divisor))
  }
  for (let i = 0; i < spec.numBlocksGroup2; i++) {
    const block = dataCodewords.slice(offset, offset + spec.dataCodewordsGroup2)
    offset += spec.dataCodewordsGroup2
    dataBlocks.push(block)
    ecBlocks.push(reedSolomonRemainder(block, divisor))
  }

  const interleaved: number[] = []
  const maxDataBlockLen = Math.max(spec.dataCodewordsGroup1, spec.dataCodewordsGroup2)
  for (let i = 0; i < maxDataBlockLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) {
        interleaved.push(block[i])
      }
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (const block of ecBlocks) {
      interleaved.push(block[i])
    }
  }

  return interleaved
}

function drawFinderPattern(
  modules: boolean[][],
  isFunction: boolean[][],
  centerX: number,
  centerY: number
): void {
  const size = modules.length
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = centerX + dx
      const y = centerY + dy
      if (x >= 0 && x < size && y >= 0 && y < size) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        modules[y][x] = dist !== 2 && dist !== 4
        isFunction[y][x] = true
      }
    }
  }
}

function drawAlignmentPattern(
  modules: boolean[][],
  isFunction: boolean[][],
  centerX: number,
  centerY: number
): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy))
      modules[centerY + dy][centerX + dx] = dist !== 1
      isFunction[centerY + dy][centerX + dx] = true
    }
  }
}

function drawFormatBits(
  modules: boolean[][],
  isFunction: boolean[][],
  mask: number
): void {
  const size = modules.length
  const bits = FORMAT_INFO_BITS_L[mask]

  for (let i = 0; i <= 5; i++) {
    modules[8][i] = ((bits >>> i) & 1) !== 0
    isFunction[8][i] = true
  }
  modules[8][7] = ((bits >>> 6) & 1) !== 0
  isFunction[8][7] = true
  modules[8][8] = ((bits >>> 7) & 1) !== 0
  isFunction[8][8] = true
  modules[7][8] = ((bits >>> 8) & 1) !== 0
  isFunction[7][8] = true
  for (let i = 9; i < 15; i++) {
    modules[14 - i][8] = ((bits >>> i) & 1) !== 0
    isFunction[14 - i][8] = true
  }

  for (let i = 0; i < 8; i++) {
    modules[size - 1 - i][8] = ((bits >>> i) & 1) !== 0
    isFunction[size - 1 - i][8] = true
  }
  for (let i = 8; i < 15; i++) {
    modules[8][size - 15 + i] = ((bits >>> i) & 1) !== 0
    isFunction[8][size - 15 + i] = true
  }
  modules[size - 8][8] = true
  isFunction[size - 8][8] = true
}

function drawVersionBits(
  modules: boolean[][],
  isFunction: boolean[][],
  version: number
): void {
  const bits = VERSION_INFO_BITS[version]
  if (!bits) return
  const size = modules.length
  for (let i = 0; i < 18; i++) {
    const bit = ((bits >>> i) & 1) !== 0
    const a = size - 11 + (i % 3)
    const b = Math.floor(i / 3)
    modules[a][b] = bit
    isFunction[a][b] = true
    modules[b][a] = bit
    isFunction[b][a] = true
  }
}

export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder()
  const rawBytes = encoder.encode(text)
  const spec = selectVersion(rawBytes.length)
  const bytes = rawBytes.length > spec.totalDataCodewords - 3
    ? rawBytes.slice(0, spec.totalDataCodewords - 3)
    : rawBytes

  const size = spec.size
  const modules: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false)
  )
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false)
  )

  // Timing patterns
  for (let i = 0; i < size; i++) {
    modules[6][i] = i % 2 === 0
    isFunction[6][i] = true
    modules[i][6] = i % 2 === 0
    isFunction[i][6] = true
  }

  // Three finder patterns
  drawFinderPattern(modules, isFunction, 3, 3)
  drawFinderPattern(modules, isFunction, size - 4, 3)
  drawFinderPattern(modules, isFunction, 3, size - 4)

  // Alignment patterns
  const centers = spec.alignmentCenters
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === centers.length - 1) ||
        (i === centers.length - 1 && j === 0)
      ) {
        continue
      }
      drawAlignmentPattern(modules, isFunction, centers[i], centers[j])
    }
  }

  // Reserve format & version areas
  drawFormatBits(modules, isFunction, 0)
  drawVersionBits(modules, isFunction, spec.version)

  // Place data codewords in zigzag columns
  const codewords = buildCodewords(bytes, spec)
  let bitIndex = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!isFunction[y][x] && bitIndex < codewords.length * 8) {
          const cw = codewords[bitIndex >>> 3]
          const bit = ((cw >>> (7 - (bitIndex & 7))) & 1) !== 0
          modules[y][x] = bit
          bitIndex++
        }
      }
    }
  }

  // Apply mask 0: (x + y) % 2 === 0 and write final format bits
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isFunction[y][x] && (x + y) % 2 === 0) {
        modules[y][x] = !modules[y][x]
      }
    }
  }
  drawFormatBits(modules, isFunction, 0)

  return modules
}
