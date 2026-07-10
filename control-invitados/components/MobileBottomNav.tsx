"use client";

import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface Props {
  items: NavItem[];
}

export default function MobileBottomNav({ items }: Props) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[999999] bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 shadow-2xl pointer-events-auto touch-manipulation md:hidden">
      <div className="flex justify-around items-center">
        {items.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <a
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 p-4 min-w-0 flex-1 transition-all ${
                isActive
                  ? "text-primary bg-primary-fixed dark:bg-primary/30 font-bold"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
