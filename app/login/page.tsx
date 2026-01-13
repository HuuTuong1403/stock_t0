"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, User } from "lucide-react";
import Link from "next/link";
import axiosClient from "@/lib/axiosClient";
import { getErrorMessage } from "@/lib/utils/error";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axiosClient.post("/auth/login", { username, password });
      toast.success("Đăng nhập thành công");
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      console.error("Login error:", error);
      toast.error(getErrorMessage(error) || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 lg:-ml-64">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-white">
            Đăng nhập
          </CardTitle>
          <p className="text-center text-slate-400 text-sm">
            Quản lý danh mục T0 & dài hạn
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label className="text-slate-300" htmlFor="username">
                Tên đăng nhập
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-800 border-slate-700 text-white pl-9"
                  required
                />
                <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              disabled={loading}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
            <div className="text-center">
              <Link
                href="/register"
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Chưa có tài khoản? Đăng ký
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

