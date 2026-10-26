import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const metrics = [
  ['📊', '10k+', 'Daily Transactions'],
  ['🏪', '500+', 'Active Shops'],
  ['⚡', '< 1s', 'Report Speed'],
  ['🔒', '99.9%', 'Uptime SLA'],
];
const shopTypes = [
  ['👟', 'Shoes Shop', 'Complete footwear inventory with size charts, colors, brand management and smart reorder alerts.', true],
  ['👕', 'Clothing Store', 'Apparel management with sizes, styles, seasonal collections and staff commissions.', true],
  ['🛒', 'Grocery Store', 'Track food items, expiry dates, barcode scanning and stock rotation.', false],
  ['📱', 'Electronics Shop', 'Gadgets, warranties, IMEI/serial numbers and tech product catalogs.', false],
  ['🍽️', 'Restaurant', 'Orders, menu management, table billing and kitchen display system.', false],
  ['💊', 'Pharmacy', 'Medicines, expiry tracking, prescription management and batch control.', false],
];
const features = [
  ['🧾', 'Point of Sale', 'Add to cart, apply discounts, split payments, choose method and print professional branded invoices in one click.'],
  ['📦', 'Inventory Intelligence', 'Live stock tracking with AI-powered low-stock alerts, supplier orders and audit logs.'],
  ['📊', 'Sales Analytics', 'Daily, weekly, monthly revenue charts with top product breakdowns, staff performance and trend insights.'],
  ['🏷️', 'Product Catalog', 'Organize by category, size, color, brand. Bulk imports via Excel. Custom fields and tags.'],
  ['👥', 'Staff Management', 'Salesmen records, biometric attendance tracking, commission reports and payroll summaries.'],
  ['📋', 'Sales History', 'Complete transaction log with advanced filters, invoice reprinting and export to PDF/Excel.'],
  ['🔔', 'Smart Alerts', 'Automatic low-stock, expiry, and daily summary notifications via WhatsApp or email.'],
  ['🔐', 'Role-Based Access', 'Owner, Manager and Cashier roles with granular permission controls and audit trails.'],
  ['🌐', 'Multi-Shop Support', 'Manage multiple branches from one account with consolidated reports and central inventory.'],
];
const stats = [
  ['10,000+', 'Transactions Processed Daily', '85%'],
  ['500+', 'Active Shops Across Pakistan', '70%'],
  ['99.9%', 'Platform Uptime Guarantee', '99%'],
  ['< 1s', 'Average Report Generation', '95%'],
  ['PKR 2M+', 'Revenue Tracked Daily', '80%'],
  ['4.9 ★', 'Average Customer Rating', '98%'],
];
const steps = [
  ['🏪', 'Register Your Shop', 'Sign up free, enter your shop name and type. Takes less than 2 minutes.'],
  ['📦', 'Add Your Products', 'Import your inventory via Excel or add products manually with images.'],
  ['🚀', 'Start Selling', 'Launch POS, process sales, track everything in real-time from day one.'],
];
const testimonials = [
  ['🧑‍💼', 'MarketSuite transformed how we run our 3 shoe stores. Real-time reports from my phone at midnight — incredible.', 'Bilal Chaudhry', 'Owner · Lahore Footwear'],
  ['👩‍💼', 'The clothing management is perfect. Sizes, colors, staff attendance — everything in one dark, beautiful dashboard.', 'Ayesha Malik', 'Manager · Style Zone Karachi'],
  ['🧔', "Before MarketSuite we used paper. Now I know every product's stock from my phone. The POS is lightning fast.", 'Usman Tariq', 'Owner · Usman Garments Islamabad'],
];
const plans = [
  ['Starter', 'Free', '', 'Perfect for single-store owners just getting started.', ['1 Shop', 'Up to 200 Products', 'Basic POS', 'Sales History (30 days)', 'Email Support'], 'Start Free', false],
  ['Pro', 'PKR 999', 'month', 'For growing retailers who need full power.', ['3 Shops', 'Unlimited Products', 'Full POS + Invoicing', 'Advanced Analytics', 'Staff Management', 'WhatsApp Alerts', 'Priority Support'], 'Go Pro Now', true],
  ['Enterprise', 'Custom', '', 'For chains, franchises and large operations.', ['Unlimited Shops', 'Unlimited Everything', 'Multi-Branch Reports', 'Custom Integrations', 'Dedicated Manager', 'SLA Guarantee', 'On-site Training'], 'Contact Us', false],
];

