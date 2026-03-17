import React from "react";

const defaultData = [
  { label: "Custeio Agrícola", value: 48, color: "bg-[#2D6A4F] dark:bg-[#4CAF80]" },
  { label: "Investimento", value: 31, color: "bg-[#52B788]" },
  { label: "Comercialização", value: 14, color: "bg-[#74C69D]" },
  { label: "Industrialização", value: 7, color: "bg-[#95D5B2]" },
];

export default function DistributionChart({
  title = "Por Finalidade",
  data = defaultData,
}) {
  return (
    <div className="flex-1 bg-white dark:bg-[#1E2130] rounded-xl border border-[#E0E0E0] dark:border-[#2E3347] px-[22px] py-5">
      <span className="text-base font-semibold text-[#111111] dark:text-[#F0F0F0]">
        {title}
      </span>

      <div className="mt-5 flex flex-col gap-3.5">
        {data.map(({ label, value, color }) => (
          <div key={label}>
            <div className="flex justify-between mb-1.5">
              <span className="text-[13px] text-[#555555] dark:text-[#AAAAAA]">
                {label}
              </span>
              <span className="text-[13px] font-semibold text-[#111111] dark:text-[#F0F0F0]">
                {value}%
              </span>
            </div>
            <div className="h-1.5 bg-[#E0E0E0] dark:bg-[#2E3347] rounded">
              <div
                className={`h-full rounded ${color}`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
