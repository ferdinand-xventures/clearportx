import { useEffect, useRef, useCallback, useState } from 'react'
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
  { name: 'Privacy Layer', desc: 'Zero-knowledge proofs and selective disclosure ensure transaction confidentiality while maintaining full auditability for regulators.' },
  { name: 'Execution Layer', desc: 'Smart contracts and AMM engine execute trades atomically with deterministic ordering and guaranteed finality.' },
  { name: 'Settlement Layer', desc: 'Atomic swaps and cross-domain bridges enable instant, risk-free settlement across multiple networks.' },
  { name: 'Compliance Layer', desc: 'Regulatory reporting and audit trails embedded at the protocol level, not bolted on as an afterthought.' },
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
    title: 'Digital Securities',
    desc: 'Issue and trade regulated digital securities with built-in compliance and real-time settlement.',
    bullets: ['Regulatory Framework', 'Real-time Settlement', 'Global Distribution'],
  },
]

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    // Assign stagger delays based on sibling position within each section
    document.querySelectorAll('.reveal, .reveal-left').forEach((el) => {
      const parent = el.parentElement
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.classList.contains('reveal') || c.classList.contains('reveal-left')
        )
        const idx = siblings.indexOf(el)
        if (idx > 0) el.style.transitionDelay = `${idx * 0.15}s`
      }
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])
}

