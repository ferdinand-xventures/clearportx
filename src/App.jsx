import { useEffect, useRef, useCallback } from 'react'
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
  },
  {
    title: 'Atomic Settlement',
    desc: 'Instant, guaranteed settlement eliminates counterparty risk and enables true institutional-grade trading.',
    tags: ['Sub-second', 'Guaranteed', 'Cross-domain'],
  },
  {
    title: 'Regulatory Compliance',
    desc: 'Built-in compliance frameworks ensure adherence to global financial regulations without compromising innovation.',
    tags: ['GDPR Ready', 'Audit Trails', 'Reporting'],
  },
  {
    title: 'Liquidity Management',
    desc: 'Advanced liquidity aggregation and optimization across multiple venues with intelligent routing and risk management.',
    tags: ['Smart Routing', 'Risk Controls', 'Multi-Venue'],
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
  {
    title: 'Digital Securities',
    desc: 'Issue and trade regulated digital securities with built-in compliance and real-time settlement.',
    bullets: ['Regulatory Framework', 'Real-time Settlement', 'Global Distribution'],
  },
  {
    title: 'Yield Optimization',
    desc: 'Institutional-grade yield strategies across DeFi protocols with privacy-preserving execution.',
    bullets: ['Multi-Protocol', 'Risk-Adjusted', 'Automated Rebalancing'],
  },
]

