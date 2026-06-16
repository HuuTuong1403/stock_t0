"use client";

import { useState } from "react";
import { Info, Lock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axiosClient from "@/lib/axiosClient";
import { getErrorMessage } from "@/lib/utils/error";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { DialogChangePass } from "./dialog-change-pass";

interface CardInfoProps {
  fullName: string;
  username: string;
  investorToken: string;
  initText: string;
  isAdmin: boolean;
}

export const CardInfo = ({
  fullName,
  username,
  investorToken,
  initText,
  isAdmin,
}: CardInfoProps) => {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [openChangePass, setOpenChangePass] = useState(false);

  const handleConnectApi = async () => {
    setConnecting(true);
    try {
      await axiosClient.post("/dnse/auth", {});
      toast.success("Kết nối API DNSE thành công");
      router.refresh();
    } catch (error: unknown) {
      console.error("DNSE connect error:", error);
      toast.error(getErrorMessage(error) || "Lỗi khi kết nối API DNSE");
    } finally {
      setConnecting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axiosClient.post("/auth/logout");
      router.push("/login");
      router.refresh();
    } catch (error: unknown) {
      console.error("Logout error:", error);
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 items-center justify-center">
            <div className="size-20 rounded-full bg-slate-700 flex items-center justify-center text-xl font-semibold text-emerald-300">
              {initText}
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <p className="text-white truncate">{fullName || username}</p>
              <p className="text-sm text-slate-500 text-center">
                {isAdmin ? "Admin" : "Người dùng"}
              </p>
              {investorToken && (
                <p className="text-base text-emerald-500 font-bold text-center">
                  Đã kết nối API DNSE
                </p>
              )}
            </div>
          </div>

          <div className="w-full h-0.5 bg-slate-700/50" />

          <div className="flex flex-row gap-2">
            {isAdmin && !investorToken && (
              <Button
                className="flex-1 h-auto text-lg"
                onClick={handleConnectApi}
                disabled={connecting}
              >
                <Info />
                {connecting ? "Đang kết nối..." : "Kết nối API DNSE"}
              </Button>
            )}

            <Button
              variant="secondary"
              className="flex-1 h-auto text-lg"
              onClick={() => setOpenChangePass(true)}
            >
              <Lock />
              Đổi mật khẩu
            </Button>

            <Button
              variant="destructive"
              className="flex-1 h-auto text-lg"
              onClick={handleLogout}
            >
              <LogOut />
              Đăng xuất
            </Button>
          </div>
        </CardContent>
      </Card>
      <DialogChangePass
        open={openChangePass}
        onOpenChange={setOpenChangePass}
      />
    </>
  );
};
