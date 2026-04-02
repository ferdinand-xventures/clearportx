import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './App.css'

const noiseShader = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`

const vertexShader = `
  ${noiseShader}
  uniform float uTime;
  varying float vNoise;
  void main() {
    float noise = snoise(vec3(position.x * 0.2, position.y * 0.2, position.z * 0.2 + uTime * 0.1));
    vNoise = noise;
    vec3 newPosition = position + normal * (noise * 2.0);
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    gl_PointSize = (12.0 * (1.0 + noise)) * (10.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying float vNoise;
  void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float ll = length(xy);
    if (ll > 0.5) discard;
    vec3 colorMain = vec3(0.06, 0.09, 0.14);
    vec3 colorAccent = vec3(0.76, 0.58, 0.33);
    vec3 finalColor = mix(colorMain, colorAccent, vNoise * 0.5 + 0.5);
    float alpha = (0.5 - ll) * 2.0;
    alpha *= smoothstep(-1.0, 0.5, vNoise);
    gl_FragColor = vec4(finalColor, alpha * 0.6);
  }
`

const FEATURES = [
  {
    title: 'Privacy by Design',
    desc: 'Zero-knowledge proofs ensure complete transaction privacy while maintaining regulatory compliance and auditability.',
    tags: ['Dark Pools', 'ZK Proofs', 'Selective Disclosure'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    title: 'Atomic Settlement',
    desc: 'Instant, guaranteed settlement eliminates counterparty risk and enables true institutional-grade trading.',
    tags: ['Sub-second', 'Guaranteed', 'Cross-domain'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    title: 'Regulatory Compliance',
    desc: 'Built-in compliance frameworks ensure adherence to global financial regulations without compromising innovation.',
    tags: ['GDPR Ready', 'Audit Trails', 'Reporting'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    title: 'Liquidity Management',
    desc: 'Advanced liquidity aggregation and optimization across multiple venues with intelligent routing and risk management.',
    tags: ['Smart Routing', 'Risk Controls', 'Multi-Venue'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
]

const TECH_LAYERS = [
  { name: 'Privacy Layer', desc: 'Zero-knowledge proofs, selective disclosure' },
  { name: 'Execution Layer', desc: 'Smart contracts, AMM engine' },
  { name: 'Settlement Layer', desc: 'Atomic swaps, cross-domain bridges' },
  { name: 'Compliance Layer', desc: 'Regulatory reporting, audit trails' },
]

const USE_CASES = [
  {
    title: 'Institutional Trading',
    desc: 'Execute large block trades without market impact through privacy-preserving dark pool infrastructure.',
    bullets: ['Zero Market Impact', 'Complete Privacy', 'Instant Settlement'],
  },
  {
    title: 'Cross-Border Payments',
    desc: 'Instant, compliant cross-border transactions with built-in regulatory reporting and audit trails.',
    bullets: ['Sub-Second Settlement', 'Regulatory Compliance', 'Cost Reduction'],
  },
  {
    title: 'CBDC Infrastructure',
    desc: 'Privacy-preserving CBDC infrastructure with selective disclosure and regulatory oversight capabilities.',
    bullets: ['Privacy Control', 'Regulatory Oversight', 'Interoperability'],
  },
  {
    title: 'Tokenized Assets',
    desc: 'Trade tokenized shares, private equity, derivatives, and alternative assets with institutional-grade privacy.',
    bullets: ['Private Equity', 'Derivatives Trading', 'Asset Tokenization'],
  },
]

function App() {
  const canvasRef = useRef(null)
  const parallaxRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const animFrameRef = useRef(null)

  useEffect(() => {
    const container = canvasRef.current
    if (!container) return

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    if (!renderer.getContext()) {
      renderer.dispose()
      return
    }

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0d1723, 0.025)

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 25
    camera.position.x = 0

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const geometry = new THREE.TorusKnotGeometry(4, 1.5, 300, 64)
    geometry.scale(1, 1.4, 0.8)

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uTime: { value: 0.0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })

    const pointCloud = new THREE.Points(geometry, material)
    pointCloud.position.set(0, 0, 0)
    scene.add(pointCloud)

    const debrisGeometry = new THREE.BufferGeometry()
    const debrisCount = 1000
    const positions = new Float32Array(debrisCount * 3)
    for (let i = 0; i < debrisCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 30
    }
    debrisGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const debrisMaterial = new THREE.PointsMaterial({
      color: 0xc39653,
      size: 0.05,
      transparent: true,
      opacity: 0.15,
    })
    const debris = new THREE.Points(debrisGeometry, debrisMaterial)
    scene.add(debris)

    const clock = new THREE.Clock()

    const onMouseMove = (event) => {
      const halfW = window.innerWidth / 2
      const halfH = window.innerHeight / 2
      mouseRef.current.x = (event.clientX - halfW) * 0.001
      mouseRef.current.y = (event.clientY - halfH) * 0.001
    }
    document.addEventListener('mousemove', onMouseMove)

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      material.uniforms.uTime.value = elapsed * 0.5

      const targetX = mouseRef.current.x * 0.5
      const targetY = mouseRef.current.y * 0.5
      pointCloud.rotation.y += 0.05 * (targetX - pointCloud.rotation.y)
      pointCloud.rotation.x += 0.05 * (targetY - pointCloud.rotation.x)
      pointCloud.rotation.y += 0.001
      debris.rotation.y -= 0.0005
      debris.rotation.x -= 0.0002


      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <>
      {/* ===== HERO SECTION ===== */}
      <section className="hero-section">
        <div id="canvas-container" ref={canvasRef} />

        <header className="site-header">
          <div className="logo">
            <img src="/logo.svg" alt="ClearportX" />
            <span className="logo-text">ClearportX</span>
          </div>
          <nav className="nav-links">
            <a className="nav-link" href="#platform">Platform</a>
            <a className="nav-link" href="#technology">Technology</a>
            <a className="nav-link" href="#solutions">Solutions</a>
            <a className="nav-link" href="#contact">Contact</a>
            <a className="nav-cta" href="#access">Get Started</a>
          </nav>
        </header>

        <div className="hero-content">
          <div className="content-left" ref={parallaxRef}>
            <span className="tag-line">Built on Canton Network</span>
            <h1>
              Institutional<br />
              Markets<br />
              <span className="highlight">Built for Privacy</span>
            </h1>
            <div className="subhead-container">
              <p className="subhead">
                The first privacy-preserving institutional DeFi platform. Trade, settle,
                and manage digital assets with enterprise-grade privacy and compliance
                built into every transaction.
              </p>
            </div>
            <div className="hero-ctas">
              <a className="btn-primary" href="#access">Request Access</a>
              <a className="btn-secondary" href="#platform">Learn More</a>
            </div>
          </div>
        </div>

        <div className="hero-footer">
          <div className="meta-data">
            <span className="gold">$6T+ processed monthly on-chain</span>
            <span>215+ ecosystem partners</span>
          </div>
          <div className="scroll-indicator" onClick={() => document.getElementById('platform')?.scrollIntoView({ behavior: 'smooth' })}>
            <span>Discover</span>
            <div className="scroll-line" />
          </div>
        </div>
      </section>

      {/* ===== PLATFORM SECTION ===== */}
      <section className="section" id="platform">
        <div className="section-inner">
          <span className="section-label">Platform</span>
          <h2>Built for <span className="highlight">Institutions</span></h2>
          <p className="section-subtitle">
            Enterprise-grade infrastructure designed for the most demanding financial
            organizations. Privacy, compliance, and performance at scale.
          </p>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div className="feature-card" key={f.title} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="feature-card-glow" />
                <div className="feature-card-inner">
                  <div className="feature-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <div className="feature-tags">
                    {f.tags.map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TECHNOLOGY SECTION ===== */}
      <section className="section section-alt" id="technology">
        <div className="section-inner">
          <span className="section-label">Technology</span>
          <h2>Powered by <span className="highlight">Canton</span></h2>
          <p className="section-subtitle">
            Built on the world's most advanced privacy-enabled distributed ledger technology.
            Canton Network provides the foundation for institutional-grade digital asset infrastructure.
          </p>

          <div className="stats-row">
            <div className="stat">
              <span className="stat-value">10,000+</span>
              <span className="stat-label">TPS Capacity</span>
            </div>
            <div className="stat">
              <span className="stat-value">99.99%</span>
              <span className="stat-label">Uptime SLA</span>
            </div>
            <div className="stat">
              <span className="stat-value">&lt; 100ms</span>
              <span className="stat-label">Latency</span>
            </div>
          </div>

          <div className="layers-grid">
            {TECH_LAYERS.map((layer, i) => (
              <div className="layer-card" key={layer.name} style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="layer-accent" />
                <span className="layer-number">0{i + 1}</span>
                <h3>{layer.name}</h3>
                <p>{layer.desc}</p>
                <div className="layer-line" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SOLUTIONS SECTION ===== */}
      <section className="section" id="solutions">
        <div className="section-inner">
          <span className="section-label">Solutions</span>
          <h2>Institutional <span className="highlight">Use Cases</span></h2>
          <p className="section-subtitle">
            Powering the next generation of institutional financial services
            with privacy, compliance, and scale.
          </p>
          <div className="usecases-grid">
            {USE_CASES.map((uc, i) => (
              <div className="usecase-card" key={uc.title} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="usecase-card-border" />
                <div className="usecase-card-inner">
                  <div className="usecase-number">0{i + 1}</div>
                  <h3>{uc.title}</h3>
                  <p>{uc.desc}</p>
                  <ul>
                    {uc.bullets.map((b) => (
                      <li key={b}>
                        <span className="bullet-dot" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRUSTED BY SECTION ===== */}
      <section className="section section-alt" id="trusted">
        <div className="section-inner centered">
          <span className="section-label">Ecosystem</span>
          <h2>Trusted by <span className="highlight">Leading Institutions</span></h2>
          <p className="section-subtitle">
            Built on Canton Network, the institutional-grade blockchain infrastructure.
          </p>
          <div className="logos-row">
            {['Goldman Sachs', 'BNP Paribas', 'HSBC', 'Broadridge', 'Circle', 'Deloitte', 'Deutsche Bank'].map((name) => (
              <span className="partner-logo" key={name}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CONTACT / CTA SECTION ===== */}
      <section className="section cta-section" id="contact">
        <div className="section-inner centered">
          <h2>Ready to <span className="highlight">Get Started</span>?</h2>
          <p className="section-subtitle">
            Join the institutions building the future of private, compliant digital asset trading on Canton Network.
          </p>
          <a className="btn-primary large" href="#access">Request Access</a>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <div className="logo">
              <img src="/logo.svg" alt="ClearportX" />
              <span className="logo-text">ClearportX</span>
            </div>
            <p className="footer-powered">Powered by Canton Network &amp; Digital Asset</p>
          </div>
          <div className="footer-right">
            <span>&copy; {new Date().getFullYear()} ClearportX. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </>
  )
}

export default App
