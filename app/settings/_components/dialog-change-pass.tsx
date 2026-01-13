import { toast } from "sonner";
import { useState } from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axiosClient from "@/lib/axiosClient";
import { getErrorMessage } from "@/lib/utils/error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DialogChangePassProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DialogChangePass = ({
  open,
  onOpenChange,
}: DialogChangePassProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
      await axiosClient.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Change password error:", error);
      toast.error(getErrorMessage(error) || "Đổi mật khẩu thất bại");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi mật khẩu</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-slate-300">
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
            <Label htmlFor="confirmPassword" className="text-slate-300">
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
      </DialogContent>
    </Dialog>
  );
};
