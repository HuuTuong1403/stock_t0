"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, User, UserCircle, Image } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    avatar: "",
  });
  const [loading, setLoading] = useState(false);
  const [canRegister, setCanRegister] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if registration is allowed (no users exist or user is admin)
    const checkRegistration = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const { user } = await res.json();

          if (user.type === "admin") {
            setCanRegister(true);
            return;
          }
        }
        // If not logged in or not admin, check if any users exist
        const checkRes = await fetch("/api/auth/check-registration");
        if (checkRes.ok) {
          const data = await checkRes.json();
          setCanRegister(data.allowed);
        } else {
          setCanRegister(true); // Default to allow if check fails
        }
      } catch (error) {
        console.error("Error checking registration:", error);
        setCanRegister(true); // Default to allow if check fails
      }
    };
    checkRegistration();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (formData.password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
          avatar: formData.avatar || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Đăng ký thất bại");
        setLoading(false);
        return;
      }

      toast.success("Đăng ký thành công");
      router.push("/login");
    } catch (error) {
      console.error("Register error:", error);
      toast.error("Không thể đăng ký, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  if (canRegister === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 lg:-ml-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (canRegister === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 lg:-ml-64">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-white">
              Đăng ký không khả dụng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-slate-400">
              Chỉ admin mới có thể tạo tài khoản mới. Vui lòng liên hệ admin để
              được tạo tài khoản.
            </p>
            <Link href="/login">
              <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
                Quay lại đăng nhập
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 lg:-ml-64">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-white">
            Đăng ký tài khoản
          </CardTitle>
          <p className="text-center text-slate-400 text-sm">
            Tạo tài khoản mới để quản lý danh mục
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label className="text-slate-300" htmlFor="fullName">
                Họ tên
              </Label>
              <div className="relative">
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="Nhập họ tên"
                  className="bg-slate-800 border-slate-700 text-white pl-9"
                  required
                />
                <UserCircle className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300" htmlFor="username">
                Tên đăng nhập
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="username"
                  className="bg-slate-800 border-slate-700 text-white pl-9"
                  required
                />
                <User className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300" htmlFor="password">
                Mật khẩu
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Tối thiểu 6 ký tự"
                  className="bg-slate-800 border-slate-700 text-white pl-9"
                  required
                  minLength={6}
                />
                <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300" htmlFor="confirmPassword">
                Xác nhận mật khẩu
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Nhập lại mật khẩu"
                  className="bg-slate-800 border-slate-700 text-white pl-9"
                  required
                />
                <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300" htmlFor="avatar">
                Avatar URL (tùy chọn)
              </Label>
              <div className="relative">
                <Input
                  id="avatar"
                  type="url"
                  value={formData.avatar}
                  onChange={(e) =>
                    setFormData({ ...formData, avatar: e.target.value })
                  }
                  placeholder="https://example.com/avatar.jpg"
                  className="bg-slate-800 border-slate-700 text-white pl-9"
                />
                <Image className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              disabled={loading}
            >
              {loading ? "Đang đăng ký..." : "Đăng ký"}
            </Button>
            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Đã có tài khoản? Đăng nhập
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
