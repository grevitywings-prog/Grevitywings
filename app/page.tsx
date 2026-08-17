import { SiteShell } from "./components/SiteShell";

const services = [
  ["Lead Generation", "LG", "We deliver the UK’s top quality telemarketing leads. We help in raising company’s profile to guide consumer in choosing your product or service. From call file to scripting to diallers, we manage the entire telesurvey process in-house. Our experts train and motivate the BPO industry’s best agents to make the most of every call. Lead generation options range from sponsoring a question within a survey to completely bespoke multi-channel acquisition.​Use only fresh sales leads for cold email campaigns and appointment setting.​"],
  ["Hotkeys Transfer", "HT", "We encounter some qualified customers during telemarketing who shows off buying signals. To maximize the conversion rate of sales, agents immediately transfer the contact to your in-house sales team. It is the most promising way to reach out to genuine interested leads.It provides an improved customer experience. The filtering process in hotkey transfer is more organised and streamlined. This process has great potential in spades. Get in touch soon to set-up your hotkey transfer campaigns."],
  ["BeSpoke Solutions", "BS", "Bespoke solution would give the power back to your business. Embracing technology & software automation opens many doors for companies. From expansion to increase revenue streams, a tailor-made solution can help to stabilize recurring issues all, while increasing efficiency. It seen as the alternative to commercial software or off the shelf software. It is adaptable, flexible, and agile. These bespoke solutions are even be developed to fit into your current ways of working, so you needn’t change how you work."],
  ["Inbound Service​​", "IS", "In this day and age, where companies want to outshine each other in terms of growth, it is paramount to retain maximum customers. We take care of customer support operations for prestigious clients. If you are eager to flourish its business, avail our inbound call services. Tasks come into call queues and are automatically pushed to the most appropriately skilled agents, providing customer satisfaction. We always bring a smile to customers’ faces owing to lower wait time and pared responses."],
  ["Web Designing​", "WD", "Your competitors can be challenging, which is why our team of highly accomplished designers craft memorable designs to promote your company’s offering and personality. At first, we understand your aims and objectives, your current limitations and your target audience. Then we follow the exciting part: the design stage, User-Interface Design, User Experience Design, Prototyping and Responsive Design maximise a website’s potential. We build and maintain WP/Joomla platforms that focus on user-friendly interface.​"],
  ["BackOffice Support", "BO", "Backoffice activities are non-customer facing tasks but are crucial. We provide effective backend support so you can focus on the big picture. We provide data processing & management; data entry services; accounts and inventory; customer care services, data analysis and research,etc. It provides benefit from cost reduction to down-sizing, increased productivity, accuracy and predictability in your business. Our agents are assisted by automation and AI technology, reducing repititve tasks and routine operations.​"],
];

