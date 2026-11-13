import React, { useEffect, useRef } from 'react';

export function HeroGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false });

    if (!gl) {
      // Fallback 2D subtle radial glow
      return;
    }

    const vsSrc = `#version 300 es
    void main(){
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;

    const fsSrc = `#version 300 es
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uDark;
    out vec4 outColor;

    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
        f.z
      );
    }

    float fbm(vec3 p) {
      return noise(p) * 0.6 + noise(p * 2.1) * 0.28 + noise(p * 4.3) * 0.12;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / max(uRes.y, 1.0);
      vec2 center = vec2(0.5, 0.28);
      vec2 d = (uv - center) * vec2(aspect, 1.0);
      float radius = 0.56;
      float rr = dot(d, d) / (radius * radius);
      if (rr > 1.05) {
        outColor = vec4(0.0);
        return;
      }
      float r = sqrt(max(rr, 0.0));
      float pz = sqrt(max(1.0 - rr, 0.0));
      vec3 n = vec3(d / radius, pz);

      float tilt = 0.38;
      vec3 m = vec3(n.x, n.y * cos(tilt) + n.z * sin(tilt), -n.y * sin(tilt) + n.z * cos(tilt));
      float theta = uTime * 0.09;
      float c = cos(theta), s = sin(theta);
      vec3 b = vec3(m.x * c - m.z * s, m.y, m.x * s + m.z * c);

      vec3 L = normalize(vec3(-0.45, 0.65, 0.6));
      float lit = smoothstep(-0.3, 0.85, dot(n, L));
      float fres = pow(1.0 - pz, 2.5);

      float v = fbm(b * 4.2 + vec3(5.0, 1.0, 2.0));
      float fw = max(fwidth(v), 0.002);
      float f = (v - 0.15) / 0.055;
      float idx = floor(f + 0.5);
      float dp = abs(f - idx) * 0.055 / fw;
      float line = 1.0 - smoothstep(0.6, 1.8, dp);
      bool major = mod(abs(idx), 3.0) < 0.5;

      vec3 baseDark = vec3(0.11, 0.10, 0.098);
      vec3 baseLight = vec3(0.92, 0.96, 0.94);
      vec3 mint = vec3(0.466, 0.984, 0.792); // #77fbca
      vec3 deepMint = vec3(0.06, 0.615, 0.43);

      vec3 bodyCol = mix(baseLight, baseDark, uDark);
      vec3 contourCol = mix(deepMint, mint, uDark);

      float alphaEdge = 1.0 - smoothstep(0.92, 1.01, r);
      float lineAlpha = line * (major ? 0.55 : 0.24) * (0.35 + 0.65 * lit);
      vec3 col = mix(bodyCol, contourCol, clamp(lineAlpha + fres * 0.22, 0.0, 1.0));
      float outAlpha = alphaEdge * (uDark > 0.5 ? 0.52 : 0.26) * (0.4 + lineAlpha * 1.3 + fres * 0.45);

      outColor = vec4(col * outAlpha, outAlpha);
    }`;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uDark = gl.getUniformLocation(prog, 'uDark');

    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const render = (now: number) => {
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light' ? 1.0 : 0.0;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reducedMotion ? 1.2 : (now - start) / 1000);
      gl.uniform1f(uDark, isDark);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reducedMotion) raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-90"
    />
  );
}
