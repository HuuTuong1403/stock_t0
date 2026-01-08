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
  Lock,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu mới và xác nhận mật khẩu không khớp");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Đổi mật khẩu thất bại");
        return;
      }

      toast.success("Đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsPopoverOpen(false);
    } catch (error) {
      console.error("Change password error:", error);
      toast.error("Không thể đổi mật khẩu, vui lòng thử lại");
    } finally {
      setIsChangingPassword(false);
    }
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
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 rounded-lg p-2 -m-2 transition-colors"
                    onMouseEnter={() => setIsPopoverOpen(true)}
                    onMouseLeave={() => setIsPopoverOpen(false)}
                  >
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
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 bg-slate-800 border-slate-700"
                  side="right"
                  align="start"
                  onMouseEnter={() => setIsPopoverOpen(true)}
                  onMouseLeave={() => setIsPopoverOpen(false)}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-white flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Đổi mật khẩu
                      </h4>
                      <p className="text-sm text-slate-400">
                        Nhập mật khẩu hiện tại và mật khẩu mới
                      </p>
                    </div>
                    <form onSubmit={handleChangePassword} className="space-y-3">
                      <div className="space-y-2">
                        <Label
                          htmlFor="currentPassword"
                          className="text-slate-300"
                        >
                          Mật khẩu hiện tại
                        </Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="bg-slate-900 border-slate-600 text-white"
                          placeholder="Nhập mật khẩu hiện tại"
                          disabled={isChangingPassword}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-slate-300">
                          Mật khẩu mới
                        </Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-slate-900 border-slate-600 text-white"
                          placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                          disabled={isChangingPassword}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="confirmPassword"
                          className="text-slate-300"
                        >
                          Xác nhận mật khẩu mới
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-slate-900 border-slate-600 text-white"
                          placeholder="Nhập lại mật khẩu mới"
                          disabled={isChangingPassword}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isChangingPassword}
                      >
                        {isChangingPassword ? "Đang xử lý..." : "Đổi mật khẩu"}
                      </Button>
                    </form>
                  </div>
                </PopoverContent>
              </Popover>
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
