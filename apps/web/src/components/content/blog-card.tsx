import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/data/content";

export function BlogCard({ article }: { article: Article }) {
  return (
    <Link className="group block" href={`/blogs/${article.blogSlug}/${article.slug}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-coco bg-cocoa-blush shadow-soft">
        <Image
          alt=""
          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          src={article.image}
        />
      </div>
      <h2 className="mt-4 text-xl font-extrabold">{article.title}</h2>
      <p className="mt-2 text-sm leading-6 text-cocoa-text">{article.excerpt}</p>
    </Link>
  );
}
