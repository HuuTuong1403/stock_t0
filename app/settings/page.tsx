import { User } from "lucide-react";
import { redirect } from "next/navigation";

import { getServerUser } from "@/lib/services/auth";

import { CardInfo } from "./_components/card-info";

const SettingsPage = async () => {
  const user = await getServerUser();

  if (!user) return redirect("/login?");

  const isAdmin = user.type === "admin";
  const initText = user.fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <User className="h-7 w-7 text-amber-400" />
        Thông tin tài khoản
      </h1>

      <div className="flex items-start flex-col lg:flex-row gap-8">
        <CardInfo
          fullName={user.fullName}
          username={user.username}
          investorToken={user.investorToken}
          initText={initText}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
};

export default SettingsPage;
