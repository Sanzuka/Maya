import React, { useEffect, useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// ─── Icones inline ────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  APPROVED: {
    label: "Conforme EUDR",
    color: "#16A34A",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    Icon: CheckIcon,
  },
  RISK: {
    label: "Risco EUDR",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    Icon: AlertIcon,
  },
  PENDING: {
    label: "Em análise",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    Icon: ClockIcon,
  },
};

// ─── Helper ────────────────────────────────────────────────────────────────────
function Row({ label, value, mono }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0",
      borderBottom:"1px solid #F3F4F6", gap:"12px", fontSize:"13px" }}>
      <span style={{ color:"#6B7280", flexShrink:0 }}>{label}</span>
      <span style={{ color:"#111827", textAlign:"right",
        fontFamily: mono ? "monospace" : undefined, fontSize: mono ? "11px" : "13px" }}>
        {value}
      </span>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function VerifyPage({ reportId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    fetch(`${BACKEND_URL}/api/laudos/${encodeURIComponent(reportId)}`)
      .then(res => {
        if (res.status === 404) { setNotFound(true); setLoading(false); return null; }
        return res.json();
      })
      .then(json => {
        if (json) setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [reportId]);

  const st = STATUS_MAP[data?.laudo?.seal_status] ?? STATUS_MAP.PENDING;
  const StatusIcon = st.Icon;

  const dateStr = data?.laudo?.generated_at
    ? new Date(data.laudo.generated_at).toLocaleDateString("pt-BR", {
        day:"2-digit", month:"long", year:"numeric", timeZone:"America/Sao_Paulo"
      })
    : "—";

  return (
    <div style={{ minHeight:"100vh", background:"#fff", fontFamily:"system-ui, sans-serif", color:"#111827" }}>

      {/* Header */}
      <header style={{ borderBottom:"1px solid #E5E7EB", padding:"14px 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <span style={{ fontSize:"14px", fontWeight:700, color:"#1A3D2B", letterSpacing:"0.06em" }}>MAYA</span>
          <span style={{ fontSize:"12px", color:"#6B7280", marginLeft:"8px" }}>Verificação EUDR</span>
        </div>
        <span style={{ fontSize:"11px", fontFamily:"monospace", color:"#9CA3AF" }}>
          {reportId?.slice(0, 12)}…
        </span>
      </header>

      <div style={{ maxWidth:"600px", margin:"0 auto", padding:"32px 20px" }}>

        {/* Loading */}
        {loading && (
          <p style={{ color:"#9CA3AF", fontSize:"14px" }}>Carregando dados do laudo…</p>
        )}

        {/* Não encontrado */}
        {!loading && notFound && (
          <div style={{ padding:"16px", background:"#FEF2F2", border:"1px solid #FECACA",
            borderRadius:"8px", color:"#DC2626", fontSize:"14px" }}>
            Laudo <code style={{ fontFamily:"monospace" }}>{reportId}</code> não encontrado.
            Verifique se o QR Code foi escaneado corretamente.
          </div>
        )}

        {/* Dados */}
        {!loading && data && (
          <>
            <h1 style={{ fontSize:"20px", fontWeight:700, marginBottom:"4px" }}>
              Verificação de Conformidade EUDR
            </h1>
            <p style={{ fontSize:"13px", color:"#6B7280", marginBottom:"28px" }}>
              Laudo emitido em {dateStr}
            </p>

            {/* Selo de status */}
            <div style={{ padding:"20px", borderRadius:"10px", background:st.bg,
              border:`1px solid ${st.border}`, marginBottom:"28px",
              display:"flex", alignItems:"center", gap:"14px" }}>
              <span style={{ color:st.color }}><StatusIcon/></span>
              <div>
                <div style={{ fontSize:"16px", fontWeight:700, color:st.color }}>{st.label}</div>
                <div style={{ fontSize:"12px", color:"#6B7280", marginTop:"2px" }}>
                  EU Regulation 2023/1115 · Referência 31/12/2020
                </div>
              </div>
            </div>

            {/* Dados do laudo */}
            <section style={{ marginBottom:"24px" }}>
              <h2 style={{ fontSize:"11px", fontWeight:600, color:"#6B7280",
                textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"10px" }}>
                Dados do laudo
              </h2>
              <Row label="Responsável técnico" value={data.laudo.producer_name ?? "—"} />
              <Row label="Município" value={data.laudo.municipality ?? "—"} />
              <Row label="Coordenadas"
                value={`${data.laudo.latitude?.toFixed(4)}, ${data.laudo.longitude?.toFixed(4)}`}
                mono />
              <Row label="Fontes" value="Geobases ES · MapBiomas Alertas" />
            </section>

            {/* Dados do produtor vinculado */}
            {data.produtor && (
              <section style={{ marginBottom:"24px" }}>
                <h2 style={{ fontSize:"11px", fontWeight:600, color:"#6B7280",
                  textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"10px" }}>
                  Cadastro do produtor
                </h2>
                <Row label="Nome" value={data.produtor.nome ?? "—"} />
                <Row label="Município" value={`${data.produtor.municipio} — ${data.produtor.uf}`} />
                {data.produtor.car && <Row label="CAR" value={data.produtor.car} mono />}
                {data.produtor.atividade && <Row label="Atividade" value={data.produtor.atividade} />}
              </section>
            )}

            {/* Hash criptográfico */}
            {data.laudo.verification_hash && (
              <section style={{ marginBottom:"24px" }}>
                <h2 style={{ fontSize:"11px", fontWeight:600, color:"#6B7280",
                  textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"10px" }}>
                  Identificador criptográfico
                </h2>
                <div style={{ background:"#F9FAFB", border:"1px solid #E5E7EB", borderRadius:"6px",
                  padding:"12px", fontFamily:"monospace", fontSize:"11px",
                  color:"#374151", wordBreak:"break-all" }}>
                  {data.laudo.verification_hash.slice(0, 32)}…
                </div>
              </section>
            )}

            <footer style={{ marginTop:"40px", paddingTop:"20px", borderTop:"1px solid #E5E7EB",
              fontSize:"11px", color:"#9CA3AF", textAlign:"center" }}>
              <p>Laudo gerado pela plataforma Maya © {new Date().getFullYear()} Antigravity</p>
              <p style={{ marginTop:"4px" }}>Conformidade EUDR — EU Regulation 2023/1115</p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