function App() {
  const canvasRef = useRef(null)
  const dotMatrixRef = useRef(null)
  const networkCanvasRef = useRef(null)
  const platformRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const animFrameRef = useRef(null)
  const [platformProgress, setPlatformProgress] = useState(0)
  useScrollReveal()

  // Scroll-linked progress for platform section
  useEffect(() => {
    const onScroll = () => {
      if (!platformRef.current) return
      const rect = platformRef.current.getBoundingClientRect()
      const sectionHeight = platformRef.current.offsetHeight
      const viewportHeight = window.innerHeight
      const scrolled = -rect.top
      const maxScroll = sectionHeight - viewportHeight
      if (maxScroll > 0) {
        setPlatformProgress(Math.max(0, Math.min(1, scrolled / maxScroll)))
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Dot matrix animation for platform section
  useEffect(() => {
    const canvas = dotMatrixRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const SPACING = 16
    const DOT_R = 4.5
    let cols, rows, frame = 0, rafId, dpr

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.floor(rect.width / SPACING)
      rows = Math.floor(rect.height / SPACING)
    }
    resize()
    window.addEventListener('resize', resize)

    function getIntensity(c, r, time) {
      const x = c / cols
      const y = r / rows
      const cx = 0.5, cy = 0.45
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      const angle = Math.atan2(y - cy, x - cx)

      // Layer 1: expanding ring pulse
      const pulse = (Math.sin(time * 0.04) + 1) / 2
      const ring = Math.abs(dist - pulse * 0.5)
      const ringVal = ring < 0.03 ? 1 : ring < 0.07 ? 0.35 : 0

      // Layer 2: rotating spiral arms
      const spiral = Math.sin(dist * 15 - time * 0.06 + angle * 3)
      const spiralVal = spiral > 0.8 ? 0.7 : spiral > 0.4 ? 0.15 : 0

      // Layer 3: concentric rings (static, subtle)
      const rings = Math.sin(dist * 30)
      const ringsVal = rings > 0.85 ? 0.25 : 0

      // Layer 4: slow radial wave
      const radial = Math.sin(angle * 6 + time * 0.02)
      const radialVal = radial > 0.7 && dist < 0.35 ? 0.3 : 0

      return Math.min(1, Math.max(ringVal, spiralVal, ringsVal, radialVal))
    }

    function draw() {
      const w = parseInt(canvas.style.width)
      const h = parseInt(canvas.style.height)
      ctx.fillStyle = '#080e16'
      ctx.fillRect(0, 0, w, h)
      const time = frame++

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const px = i * SPACING + SPACING / 2
          const py = j * SPACING + SPACING / 2
          const intensity = getIntensity(i, j, time)

          // Base dot (always visible)
          ctx.beginPath()
          ctx.arc(px, py, 1, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(195, 150, 83, 0.08)'
          ctx.fill()

          if (intensity > 0) {
            // Circle ring
            ctx.beginPath()
            ctx.arc(px, py, DOT_R, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(195, 150, 83, ${intensity * 0.8})`
            ctx.lineWidth = 2
            ctx.stroke()

            // Center dot
            ctx.beginPath()
            ctx.arc(px, py, 0.6, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(195, 150, 83, ${intensity * 0.5})`
            ctx.fill()
          }
        }
      }
      rafId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // Network graph animation for technology section
  useEffect(() => {
    const canvas = networkCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let rafId, dpr, w, h
    const nodes = []
    const NODE_COUNT = 40
    const CONNECTION_DIST = 180

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio, 2)
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function initNodes() {
      nodes.length = 0
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 2 + 1,
        })
      }
    }

    resize()
    initNodes()
    window.addEventListener('resize', () => { resize(); initNodes() })

    function draw() {
      ctx.clearRect(0, 0, w, h)

      // Update positions
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.12
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(195, 150, 83, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(195, 150, 83, 0.2)'
        ctx.fill()
      }

      rafId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [])

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
            <a className="nav-link" href="#trusted">Ecosystem</a>
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
              <a className="btn-secondary" href="#contact">Watch Demo</a>
            </div>
          </div>
          <div className="content-right">
            <div className="swap-card">
              <div className="swap-header">
                <span className="swap-badge">Live</span>
                <span className="swap-title">Private Swap</span>
                <span className="swap-badge swap-badge--encrypted">Encrypted</span>
              </div>
              <div className="swap-field">
                <div className="swap-field-label">From</div>
                <div className="swap-field-row">
                  <div className="swap-token">
                    <span className="swap-token-icon">C</span>
                    <div>
                      <div className="swap-token-name">Canton Coin</div>
                      <div className="swap-token-ticker">CANTON</div>
                    </div>
                  </div>
                  <div className="swap-amount">10,000</div>
                </div>
              </div>
              <div className="swap-field">
                <div className="swap-field-label">To</div>
                <div className="swap-field-row">
                  <div className="swap-token">
                    <span className="swap-token-icon swap-token-icon--usdc">$</span>
                    <div>
                      <div className="swap-token-name">USD Coin</div>
                      <div className="swap-token-ticker">USDC</div>
                    </div>
                  </div>
                  <div className="swap-amount">500.00</div>
                </div>
              </div>
              <div className="swap-details">
                <div className="swap-detail-row"><span>Rate</span><span>1 CANTON = 0.05 USDC</span></div>
                <div className="swap-detail-row"><span>Network Fee</span><span>0.3%</span></div>
                <div className="swap-detail-row"><span>Settlement</span><span className="gold">Atomic</span></div>
              </div>
              <button className="swap-button">Execute Private Swap</button>
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

      {/* ===== PLATFORM SECTION — Scroll-linked sticky ===== */}
      <section className="platform-section" id="platform" ref={platformRef}>
        <div className="platform-sticky">
          <div className="platform-layout">
            <div className="platform-left">
              <canvas ref={dotMatrixRef} className="dot-matrix-canvas" />
              <div className="platform-left-content">
                <span className="section-label">Platform</span>
                <h2>Built for <span className="highlight">Institutions</span></h2>
                <p className="section-subtitle">
                  Enterprise-grade infrastructure designed for the most demanding financial
                  organizations. Privacy, compliance, and performance at scale.
                </p>
              </div>
            </div>
            <div className="platform-right">
              {FEATURES.map((f, i) => {
                const start = i * 0.2
                const reveal = Math.max(0, Math.min(1, (platformProgress - start) / 0.15))
                return (
                  <div
                    className="feature-card"
                    key={f.title}
                    style={{
                      opacity: reveal,
                      transform: `translateY(${(1 - reveal) * 30}px)`,
                    }}
                  >
                    <div className="feature-number">0{i + 1}</div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                    <div className="feature-tags">
                      {f.tags.map((t) => (
                        <span key={t} className="tag">{t}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== TECHNOLOGY — Compact stats + layers ===== */}
      <section className="tech-section" id="technology">
        <canvas ref={networkCanvasRef} className="network-canvas" />
        <div className="section-inner centered">
          <span className="section-label reveal">Powered by Canton</span>
          <h2 className="reveal">Institutional-Grade <span className="highlight">Infrastructure</span></h2>

          <div className="tech-stats reveal">
            <div className="tech-stat">
              <span className="tech-stat-value">10,000+</span>
              <span className="tech-stat-label">TPS Capacity</span>
            </div>
            <div className="tech-stat">
              <span className="tech-stat-value">99.99%</span>
              <span className="tech-stat-label">Uptime SLA</span>
            </div>
            <div className="tech-stat">
              <span className="tech-stat-value">&lt; 100ms</span>
              <span className="tech-stat-label">Latency</span>
            </div>
          </div>

          <div className="tech-layers reveal">
            {TECH_LAYERS.map((layer, i) => (
              <div className="tech-layer" key={layer.name}>
                <span className="tech-layer-name">{layer.name}</span>
                <span className="tech-layer-desc">{layer.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRUSTED BY SECTION ===== */}
      <section className="trusted-section" id="trusted">
        <div className="section-inner centered">
          <span className="section-label reveal">Ecosystem</span>
          <h2 className="reveal">Trusted by <span className="highlight">Leading Institutions</span></h2>
          <p className="section-subtitle reveal">
            Built on Canton Network, the institutional-grade blockchain infrastructure.
          </p>
        </div>
        <div className="logo-marquee">
          <div className="logo-marquee-track">
            {[...Array(2)].map((_, setIdx) => (
              ['Canton Network', 'Digital Asset', 'Goldman Sachs', 'BNP Paribas', 'HSBC', 'Broadridge', 'Circle', 'Deloitte', 'Deutsche Bank', 'S&P Global', 'Cboe'].map((name) => (
                <span className="marquee-logo" key={`${setIdx}-${name}`}>{name}</span>
              ))
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
            <a href="#trusted">Ecosystem</a>
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
