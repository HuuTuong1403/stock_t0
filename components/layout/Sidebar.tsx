"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Zap,
  TrendingUp,
  Coins,
  Landmark,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Cổ phiếu", href: "/stocks", icon: Building2 },
  { name: "Lệnh T0", href: "/t0-orders", icon: Zap },
  { name: "Lệnh dài hạn", href: "/long-term-orders", icon: TrendingUp },
  { name: "Cổ tức", href: "/dividends", icon: Coins },
  { name: "CTCK", href: "/stock-companies", icon: Landmark },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    fullName?: string;
    username?: string;
    avatar?: string;
    type?: string;
  } | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        setUserInfo(data.user);
      } catch {
        // ignore
      }
    };
    fetchUser();
  }, [pathname]);

  const initials = useMemo(() => {
    if (!userInfo) return "";
    if (userInfo.fullName) {
      return userInfo.fullName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    if (userInfo.username) {
      return userInfo.username.slice(0, 2).toUpperCase();
    }
    return "";
  }, [userInfo]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUserInfo(null);
    router.push("/login");
    router.refresh();
  };

  if (pathname === "/login") {
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
            {userInfo && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-emerald-300">
                  {initials}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white truncate">
                    {userInfo.fullName || userInfo.username}
                  </p>
                  <p className="text-xs text-slate-500">
                    {userInfo.type === "admin" ? "Admin" : "Người dùng"}
                  </p>
                </div>
              </div>
            )}
            <Button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100"
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
