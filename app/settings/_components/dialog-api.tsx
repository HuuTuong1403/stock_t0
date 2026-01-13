import { toast } from "sonner";
import { useState } from "react";
import { User, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import axiosClient from "@/lib/axiosClient";
import { getErrorMessage } from "@/lib/utils/error";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DialogApiProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DialogApi = ({ open, onOpenChange }: DialogApiProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axiosClient.post("/dnse/auth", { username, password });
      toast.success("Lấy thông tin thành công");
      router.refresh();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Login error:", error);
      toast.error(getErrorMessage(error) || "Lỗi khi lấy thông tin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kết nối API DNSE</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Đăng nhập tài khoản DNSE để lấy thông tin investor
        </DialogDescription>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-slate-300" htmlFor="username">
              Tài khoản DNSE
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
            {loading ? "Đang lấy thông tin..." : "Lấy thông tin"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
