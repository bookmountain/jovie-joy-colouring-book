import Image from "next/image";
import Link from "next/link";
import { blogCategories } from "@/data/content";

export function BlogCategoryCards() {
  return (
    <section className="bg-cocoa-cream py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="coco-heading mb-8">Blog Posts</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {blogCategories.slice(0, 4).map((category) => (
            <Link
              className="group block"
              href={`/blogs/${category.slug}`}
              key={category.slug}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-coco bg-cocoa-blush shadow-soft">
                <Image
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                  src={category.image}
                />
              </div>
              <h3 className="mt-4 text-xl font-extrabold">{category.title}</h3>
              <p className="mt-2 text-sm leading-6 text-cocoa-text">
                {category.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
