import type { ReactNode } from "react";

export function PageHero({ eyebrow = "Welcome to Grevitywings", title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return <section className="page-hero"><div className="page-hero-pattern" aria-hidden="true"/><div className="container"><p className="eyebrow eyebrow-light">{eyebrow}</p><h1>{title}</h1>{intro && <p>{intro}</p>}</div></section>;
}

export function SectionHeader({ label, title, children, light = false }: { label?: string; title: string; children?: ReactNode; light?: boolean }) {
  return <div className={`section-heading ${light ? "light" : ""}`}>{label && <p className="eyebrow">{label}</p>}<h2>{title}</h2>{children}</div>;
}

export function ContactForm({ compact = false }: { compact?: boolean }) {
  return <form className={`contact-form ${compact ? "contact-form-compact" : ""}`} action="https://grevitywings.com/index.php/contact-2/#wpcf7-f1799-p39-o1" method="post">
    <input type="hidden" name="_wpcf7" value="1799"/><input type="hidden" name="_wpcf7_version" value="6.1.7"/><input type="hidden" name="_wpcf7_locale" value="en_US"/>
    <label>Your name<input name="your-name" type="text" autoComplete="name" required /></label>
    <label>Your email<input name="your-email" type="email" autoComplete="email" required /></label>
    {!compact && <label>Subject<input name="your-subject" type="text" /></label>}
    {compact && <label>Phone<input name="contact-form-phone" type="tel" autoComplete="tel" required /></label>}
    <label className="form-wide">{compact ? "Message" : "Your message (optional)"}<textarea name={compact ? "contact-form-message" : "your-message"} rows={compact ? 3 : 6} required={compact}/></label>
    <button className="button button-primary" type="submit">Submit <span aria-hidden="true">↗</span></button>
  </form>;
}

export function JobApplicationForm({ position, action }: { position: string; action: string }) {
  return <form className="contact-form application-form" action={`https://grevitywings.com${action}`} method="post" encType="multipart/form-data">
    <input type="hidden" name="position" value={position}/>
    <label>Name*<input name="name" type="text" autoComplete="name" required/></label>
    <label>E-mail*<input name="email" type="email" autoComplete="email" required/></label>
    <label>Phone*<input name="phone" type="tel" autoComplete="tel" required/></label>
    <fieldset className="form-wide"><legend>Gender*</legend><label><input name="gender" type="radio" value="male" required/> Male</label><label><input name="gender" type="radio" value="female"/> Female</label><label><input name="gender" type="radio" value="others"/> others</label></fieldset>
    <label className="form-wide">Description*<textarea name="description" rows={5} required/></label>
    <label className="form-wide">CV*<input name="cv" type="file" accept=".pdf,.doc,.docx" required/></label>
    <button className="button button-primary" type="submit">Send Application</button>
  </form>;
}

export function CallToAction() {
  return <section className="cta-band"><div className="container"><div><p className="eyebrow eyebrow-light">Contact for business</p><h2>Would You Like To Start A Campaign With Us?</h2></div><a className="button button-primary" href="/index.php/contact-2/">Contact Today <span aria-hidden="true">↗</span></a></div></section>;
}
