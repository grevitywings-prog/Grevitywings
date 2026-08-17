"use client";

import { useState } from "react";
import { ContactForm } from "./PageParts";

export function ContactDrawer() {
  const [open, setOpen] = useState(false);
  return <>
    <button className="contact-drawer-trigger" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">Contact Us</button>
    {open && <div className="drawer-backdrop"><section className="contact-drawer" role="dialog" aria-modal="true" aria-labelledby="contact-drawer-title"><button className="drawer-close" type="button" onClick={() => setOpen(false)} aria-label="Close contact form">×</button><p className="eyebrow">Contact Form</p><h2 id="contact-drawer-title">Contact Us</h2><ContactForm compact/><a className="drawer-email" href="mailto:shaharyar@grevitywings.com">shaharyar@grevitywings.com</a></section></div>}
  </>;
}
