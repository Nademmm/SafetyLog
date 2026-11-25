import * as React from 'react'
import { cn } from '@/lib/utils'

export type DitheringShape = 'wave' | 'simplex' | 'ripple'
export type DitheringType = '2x2' | '4x4' | '8x8'

export interface DitheringShaderProps {
  shape?: DitheringShape
  type?: DitheringType
  colorBack?: string
  colorFront?: string
  pxSize?: number
  speed?: number
  className?: string
  style?: React.CSSProperties
}

const VERT_SRC = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAG_SRC = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_pxSize;
uniform int u_shape;
uniform int u_type;
uniform vec3 u_colorBack;
uniform vec3 u_colorFront;

float bayer2(vec2 p) {
  vec2 c = floor(mod(p, 2.0));
  return (c.x * 2.0 + c.y * 3.0 - c.x * c.y * 2.0) / 4.0;
}

float bayer4(vec2 p) {
  return (bayer2(floor(p / 2.0)) + bayer2(p) * 4.0) / 4.0;
}

float bayer8(vec2 p) {
  vec2 c = floor(mod(p, 8.0));
  float idx = c.x + c.y * 8.0;
  // Recursive 8x8 Bayer threshold
  float b4 = bayer2(floor(c / 4.0)) * 0.25
           + bayer2(floor(mod(c, 4.0) / 2.0)) * 0.0625 * 4.0
           + bayer2(mod(c, 2.0)) * 0.25;
  return fract(b4 + idx * 0.0001);
}

float bayerThreshold(vec2 cell) {
  if (u_type == 0) return bayer2(cell);
  if (u_type == 1) return bayer4(cell);
  // Exact 8x8 bit-interleaved Bayer matrix
  vec2 p = floor(mod(cell, 8.0));
  float v = 0.0;
  float scale = 0.5;
  for (int i = 0; i < 3; i++) {
    vec2 b = floor(mod(p, 2.0));
    float m = mod(b.x * 2.0 + (b.x == b.y ? 0.0 : 1.0) + b.y * 2.0, 4.0);
    // Standard 2x2 Bayer: [0, 2; 3, 1]
    float d2 = b.y < 0.5 ? (b.x < 0.5 ? 0.0 : 2.0) : (b.x < 0.5 ? 3.0 : 1.0);
    v += d2 * scale * 0.5;
    p = floor(p * 0.5);
    scale *= 0.25;
  }
  return v;
}

float fieldValue(vec2 uv, float t) {
  if (u_shape == 1) {
    // Ripple
    float dist = length(uv - 0.5);
    return 0.5 + 0.5 * sin(dist * 18.0 - t * 2.2);
  }
  if (u_shape == 2) {
    // Simplex-like organic interference
    float a = sin(uv.x * 4.2 + t * 0.9) * cos(uv.y * 3.8 - t * 0.7);
    float b = sin((uv.x * 2.3 - uv.y * 3.1) + t * 1.1);
    return 0.5 + 0.28 * a + 0.22 * b;
  }
  // Wave (default)
  float w1 = sin(uv.x * 3.5 + t + sin(uv.y * 2.2 - t * 0.6) * 0.9);
  float w2 = cos(uv.y * 2.8 - t * 0.8 + uv.x * 1.4);
  return clamp(0.5 + 0.28 * w1 + 0.22 * w2, 0.0, 1.0);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / max(u_pxSize, 1.0));
  vec2 snappedFrag = (cell + 0.5) * max(u_pxSize, 1.0);
  vec2 uv = snappedFrag / u_resolution;
  uv.x *= u_resolution.x / max(u_resolution.y, 1.0);

  float value = fieldValue(uv, u_time);
  float threshold = bayerThreshold(cell);
  float dithered = step(threshold, value);

  vec3 color = mix(u_colorBack, u_colorFront, dithered);
  gl_FragColor = vec4(color, 1.0);
}`

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const num = Number.parseInt(full, 16)
  if (Number.isNaN(num)) return [0, 0, 0]
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255]
}

export function DitheringShader({
  shape = 'wave',
  type = '8x8',
  colorBack = '#0D1117',
  colorFront = '#332116',
  pxSize = 3,
  speed = 0.6,
  className,
  style,
}: DitheringShaderProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const propsRef = React.useRef({ shape, type, colorBack, colorFront, pxSize, speed })

  React.useEffect(() => {
    propsRef.current = { shape, type, colorBack, colorFront, pxSize, speed }
  }, [shape, type, colorBack, colorFront, pxSize, speed])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false })
    if (!gl) return

    const compileShader = (shaderType: number, source: string) => {
      const shader = gl.createShader(shaderType)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vert = compileShader(gl.VERTEX_SHADER, VERT_SRC)
    const frag = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC)
    if (!vert || !frag) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const posLoc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uTime = gl.getUniformLocation(program, 'u_time')
    const uPxSize = gl.getUniformLocation(program, 'u_pxSize')
    const uShape = gl.getUniformLocation(program, 'u_shape')
    const uType = gl.getUniformLocation(program, 'u_type')
    const uColorBack = gl.getUniformLocation(program, 'u_colorBack')
    const uColorFront = gl.getUniformLocation(program, 'u_colorFront')

    const syncSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width * dpr))
      const h = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
    }

    syncSize()
    const resizeObserver = new ResizeObserver(syncSize)
    resizeObserver.observe(canvas)

    let rafId = 0
    const start = performance.now()

    const renderFrame = (now: number) => {
      const current = propsRef.current
      const elapsed = reducedMotion ? 0 : ((now - start) / 1000) * current.speed
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      gl.useProgram(program)
      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uTime, elapsed)
      gl.uniform1f(uPxSize, Math.max(1, current.pxSize * dpr))
      gl.uniform1i(
        uShape,
        current.shape === 'ripple' ? 1 : current.shape === 'simplex' ? 2 : 0,
      )
      gl.uniform1i(uType, current.type === '2x2' ? 0 : current.type === '4x4' ? 1 : 2)

      const back = hexToRgb(current.colorBack)
      const front = hexToRgb(current.colorFront)
      gl.uniform3f(uColorBack, back[0], back[1], back[2])
      gl.uniform3f(uColorFront, front[0], front[1], front[2])

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      if (!reducedMotion) {
        rafId = requestAnimationFrame(renderFrame)
      }
    }

    rafId = requestAnimationFrame(renderFrame)

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('block h-full w-full', className)}
      style={{ backgroundColor: colorBack, ...style }}
    />
  )
}
