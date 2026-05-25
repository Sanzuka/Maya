import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function KPICard({ titulo, valor, delta, progressBar, onClick, clickable }) {
  return (
    <div
      className={`flex-1 bg-white dark:bg-[#1E2130] rounded-xl border border-[#E0E0E0] dark:border-[#2E3347] px-[22px] py-5 transition-all duration-150 ${clickable || onClick ? "cursor-pointer hover:border-[#A8852B] hover:shadow-sm" : ""}`}
      onClick={onClick}
    >
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
      {progressBar && (
        <div className="kpi-prog-wrap">
          <div className="kpi-prog-label">
            <span>{progressBar.atual} dossiês</span>
            <span>meta: {progressBar.meta}</span>
          </div>
          <div className="kpi-prog-bg">
            <div
              className="kpi-prog-fill"
              style={{
                width: `${Math.min(100, Math.round((progressBar.atual / progressBar.meta) * 100))}%`,
                background: progressBar.atual >= progressBar.meta ? "var(--green)" : "var(--gold)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
