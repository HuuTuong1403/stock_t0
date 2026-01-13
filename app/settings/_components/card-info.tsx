"use client";

import { useState } from "react";
import { Info, Lock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import axiosClient from "@/lib/axiosClient";
import { getErrorMessage } from "@/lib/utils/error";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { DialogApi } from "./dialog-api";
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
  const [open, setOpen] = useState(false);
  const [openChangePass, setOpenChangePass] = useState(false);

  const handleConnectApi = () => {
    setOpen(true);
  };

  const handleLogout = async () => {
    try {
      await axiosClient.post("/auth/logout");
      router.push("/login");
      router.refresh();
    } catch (error: unknown) {
      console.error("Logout error:", error);
      // Still redirect even if logout fails
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
              <Button className="flex-1 h-auto text-lg" onClick={handleConnectApi}>
                <Info />
                Kết nối API DNSE
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
      <DialogApi open={open} onOpenChange={setOpen} />
      <DialogChangePass
        open={openChangePass}
        onOpenChange={setOpenChangePass}
      />
    </>
  );
};
