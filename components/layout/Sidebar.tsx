"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Zap,
  TrendingUp,
  Coins,
  Landmark,
  Menu,
  X,
  ListOrdered,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import axiosClient from "@/lib/axiosClient";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, forAdmin: false },
  { name: "Cổ phiếu", href: "/stocks", icon: Building2, forAdmin: true },
  {
    name: "Cổ phiếu của bạn",
    href: "/stock-users",
    icon: ListOrdered,
    forAdmin: false,
  },
  { name: "Lệnh T0", href: "/t0-orders", icon: Zap, forAdmin: false },
  {
    name: "Lệnh dài hạn",
    href: "/long-term-orders",
    icon: TrendingUp,
    forAdmin: false,
  },
  { name: "Cổ tức", href: "/dividends", icon: Coins, forAdmin: false },
  { name: "CTCK", href: "/stock-companies", icon: Landmark, forAdmin: false },
];

interface SidebarProps {
  user: {
    fullName?: string;
    username?: string;
    avatar?: string;
    type?: string;
  } | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  let initText = "";

  if (user?.fullName) {
    initText = user.fullName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  if (user?.username) {
    initText = user.username.slice(0, 2).toUpperCase();
  }

  const handleLogout = async () => {
    await axiosClient.post("/auth/logout");
    router.push("/login");
    router.refresh();
  };

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-slate-700/50">
            <h1 className="text-xl font-bold bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Stock T0 Manager
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-6">
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              if (item.forAdmin && user?.type !== "admin") {
                return null;
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-linear-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      isActive ? "text-emerald-400" : "text-slate-500"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-700/50 p-4 space-y-3">
            {user && (
              <Link
                href="/settings"
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 rounded-lg p-2 -m-2 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-emerald-300">
                  {initText}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white truncate">
                    {user.fullName || user.username}
                  </p>
                  <p className="text-xs text-slate-500">
                    {user.type === "admin" ? "Admin" : "Người dùng"}
                  </p>
                </div>
              </Link>
            )}

            <Button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 mt-4"
              variant="outline"
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
