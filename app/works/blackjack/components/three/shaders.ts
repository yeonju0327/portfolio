// 승리 시 프리즘 색수차(Chromatic Aberration) 연출용 커스텀 셰이더
export const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      // 렌즈 외곽으로 갈수록 더 심하게 찢어지도록 설계
      vec2 dist = vUv - 0.5;
      vec2 offset = dist * uAmount;
      vec4 r = texture2D(tDiffuse, vUv + offset);
      vec4 g = texture2D(tDiffuse, vUv);
      vec4 b = texture2D(tDiffuse, vUv - offset);
      gl_FragColor = vec4(r.r, g.g, b.b, g.a);
    }
  `,
};
