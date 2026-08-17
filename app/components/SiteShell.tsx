"use client";

import { useState, type ReactNode } from "react";
import { ContactDrawer } from "./ContactDrawer";

const nav = [["Home", "/"], ["About", "/index.php/about-2/"], ["Services", "/#services"], ["Gallery", "/index.php/gallery/"], ["Career", "/index.php/career/"], ["Our Team", "/index.php/our-team/"], ["Contact", "/index.php/contact-2/"]];

export function SiteShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="site-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="topbar"><div className="container topbar-inner"><span>Business With Brevity</span><div><a href="mailto:sales@grevitywings.com">✉ sales@grevitywings.com</a><a href="tel:+919831365785">☎ +91 9831365785</a></div></div></div>
    <header className="site-header"><div className="container header-inner">
      <a className="brand" href="/" aria-label="Grevitywings home"><img src="/grevitywings-logo.png" alt="Grevitywings — Business With Brevity" width="314" height="112" /></a>
      <nav className={`primary-nav ${open ? "is-open" : ""}`} aria-label="Primary navigation">{nav.map(([label, href]) => <a href={href} key={label} onClick={() => setOpen(false)}>{label}</a>)}<a className="nav-cta" href="/index.php/contact-2/">Contact for business <span aria-hidden="true">›</span></a></nav>
      <button className="menu-toggle" type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "×" : "☰"}</button>
    </div></header>
    {children}
    <footer className="site-footer"><div className="container footer-grid">
      <div className="footer-brand"><img src="/grevitywings-logo.png" alt="Grevitywings" width="314" height="112"/><p>Our products and services are designed for quality and have a proven track record of reliability. Our services are cherished by some of the largest clients and marketing service providers in the world.</p></div>
      <div><h2>Navigation</h2><ul>{nav.slice(0,7).map(([label,href])=><li key={label}><a href={href}>{label}</a></li>)}</ul></div>
      <div className="footer-contact"><h2>Contact Us</h2><p><b>⌖</b><span>India - Headquarter (HQ): 18, Rabindra Sarani Rd, Terita Bazar, Poddar Court, Tiretti, Kolkata, West Bengal ,Postcode- 700001</span></p><p><b>☎</b><a href="tel:+919831365785">+91 9831365785</a></p><p><b>⌖</b><span>United Kingdom Registered Office Address : 71-75 Shelton Street, Covent Garden, London England, United Kingdom, WC2H 9JQ</span></p><p><b>☎</b><a href="tel:+441217512162">+44 1217512162</a></p></div>
      <div><h2>Get Connected</h2><ul><li><a href="https://www.facebook.com/GrevityWings/" target="_blank" rel="noreferrer">Facebook</a></li><li><a href="https://instagram.com/grevitywings?igshid=127tgrferxyle" target="_blank" rel="noreferrer">Instagram</a></li><li><a href="https://www.linkedin.com/company/grevitywings-technologies-private-limited" target="_blank" rel="noreferrer">LinkedIn</a></li><li><a href="mailto:sales@grevitywings.com">sales@grevitywings.com</a></li></ul></div>
    </div><div className="container footer-bottom"><p>Copyright ©️ 2021 CIN:U72900WB2020PTC237298 Powered Grevitywings Technologies Private Limited.</p><div><a href="/index.php/privacy-policy-2/">Privacy Policy</a><a href="/index.php/terms-and-conditions/">Terms and Conditions</a></div></div></footer>
    <a className="whatsapp" href="https://wa.me/919831365785" target="_blank" rel="noreferrer" aria-label="WhatsApp us"><span>WhatsApp us</span><b>☎</b></a>
    <ContactDrawer />
  </div>;
}
