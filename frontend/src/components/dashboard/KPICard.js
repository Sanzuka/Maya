import React from "react";
import { TrendingUp } from "lucide-react";

export default function KPICard({ titulo, valor, delta }) {
  return (
    <div className="flex-1 bg-white dark:bg-[#1E2130] rounded-xl border border-[#E0E0E0] dark:border-[#2E3347] px-[22px] py-5">
      <p className="text-[13px] font-medium text-[#555555] dark:text-[#AAAAAA] uppercase tracking-wide">
        {titulo}
      </p>
      <p className="text-[32px] font-bold text-[#111111] dark:text-[#F0F0F0] mt-1.5 leading-10 tracking-tight">
        {valor}
      </p>
      {delta && (
        <div className="flex items-center gap-1.5 mt-2">
          <TrendingUp size={14} className="text-[#2D6A4F] dark:text-[#4CAF80]" />
          <span className="text-[13px] font-medium text-[#2D6A4F] dark:text-[#4CAF80]">
            {delta}
          </span>
        </div>
      )}
    </div>
  );
}
