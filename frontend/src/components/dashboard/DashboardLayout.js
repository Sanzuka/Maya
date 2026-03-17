import React from "react";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6 bg-[#F5F5F5] dark:bg-[#0F1117]">
      {children}
    </div>
  );
}
