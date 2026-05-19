import Link from "next/link";
import { footerGroups, socialLinks } from "@/data/navigation";

export function Footer() {
  return (
    <footer className="mt-0 bg-[#f8edff]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-[1.2fr_1fr_1fr] lg:px-8">
        <div>
          <p className="font-cute text-4xl font-extrabold tracking-normal text-cocoa-ink">
            Zoe&amp;Book
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-cocoa-text">
            Drop us a note anytime:
          </p>
          <div className="mt-4 grid gap-2 text-sm">
            <p>
              <span className="font-extrabold">Customer Care</span>
              <br />
              hello@zoeandbook.com
            </p>
            <p>
              <span className="font-extrabold">Licensing Inquiries</span>
              <br />
              studio@zoeandbook.com
            </p>
          </div>
        </div>
        {footerGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-base font-extrabold">{group.title}</h2>
            <ul className="mt-4 grid gap-2 text-sm text-cocoa-text">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link className="hover:text-cocoa-coral" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-[#e4d4ef] px-4 py-5 text-sm text-cocoa-text lg:px-8">
        <div className="flex flex-wrap gap-4">
          {socialLinks.map((link) => (
            <a
              className="font-bold hover:text-cocoa-coral"
              href={link.href}
              key={link.label}
              rel="noreferrer"
              target="_blank"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex gap-4">
          <Link href="/">Home</Link>
          <Link href="/search">Search</Link>
          <Link href="/collections">Collection</Link>
        </div>
      </div>
    </footer>
  );
}
