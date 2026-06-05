"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import axiosClient from "@/lib/axiosClient";
import { DNSE_TOKEN_EXPIRED_CODE } from "@/lib/constants/dnse";
import { getErrorMessage } from "@/lib/utils/error";
import { cn } from "@/lib/utils";

interface UpdatePricesButtonProps {
  onSuccess?: () => void;
  className?: string;
  variant?: "default" | "outline";
}

export function UpdatePricesButton({
  onSuccess,
  className,
  variant = "outline",
}: UpdatePricesButtonProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const { data } = await axiosClient.post("/stocks/update-prices");
      toast.success(
        data.message || `Cập nhật ${data.success}/${data.total} mã thành công`,
      );
      onSuccess?.();
    } catch (error) {
      const err = error as { code?: string; error?: string };
      if (err?.code === DNSE_TOKEN_EXPIRED_CODE) {
        toast.error(
          getErrorMessage(error) ||
            "Token DNSE đã hết hạn. Vui lòng cập nhật lại trong Cài đặt.",
        );
        router.push("/settings");
        return;
      }
      toast.error(getErrorMessage(error) || "Lỗi khi cập nhật giá thị trường");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={handleUpdate}
      disabled={updating}
      className={cn(
        variant === "outline"
          ? "border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
          : "bg-amber-500/90 hover:bg-amber-500 text-white",
        className,
      )}
    >
      <TrendingUp
        className={cn("h-3.5 w-3.5 mr-1.5", updating && "animate-pulse")}
      />
      {updating ? "Đang cập nhật giá..." : "Cập nhật giá"}
    </Button>
  );
}