const REVEAL_CSS = `
.ms-reveal{opacity:0;transform:translateY(28px);transition:opacity .55s cubic-bezier(.22,.68,0,1.2),transform .55s cubic-bezier(.22,.68,0,1.2)}
.ms-reveal-left{opacity:0;transform:translateX(-36px);transition:opacity .55s cubic-bezier(.22,.68,0,1.2),transform .55s cubic-bezier(.22,.68,0,1.2)}
.ms-reveal-right{opacity:0;transform:translateX(36px);transition:opacity .55s cubic-bezier(.22,.68,0,1.2),transform .55s cubic-bezier(.22,.68,0,1.2)}
.ms-reveal-scale{opacity:0;transform:scale(.88);transition:opacity .5s cubic-bezier(.22,.68,0,1.2),transform .5s cubic-bezier(.22,.68,0,1.2)}
.ms-reveal-flip{opacity:0;transform:translateY(20px) rotateX(8deg);transition:opacity .5s ease,transform .5s ease;transform-origin:top center}
.ms-reveal.ms-in-view,.ms-reveal-left.ms-in-view,.ms-reveal-right.ms-in-view,.ms-reveal-scale.ms-in-view,.ms-reveal-flip.ms-in-view{opacity:1!important;transform:none!important}
.ms-reveal-stagger>*:nth-child(1){transition-delay:0s!important}
.ms-reveal-stagger>*:nth-child(2){transition-delay:.07s!important}
.ms-reveal-stagger>*:nth-child(3){transition-delay:.14s!important}
.ms-reveal-stagger>*:nth-child(4){transition-delay:.21s!important}
.ms-reveal-stagger>*:nth-child(5){transition-delay:.28s!important}
.ms-reveal-stagger>*:nth-child(6){transition-delay:.35s!important}
.ms-reveal-stagger>*:nth-child(7){transition-delay:.42s!important}
.ms-reveal-stagger>*:nth-child(8){transition-delay:.49s!important}
.ms-reveal-stagger>*:nth-child(9){transition-delay:.56s!important}
.ms-feature-card.ms-in-view,.ms-solution-card.ms-in-view,.ms-testi-card.ms-in-view,.ms-pricing-card.ms-in-view{transition:opacity .55s cubic-bezier(.22,.68,0,1.2),transform .55s cubic-bezier(.22,.68,0,1.2),box-shadow .28s ease,border-color .28s ease!important}
.ms-feature-card.ms-in-view:hover,.ms-solution-card.ms-in-view:hover,.ms-testi-card.ms-in-view:hover{transform:translateY(-6px)!important;box-shadow:0 20px 50px rgba(0,0,0,.22),0 0 0 1px rgba(245,158,11,.18)}
.ms-pricing-card.ms-in-view:hover{transform:translateY(-6px) scale(1.01)!important}
.ms-stat-fill{transition:width 1.1s cubic-bezier(.4,0,.2,1)!important}
.ms-stat-item.ms-in-view .ms-stat-fill{width:var(--target-width)!important}
.ms-section-anim-title{opacity:0;transform:translateY(22px);transition:opacity .5s ease,transform .5s ease}
.ms-section-anim-title.ms-in-view{opacity:1;transform:none}
.ms-section-anim-sub{opacity:0;transform:translateY(14px);transition:opacity .5s ease .1s,transform .5s ease .1s}
.ms-section-anim-sub.ms-in-view{opacity:1;transform:none}
.ms-contact-card{transition-delay:calc(var(--ci,0)*.1s)!important}
`;