export default function Home() {
  return (
    <SiteShell>
      <main id="main-content">
        <section className="hero">
          <div className="hero-map" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-copy reveal">
              <p className="eyebrow"><span className="globe-mark">◎</span> Welcome to Grevitywings</p>
              <h1>We Work <span>FOR YOU</span></h1>
              <p className="hero-lede">Our research, sales &amp; customer care team provides the exemplary support your customers deserve.</p>
              <div className="hero-actions">
                <a className="button button-primary" href="/index.php/contact-2/">Contact for business <span aria-hidden="true">↗</span></a>
                <a className="button button-secondary" href="#services">Our services</a>
              </div>
              <div className="hero-trust" aria-label="Business highlights"><span>Data Protection Regulations</span><span>ICO</span><span>GDPR</span></div>
            </div>
            <div className="hero-visual reveal reveal-delay" aria-label="Grevitywings international offices">
              <div className="globe-panel">
                <div className="orbit orbit-one" /><div className="orbit orbit-two" />
                <div className="wire-globe" aria-hidden="true"><i /><i /><i /></div>
                <div className="location-card location-india"><strong>India</strong><span>Headquarter (HQ)</span></div>
                <div className="location-card location-uk"><strong>United Kingdom</strong><span>Registered Office</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="strategy-strip" aria-label="How we work"><div className="container strategy-grid">
          <article><span>01</span><div><h2>We Work FOR YOU</h2><p>Our research, sales &amp; customer care team provides the exemplary support your customers deserve.</p></div></article>
          <article><span>02</span><div><h2>OUR STRATEGIES</h2><p>Our call center framework provides maximum data security for your business assets.</p></div></article>
          <article><span>03</span><div><h2>CUSTOMER OUTREACH</h2><p>Appointment setting and Customer Relationship Management lifecycle.</p></div></article>
        </div></section>

        <section className="section services-section" id="services"><div className="container">
          <div className="section-heading split-heading"><div><p className="eyebrow">Our services</p><h2>We provide a wide range of Services</h2></div><p>We help our clients achieve optimum results from their data-driven marketing through our industry’s top leading tech products and professional services.</p></div>
          <div className="service-grid">{services.map(([title, icon, body], index) => <article className="service-card" key={title}><div className="service-top"><span className="service-icon">{icon}</span><span className="service-number">0{index + 1}</span></div><h3>{title}</h3><p>{body}</p></article>)}</div>
        </div></section>

        <section className="section portfolio-section"><div className="container"><div className="section-heading split-heading"><div><p className="eyebrow">Check out our Web Designing​​ work</p><h2>Take a peek inside our Grevityrworld</h2></div><div className="video-embed"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/fUXdrl9ch_Q" title="Grevitywings video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div></div><div className="portfolio-grid">{Array.from({length:6},(_,index)=><a href={`/portfolio/0${index+1}.${index===5?"png":"jpg"}`} key={index}><img src={`/portfolio/0${index+1}.${index===5?"png":"jpg"}`} alt={`Grevitywings web designing work ${index+1}`} loading="lazy"/></a>)}</div></div></section>

        <section className="section clients-section"><div className="container"><div className="section-heading"><p className="eyebrow">Clients</p><h2>Clients</h2></div><div className="client-grid">{[["aviva.png","aviva"],["axxa.png","axxa"],["o2.png","o2"],["virgin.png","virgin"],["repair.png","Repair+and+Assure+Ltd"],["clc.jpg","clc"],["bt.png","BT"],["talktalk.png","talktalk"],["mr-green.jpg","Mr_Green Casino"]].map(([file,alt])=><div key={file}><img src={`/clients/${file}`} alt={alt} loading="lazy"/></div>)}</div></div></section>

        <section className="section home-testimonial"><div className="container testimonial-feature"><div><p className="eyebrow">What Clients Say</p><h2>What Clients Say</h2><blockquote>From the initial conversations, we knew that they had our best interests in mind. Their contribution towards UI web development and bespoke solutions brought great recommendations based on user's habits and industry trends. Their willingness to go above and beyond for the client are their greatest strengths. Looking forward to their inception of lead generation marketing in India to boost hotel chain industry.</blockquote><p><strong>Rahul Singhania</strong><span>CEO, Bedoff Co.</span></p></div><img src="/testimonial.jpg" alt="Rahul Singhania" width="279" height="300" loading="lazy"/></div></section>

        <section className="section insight-section"><div className="container insight-grid"><article><span>01</span><h2>Digital Marketing Made Easy</h2><p>The benefits of digital marketing include:<br/>Global reach |Trackable, measurable results |Personalisation <br/>Openness |Social currency| Improved conversion rates</p></article><article><span>02</span><h2>IVA For you</h2><p>An Individual Voluntary Arrangement ( IVA ) is an agreement with your creditors to pay all or part of your debts. You agree to make regular payments to an insolvency practitioner, who will divide this money between your creditors.</p></article><article><span>03</span><h2>Hotkey Transfer</h2><p>In short, hotkey transfer is a way to reach out to generated leads and sort out genuine ones from those who aren't.you are 1 step away from reaching your Goals via Hotkey Transfer : Contact Today.</p></article><article><span>04</span><h2>Inbound Support</h2><p>Outsource Your Operation: Collections, Vulnerable Customer, Complaints Handling, Telesales. Outsource Your Operation: rapid resourcing, fraud management, analytics, Call Centre Services to Grevitywings with Inbound support. Contact today</p></article></div></section>

        <section className="section compliance-section"><div className="container compliance-grid">
          <div><p className="eyebrow eyebrow-light">About us</p><h2>Protecting your confidential data is a sign of respect.</h2></div>
          <div className="compliance-copy"><p>Our products and services are designed for quality and have a proven track record of reliability. Our services are cherished by some of the largest clients and marketing service providers in the world. We comply with Data Protection Regulations – ICO GDPR.</p><div className="text-links"><a href="/index.php/privacy-policy-2/">Privacy Policy <span aria-hidden="true">↗</span></a><a href="/index.php/terms-and-conditions/">Terms and Conditions <span aria-hidden="true">↗</span></a></div></div>
        </div></section>
        <section className="stats-band"><div className="container stats-grid"><div><strong>1</strong><span>Surveyed</span></div><div><strong>—</strong><span>Happy clients</span></div><div><strong>—</strong><span>Campaigns completed</span></div></div></section>
        <section className="cta-band"><div className="container"><div><p className="eyebrow eyebrow-light">Contact for business</p><h2>Would You Like To Start A Campaign With Us?</h2></div><a className="button button-primary" href="/index.php/contact-2/">Contact Today <span aria-hidden="true">↗</span></a></div></section>
      </main>
    </SiteShell>
  );
}
