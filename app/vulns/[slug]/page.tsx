import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getVulnBySlug, getAllVulnSlugs } from "@/lib/content";
import { Header } from "@/components/Header";
import { DocReader } from "@/components/DocReader";

export async function generateStaticParams() {
  const slugs = getAllVulnSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getVulnBySlug(slug);
  if (!doc) return { title: "Not Found" };
  return {
    title: `${doc.title} — Veylith Read`,
    description: `${doc.protocol} ${doc.severity} vulnerability on ${doc.chain}: ${doc.title}`,
  };
}

export default async function VulnPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getVulnBySlug(slug);

  if (!doc) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="flex-1 px-6 py-12">
        <DocReader doc={doc}>
          <MDXRemote source={doc.content} />
        </DocReader>
      </main>
    </>
  );
}
