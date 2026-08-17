import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AboutPage, CareerPage, ContactPage, GalleryPage, LegalPage, TeamPage } from "../../components/LegacyPages";
import { JobPage, LegacyJobPage, type JobSlug } from "../../components/JobPage";
import { RawLegacyPage } from "../../components/RawLegacyPage";
import { jobRecords } from "../../content/jobs";

type Props = { params: Promise<{ slug?: string[] }> };

const records: Record<string, { title: string; description: string }> = {
  "about-2": { title: "About", description: "Welcome To Grevitywings Technologies" },
  "contact-2": { title: "Contact", description: "If you feel like communicating with us for any query or grievance, fill the forms below." },
  "privacy-policy-2": { title: "Privacy Policy", description: "Grevitywings Privacy Policy" },
  "terms-and-conditions": { title: "Terms and Conditions", description: "Grevitywings Terms and Conditions" },
  gallery: { title: "Gallery", description: "Checkout Our Latest Team Gallery" },
  career: { title: "Career", description: "Jobs at Grevitywings" },
  "our-team": { title: "Our Team", description: "The Grevitywings team" },
  "sample-page": { title: "Sample Page", description: "Sample Page" },
  "the-new-umoma-opens-its-doors-2": { title: "The New UMoMA Opens its Doors", description: "The premier destination for modern art in Northern Sweden." },
  blog: { title: "Blog", description: "Grevitywings Blog" },
  "2020/05/23/hello-world": { title: "Hello world!", description: "Welcome to WordPress. This is your first post." },
  "jobs/ground-operations-executive-fresher": { title: "Ground operations executive – fresher", description: "Ground operations executive – fresher at Grevitywings" },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const job = jobRecords[key as JobSlug];
  const record = job ? { title: job.title, description: job.descriptionHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 155) } : records[key];
  if (!record) return {};
  const canonical = `/index.php/${key}/`;
  return { title: record.title, description: record.description, alternates: { canonical }, openGraph: { title: record.title, description: record.description, url: canonical, images: [] }, twitter: { title: record.title, description: record.description, images: [] } };
}

export default async function LegacyRoute({ params }: Props) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  if (key === "about-2") return <AboutPage/>;
  if (key === "contact-2") return <ContactPage/>;
  if (key === "privacy-policy-2") return <LegalPage type="privacy"/>;
  if (key === "terms-and-conditions") return <LegalPage type="terms"/>;
  if (key === "gallery") return <GalleryPage/>;
  if (key === "career") return <CareerPage/>;
  if (key === "our-team") return <TeamPage/>;
  if (key === "sample-page") return <RawLegacyPage page="sample"/>;
  if (key === "the-new-umoma-opens-its-doors-2") return <RawLegacyPage page="umoma"/>;
  if (key === "blog") return <RawLegacyPage page="blog"/>;
  if (key === "2020/05/23/hello-world") return <RawLegacyPage page="hello"/>;
  if (key === "jobs/ground-operations-executive-fresher") return <LegacyJobPage/>;
  if (key in jobRecords) return <JobPage slug={key as JobSlug}/>;
  notFound();
}
