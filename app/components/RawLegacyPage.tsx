import { legacyHtml } from "../content/legacy-html";
import { PageHero } from "./PageParts";
import { SiteShell } from "./SiteShell";

type LegacyKey = keyof typeof legacyHtml;

const titles: Record<LegacyKey, string> = {
  sample: "Sample Page",
  umoma: "The New UMoMA Opens its Doors",
  blog: "Blog",
  hello: "Hello world!",
};

export function RawLegacyPage({ page }: { page: LegacyKey }) {
  return <SiteShell><main id="main-content"><PageHero title={titles[page]} eyebrow="Welcome to Grevitywings"/><section className="section"><article className="container prose-card legacy-copy" dangerouslySetInnerHTML={{ __html: legacyHtml[page] }}/></section></main></SiteShell>;
}