function useScrollReveal() {
  const observerRef = useRef(null)

  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observerRef.current?.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    document.querySelectorAll('.reveal').forEach((el) => {
      observerRef.current.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [])

  useEffect(() => {
    const cleanup = setupObserver()
    return cleanup
  }, [setupObserver])
}

function App() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const animFrameRef = useRef(null)

  useScrollReveal()

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
          <div className="content-left">
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

      {/* ===== STATS BAR ===== */}
      <section className="stats-bar">
        <div className="stats-bar-inner">
          <div className="stat-item reveal">
            <span className="stat-value">10,000+</span>
            <span className="stat-label">TPS Capacity</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item reveal">
            <span className="stat-value">99.99%</span>
            <span className="stat-label">Uptime SLA</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item reveal">
            <span className="stat-value">&lt; 100ms</span>
            <span className="stat-label">Latency</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item reveal">
            <span className="stat-value">215+</span>
            <span className="stat-label">Ecosystem Partners</span>
          </div>
        </div>
      </section>

      {/* ===== PLATFORM SECTION — Sticky left + scroll right ===== */}
      <section className="section" id="platform">
        <div className="platform-layout">
          <div className="platform-left">
            <div className="platform-left-sticky">
              <span className="section-label reveal">Platform</span>
              <h2 className="reveal">Built for <span className="highlight">Institutions</span></h2>
              <p className="section-subtitle reveal">
                Enterprise-grade infrastructure designed for the most demanding financial
                organizations. Privacy, compliance, and performance at scale.
              </p>
              <a className="btn-primary reveal" href="#access">Explore Platform</a>
            </div>
          </div>
          <div className="platform-right">
            {FEATURES.map((f, i) => (
              <div className="feature-card reveal" key={f.title}>
                <div className="feature-number">0{i + 1}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="feature-tags">
                  {f.tags.map((t) => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MANIFESTO SECTION ===== */}
      <section className="manifesto-section">
        <div className="manifesto-inner">
          <div className="manifesto-block reveal">
            <span className="manifesto-label">Manifesto</span>
            <blockquote className="manifesto-quote">
              Privacy is not a feature. It is a fundamental right of institutional market participants.
              We build infrastructure where compliance and privacy coexist by design.
            </blockquote>
          </div>
          <div className="manifesto-divider" />
          <div className="manifesto-block reveal">
            <span className="manifesto-label">Mission</span>
            <p className="manifesto-text">
              To create the standard for privacy-preserving institutional finance,
              enabling secure, compliant, and efficient digital asset trading at global scale.
            </p>
          </div>
        </div>
      </section>

      {/* ===== TECHNOLOGY SECTION ===== */}
      <section className="section" id="technology">
        <div className="section-inner">
          <span className="section-label reveal">Technology</span>
          <h2 className="reveal">Powered by <span className="highlight">Canton</span></h2>
          <p className="section-subtitle reveal">
            Built on the world's most advanced privacy-enabled distributed ledger technology.
            Canton Network provides the foundation for institutional-grade digital asset infrastructure.
          </p>

          <div className="layers-grid">
            {TECH_LAYERS.map((layer, i) => (
              <div className="layer-card reveal" key={layer.name}>
                <span className="layer-number">0{i + 1}</span>
                <h3>{layer.name}</h3>
                <p>{layer.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SOLUTIONS SECTION — Industries-style grid ===== */}
      <section className="section" id="solutions">
        <div className="section-inner">
          <span className="section-label reveal">Solutions</span>
          <h2 className="reveal">Institutional <span className="highlight">Use Cases</span></h2>
          <p className="section-subtitle reveal">
            Powering the next generation of institutional financial services
            with privacy, compliance, and scale.
          </p>
          <div className="usecases-grid">
            {USE_CASES.map((uc, i) => (
              <div className="usecase-card reveal" key={uc.title}>
                <div className="usecase-number">0{i + 1}</div>
                <h3>{uc.title}</h3>
                <p>{uc.desc}</p>
                <ul>
                  {uc.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRUSTED BY SECTION ===== */}
      <section className="section" id="trusted">
        <div className="section-inner centered">
          <span className="section-label reveal">Ecosystem</span>
          <h2 className="reveal">Trusted by <span className="highlight">Leading Institutions</span></h2>
          <p className="section-subtitle reveal">
            Built on Canton Network, the institutional-grade blockchain infrastructure.
          </p>
          <div className="logos-row reveal">
            {['Goldman Sachs', 'BNP Paribas', 'HSBC', 'Broadridge', 'Circle', 'Deloitte', 'Deutsche Bank'].map((name) => (
              <span className="partner-logo" key={name}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMMUNITY / STAGGERED CARDS ===== */}
      <section className="community-section">
        <div className="community-inner">
          <div className="community-header reveal">
            <span className="section-label">Community</span>
            <h2>Join the <span className="highlight">Ecosystem</span></h2>
          </div>
          <div className="community-cards">
            {[
              { title: 'For Institutions', desc: 'Access institutional-grade privacy infrastructure for digital asset trading, settlement, and custody.', cta: 'Request Access' },
              { title: 'For Developers', desc: 'Build on Canton Network with comprehensive SDKs, documentation, and developer support.', cta: 'Start Building' },
              { title: 'For Partners', desc: 'Integrate with ClearportX to offer privacy-preserving financial services to your clients.', cta: 'Partner With Us' },
              { title: 'For Researchers', desc: 'Explore cutting-edge research in zero-knowledge proofs, privacy-preserving computation, and DeFi.', cta: 'Read Papers' },
            ].map((card, i) => (
              <div className="community-card reveal" key={card.title} style={{ '--stagger': i }}>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                <a className="community-cta" href="#access">
                  {card.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION — Full-width gold accent ===== */}
      <section className="cta-section" id="contact">
        <div className="cta-inner">
          <h2 className="reveal">Unlock the Future of<br /><span className="highlight-dark">Private Institutional Finance</span></h2>
          <p className="reveal">Join the institutions building the future of private, compliant digital asset trading on Canton Network.</p>
          <div className="cta-buttons reveal">
            <a className="btn-cta-primary" href="#access">Request Access</a>
            <a className="btn-cta-secondary" href="#contact">Book a Demo</a>
          </div>
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
          <div className="footer-links">
            <a href="#platform">Platform</a>
            <a href="#technology">Technology</a>
            <a href="#solutions">Solutions</a>
            <a href="#contact">Contact</a>
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
