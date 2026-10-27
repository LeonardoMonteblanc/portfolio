// src/ui/components/sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Tag,
  FileText,
  Settings,
  MessageSquare,
  Vote,
  Image,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/ui/components/button";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Solicitações", href: "/admin/solicitacoes", icon: FileText },
  { name: "Negócios", href: "/admin/negocios", icon: Building2 },
  { name: "Categorias", href: "/admin/categorias", icon: Tag },
  { name: "Fórum", href: "/admin/forum", icon: MessageSquare },
  { name: "Votações", href: "/admin/votacoes", icon: Vote },
  { name: "Imagens", href: "/admin/imagens", icon: Image },
  { name: "Configurações", href: "/admin/configuracoes", icon: Settings },
];

export function Sidebar({ admin }: { admin: { nome: string; email: string } }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div
          className={cn(
            "flex items-center justify-between h-16 px-4 border-b border-gray-200",
            collapsed && "justify-center",
          )}
        >
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <span className="font-semibold text-gray-900">Diretório</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("h-8 w-8", collapsed && "mx-auto")}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 p-4 space-y-1 overflow-y-auto"
          aria-label="Menu principal"
        >
          <ul className="space-y-1" role="list">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      collapsed && "justify-center px-2",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon
                      className="h-5 w-5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info & Logout */}
        <div
          className={cn(
            "p-4 border-t border-gray-200",
            collapsed && "items-center",
          )}
        >
          {!collapsed ? (
            <div className="space-y-2">
              <div className="px-3 py-2 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">
                  {admin.nome}
                </p>
                <p className="text-xs text-gray-500 truncate">{admin.email}</p>
              </div>
              <form action="/api/auth/logout" method="POST">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </Button>
              </form>
            </div>
          ) : (
            <form action="/api/auth/logout" method="POST">
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="mx-auto"
                aria-label="Sair"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
