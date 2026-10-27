// src/ui/components/header.tsx
"use client";

import { cn } from "@/lib/utils";
import { Menu, Bell, Search, User, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/ui/components/button";
import { useTheme } from "next-themes";

interface HeaderProps {
  admin: {
    nome: string;
    email: string;
  };
}

export function Header({ admin }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 bg-white border-b border-gray-200",
        "lg:pl-64",
      )}
    >
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Search */}
        <div className="hidden sm:block flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" aria-label="Notificações">
            <Bell className="h-5 w-5" />
          </Button>

          {/* User menu */}
          <div className="relative">
            <Button
              variant="ghost"
              className="gap-2 pr-3 pl-3"
              aria-label="Menu do usuário"
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-700" />
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {admin.nome}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