const Arrow = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const ContactIcon = ({ id, children }) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    {children}
    <defs><linearGradient id={id} x1="0" y1="0" x2="22" y2="22"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
  </svg>
);

export default function Home() {
  const navigate = useNavigate();
  const [contact, setContact] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleContactSubmit = () => {
    if (!contact.name.trim() || !contact.email.trim()) {
      setContactError('Please fill in your name and email.');
      return;
    }
    setContactSent(true);
    setContactError('');
  };
  const setC = (f) => (e) => setContact((c) => ({ ...c, [f]: e.target.value }));

  useEffect(() => {
    document.title = 'MarketSuite — Premium Store Management';

    // navbar scroll state
    const onScroll = () => {
      const nav = document.getElementById('msNav');
      if (nav) nav.classList.toggle('ms-nav-scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll);

    // smooth scroll for in-page anchors
    const onClick = (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a) {
        e.preventDefault();
        const el = document.getElementById(a.getAttribute('href').slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    document.addEventListener('click', onClick);

    // scroll-reveal (same tagging as the original inline script)
    document.querySelectorAll('.ms-section-title, .ms-section-label').forEach((el) => el.classList.add('ms-section-anim-title', 'ms-reveal'));
    document.querySelectorAll('.ms-section-sub').forEach((el) => el.classList.add('ms-section-anim-sub', 'ms-reveal'));
    ['ms-features-grid', 'ms-solutions-grid', 'ms-testi-grid', 'ms-pricing-grid', 'ms-steps-row', 'ms-stats-grid', 'ms-contact-info'].forEach((cls) => {
      const g = document.querySelector('.' + cls);
      if (g) g.classList.add('ms-reveal-stagger');
    });
    document.querySelectorAll('.ms-feature-card, .ms-testi-card').forEach((el) => el.classList.add('ms-reveal-flip'));
    document.querySelectorAll('.ms-solution-card').forEach((el) => el.classList.add('ms-reveal-scale'));
    document.querySelectorAll('.ms-pricing-card').forEach((el) => el.classList.add('ms-reveal'));
    document.querySelectorAll('.ms-stat-item').forEach((el) => el.classList.add('ms-reveal-left'));
    document.querySelectorAll('.ms-step-card').forEach((el, i) => el.classList.add(i % 2 === 0 ? 'ms-reveal' : 'ms-reveal-scale'));
    document.querySelectorAll('.ms-contact-card').forEach((el, i) => { el.classList.add('ms-reveal'); el.style.setProperty('--ci', i); });
    document.querySelectorAll('.ms-contact-form-wrap').forEach((el) => el.classList.add('ms-reveal-right'));
    document.querySelectorAll('.ms-cta-title, .ms-cta-sub').forEach((el) => el.classList.add('ms-reveal'));
    document.querySelectorAll('.ms-metrics-strip').forEach((el) => el.classList.add('ms-reveal'));

    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('ms-in-view'); obs.unobserve(e.target); } }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.ms-reveal, .ms-reveal-left, .ms-reveal-right, .ms-reveal-scale, .ms-reveal-flip, .ms-section-anim-title, .ms-section-anim-sub').forEach((el) => obs.observe(el));

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick);
      obs.disconnect();
    };
  }, []);

  const toggleMobileNav = () => document.getElementById('msNavLinks')?.classList.toggle('ms-nav-open');

  return (
    <div className="ms-root">
      <div className="ms-noise-overlay"></div>
      <div className="ms-radial-fade"></div>
      <div className="ms-hero-orb ms-hero-orb-1"></div>
      <div className="ms-hero-orb ms-hero-orb-2"></div>
      <div className="ms-hero-orb ms-hero-orb-3"></div>

      {/* NAVBAR */}
      <nav className="ms-nav" id="msNav">
        <div className="ms-nav-inner">
          <div className="ms-logo">
            <div className="ms-logo-mark">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 2L20 7V15L11 20L2 15V7L11 2Z" fill="url(#logoGrad)" stroke="rgba(245,158,11,0.4)" strokeWidth="0.5" />
                <path d="M11 6L16 9V13L11 16L6 13V9L11 6Z" fill="rgba(8,8,16,0.6)" />
                <circle cx="11" cy="11" r="2" fill="#fbbf24" />
                <defs><linearGradient id="logoGrad" x1="2" y1="2" x2="20" y2="20"><stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              </svg>
            </div>
            <span className="ms-logo-text">Market<span className="ms-logo-accent">Suite</span></span>
          </div>
          <div className="ms-nav-links" id="msNavLinks">
            <a href="#features" className="ms-nav-link">Features</a>
            <a href="#solutions" className="ms-nav-link">Solutions</a>
            <a href="#stats" className="ms-nav-link">Analytics</a>
            <a href="#pricing" className="ms-nav-link">Pricing</a>
            <a href="#contact" className="ms-nav-link">Contact</a>
          </div>
          <div className="ms-nav-actions">
            <button onClick={() => navigate('/login')} className="ms-btn-ghost ms-btn-sm">Sign In</button>
            <button onClick={() => navigate('/signup')} className="ms-btn-gold ms-btn-sm"><span>Get Started</span><Arrow /></button>
          </div>
          <button className="ms-hamburger" id="msHamburger" onClick={toggleMobileNav}><span></span><span></span><span></span></button>
        </div>
      </nav>

      {/* HERO */}
      <section className="ms-hero" id="hero">
        <div className="ms-hero-badge ms-anim-1">
          <span className="ms-pulse-dot"></span>
          <span>AI-Powered · POS · Inventory · Analytics</span>
          <span className="ms-badge-tag">2026</span>
        </div>
        <h1 className="ms-hero-title ms-anim-2">Run Your Store<br /><span className="ms-gradient-text ms-shimmer-text">Like a Titan.</span></h1>
        <p className="ms-hero-sub ms-anim-3">
          The only retail management platform built for Pakistan's elite shops.<br className="ms-hidden-mobile" />
          POS · Inventory · Staff · Analytics — all in one obsidian dashboard.
        </p>
        <div className="ms-hero-cta ms-anim-4">
          <button onClick={() => navigate('/signup')} className="ms-btn-gold ms-btn-xl ms-btn-glow">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2.25C5.27 2.25 2.25 5.27 2.25 9C2.25 12.73 5.27 15.75 9 15.75C12.73 15.75 15.75 12.73 15.75 9C15.75 5.27 12.73 2.25 9 2.25ZM12.53 7.28L8.28 11.53C8.14 11.67 7.95 11.75 7.75 11.75C7.55 11.75 7.36 11.67 7.22 11.53L5.47 9.78C5.18 9.49 5.18 9.01 5.47 8.72C5.76 8.43 6.24 8.43 6.53 8.72L7.75 9.94L11.47 6.22C11.76 5.93 12.24 5.93 12.53 6.22C12.82 6.51 12.82 6.99 12.53 7.28Z" fill="currentColor" /></svg>
            Launch Free Store
          </button>
          <button onClick={() => navigate('/login')} className="ms-btn-outline ms-btn-xl">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5A6.5 6.5 0 1 1 1.5 8 6.51 6.51 0 0 1 8 1.5M8 0a8 8 0 1 0 8 8 8 8 0 0 0-8-8Zm.75 4.5h-1.5v4.25L10.6 11l.9-1.24-2.75-1.64Z" fill="currentColor" /></svg>
            Watch Demo
          </button>
        </div>
        <div className="ms-hero-trust ms-anim-5">
          <div className="ms-trust-item"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.6 3.3L12 4.8l-2.5 2.4.6 3.4L7 9l-3.1 1.6.6-3.4L2 4.8l3.4-.5L7 1z" fill="#f59e0b" /></svg><span>500+ Active Shops</span></div>
          <div className="ms-trust-divider"></div>
          <div className="ms-trust-item"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5 6.5-7" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>99.9% Uptime</span></div>
          <div className="ms-trust-divider"></div>
          <div className="ms-trust-item"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5v11M1.5 7h11" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" /></svg><span>No Credit Card</span></div>
        </div>
        <div className="ms-metrics-strip ms-anim-6">
          {metrics.map(([icon, val, label]) => (
            <div key={label} className="ms-metric-card">
              <div className="ms-metric-icon">{icon}</div>
              <div><div className="ms-metric-val">{val}</div><div className="ms-metric-label">{label}</div></div>
            </div>
          ))}
        </div>
        <div className="ms-scroll-hint"><div className="ms-scroll-mouse"><div className="ms-scroll-wheel"></div></div><span>Scroll</span></div>
      </section>

      {/* MARQUEE */}
      <div className="ms-marquee-wrap">
        <div className="ms-marquee-track">
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ display: 'contents' }}>
              {['👟 Shoes Store', '👕 Clothing', '📊 Analytics', '🧾 POS System', '📦 Inventory', '👥 Staff Mgmt', '💰 Revenue Reports', '🏆 Best in Class'].map((t) => (
                <span key={t} style={{ display: 'contents' }}>
                  <span className="ms-marquee-item">{t}</span>
                  <span className="ms-marquee-sep">◆</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* SOLUTIONS */}
      <section className="ms-section" id="solutions">
        <div className="ms-section-inner">
          <div className="ms-section-label">— Supported Verticals</div>
          <h2 className="ms-section-title">One Platform.<br /><span className="ms-gradient-text">Any Business.</span></h2>
          <p className="ms-section-sub">From boutique shoe stores to large clothing chains — MarketSuite adapts to your world.</p>
          <div className="ms-solutions-grid">
            {shopTypes.map(([icon, name, desc, available]) => (
              <div key={name} className={`ms-solution-card ${!available ? 'ms-card-dim' : 'ms-card-live'}`}>
                <div className="ms-solution-glow"></div>
                <div className="ms-solution-top">
                  <div className="ms-solution-icon">{icon}</div>
                  {available ? <span className="ms-badge-live">LIVE NOW</span> : <span className="ms-badge-soon">COMING SOON</span>}
                </div>
                <h3 className="ms-solution-name">{name}</h3>
                <p className="ms-solution-desc">{desc}</p>
                {available && <div className="ms-solution-footer"><span>Start managing →</span></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="ms-section ms-section-alt" id="features">
        <div className="ms-section-inner">
          <div className="ms-section-label">— Feature Suite</div>
          <h2 className="ms-section-title">Everything You Need,<br /><span className="ms-gradient-text">Nothing You Don't.</span></h2>
          <p className="ms-section-sub">Built by retail operators, for retail operators. Every feature earned its place.</p>
          <div className="ms-features-grid">
            {features.map(([icon, title, desc], idx) => (
              <div key={title} className="ms-feature-card" style={{ animationDelay: `${idx * 0.08}s` }}>
                <div className="ms-feature-num">0{idx + 1}</div>
                <div className="ms-feature-icon-wrap"><span className="ms-feature-icon">{icon}</span></div>
                <h3 className="ms-feature-title">{title}</h3>
                <p className="ms-feature-desc">{desc}</p>
                <div className="ms-feature-line"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="ms-section ms-stats-section" id="stats">
        <div className="ms-stats-bg-line"></div>
        <div className="ms-section-inner">
          <div className="ms-section-label">— By The Numbers</div>
          <h2 className="ms-section-title">Performance That<br /><span className="ms-gradient-text">Speaks Volumes.</span></h2>
          <div className="ms-stats-grid">
            {stats.map(([val, label, pct]) => (
              <div key={label} className="ms-stat-item">
                <div className="ms-stat-num">{val}</div>
                <div className="ms-stat-label">{label}</div>
                <div className="ms-stat-bar"><div className="ms-stat-fill" style={{ '--target-width': pct, width: '0%' }}></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="ms-section" id="how">
        <div className="ms-section-inner">
          <div className="ms-section-label">— How It Works</div>
          <h2 className="ms-section-title">Up &amp; Running in<br /><span className="ms-gradient-text">3 Simple Steps.</span></h2>
          <div className="ms-steps-row">
            {steps.map(([icon, title, desc], idx) => (
              <span key={title} style={{ display: 'contents' }}>
                <div className="ms-step-card">
                  <div className="ms-step-num">{idx + 1}</div>
                  <div className="ms-step-icon">{icon}</div>
                  <h3 className="ms-step-title">{title}</h3>
                  <p className="ms-step-desc">{desc}</p>
                </div>
                {idx < steps.length - 1 && <div className="ms-step-arrow">→</div>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="ms-section ms-section-alt" id="pricing">
        <div className="ms-section-inner">
          <div className="ms-section-label">— Pricing</div>
          <h2 className="ms-section-title">Transparent Pricing.<br /><span className="ms-gradient-text">Zero Surprises.</span></h2>
          <p className="ms-section-sub">Start free, scale when you're ready. No contracts, no hidden fees.</p>
          <div className="ms-pricing-grid">
            {plans.map(([name, price, period, desc, feats, cta, popular]) => (
              <div key={name} className={`ms-pricing-card ${popular ? 'ms-pricing-featured' : ''}`}>
                {popular && (
                  <div className="ms-pricing-crown">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10L3.5 4 7 7 10.5 4 12 10H2Z" fill="#f59e0b" /></svg>
                    Most Popular
                  </div>
                )}
                <div className="ms-pricing-name">{name}</div>
                <div className="ms-pricing-price">{price}{period !== '' && <span className="ms-pricing-period">/{period}</span>}</div>
                <div className="ms-pricing-desc">{desc}</div>
                <ul className="ms-pricing-features">
                  {feats.map((f) => (
                    <li key={f}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/signup')} className={popular ? 'ms-btn-gold ms-btn-full' : 'ms-btn-outline ms-btn-full'}>{cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="ms-section" id="testimonials">
        <div className="ms-section-inner">
          <div className="ms-section-label">— Testimonials</div>
          <h2 className="ms-section-title">Trusted by Pakistan's<br /><span className="ms-gradient-text">Top Retailers.</span></h2>
          <div className="ms-testi-grid">
            {testimonials.map(([avatar, quote, name, role]) => (
              <div key={name} className="ms-testi-card">
                <div className="ms-testi-stars">{[0, 1, 2, 3, 4].map((i) => <span key={i}>★</span>)}</div>
                <p className="ms-testi-quote">"{quote}"</p>
                <div className="ms-testi-author">
                  <div className="ms-testi-avatar">{avatar}</div>
                  <div><div className="ms-testi-name">{name}</div><div className="ms-testi-role">{role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="ms-cta-banner">
        <div className="ms-cta-bg-orb ms-orb-1"></div>
        <div className="ms-cta-bg-orb ms-orb-2"></div>
        <div className="ms-cta-inner">
          <div className="ms-section-label" style={{ justifyContent: 'center' }}>— Limited Time Offer</div>
          <h2 className="ms-cta-title">Your Store.<br /><span className="ms-gradient-text">Elevated.</span></h2>
          <p className="ms-cta-sub">Register your business in under 2 minutes.<br />No credit card required. Cancel anytime.</p>
          <div className="ms-cta-btns">
            <button onClick={() => navigate('/signup')} className="ms-btn-gold ms-btn-xl ms-btn-glow">Create Free Account →</button>
            <button onClick={() => navigate('/login')} className="ms-btn-ghost ms-btn-xl">Sign In Instead</button>
          </div>
          <div className="ms-cta-note">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L6 6.5M6 8.5V11" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Free forever on Starter plan · Pro from PKR 999/mo
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="ms-section" id="contact">
        <div className="ms-section-inner">
          <div className="ms-section-label">— Get In Touch</div>
          <h2 className="ms-section-title">Have Questions?<br /><span className="ms-gradient-text">We're Here.</span></h2>
          <p className="ms-section-sub">Our team is available 24/7 to help you get the most out of MarketSuite.</p>
          <div className="ms-contact-grid">
            <div className="ms-contact-info">
              <div className="ms-contact-card">
                <div className="ms-contact-icon-wrap"><ContactIcon id="cGrad1"><path d="M3 5.5C3 4.67 3.67 4 4.5 4H8.36C8.72 4 9.04 4.23 9.16 4.57L10.46 8.07C10.6 8.46 10.44 8.89 10.08 9.09L7.88 10.27C9.06 12.69 11 14.62 13.43 15.83L14.62 13.63C14.82 13.27 15.25 13.11 15.64 13.25L19.14 14.55C19.48 14.67 19.71 14.99 19.71 15.35V19.21C19.71 20.04 19.04 20.71 18.21 20.71C8.6 20.71 0.79 12.9 0.79 3.29V3C0.79 2.17 1.46 1.5 2.29 1.5H2.5C2.5 3.16 2.89 4.36 3 5.5Z" fill="url(#cGrad1)" /></ContactIcon></div>
                <div className="ms-contact-detail"><div className="ms-contact-label">Phone / WhatsApp</div><a href="tel:+923415909442" className="ms-contact-value">+92 341 5909442</a></div>
              </div>
              <div className="ms-contact-card">
                <div className="ms-contact-icon-wrap"><ContactIcon id="cGrad2"><path d="M20 4H2C1.45 4 1 4.45 1 5V17C1 17.55 1.45 18 2 18H20C20.55 18 21 17.55 21 17V5C21 4.45 20.55 4 20 4ZM20 6.19L11 11.87L2 6.19V5.81L11 11.5L20 5.81V6.19Z" fill="url(#cGrad2)" /></ContactIcon></div>
                <div className="ms-contact-detail"><div className="ms-contact-label">Email Address</div><a href="mailto:maviajatt464@gmail.com" className="ms-contact-value">maviajatt464@gmail.com</a></div>
              </div>
              <div className="ms-contact-card">
                <div className="ms-contact-icon-wrap"><ContactIcon id="cGrad3"><path d="M11 2C7.13 2 4 5.13 4 9C4 14.25 11 21 11 21C11 21 18 14.25 18 9C18 5.13 14.87 2 11 2ZM11 11.5C9.62 11.5 8.5 10.38 8.5 9C8.5 7.62 9.62 6.5 11 6.5C12.38 6.5 13.5 7.62 13.5 9C13.5 10.38 12.38 11.5 11 11.5Z" fill="url(#cGrad3)" /></ContactIcon></div>
                <div className="ms-contact-detail"><div className="ms-contact-label">Headquarters</div><span className="ms-contact-value">Pakistan 🇵🇰</span></div>
              </div>
              <div className="ms-contact-card">
                <div className="ms-contact-icon-wrap"><ContactIcon id="cGrad4"><circle cx="11" cy="11" r="9" stroke="url(#cGrad4)" strokeWidth="2" /><path d="M11 6v5l3 3" stroke="url(#cGrad4)" strokeWidth="2" strokeLinecap="round" /></ContactIcon></div>
                <div className="ms-contact-detail"><div className="ms-contact-label">Support Hours</div><span className="ms-contact-value">24 / 7 Always On</span></div>
              </div>
            </div>

            <div className="ms-contact-form-wrap">
              <div className="ms-form-glow"></div>
              <h3 className="ms-form-title">Send a Message</h3>
              <p className="ms-form-sub">We typically reply within 1 hour.</p>
              <div className="ms-form-row">
                <div className="ms-form-group"><label className="ms-form-label">Your Name</label><input value={contact.name} onChange={setC('name')} className="ms-form-input" placeholder="Ahmad Raza" /></div>
                <div className="ms-form-group"><label className="ms-form-label">Email Address</label><input value={contact.email} onChange={setC('email')} className="ms-form-input" placeholder="you@example.com" /></div>
              </div>
              <div className="ms-form-group"><label className="ms-form-label">Subject</label><input value={contact.subject} onChange={setC('subject')} className="ms-form-input" placeholder="How can we help?" /></div>
              <div className="ms-form-group"><label className="ms-form-label">Message</label><textarea value={contact.message} onChange={setC('message')} className="ms-form-input ms-form-textarea" placeholder="Tell us about your business..."></textarea></div>
              <button className="ms-btn-gold ms-btn-full ms-btn-lg" onClick={handleContactSubmit}>{contactSent ? <span>✓ Message Sent!</span> : <span>Send Message →</span>}</button>
              {contactError && <p className="ms-form-error">{contactError}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ms-footer">
        <div className="ms-footer-top">
          <div className="ms-footer-brand">
            <div className="ms-logo">
              <div className="ms-logo-mark ms-logo-mark-sm">
                <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                  <path d="M11 2L20 7V15L11 20L2 15V7L11 2Z" fill="url(#footGrad)" stroke="rgba(245,158,11,0.4)" strokeWidth="0.5" />
                  <circle cx="11" cy="11" r="2" fill="#fbbf24" />
                  <defs><linearGradient id="footGrad" x1="2" y1="2" x2="20" y2="20"><stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
                </svg>
              </div>
              <span className="ms-logo-text ms-logo-text-sm">Market<span className="ms-logo-accent">Suite</span></span>
            </div>
            <p className="ms-footer-tagline">Pakistan's premium retail management platform. Built for shops that demand excellence.</p>
            <div className="ms-footer-socials">
              <a href="mailto:maviajatt464@gmail.com" className="ms-social-btn" title="Email">✉</a>
              <a href="tel:+923415909442" className="ms-social-btn" title="Call">📞</a>
              <a href="https://wa.me/923415909442" className="ms-social-btn" title="WhatsApp">💬</a>
            </div>
          </div>
          <div className="ms-footer-links-group">
            <div className="ms-footer-col">
              <div className="ms-footer-col-title">Product</div>
              <a href="#features" className="ms-footer-link">Features</a>
              <a href="#solutions" className="ms-footer-link">Solutions</a>
              <a href="#pricing" className="ms-footer-link">Pricing</a>
              <a href="#stats" className="ms-footer-link">Analytics</a>
            </div>
            <div className="ms-footer-col">
              <div className="ms-footer-col-title">Supported</div>
              <span className="ms-footer-link">👟 Shoes Store</span>
              <span className="ms-footer-link">👕 Clothing Store</span>
              <span className="ms-footer-link">🛒 Grocery (Soon)</span>
              <span className="ms-footer-link">📱 Electronics (Soon)</span>
            </div>
            <div className="ms-footer-col">
              <div className="ms-footer-col-title">Contact</div>
              <a href="mailto:maviajatt464@gmail.com" className="ms-footer-link">maviajatt464@gmail.com</a>
              <a href="tel:+923415909442" className="ms-footer-link">+92 341 5909442</a>
              <a href="#contact" className="ms-footer-link">Send Message</a>
              <span className="ms-footer-link">Pakistan 🇵🇰</span>
            </div>
          </div>
        </div>
        <div className="ms-footer-bottom">
          <span>© {new Date().getFullYear()} MarketSuite · MERN Stack</span>
          <span className="ms-footer-divider">·</span>
          <span>Built with ❤️ for Pakistani retailers</span>
          <span className="ms-footer-divider">·</span>
          <span>All rights reserved</span>
        </div>
      </footer>

      <style>{REVEAL_CSS}</style>
    </div>
  );
}
