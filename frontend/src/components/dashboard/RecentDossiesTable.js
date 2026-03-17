import React from "react";

const statusStyles = {
  pronto: "bg-[#E8F5E9] dark:bg-[#1B3A2D] text-[#2D6A4F] dark:text-[#4CAF80]",
  em_analise: "bg-[#FFF3E0] dark:bg-[#3E2A0A] text-[#F57C00] dark:text-[#FFB74D]",
  pendente: "bg-[#FFEBEE] dark:bg-[#3E1A1A] text-[#E53935] dark:text-[#E57373]",
  encaminhado: "bg-[#E3F2FD] dark:bg-[#1A2A3E] text-[#1976D2] dark:text-[#64B5F6]",
};

const statusLabels = {
  pronto: "Pronto",
  em_analise: "Em Análise",
  pendente: "Pendente",
  encaminhado: "Encaminhado",
};

const columns = ["Produtor", "Linha", "Valor", "Docs", "Status"];
const colWidths = [
  "w-[180px]",
  "w-[140px]",
  "w-[130px]",
  "flex-1",
  "w-[110px] text-right",
];

export default function RecentDossiesTable({ dossies = [], onClickOp }) {
  const formatCurrency = (val) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="bg-white dark:bg-[#1E2130] rounded-xl border border-[#E0E0E0] dark:border-[#2E3347] px-[22px] py-5">
      <div className="flex items-center justify-between mb-[18px]">
        <span className="text-base font-semibold text-[#111111] dark:text-[#F0F0F0]">
          Operações Recentes
        </span>
        <button className="text-[13px] font-medium text-[#2D6A4F] dark:text-[#4CAF80] hover:underline">
          Ver todas
        </button>
      </div>

      {/* Table head */}
      <div className="flex pb-2.5 border-b border-[#E0E0E0] dark:border-[#2E3347]">
        {columns.map((col, i) => (
          <span
            key={col}
            className={`text-xs font-semibold text-[#888888] dark:text-[#666666] uppercase tracking-widest ${colWidths[i]}`}
          >
            {col}
          </span>
        ))}
      </div>

      {/* Table rows */}
      {dossies.map((op, idx) => {
        const prog = op.progresso_docs || { ok: 0, total: 9, percentual: 0 };
        return (
          <div
            key={op.id ?? idx}
            className={`flex items-center py-[13px] cursor-pointer hover:bg-[#F5F5F5] dark:hover:bg-[#252840] transition-colors ${
              idx < dossies.length - 1
                ? "border-b border-[#F5F5F5] dark:border-[#252840]"
                : ""
            }`}
            onClick={() => onClickOp && onClickOp(op.id)}
          >
            <div className="w-[180px]">
              <span className="text-sm font-medium text-[#111111] dark:text-[#F0F0F0] block">
                {op.produtor?.nome || "N/A"}
              </span>
              <span className="text-xs text-[#888888] dark:text-[#666666]">
                {op.produtor?.municipio}
              </span>
            </div>
            <div className="w-[140px]">
              <span className="text-sm text-[#555555] dark:text-[#AAAAAA]">
                {op.linha}
              </span>
              <span className="text-xs text-[#888888] dark:text-[#666666] block">
                {op.modalidade}
              </span>
            </div>
            <span className="w-[130px] text-sm font-semibold text-[#111111] dark:text-[#F0F0F0]">
              {formatCurrency(op.valor)}
            </span>
            <div className="flex-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 max-w-[80px] bg-[#E0E0E0] dark:bg-[#2E3347] rounded">
                <div
                  className="h-full rounded bg-[#2D6A4F] dark:bg-[#4CAF80]"
                  style={{ width: `${prog.percentual}%` }}
                />
              </div>
              <span className="text-xs text-[#888888] dark:text-[#666666]">
                {prog.ok}/{prog.total}
              </span>
            </div>
            <span
              className={`w-[110px] text-center text-xs font-semibold px-2.5 py-[3px] rounded-full ${
                statusStyles[op.status] || statusStyles.pendente
              }`}
            >
              {statusLabels[op.status] || op.status}
            </span>
          </div>
        );
      })}

      {dossies.length === 0 && (
        <p className="text-sm text-[#888888] dark:text-[#666666] py-6 text-center">
          Nenhuma operação recente.
        </p>
      )}
    </div>
  );
}
