"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { NavItem } from "@/lib/navigation";

export const SidebarNav = ({ items }: { items: readonly NavItem[] }) => {
  const t = useTranslations("Nav");
  const shell = useTranslations("Shell");
  const pathname = usePathname();

  return (
    <nav aria-label={shell("mainNav")} className="flex flex-col gap-1">
      {items.map((item) => {
        // usePathname() from next-intl has the locale prefix already
        // stripped, so these compare against plain "/users"-style hrefs.
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        if (item.children && item.children.length > 0) {
          // A group: its name, then its screens indented beneath it. The name is
          // not a link of its own, so the page the reader is on is marked once,
          // on the screen itself.
          return (
            <div key={item.key} className="flex flex-col gap-1">
              <p className="px-4 pt-2 text-caption font-medium text-[color:var(--color-text-muted)]">{t(item.key)}</p>
              <ul className="flex flex-col gap-1 ps-3">
                {item.children.map((child) => {
                  const childActive = pathname.startsWith(child.href);
                  return (
                    <li key={child.key} className="flex flex-col">
                      <Link
                        href={child.href}
                        aria-current={childActive ? "page" : undefined}
                        className={`rounded-[var(--radius-md)] px-4 py-2.5 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] ${
                          childActive
                            ? "bg-[color:var(--color-surface-sunken)] font-medium text-[color:var(--color-text-primary)]"
                            : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-sunken)] hover:text-[color:var(--color-text-primary)] active:bg-[color:var(--color-surface-skeleton)]"
                        }`}
                      >
                        {t(child.key)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        }
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-[var(--radius-md)] px-4 py-2.5 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] ${
              active
                ? "bg-[color:var(--color-surface-sunken)] font-medium text-[color:var(--color-text-primary)]"
                : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-sunken)] hover:text-[color:var(--color-text-primary)] active:bg-[color:var(--color-surface-skeleton)]"
            }`}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
};
