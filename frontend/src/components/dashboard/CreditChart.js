import React from "react";

const defaultData = [
  { month: "Jan", value: 65 },
  { month: "Fev", value: 72 },
  { month: "Mar", value: 58 },
  { month: "Abr", value: 80 },
  { month: "Mai", value: 90, highlight: true },
  { month: "Jun", value: 75 },
  { month: "Jul", value: 68 },
];

export default function CreditChart({
  title = "Evolução de Crédito (2025)",
  data = defaultData,
  activeTab = "Mensal",
}) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="flex-[2] bg-white dark:bg-[#1E2130] rounded-xl border border-[#E0E0E0] dark:border-[#2E3347] px-[22px] py-5">
      <div className="flex items-center justify-between mb-5">
        <span className="text-base font-semibold text-[#111111] dark:text-[#F0F0F0]">
          {title}
        </span>
        <div className="flex gap-2">
          {["Mensal", "Trimestral"].map((tab) => (
            <span
              key={tab}
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                tab === activeTab
                  ? "bg-[#E8F5E9] dark:bg-[#1B3A2D] text-[#2D6A4F] dark:text-[#4CAF80]"
                  : "text-[#888888] dark:text-[#666666]"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-3 h-[140px]">
        {data.map(({ month, value, highlight }) => {
          const height = Math.round((value / maxValue) * 126);
          return (
            <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full rounded-t ${
                  highlight
                    ? "bg-[#2D6A4F] dark:bg-[#4CAF80]"
                    : "bg-[#B7DEC7] dark:bg-[#2E4A3E]"
                }`}
                style={{ height: `${height}px` }}
              />
              <span
                className={`text-[11px] ${
                  highlight
                    ? "text-[#2D6A4F] dark:text-[#4CAF80] font-semibold"
                    : "text-[#888888] dark:text-[#666666]"
                }`}
              >
                {month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
