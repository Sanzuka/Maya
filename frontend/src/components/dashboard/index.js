import React, { useState, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "./DashboardLayout";
import KPICard from "./KPICard";
import CreditChart from "./CreditChart";
import DistributionChart from "./DistributionChart";
import RecentDossiesTable from "./RecentDossiesTable";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard({ setScreen, setSelectedOp }) {
  const [stats, setStats] = useState(null);
  const [operacoes, setOperacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [statsRes, opsRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats`),
          axios.get(`${API}/operacoes?limit=10`),
        ]);
        setStats(statsRes.data);
        setOperacoes(opsRes.data.slice(0, 4));
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []);

  const formatCurrency = (val) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-[#888888] dark:text-[#666666]">
          Carregando...
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-[#E53935]">
          Erro ao carregar dados do dashboard.
        </div>
      </DashboardLayout>
    );
  }

  const kpis = [
    {
      titulo: "Dossiês Hoje",
      valor: stats.dossies_hoje.toString(),
      delta: "+3 vs ontem",
    },
    {
      titulo: "Este Mês",
      valor: stats.dossies_mes.toString(),
      delta: "meta: 60 dossiês",
    },
    {
      titulo: "Crédito (mês)",
      valor: formatCurrency(stats.credito_mes),
      delta: "encaminhado ao banco",
    },
    {
      titulo: "Docs Pendentes",
      valor: stats.docs_pendentes.toString(),
      delta: `de ${stats.total_produtores} produtores`,
    },
  ];

  const handleClickOp = (opId) => {
    setSelectedOp(opId);
    setScreen("dossie");
  };

  return (
    <DashboardLayout>
      {/* KPI Cards */}
      <div className="flex gap-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.titulo} {...kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="flex gap-4">
        <CreditChart />
        <DistributionChart />
      </div>

      {/* Recent Operations Table */}
      <RecentDossiesTable dossies={operacoes} onClickOp={handleClickOp} />
    </DashboardLayout>
  );
}
