import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getArticle, getBlogCategory } from "@/data/content";
import { resolveAssetUrl } from "@/lib/api";

type PageProps = {
  params: Promise<{ slug: string; articleSlug: string }>;
};

const blogSlugAliases: Record<string, string> = {
  "tools-tips": "coloring-book-guide",
  "lifestyle-diy": "diy",
};

export default async function ArticlePage({ params }: PageProps) {
  const { slug, articleSlug } = await params;
  const blogSlug = blogSlugAliases[slug] ?? slug;

  let article;
  let category;
  try {
    [article, { category }] = await Promise.all([
      getArticle(blogSlug, articleSlug),
      getBlogCategory(blogSlug),
    ]);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Blogs", href: "/blogs/htc" },
          { label: category.title, href: `/blogs/${category.slug}` },
          { label: article.title },
        ]}
      />
      <article className="mt-8">
        <h1 className="coco-heading">
          {article.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-cocoa-text">
          {article.excerpt}
        </p>
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-coco bg-cocoa-blush shadow-soft">
          <Image
            alt=""
            className="h-full w-full object-cover"
            fill
            priority
            sizes="(min-width: 1024px) 860px, 100vw"
            src={resolveAssetUrl(article.image)}
          />
        </div>
        <div className="mt-8 space-y-5 text-base leading-8 text-cocoa-text">
          {article.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
