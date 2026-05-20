import { notFound } from "next/navigation";
import { BlogCard } from "@/components/content/blog-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getBlogCategory } from "@/data/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const blogSlugAliases: Record<string, string> = {
  "tools-tips": "coloring-book-guide",
  "lifestyle-diy": "diy",
};

export default async function BlogCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const blogSlug = blogSlugAliases[slug] ?? slug;

  let category;
  let categoryArticles;
  try {
    const result = await getBlogCategory(blogSlug);
    category = result.category;
    categoryArticles = result.articles;
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <Breadcrumbs items={[{ label: "Blogs", href: "/blogs/htc" }, { label: category.title }]} />
      <div className="mt-8">
        <h1 className="coco-heading">
          {category.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-cocoa-text">
          {category.excerpt}
        </p>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categoryArticles.map((article) => (
          <BlogCard article={article} key={article.slug} />
        ))}
      </div>
    </main>
  );
}
