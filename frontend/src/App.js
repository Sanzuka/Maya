import React, { useState, useEffect } from "react";
import axios from "axios";
import { AuthProvider, useAuth } from "./AuthContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, strokeWidth = 1.5, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {d.split(" M").map((seg, i) => (
      <path key={i} d={i === 0 ? seg : "M" + seg} />
    ))}
  </svg>
);

const IC = {
  home:    "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  users:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 108 0 4 4 0 00-8 0",
  prop:    "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10 M15 9l-3-3-3 3",
  ops:     "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  docs:    "M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z M13 2v7h7",
  dossie:  "M9 12h6 M9 16h6 M9 8h2 M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z",
  bell:    "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
  plus:    "M12 5v14 M5 12h14",
  arrow:   "M5 12h14 M12 5l7 7-7 7",
  back:    "M19 12H5 M12 19l-7-7 7-7",
  check:   "M20 6L9 17l-5-5",
  upload:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  alert:   "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  search:  "M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.35-4.35",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 106 0 3 3 0 00-6 0",
  send:    "M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z",
  trash:   "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6 M10 11v6 M14 11v6 M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  pdf:     "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M10 12a2 2 0 104 0 2 2 0 00-4 0 M8 18h8",
  logout:  "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  user:    "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
  shield:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────
const DOCS_TEMPLATE = [
  { id: "rg",      label: "RG / CPF",              obrig: true,  categoria: "Pessoal"     },
  { id: "caf",     label: "CAF (Declaração DAP)",   obrig: true,  categoria: "Rural"       },
  { id: "ccir",    label: "CCIR Quitado",           obrig: true,  categoria: "Imóvel"      },
  { id: "itr",     label: "ITR últimos 5 anos",     obrig: true,  categoria: "Imóvel"      },
  { id: "car",     label: "CAR (Ativo/Pendente)",   obrig: true,  categoria: "Ambiental"   },
  { id: "cafir",   label: "CAFIR",                  obrig: true,  categoria: "Rural"       },
  { id: "matricula", label: "Matrícula (<30 dias)", obrig: true,  categoria: "Imóvel"      },
  { id: "ie",      label: "Inscrição Estadual",     obrig: false, categoria: "Fiscal"      },
  { id: "zarc",    label: "Consulta ZARC",          obrig: true,  categoria: "Seguro"      },
];

const STATUS_CFG = {
  pronto:      { label: "Pronto",      color: "#6DB580", bg: "rgba(109,181,128,0.12)", border: "rgba(109,181,128,0.3)" },
  em_analise:  { label: "Em Análise",  color: "#C8A84B", bg: "rgba(200,168,75,0.12)",  border: "rgba(200,168,75,0.3)"  },
  pendente:    { label: "Pendente",    color: "#C05A4A", bg: "rgba(192,90,74,0.12)",   border: "rgba(192,90,74,0.3)"   },
  encaminhado: { label: "Encaminhado", color: "#7A9EC0", bg: "rgba(122,158,192,0.12)", border: "rgba(122,158,192,0.3)" },
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;1,400&family=Barlow+Condensed:wght@600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#0B0D09;--bg2:#111410;--bg3:#181C14;--bg4:#1E2318;--bg5:#242A1E;
  --gold:#C8A84B;--gold2:#A08030;--gold3:rgba(200,168,75,0.12);
  --green:#6DB580;--green2:#4A7C59;
  --red:#C05A4A;--blue:#7A9EC0;
  --text:#D4CCBA;--mid:#9A9E8A;--dim:#5A6050;
  --bdr:rgba(200,168,75,0.1);--bdr2:rgba(200,168,75,0.06);
}
body{background:var(--bg);color:var(--text);font-family:'IBM Plex Mono',monospace;font-size:16px;}
.app{display:flex;height:100vh;overflow:hidden;}

/* SIDEBAR */
.sb{width:196px;flex-shrink:0;background:var(--bg2);border-right:1px solid var(--bdr);display:flex;flex-direction:column;position:relative;}
.sb::after{content:'';position:absolute;top:0;right:-1px;width:1px;height:40%;background:linear-gradient(to bottom,var(--gold),transparent);opacity:.25;}
.sb-logo{padding:18px 16px 14px;border-bottom:1px solid var(--bdr2);}
.logo{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:26px;letter-spacing:3px;color:var(--gold);line-height:1;}
.logo-sub{font-size:8px;color:var(--dim);letter-spacing:1.5px;margin-top:3px;}
.sb-nav{flex:1;padding:10px 0;}
.ni{display:flex;align-items:center;gap:9px;padding:9px 14px;cursor:pointer;font-size:14px;color:var(--mid);letter-spacing:.3px;transition:all .15s;border:none;background:none;width:100%;text-align:left;position:relative;}
.ni:hover{color:var(--text);background:rgba(200,168,75,0.04);}
.ni.on{color:var(--gold);background:rgba(200,168,75,0.07);}
.ni.on::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--gold);}
.nb{margin-left:auto;background:var(--red);color:#fff;font-size:8px;font-weight:700;padding:1px 5px;border-radius:9px;}
.sb-foot{padding:11px 14px;border-top:1px solid var(--bdr2);font-size:8.5px;color:var(--dim);}
.sb-foot b{color:var(--mid);}
.safra{color:var(--green);font-size:8px;margin-top:3px;}

/* MAIN */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.topbar{height:50px;flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--bdr);display:flex;align-items:center;padding:0 20px;gap:14px;}
.tb-bc{font-size:13px;color:var(--text);letter-spacing:.6px;text-transform:uppercase;}
.tb-bc span{color:var(--gold);}
.tb-sp{flex:1;}
.tb-search{display:flex;align-items:center;gap:7px;background:var(--bg3);border:1px solid var(--bdr2);border-radius:4px;padding:5px 10px;font-size:9.5px;color:var(--dim);cursor:pointer;transition:border-color .15s;}
.tb-search:hover{border-color:var(--bdr);}
.tb-bell{position:relative;cursor:pointer;color:var(--mid);padding:4px;background:none;border:none;transition:color .15s;}
.tb-bell:hover{color:var(--gold);}
.tb-user{display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bg3);border:1px solid var(--bdr2);border-radius:4px;font-size:9px;}
.tb-user-name{color:var(--text);font-weight:500;}
.tb-user-role{color:var(--dim);font-size:7.5px;letter-spacing:1px;text-transform:uppercase;}
.tb-logout{padding:6px 10px;background:none;border:1px solid var(--bdr2);border-radius:4px;cursor:pointer;color:var(--mid);transition:all .15s;font-size:9px;}
.tb-logout:hover{border-color:var(--bdr);color:var(--red);}
.bdot{position:absolute;top:2px;right:2px;width:6px;height:6px;background:var(--red);border-radius:50%;border:1.5px solid var(--bg2);}
.tb-date{font-size:9px;color:var(--dim);padding-left:12px;border-left:1px solid var(--bdr2);}

/* SCROLL AREA */
.scroll{flex:1;overflow-y:auto;padding:18px 20px;scrollbar-width:thin;scrollbar-color:var(--bg4) transparent;}
.scroll::-webkit-scrollbar{width:4px;}
.scroll::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:2px;}

/* PANELS */
.panel{background:var(--bg2);border:1px solid var(--bdr2);border-radius:6px;overflow:hidden;}
.ph{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid var(--bdr2);}
.pt{font-size:12px;color:var(--gold);letter-spacing:1px;text-transform:uppercase;}
.pa{font-size:9px;color:var(--dim);cursor:pointer;letter-spacing:.4px;display:flex;align-items:center;gap:4px;background:none;border:none;transition:color .15s;}
.pa:hover{color:var(--gold);}

/* KPI */
.krow{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:14px;}
.kc{background:var(--bg2);border:1px solid var(--bdr2);border-radius:6px;padding:13px 15px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
.kc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--gold);opacity:0;transition:opacity .2s;}
.kc:hover{border-color:var(--bdr);background:var(--bg3);}
.kc:hover::before,.kc.on::before{opacity:1;}
.kc.on{border-color:rgba(200,168,75,.3);background:var(--gold3);}
.kl{font-size:12px;color:var(--text);letter-spacing:1px;text-transform:uppercase;margin-bottom:7px;}
.kv{font-family:'Barlow Condensed',sans-serif;font-size:34px;font-weight:800;color:var(--gold);line-height:1;margin-bottom:3px;}
.kv.g{color:var(--green);} .kv.b{color:var(--blue);} .kv.r{color:var(--red);}
.ks{font-size:12px;color:var(--mid);}

/* TABLE */
.tbl{width:100%;border-collapse:collapse;}
.tbl th{font-size:12px;color:var(--text);letter-spacing:0.8px;text-transform:uppercase;padding:9px 14px;text-align:left;border-bottom:1px solid var(--bdr);font-weight:600;}
.tbl td{padding:10px 14px;border-bottom:1px solid var(--bdr2);transition:background .1s;}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr.click{cursor:pointer;}
.tbl tr.click:hover td{background:rgba(200,168,75,.04);}
.prod-name{color:var(--text);font-weight:500;font-size:11.5px;}
.prod-sub{font-size:12px;color:var(--mid);margin-top:2px;}
.lb{font-size:8.5px;font-weight:600;letter-spacing:.8px;padding:2px 7px;border-radius:3px;display:inline-block;}
.lb.pronaf{color:var(--green);background:rgba(109,181,128,.12);border:1px solid rgba(109,181,128,.25);}
.lb.pronamp{color:var(--gold);background:rgba(200,168,75,.1);border:1px solid rgba(200,168,75,.2);}
.lb.livre{color:var(--blue);background:rgba(122,158,192,.1);border:1px solid rgba(122,158,192,.2);}
.sb2{font-size:9px;letter-spacing:.4px;padding:3px 8px;border-radius:3px;display:inline-block;font-weight:500;}
.pbar{display:flex;align-items:center;gap:7px;}
.pbg{flex:1;height:3px;background:var(--bg4);border-radius:2px;overflow:hidden;min-width:44px;}
.pbf{height:100%;border-radius:2px;}
.pct{font-size:8.5px;color:var(--dim);white-space:nowrap;}

/* GRID */
.g2{display:grid;grid-template-columns:1fr 268px;gap:12px;}
.side{display:flex;flex-direction:column;gap:12px;}
.arow{display:flex;gap:9px;align-items:flex-start;padding:9px 14px;border-bottom:1px solid var(--bdr2);font-size:9.5px;color:var(--mid);line-height:1.4;}
.arow:last-child{border-bottom:none;}
.adot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:3px;}
.adot.w{background:var(--gold);box-shadow:0 0 5px var(--gold2);}
.adot.ok{background:var(--green);}
.strow{display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid var(--bdr2);font-size:10px;}
.strow:last-child{border-bottom:none;}
.stl{color:var(--dim);}
.stv{color:var(--text);font-weight:500;}
.stv.g{color:var(--green);} .stv.gold{color:var(--gold);}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:6px;font-family:'IBM Plex Mono',monospace;font-size:13px;letter-spacing:.5px;padding:8px 14px;border-radius:4px;cursor:pointer;transition:all .15s;border:none;}
.btn-gold{background:rgba(200,168,75,.1);border:1px solid rgba(200,168,75,.3) !important;color:var(--gold);}
.btn-gold:hover{background:rgba(200,168,75,.18);border-color:rgba(200,168,75,.5) !important;}
.btn-green{background:rgba(109,181,128,.1);border:1px solid rgba(109,181,128,.3) !important;color:var(--green);}
.btn-green:hover{background:rgba(109,181,128,.2);}
.btn-red{background:rgba(192,90,74,.1);border:1px solid rgba(192,90,74,.3) !important;color:var(--red);}
.btn-red:hover{background:rgba(192,90,74,.18);}
.btn-ghost{background:none;border:1px solid var(--bdr2) !important;color:var(--mid);}
.btn-ghost:hover{border-color:var(--bdr) !important;color:var(--text);}

/* SECTION LABEL */
.sl{font-size:12px;color:var(--text);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:11px;display:flex;align-items:center;gap:8px;}
.sl::after{content:'';flex:1;height:1px;background:var(--bdr2);}

/* FORM */
.form-grid{display:grid;gap:14px;}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.form-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
.fg{display:flex;flex-direction:column;gap:5px;}
.fg label{font-size:12px;color:var(--text);letter-spacing:0.5px;text-transform:uppercase;}
.fg input,.fg select{background:var(--bg3);border:1px solid rgba(200,168,75,0.2);border-radius:4px;padding:10px 12px;color:var(--text);font-family:'IBM Plex Mono',monospace;font-size:15px;outline:none;transition:border-color .15s;}
.fg input:focus,.fg select:focus{border-color:rgba(200,168,75,.4);}
.fg input::placeholder{color:var(--dim);}
.fg select option{background:var(--bg3);}
.form-section{background:var(--bg3);border:1px solid var(--bdr2);border-radius:6px;padding:16px;}
.form-section-title{font-size:12px;color:var(--gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:13px;padding-bottom:8px;border-bottom:1px solid var(--bdr2);}
.enquad-box{border-radius:6px;padding:13px 16px;margin-top:14px;border:1px solid;}
.tag-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:4px;font-size:9px;letter-spacing:.5px;font-weight:600;}

/* CHECKLIST */
.doc-item{display:flex;align-items:center;gap:11px;padding:10px 14px;border-bottom:1px solid var(--bdr2);transition:background .15s;cursor:pointer;}
.doc-item:last-child{border-bottom:none;}
.doc-item:hover{background:rgba(200,168,75,.03);}
.doc-check{width:20px;height:20px;border-radius:3px;border:1.5px solid;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;}
.doc-info{flex:1;}
.doc-name{font-size:11px;color:var(--text);}
.doc-cat{font-size:8.5px;color:var(--dim);margin-top:2px;}
.doc-badge{font-size:8px;letter-spacing:.5px;padding:2px 6px;border-radius:3px;margin-left:auto;}
.doc-actions{display:flex;gap:6px;opacity:0;transition:opacity .15s;}
.doc-item:hover .doc-actions{opacity:1;}

/* DOSSIE */
.dossie-header{background:var(--bg3);border:1px solid var(--bdr);border-radius:6px;padding:20px 24px;margin-bottom:14px;}
.dossie-id{font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:800;color:var(--gold);letter-spacing:2px;}
.dossie-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;}
.dossie-block{background:var(--bg2);border:1px solid var(--bdr2);border-radius:6px;padding:14px 16px;}
.db-title{font-size:8.5px;color:var(--gold);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--bdr2);}
.db-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;}
.db-key{color:var(--dim);}
.db-val{color:var(--text);}
.dossie-timeline{background:var(--bg2);border:1px solid var(--bdr2);border-radius:6px;padding:14px 16px;}
.tl-item{display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--bdr2);font-size:10px;}
.tl-item:last-child{border-bottom:none;}
.tl-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:3px;}
.tl-text{color:var(--mid);flex:1;}
.tl-date{color:var(--dim);font-size:9px;white-space:nowrap;}
.loading{text-align:center;padding:40px;color:var(--mid);font-size:11px;}
.error{background:rgba(192,90,74,.1);border:1px solid rgba(192,90,74,.3);border-radius:6px;padding:12px 16px;color:var(--red);font-size:10px;margin-bottom:14px;}
.success{background:rgba(109,181,128,.1);border:1px solid rgba(109,181,128,.3);border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:10px;color:var(--green);display:flex;align-items:center;gap:8px;}
`;

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({ setScreen, setSelectedOp }) {
  const [activeKpi, setActiveKpi] = useState(null);
  const [stats, setStats] = useState(null);
  const [operacoes, setOperacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [statsRes, opsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/operacoes?limit=10`)
      ]);
      setStats(statsRes.data);
      setOperacoes(opsRes.data.slice(0, 4));
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      setLoading(false);
    }
  };

  if (loading) return <div className="scroll"><div className="loading">Carregando...</div></div>;
  if (!stats) return <div className="scroll"><div className="error">Erro ao carregar dados</div></div>;

  const formatCurrency = (val) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(val);

  return (
    <div className="scroll">
      <div className="krow">
        {[
          { k:"hoje",     label:"Dossiês Hoje",    val:stats.dossies_hoje.toString(),     cls:"",  sub:"+3 vs ontem" },
          { k:"mes",      label:"Este Mês",         val:stats.dossies_mes.toString(),      cls:"g", sub:`meta: 60 dossiês` },
          { k:"credito",  label:"Crédito (mês)",    val:formatCurrency(stats.credito_mes), cls:"b", sub:"encaminhado ao banco" },
          { k:"pend",     label:"Docs Pendentes",   val:stats.docs_pendentes.toString(),   cls:"r", sub:`de ${stats.total_produtores} produtores` },
        ].map(k => (
          <div key={k.k} className={`kc ${activeKpi===k.k?"on":""}`} onClick={()=>setActiveKpi(activeKpi===k.k?null:k.k)}>
            <div className="kl">{k.label}</div>
            <div className={`kv ${k.cls}`}>{k.val}</div>
            <div className="ks">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="g2">
        <div>
          <div className="sl">Operações Recentes</div>
          <div className="panel">
            <div className="ph">
              <span className="pt">[ Operações Ativas ]</span>
              <div style={{display:"flex",gap:9}}>
                <button className="btn btn-gold" onClick={()=>setScreen("operacoes")}>
                  <Icon d={IC.plus} size={11}/> NOVA
                </button>
                <button className="pa" onClick={()=>setScreen("operacoes")}>
                  VER TODAS <Icon d={IC.arrow} size={10}/>
                </button>
              </div>
            </div>
            <table className="tbl">
              <thead><tr>
                <th>Produtor</th><th>Linha</th><th>Valor</th><th>Docs</th><th>Status</th>
              </tr></thead>
              <tbody>
                {operacoes.map(op => {
                  const p = op.produtor;
                  const prog = op.progresso_docs || {ok:0, total:9, percentual:0};
                  const pct = prog.percentual;
                  const pc = pct===100?"var(--green)":pct>=60?"var(--gold)":"var(--red)";
                  const st = STATUS_CFG[op.status] || STATUS_CFG.pendente;
                  return (
                    <tr key={op.id} className="click" onClick={()=>{setSelectedOp(op.id);setScreen("dossie");}}>
                      <td>
                        <div className="prod-name">{p?.nome || "N/A"}</div>
                        <div className="prod-sub">{p?.municipio} · {op.id}</div>
                      </td>
                      <td>
                        <span className={`lb ${op.linha.toLowerCase()}`}>{op.linha}</span>
                        <div className="prod-sub" style={{marginTop:3}}>{op.modalidade}</div>
                      </td>
                      <td style={{color:"var(--text)",fontSize:11}}>
                        {formatCurrency(op.valor)}
                      </td>
                      <td>
                        <div className="pbar">
                          <div className="pbg"><div className="pbf" style={{width:`${pct}%`,background:pc}}/></div>
                          <span className="pct">{prog.ok}/{prog.total}</span>
                        </div>
                      </td>
                      <td>
                        <span className="sb2" style={{color:st.color,background:st.bg,border:`1px solid ${st.border}`}}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="side">
          <div className="sl">Alertas</div>
          <div className="panel">
            <div className="ph"><span className="pt">[ Atenção ]</span><span style={{fontSize:9,color:"var(--red)"}}>2 urgentes</span></div>
            {[
              {t:"w",m:"Documentos pendentes em 3 operações"},
              {t:"w",m:"ZARC não consultado em algumas operações"},
              {t:"ok",m:`${stats.dossies_mes} dossiês criados este mês`},
              {t:"ok",m:`Taxa de aprovação: ${stats.taxa_aprovacao}%`},
            ].map((a,i)=>(
              <div key={i} className="arow">
                <div className={`adot ${a.t}`}/>
                {a.m}
              </div>
            ))}
          </div>
          <div className="sl">Escritório</div>
          <div className="panel">
            <div className="ph"><span className="pt">[ Estatísticas ]</span></div>
            {[
              ["Produtores",stats.total_produtores.toString(),""],
              ["Taxa aprovação",`${stats.taxa_aprovacao}%`,"g"],
              ["Tempo médio","28 min",""],
              ["Banco principal","Sicoob","gold"],
              ["Próx. vencimento","3 dias",""],
            ].map(([l,v,c])=>(
              <div key={l} className="strow">
                <span className="stl">{l}</span>
                <span className={`stv ${c}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: CADASTRO DE PRODUTOR
// ─────────────────────────────────────────────────────────────────────────────
function CadastroProd({ setScreen }) {
  const [form, setForm] = useState({ nome:"", cpf:"", estado_civil:"solteiro", municipio:"", uf:"ES", renda:"", modulos:"", atividade:"", caf:"", ccir:"", car:"", cafir:"" });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const renda = parseFloat(form.renda) || 0;
  const enquad = renda <= 360000 ? { label:"PRONAF", color:"var(--green)", bg:"rgba(109,181,128,.12)", border:"rgba(109,181,128,.3)", desc:"Renda ≤ R$360k · Limite R$250k/ano · Taxa 3–6% a.a. · CAF obrigatório" }
    : renda <= 1760000 ? { label:"PRONAMP", color:"var(--gold)", bg:"rgba(200,168,75,.12)", border:"rgba(200,168,75,.3)", desc:"Renda R$360k–R$1,76M · Limite R$1,5M/ano · Taxa 8% a.a." }
    : { label:"Livre", color:"var(--blue)", bg:"rgba(122,158,192,.12)", border:"rgba(122,158,192,.3)", desc:"Renda > R$1,76M · Sem limite · Crédito livre" };

  const salvar = async () => {
    setError("");
    setLoading(true);
    try {
      await axios.post(`${API}/produtores`, {
        nome: form.nome,
        cpf: form.cpf,
        estado_civil: form.estado_civil,
        municipio: form.municipio,
        uf: form.uf,
        renda: parseFloat(form.renda) || 0,
        modulos: parseFloat(form.modulos) || 0,
        atividade: form.atividade,
        caf: form.caf,
        ccir: form.ccir,
        car: form.car,
        cafir: form.cafir
      });
      setSaved(true);
      setTimeout(() => {
        setScreen("dashboard");
      }, 2000);
    } catch (err) {
      setError("Erro ao salvar produtor: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scroll">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div className="sl" style={{marginBottom:4}}>Cadastro</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,color:"var(--text)",letterSpacing:1}}>Novo Produtor Rural</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost" onClick={()=>setScreen("dashboard")}>
            <Icon d={IC.back} size={11}/> VOLTAR
          </button>
          <button className="btn btn-green" onClick={salvar} disabled={loading}>
            <Icon d={IC.check} size={11}/> {loading?"SALVANDO...":"SALVAR PRODUTOR"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {saved && (
        <div className="success">
          <Icon d={IC.check} size={13}/> Produtor salvo com sucesso! Motor de enquadramento atualizado.
        </div>
      )}

      <div className="form-grid" style={{gap:14}}>
        {/* Dados Pessoais */}
        <div className="form-section">
          <div className="form-section-title">Dados Pessoais</div>
          <div className="form-row" style={{marginBottom:12}}>
            <div className="fg"><label>Nome Completo</label><input value={form.nome} onChange={e=>set("nome",e.target.value)} placeholder="Ex: João da Silva Pereira"/></div>
            <div className="fg"><label>CPF</label><input value={form.cpf} onChange={e=>set("cpf",e.target.value)} placeholder="000.000.000-00"/></div>
          </div>
          <div className="form-row3">
            <div className="fg"><label>Estado Civil</label>
              <select value={form.estado_civil} onChange={e=>set("estado_civil",e.target.value)}>
                <option value="solteiro">Solteiro(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viuvo">Viúvo(a)</option>
              </select>
            </div>
            <div className="fg"><label>Município</label><input value={form.municipio} onChange={e=>set("municipio",e.target.value)} placeholder="Marilândia"/></div>
            <div className="fg"><label>UF</label>
              <select value={form.uf} onChange={e=>set("uf",e.target.value)}>
                {["ES","MG","BA","GO","MT","MS","PR","SP","RS"].map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Dados Rurais */}
        <div className="form-section">
          <div className="form-section-title">Dados da Atividade Rural</div>
          <div className="form-row" style={{marginBottom:12}}>
            <div className="fg">
              <label>Renda Bruta Anual (R$)</label>
              <input type="number" value={form.renda} onChange={e=>set("renda",e.target.value)} placeholder="Ex: 180000"/>
            </div>
            <div className="fg">
              <label>Módulos Fiscais</label>
              <input type="number" step="0.1" value={form.modulos} onChange={e=>set("modulos",e.target.value)} placeholder="Ex: 3.5"/>
            </div>
          </div>
          <div className="fg">
            <label>Atividade Principal</label>
            <select value={form.atividade} onChange={e=>set("atividade",e.target.value)}>
              <option value="">Selecione...</option>
              {["Cafeicultura","Pecuária","Horticultura","Fruticultura","Silvicultura","Apicultura","Aquicultura","Grãos"].map(a=><option key={a}>{a}</option>)}
            </select>
          </div>

          {renda > 0 && (
            <div className="enquad-box" style={{background:enquad.bg,borderColor:enquad.border}}>
              <div style={{fontSize:8.5,color:"var(--dim)",letterSpacing:1.5,marginBottom:5}}>ENQUADRAMENTO AUTOMÁTICO</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,color:enquad.color}}>{enquad.label}</span>
                <span style={{fontSize:9.5,color:"var(--mid)"}}>{enquad.desc}</span>
              </div>
            </div>
          )}
        </div>

        {/* Documentos Rurais */}
        <div className="form-section">
          <div className="form-section-title">Registros e Certificados</div>
          <div className="form-row" style={{marginBottom:12}}>
            <div className="fg"><label>Nº CAF</label><input value={form.caf} onChange={e=>set("caf",e.target.value)} placeholder="CAF-ES-00000"/></div>
            <div className="fg"><label>Nº CCIR</label><input value={form.ccir} onChange={e=>set("ccir",e.target.value)} placeholder="CCIR-2024-00"/></div>
          </div>
          <div className="form-row">
            <div className="fg"><label>Nº CAR</label><input value={form.car} onChange={e=>set("car",e.target.value)} placeholder="ES-0000000"/></div>
            <div className="fg"><label>Nº CAFIR</label><input value={form.cafir} onChange={e=>set("cafir",e.target.value)} placeholder="CAFIR-0000"/></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: OPERAÇÕES / ENQUADRAMENTO
// ─────────────────────────────────────────────────────────────────────────────
function Operacoes({ setScreen, setSelectedOp }) {
  const [filter, setFilter] = useState("todas");
  const [form, setForm] = useState({ prod_id:"", linha:"PRONAF", modalidade:"Custeio Agrícola", valor:"", cultura:"", banco:"Sicoob" });
  const [glebaForm, setGlebaForm] = useState({ codigo_car:"", area_contratada_ha:"", municipio_ibge:"", descricao:"", vertices_raw:"", identificacao:1 });
  const [glebaAlerta, setGlebaAlerta] = useState(null);
  const [verificandoGleba, setVerificandoGleba] = useState(false);
  const [showGleba, setShowGleba] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [operacoes, setOperacoes] = useState([]);
  const [produtores, setProdutores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    carregarDados();
  }, [filter]);

  const carregarDados = async () => {
    try {
      const [opsRes, prodsRes] = await Promise.all([
        axios.get(`${API}/operacoes${filter !== "todas" ? `?status=${filter}` : ""}`),
        axios.get(`${API}/produtores`)
      ]);
      setOperacoes(opsRes.data);
      setProdutores(prodsRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setLoading(false);
    }
  };

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const prod = produtores.find(p=>p.id===form.prod_id);
  const renda = prod?.renda || 0;
  const enquad = renda <= 360000 ? {label:"PRONAF",color:"var(--green)",desc:"Limite R$250k · Taxa 3–6% a.a."}
    : renda <= 1760000 ? {label:"PRONAMP",color:"var(--gold)",desc:"Limite R$1,5M · Taxa 8% a.a."}
    : {label:"Livre",color:"var(--blue)",desc:"Crédito livre"};

  // Parsear vértices SIRGAS2000 da entrada livre (lat,lon por linha)
  const parseVertices = (raw) => {
    if (!raw || !raw.trim()) return [];
    return raw.trim().split("\n").map((line, i) => {
      const parts = line.trim().split(/[,;\s]+/);
      if (parts.length < 2) return null;
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      const alt = parts[2] ? parseFloat(parts[2]) : null;
      if (isNaN(lat) || isNaN(lon)) return null;
      return { seq: i + 1, lat: parseFloat(lat.toFixed(6)), lon: parseFloat(lon.toFixed(6)), alt };
    }).filter(Boolean);
  };

  // Verificação pré-contratação (MCR 3-6-3-b)
  const verificarGleba = async () => {
    if (!form.prod_id || !glebaForm.codigo_car) return;
    setVerificandoGleba(true);
    setGlebaAlerta(null);
    try {
      const params = new URLSearchParams({
        prod_id: form.prod_id,
        codigo_car: glebaForm.codigo_car,
        area_contratada_ha: glebaForm.area_contratada_ha || 0
      });
      const r = await axios.post(`${API}/verificar-gleba?${params}`);
      setGlebaAlerta(r.data);
    } catch(e) {
      console.error(e);
    }
    setVerificandoGleba(false);
  };

  const criarOperacao = async () => {
    setError("");
    setSuccess("");
    try {
      const vertices = parseVertices(glebaForm.vertices_raw);
      const gleba = showGleba ? {
        identificacao: parseInt(glebaForm.identificacao) || 1,
        codigo_car: glebaForm.codigo_car || "",
        area_contratada_ha: parseFloat(glebaForm.area_contratada_ha) || null,
        municipio_ibge: glebaForm.municipio_ibge || "",
        descricao: glebaForm.descricao || "",
        vertices: vertices
      } : null;

      const res = await axios.post(`${API}/operacoes`, {
        prod_id: form.prod_id,
        linha: form.linha,
        modalidade: form.modalidade,
        valor: parseFloat(form.valor) || 0,
        cultura: form.cultura,
        banco: form.banco,
        gleba
      });

      // Exibir alerta de sobreposição se houver
      if (res.data?.alerta_gleba) {
        const al = res.data.alerta_gleba;
        if (al.status === "conflito") {
          setSuccess("Operação criada com ALERTA: " + al.conflitos.map(c=>c.referencia_mcr||c.tipo).join("; "));
        } else if (al.status?.includes("tolerancia")) {
          setSuccess("Operação criada — verificar tolerância de área MCR: " + al.status);
        } else {
          setSuccess("Operação criada com sucesso!");
        }
      } else {
        setSuccess("Operação criada com sucesso!");
      }

      setShowForm(false);
      setShowGleba(false);
      setGlebaAlerta(null);
      setForm({ prod_id:"", linha:"PRONAF", modalidade:"Custeio Agrícola", valor:"", cultura:"", banco:"Sicoob" });
      setGlebaForm({ codigo_car:"", area_contratada_ha:"", municipio_ibge:"", descricao:"", vertices_raw:"", identificacao:1 });
      carregarDados();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError("Erro ao criar operação: " + (err.response?.data?.detail || err.message));
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(val);

  if (loading) return <div className="scroll"><div className="loading">Carregando...</div></div>;

  return (
    <div className="scroll">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div className="sl" style={{marginBottom:4}}>Operações</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,color:"var(--text)",letterSpacing:1}}>Gestão de Operações</div>
        </div>
        <button className="btn btn-gold" onClick={()=>setShowForm(!showForm)}>
          <Icon d={showForm ? IC.back : IC.plus} size={11}/> {showForm?"CANCELAR":"NOVA OPERAÇÃO"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success"><Icon d={IC.check} size={13}/> {success}</div>}

      {showForm && (
        <div className="form-section" style={{marginBottom:14}}>
          <div className="form-section-title">Nova Operação de Crédito</div>
          <div className="form-row" style={{marginBottom:12}}>
            <div className="fg">
              <label>Produtor</label>
              <select value={form.prod_id} onChange={e=>set("prod_id",e.target.value)}>
                <option value="">Selecione o produtor...</option>
                {produtores.map(p=><option key={p.id} value={p.id}>{p.nome} — {p.municipio}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Banco</label>
              <select value={form.banco} onChange={e=>set("banco",e.target.value)}>
                {["Sicoob","Banco do Brasil","Caixa Econômica","Bradesco"].map(b=><option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          {prod && (
            <div style={{background:"rgba(200,168,75,.06)",border:"1px solid var(--bdr2)",borderRadius:4,padding:"8px 12px",marginBottom:12,fontSize:9.5,color:"var(--mid)"}}>
              <b style={{color:enquad.color}}>{enquad.label}</b> · {prod.nome} · Renda: {formatCurrency(renda)} · {enquad.desc}
            </div>
          )}
          <div className="form-row3" style={{marginBottom:12}}>
            <div className="fg">
              <label>Linha</label>
              <select value={form.linha} onChange={e=>set("linha",e.target.value)}>
                <option>PRONAF</option><option>PRONAMP</option><option>Livre</option>
              </select>
            </div>
            <div className="fg">
              <label>Modalidade</label>
              <select value={form.modalidade} onChange={e=>set("modalidade",e.target.value)}>
                {["Custeio Agrícola","Custeio Pecuário","Investimento","Mais Alimentos"].map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Cultura / Atividade</label>
              <select value={form.cultura} onChange={e=>set("cultura",e.target.value)}>
                <option value="">Selecione...</option>
                {["Café","Milho","Soja","Tomate","Pasto","Eucalipto","Feijão"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row" style={{marginBottom:12}}>
            <div className="fg">
              <label>Valor Solicitado (R$)</label>
              <input type="number" value={form.valor} onChange={e=>set("valor",e.target.value)} placeholder="Ex: 85000"/>
            </div>
          </div>

          {/* SEÇÃO GLEBA — MCR 2-1-2 / SICOR Campo 25 */}
          <div style={{borderTop:"1px solid var(--bdr)",paddingTop:12,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showGleba?10:0}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"var(--dim)"}}>
                LOCALIZAÇÃO DA GLEBA <span style={{color:"var(--gold)",fontSize:9,marginLeft:6}}>MCR 2-1-2 · SICOR Campo 25</span>
              </div>
              <button className={`btn ${showGleba?"btn-ghost":"btn-ghost"}`} style={{fontSize:9,padding:"3px 10px"}}
                onClick={()=>setShowGleba(!showGleba)}>
                {showGleba ? "▲ OCULTAR" : "▼ INFORMAR GLEBA"}
              </button>
            </div>

            {showGleba && (
              <div>
                <div className="form-row3" style={{marginBottom:8}}>
                  <div className="fg">
                    <label>Código CAR da Gleba</label>
                    <input value={glebaForm.codigo_car}
                      onChange={e=>setGlebaForm(f=>({...f,codigo_car:e.target.value}))}
                      placeholder="ES-3200300-..." style={{fontFamily:"monospace",fontSize:11}}/>
                  </div>
                  <div className="fg">
                    <label>Área Contratada (ha)</label>
                    <input type="number" step="0.01" value={glebaForm.area_contratada_ha}
                      onChange={e=>setGlebaForm(f=>({...f,area_contratada_ha:e.target.value}))}
                      placeholder="Ex: 3.5"/>
                  </div>
                  <div className="fg">
                    <label>Cód. Município IBGE</label>
                    <input value={glebaForm.municipio_ibge}
                      onChange={e=>setGlebaForm(f=>({...f,municipio_ibge:e.target.value}))}
                      placeholder="Ex: 3200300" style={{fontFamily:"monospace",fontSize:11}}/>
                  </div>
                </div>

                <div style={{marginBottom:8}}>
                  <label style={{fontSize:10,color:"var(--dim)",fontWeight:600,letterSpacing:.5,display:"block",marginBottom:4}}>
                    VÉRTICES DO PERÍMETRO — SIRGAS2000 (uma linha por ponto: lat, lon, alt)
                  </label>
                  <textarea
                    value={glebaForm.vertices_raw}
                    onChange={e=>setGlebaForm(f=>({...f,vertices_raw:e.target.value}))}
                    placeholder={"-19.420512, -40.552301, 680\n-19.421045, -40.551890, 682\n-19.420800, -40.551200, 679\n..."}
                    rows={5}
                    style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,
                      padding:"7px 10px",fontSize:11,color:"var(--text)",fontFamily:"monospace",
                      boxSizing:"border-box",resize:"vertical"}}/>
                  <div style={{fontSize:9,color:"var(--dim)",marginTop:3}}>
                    Sistema de referência: SIRGAS2000 · 6 casas decimais · máx. 100 pontos por gleba · altitude em metros (opcional)
                  </div>
                </div>

                <div style={{marginBottom:8}}>
                  <label style={{fontSize:10,color:"var(--dim)",fontWeight:600,letterSpacing:.5,display:"block",marginBottom:4}}>DESCRIÇÃO DA GLEBA</label>
                  <input value={glebaForm.descricao}
                    onChange={e=>setGlebaForm(f=>({...f,descricao:e.target.value}))}
                    placeholder="Ex: Talhão norte — área de café arábica, terreno ondulado"
                    style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"6px 9px",fontSize:12,color:"var(--text)",boxSizing:"border-box"}}/>
                </div>

                {/* Botão verificação pré-contratação */}
                {form.prod_id && glebaForm.codigo_car && (
                  <div style={{marginBottom:8}}>
                    <button className="btn btn-ghost" style={{fontSize:9,padding:"4px 12px"}}
                      onClick={verificarGleba} disabled={verificandoGleba}>
                      <Icon d={IC.search} size={10}/> {verificandoGleba ? "VERIFICANDO..." : "VERIFICAR SOBREPOSIÇÃO (MCR 3-6-3-b)"}
                    </button>
                  </div>
                )}

                {/* Resultado da verificação */}
                {glebaAlerta && (
                  <div style={{
                    padding:"10px 14px", borderRadius:4, marginBottom:8, fontSize:11,
                    background: glebaAlerta.status==="livre" ? "rgba(109,181,128,.08)" : "rgba(220,38,38,.08)",
                    border: `1px solid ${glebaAlerta.status==="livre" ? "rgba(109,181,128,.3)" : "rgba(220,38,38,.3)"}`,
                    color: glebaAlerta.status==="livre" ? "var(--green)" : "var(--red)"
                  }}>
                    <div style={{fontWeight:700,marginBottom:4}}>
                      {glebaAlerta.status==="livre" ? "✓ Gleba disponível para contratação" : "⚠ Impedimento detectado"}
                    </div>
                    {glebaAlerta.area_disponivel_ha != null &&
                      <div style={{fontSize:10,color:"var(--dim)"}}>Área disponível no imóvel: {glebaAlerta.area_disponivel_ha} ha</div>}
                    {glebaAlerta.conflitos?.map((c,i) => (
                      <div key={i} style={{fontSize:10,marginTop:4,color:"var(--mid)"}}>
                        • {c.tipo?.replace(/_/g," ")} {c.operacao_id ? `— Op. ${c.operacao_id}` : ""}
                        {c.referencia_mcr && <span style={{color:"var(--dim)"}}> | {c.referencia_mcr}</span>}
                      </div>
                    ))}
                    <div style={{fontSize:9,color:"var(--dim)",marginTop:4}}>{glebaAlerta.orientacao}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <button className="btn btn-green" onClick={criarOperacao}>
              <Icon d={IC.ops} size={11}/> CRIAR OPERAÇÃO
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {["todas","pendente","em_analise","pronto","encaminhado"].map(f=>(
          <button key={f} className={`btn ${filter===f?"btn-gold":"btn-ghost"}`} onClick={()=>setFilter(f)} style={{fontSize:9,padding:"5px 11px"}}>
            {f==="todas"?"TODAS":STATUS_CFG[f]?.label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="ph"><span className="pt">[ {operacoes.length} Operações ]</span></div>
        <table className="tbl">
          <thead><tr>
            <th>Operação</th><th>Produtor</th><th>Linha / Modalidade</th><th>Valor</th><th>Docs</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {operacoes.map(op => {
              const p = op.produtor;
              const prog = op.progresso_docs || {ok:0, total:9, percentual:0};
              const pct = prog.percentual;
              const pc = pct===100?"var(--green)":pct>=60?"var(--gold)":"var(--red)";
              const st = STATUS_CFG[op.status] || STATUS_CFG.pendente;
              const created = new Date(op.created_at).toLocaleDateString('pt-BR');
              return (
                <tr key={op.id} className="click" onClick={()=>{setSelectedOp(op.id);setScreen("dossie");}}>
                  <td>
                    <div style={{color:"var(--gold)",fontWeight:600,fontSize:11}}>{op.id}</div>
                    <div className="prod-sub">{created}</div>
                  </td>
                  <td>
                    <div className="prod-name">{p?.nome || "N/A"}</div>
                    <div className="prod-sub">{p?.municipio} · {p?.uf}</div>
                  </td>
                  <td>
                    <span className={`lb ${op.linha.toLowerCase()}`}>{op.linha}</span>
                    <div className="prod-sub" style={{marginTop:3}}>{op.modalidade}</div>
                  </td>
                  <td style={{color:"var(--text)",fontSize:11}}>
                    {formatCurrency(op.valor)}
                  </td>
                  <td>
                    <div className="pbar">
                      <div className="pbg"><div className="pbf" style={{width:`${pct}%`,background:pc}}/></div>
                      <span className="pct">{prog.ok}/{prog.total}</span>
                    </div>
                  </td>
                  <td>
                    <span className="sb2" style={{color:st.color,background:st.bg,border:`1px solid ${st.border}`}}>{st.label}</span>
                  </td>
                  <td>
                    <button className="btn btn-ghost" style={{padding:"4px 9px",fontSize:9}} onClick={e=>{e.stopPropagation();setSelectedOp(op.id);setScreen("checklist");}}>
                      DOCS
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: CHECKLIST DE DOCUMENTOS
// ─────────────────────────────────────────────────────────────────────────────
function Checklist({ setScreen, selectedOp }) {
  const [operacao, setOperacao] = useState(null);
  const [docs, setDocs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [selectedOp]);

  const carregarDados = async () => {
    try {
      const opRes = await axios.get(`${API}/operacoes/${selectedOp}`);
      setOperacao(opRes.data);
      setDocs(opRes.data.documentos || {});
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar operação:", error);
      setLoading(false);
    }
  };

  const toggle = async (id) => {
    const novoStatus = docs[id]==="ok"?"pendente":"ok";
    const novoDocs = {...docs, [id]: novoStatus};
    setDocs(novoDocs);
    
    try {
      await axios.put(`${API}/operacoes/${selectedOp}/documentos`, {
        documentos: novoDocs
      });
      carregarDados(); // Recarregar para atualizar progresso
    } catch (error) {
      console.error("Erro ao atualizar documento:", error);
    }
  };

  if (loading) return <div className="scroll"><div className="loading">Carregando...</div></div>;
  if (!operacao) return <div className="scroll"><div className="error">Operação não encontrada</div></div>;

  const prod = operacao.produtor;
  const prog = operacao.progresso_docs || {ok:0, total:9, percentual:0};
  const pct = prog.percentual;
  const pronto = DOCS_TEMPLATE.filter(d=>d.obrig).every(d=>docs[d.id]==="ok");

  const docColor = (status) =>
    status==="ok"     ? {c:"var(--green)", bg:"rgba(109,181,128,.1)",  bdr:"rgba(109,181,128,.3)"}
    : status==="invalido" ? {c:"var(--red)",   bg:"rgba(192,90,74,.1)",   bdr:"rgba(192,90,74,.3)"}
    : {c:"var(--dim)",  bg:"rgba(90,96,80,.1)", bdr:"rgba(90,96,80,.2)"};

  return (
    <div className="scroll">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div className="sl" style={{marginBottom:4}}>Documentos · {operacao.id}</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,color:"var(--text)",letterSpacing:1}}>
            Checklist — {prod?.nome || "N/A"}
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost" onClick={()=>setScreen("operacoes")}>
            <Icon d={IC.back} size={11}/> VOLTAR
          </button>
          {pronto
            ? <button className="btn btn-green"><Icon d={IC.send} size={11}/> ENCAMINHAR AO BANCO</button>
            : <button className="btn btn-gold" style={{opacity:.6,cursor:"not-allowed"}}><Icon d={IC.alert} size={11}/> DOCS INCOMPLETOS</button>
          }
        </div>
      </div>

      {/* Progress */}
      <div className="panel" style={{marginBottom:14}}>
        <div style={{padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:9,color:"var(--dim)",letterSpacing:1.5}}>PROGRESSO GERAL</span>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,color:pct===100?"var(--green)":pct>=60?"var(--gold)":"var(--red)"}}>{pct}%</span>
          </div>
          <div className="pbg" style={{height:6,minWidth:"100%"}}>
            <div className="pbf" style={{width:`${pct}%`,background:pct===100?"var(--green)":pct>=60?"var(--gold)":"var(--red)",transition:"width .4s ease"}}/>
          </div>
          <div style={{display:"flex",gap:14,marginTop:10,fontSize:9,color:"var(--dim)"}}>
            <span style={{color:"var(--green)"}}>✓ {prog.ok} recebidos</span>
            <span style={{color:"var(--red)"}}>✗ {prog.total-prog.ok} pendentes</span>
            <span>· {operacao.linha} · {operacao.modalidade} · {prod?.municipio}</span>
          </div>
        </div>
      </div>

      {/* Doc list grouped by category */}
      {["Pessoal","Rural","Imóvel","Ambiental","Fiscal","Seguro"].map(cat => {
        const items = DOCS_TEMPLATE.filter(d=>d.categoria===cat);
        if(!items.length) return null;
        return (
          <div key={cat} style={{marginBottom:12}}>
            <div className="sl">{cat}</div>
            <div className="panel">
              {items.map(doc => {
                const st = docs[doc.id] || "pendente";
                const { c, bg, bdr } = docColor(st);
                return (
                  <div key={doc.id} className="doc-item" onClick={()=>toggle(doc.id)}>
                    <div className="doc-check" style={{borderColor:c,background:st==="ok"?bg:"transparent"}}>
                      {st==="ok" && <Icon d={IC.check} size={10} strokeWidth={2.5}/>}
                    </div>
                    <div className="doc-info">
                      <div className="doc-name">{doc.label}</div>
                      <div className="doc-cat">{doc.obrig ? "Obrigatório — MCR/BACEN" : "Opcional"}</div>
                    </div>
                    <span className="doc-badge" style={{color:c,background:bg,border:`1px solid ${bdr}`}}>
                      {st==="ok"?"RECEBIDO":st==="invalido"?"INVÁLIDO":"PENDENTE"}
                    </span>
                    <div className="doc-actions">
                      <button className="btn btn-ghost" style={{padding:"3px 8px",fontSize:8}} onClick={e=>e.stopPropagation()}>
                        <Icon d={IC.upload} size={10}/>
                      </button>
                      <button className="btn btn-ghost" style={{padding:"3px 8px",fontSize:8}} onClick={e=>e.stopPropagation()}>
                        <Icon d={IC.eye} size={10}/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: VISUALIZAÇÃO DO DOSSIÊ
// ─────────────────────────────────────────────────────────────────────────────
function Dossie({ setScreen, selectedOp }) {
  const [operacao, setOperacao] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [selectedOp]);

  const carregarDados = async () => {
    try {
      const opRes = await axios.get(`${API}/operacoes/${selectedOp}`);
      setOperacao(opRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar operação:", error);
      setLoading(false);
    }
  };

  if (loading) return <div className="scroll"><div className="loading">Carregando...</div></div>;
  if (!operacao) return <div className="scroll"><div className="error">Operação não encontrada</div></div>;

  const prod = operacao.produtor;
  const docs = operacao.documentos || {};
  const prog = operacao.progresso_docs || {ok:0, total:9};
  const st = STATUS_CFG[operacao.status] || STATUS_CFG.pendente;
  const created = new Date(operacao.created_at).toLocaleDateString('pt-BR');
  const formatCurrency = (val) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(val);

  return (
    <div className="scroll">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <div className="sl" style={{marginBottom:4}}>Dossiê</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,color:"var(--text)",letterSpacing:1}}>
            Visualização Completa
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost" onClick={()=>setScreen("operacoes")}>
            <Icon d={IC.back} size={11}/> VOLTAR
          </button>
          <button className="btn btn-ghost" onClick={()=>setScreen("checklist")}>
            <Icon d={IC.docs} size={11}/> DOCUMENTOS
          </button>
          <button className="btn btn-gold">
            <Icon d={IC.pdf} size={11}/> GERAR PDF
          </button>
          {operacao.status==="pronto" && (
            <button className="btn btn-green">
              <Icon d={IC.send} size={11}/> ENCAMINHAR
            </button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="dossie-header">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div className="dossie-id">{operacao.id}</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,color:"var(--text)",marginTop:2,letterSpacing:.5}}>{prod?.nome || "N/A"}</div>
            <div style={{fontSize:9,color:"var(--dim)",marginTop:4,letterSpacing:1}}>{prod?.municipio} · {prod?.uf} · CPF {prod?.cpf}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <span className="sb2" style={{color:st.color,background:st.bg,border:`1px solid ${st.border}`,fontSize:11,padding:"5px 12px"}}>{st.label}</span>
            <div style={{fontSize:9,color:"var(--dim)",marginTop:6}}>Criado em {created}</div>
          </div>
        </div>
      </div>

      <div className="dossie-grid">
        {/* Operação */}
        <div className="dossie-block">
          <div className="db-title">Operação de Crédito</div>
          {[
            ["Linha de Crédito", operacao.linha],
            ["Modalidade", operacao.modalidade],
            ["Cultura / Atividade", operacao.cultura],
            ["Valor Solicitado", formatCurrency(operacao.valor)],
            ["Banco", operacao.banco],
          ].map(([k,v])=>(
            <div key={k} className="db-row">
              <span className="db-key">{k}</span>
              <span className="db-val">{v}</span>
            </div>
          ))}
        </div>

        {/* Produtor */}
        <div className="dossie-block">
          <div className="db-title">Dados do Produtor</div>
          {[
            ["Renda Bruta Anual", formatCurrency(prod?.renda||0)],
            ["Módulos Fiscais", `${prod?.modulos} MF`],
            ["Atividade", prod?.atividade],
            ["CAF", prod?.caf],
            ["CCIR", prod?.ccir],
            ["CAR", prod?.car],
          ].map(([k,v])=>(
            <div key={k} className="db-row">
              <span className="db-key">{k}</span>
              <span className="db-val">{v}</span>
            </div>
          ))}
        </div>

        {/* Documentos */}
        <div className="dossie-block">
          <div className="db-title">Situação Documental</div>
          {DOCS_TEMPLATE.map(doc => {
            const st2 = docs[doc.id]||"pendente";
            const c = st2==="ok"?"var(--green)":st2==="invalido"?"var(--red)":"var(--dim)";
            return (
              <div key={doc.id} className="db-row" style={{alignItems:"center"}}>
                <span className="db-key">{doc.label}</span>
                <span style={{fontSize:9,color:c,fontWeight:600,letterSpacing:.5}}>
                  {st2==="ok"?"✓ OK":st2==="invalido"?"✗ INVÁLIDO":"— PENDENTE"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Enquadramento */}
        <div className="dossie-block">
          <div className="db-title">Enquadramento MCR / Regras</div>
          {[
            ["Linha enquadrada", operacao.linha],
            ["Documentos", `${prog.ok}/${prog.total} recebidos`],
            ["Obrigatórios", DOCS_TEMPLATE.filter(d=>d.obrig&&docs[d.id]==="ok").length + "/" + DOCS_TEMPLATE.filter(d=>d.obrig).length],
            ["ZARC", docs.zarc==="ok"?"✓ Consultado":"✗ Pendente"],
            ["Apto para envio", prog.ok>=8?"✓ Sim":"✗ Não"],
          ].map(([k,v])=>(
            <div key={k} className="db-row">
              <span className="db-key">{k}</span>
              <span className="db-val" style={{color:v.startsWith("✓")?"var(--green)":v.startsWith("✗")?"var(--red)":undefined}}>{v}</span>
            </div>
          ))}

          <div style={{marginTop:12,padding:"10px 12px",background:"var(--bg4)",borderRadius:4,fontSize:9,color:"var(--mid)",lineHeight:1.6}}>
            <b style={{color:"var(--gold)",display:"block",marginBottom:3}}>Observação da Maya</b>
            Operação enquadrada em {operacao.linha} — {operacao.modalidade}. {prog.ok>=8?"Documentação completa. Pronto para encaminhar ao "+operacao.banco+".":"Aguardando documentos obrigatórios antes do encaminhamento."}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="sl">Histórico</div>
      <div className="dossie-timeline">
        {[
          {d:"var(--green)", t:"Dossiê iniciado — dados do produtor cadastrados", dt:created},
          {d:"var(--gold)",  t:"Documentos carregados: RG, CAF, CCIR, ITR, CAR", dt:created},
          {d:"var(--gold)",  t:"Motor de enquadramento executado: "+operacao.linha+" confirmado", dt:created},
          {d:prog.ok>=8?"var(--green)":"var(--red)", t:prog.ok>=8?"Documentação completa — aguardando envio":"Documentação incompleta — itens pendentes", dt:created},
        ].map((item,i)=>(
          <div key={i} className="tl-item">
            <div className="tl-dot" style={{background:item.d}}/>
            <span className="tl-text">{item.t}</span>
            <span className="tl-date">{item.dt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: GERENCIAR USUÁRIOS (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: LISTA DE PRODUTORES + MEMÓRIA
// ─────────────────────────────────────────────────────────────────────────────
function ListaProdutores({ setScreen, setSelectedProd }) {
  const [produtores, setProdutores] = React.useState([]);
  const [filtro, setFiltro] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [memoria, setMemoria] = React.useState(null);
  const [aba, setAba] = React.useState("propriedade");
  const [loading, setLoading] = React.useState(true);
  const [memForm, setMemForm] = React.useState({});
  const [vForm, setVForm] = React.useState({ data: new Date().toISOString().slice(0,10), tecnico:"", tipo:"vistoria_inicial", conformidade:"regular", observacoes:"", infraestrutura:"", area_visitada_ha:"", fotos_realizadas:false });
  const [hcForm, setHcForm] = React.useState({ banco:"Sicoob", linha:"PRONAF", ano: new Date().getFullYear(), valor:"", status:"quitado", observacoes:"" });
  const [hpForm, setHpForm] = React.useState({ safra:"", cultura:"", area_plantada_ha:"", produtividade_sc_ha:"", producao_total_sc:"", perdas_percent:0, irrigacao:false, observacoes:"" });
  const [alForm, setAlForm] = React.useState({ tipo:"doc_vencendo", descricao:"", data_limite:"" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    axios.get(`${API}/produtores`).then(r => { setProdutores(r.data); setLoading(false); });
  }, []);

  React.useEffect(() => {
    if (!selected) return;
    axios.get(`${API}/produtores/${selected.id}/memoria`).then(r => {
      setMemoria(r.data);
      setMemForm({
        coordenadas: r.data.coordenadas||"", acesso_propriedade: r.data.acesso_propriedade||"",
        area_total_ha: r.data.area_total_ha||"", area_agricola_ha: r.data.area_agricola_ha||"",
        topografia: r.data.topografia||"", solo: r.data.solo||"",
        fonte_agua: r.data.fonte_agua||"", infraestrutura: r.data.infraestrutura||"",
        contato_preferencial: r.data.contato_preferencial||"",
        observacoes_gerais: r.data.observacoes_gerais||"",
        consultor_responsavel: r.data.consultor_responsavel||""
      });
    });
  }, [selected]);

  const filtrados = produtores.filter(p =>
    p.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    p.cpf.includes(filtro) ||
    p.municipio?.toLowerCase().includes(filtro.toLowerCase())
  );

  const ENQS = { PRONAF: "g", PRONAMP: "gold", Livre: "r" };

  const salvarPropriedade = async () => {
    setSaving(true);
    const clean = {};
    Object.entries(memForm).forEach(([k,v]) => { if (v !== "" && v !== null) clean[k] = v; });
    await axios.patch(`${API}/produtores/${selected.id}/memoria`, clean);
    const r = await axios.get(`${API}/produtores/${selected.id}/memoria`);
    setMemoria(r.data);
    setSaving(false);
  };

  const addVistoria = async () => {
    setSaving(true);
    const d = {...vForm};
    if (d.area_visitada_ha) d.area_visitada_ha = parseFloat(d.area_visitada_ha);
    await axios.post(`${API}/produtores/${selected.id}/vistorias`, d);
    const r = await axios.get(`${API}/produtores/${selected.id}/memoria`);
    setMemoria(r.data);
    setVForm({ data: new Date().toISOString().slice(0,10), tecnico:"", tipo:"vistoria_inicial", conformidade:"regular", observacoes:"", infraestrutura:"", area_visitada_ha:"", fotos_realizadas:false });
    setSaving(false);
  };

  const addCredito = async () => {
    setSaving(true);
    const d = {...hcForm, ano: parseInt(hcForm.ano), valor: parseFloat(hcForm.valor)};
    await axios.post(`${API}/produtores/${selected.id}/historico_credito`, d);
    const r = await axios.get(`${API}/produtores/${selected.id}/memoria`);
    setMemoria(r.data);
    setHcForm({ banco:"Sicoob", linha:"PRONAF", ano: new Date().getFullYear(), valor:"", status:"quitado", observacoes:"" });
    setSaving(false);
  };

  const addProdutivo = async () => {
    setSaving(true);
    const d = {...hpForm, area_plantada_ha: parseFloat(hpForm.area_plantada_ha)};
    if (d.produtividade_sc_ha) d.produtividade_sc_ha = parseFloat(d.produtividade_sc_ha);
    if (d.producao_total_sc) d.producao_total_sc = parseFloat(d.producao_total_sc);
    await axios.post(`${API}/produtores/${selected.id}/historico_produtivo`, d);
    const r = await axios.get(`${API}/produtores/${selected.id}/memoria`);
    setMemoria(r.data);
    setHpForm({ safra:"", cultura:"", area_plantada_ha:"", produtividade_sc_ha:"", producao_total_sc:"", perdas_percent:0, irrigacao:false, observacoes:"" });
    setSaving(false);
  };

  const addAlerta = async () => {
    setSaving(true);
    await axios.post(`${API}/produtores/${selected.id}/alertas`, alForm);
    const r = await axios.get(`${API}/produtores/${selected.id}/memoria`);
    setMemoria(r.data);
    setAlForm({ tipo:"doc_vencendo", descricao:"", data_limite:"" });
    setSaving(false);
  };

  const resolverAlerta = async (alId) => {
    await axios.patch(`${API}/produtores/${selected.id}/alertas/${alId}/resolver`);
    const r = await axios.get(`${API}/produtores/${selected.id}/memoria`);
    setMemoria(r.data);
  };

  const conformidadeCor = { regular:"var(--green)", irregular:"var(--red)", pendente:"var(--gold)", embargado:"var(--red)" };
  const tipoCor = { doc_vencendo:"var(--gold)", embargo:"var(--red)", irregularidade:"var(--red)", pendencia:"var(--gold)" };

  if (loading) return <div style={{padding:32,color:"var(--dim)"}}>Carregando produtores...</div>;

  return (
    <div style={{display:"flex",gap:0,height:"100%",overflow:"hidden"}}>
      {/* COLUNA LISTA */}
      <div style={{width:320,minWidth:280,borderRight:"1px solid var(--bdr)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"16px 14px 10px",borderBottom:"1px solid var(--bdr)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text)",letterSpacing:1,marginBottom:8}}>PRODUTORES CADASTRADOS</div>
          <input
            value={filtro} onChange={e=>setFiltro(e.target.value)}
            placeholder="Buscar por nome, CPF ou município..."
            style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"6px 10px",fontSize:12,color:"var(--text)",boxSizing:"border-box"}}
          />
          <div style={{fontSize:10,color:"var(--dim)",marginTop:6}}>{filtrados.length} produtor{filtrados.length!==1?"es":""}</div>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {filtrados.map(p => {
            const eq = p.enquadramento?.label || "?";
            const cor = ENQS[eq] || "";
            return (
              <div
                key={p.id}
                onClick={()=>setSelected(p)}
                style={{padding:"10px 14px",borderBottom:"1px solid var(--bdr2)",cursor:"pointer",background:selected?.id===p.id?"var(--bg3)":"transparent",transition:"background .15s"}}
              >
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{p.nome}</div>
                  <span className={`lb ${cor}`} style={{fontSize:9}}>{eq}</span>
                </div>
                <div style={{fontSize:11,color:"var(--dim)",marginTop:2}}>{p.cpf} · {p.municipio||"–"} {p.uf}</div>
                <div style={{fontSize:11,color:"var(--dim)"}}>{p.atividade} · {p.modulos} módulos</div>
              </div>
            );
          })}
          {filtrados.length === 0 && <div style={{padding:24,color:"var(--dim)",fontSize:12,textAlign:"center"}}>Nenhum produtor encontrado</div>}
        </div>
        <div style={{padding:12,borderTop:"1px solid var(--bdr)"}}>
          <button className="btn btn-green" style={{width:"100%"}} onClick={()=>setScreen("cadastro")}>
            <Icon d={IC.users} size={11}/> + NOVO PRODUTOR
          </button>
        </div>
      </div>

      {/* COLUNA DETALHE */}
      {selected ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Header do produtor */}
          <div style={{padding:"14px 20px",borderBottom:"1px solid var(--bdr)",background:"var(--bg2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:"var(--text)",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>{selected.nome}</div>
                <div style={{fontSize:12,color:"var(--dim)",marginTop:2}}>CPF: {selected.cpf} · {selected.municipio} {selected.uf} · {selected.atividade}</div>
                <div style={{fontSize:12,color:"var(--dim)"}}>Renda: R$ {Number(selected.renda).toLocaleString("pt-BR")} · {selected.modulos} módulos fiscais</div>
              </div>
              <button className="btn btn-gold" style={{fontSize:10}} onClick={()=>{setSelectedProd && setSelectedProd(selected.id); setScreen("cadastro");}}>
                <Icon d={IC.edit} size={10}/> EDITAR
              </button>
            </div>
            {/* Abas */}
            <div style={{display:"flex",gap:4,marginTop:12}}>
              {[["propriedade","Propriedade"],["vistorias","Vistorias"],["credito","Histórico Crédito"],["produtivo","Histórico Produtivo"],["alertas","Alertas"]].map(([k,l])=>(
                <button key={k} onClick={()=>setAba(k)}
                  style={{padding:"4px 12px",fontSize:10,fontWeight:700,letterSpacing:.5,border:"1px solid",borderRadius:3,cursor:"pointer",
                    background: aba===k?"var(--red)":"transparent",
                    color: aba===k?"#fff":"var(--dim)",
                    borderColor: aba===k?"var(--red)":"var(--bdr)"}}>
                  {l}
                  {k==="alertas" && memoria?.alertas?.filter(a=>!a.resolvido).length > 0 &&
                    <span style={{marginLeft:4,background:"var(--red)",color:"#fff",borderRadius:8,padding:"0 5px",fontSize:9}}>
                      {memoria.alertas.filter(a=>!a.resolvido).length}
                    </span>
                  }
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo das abas */}
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            {!memoria && <div style={{color:"var(--dim)",fontSize:12}}>Carregando memória...</div>}

            {/* ABA: PROPRIEDADE */}
            {aba==="propriedade" && memoria && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["coordenadas","Coordenadas GPS","text","Ex: -19.4205, -40.5523"],
                  ["acesso_propriedade","Acesso à Propriedade","text","Ex: ES-080 km 12, porteira azul"],
                  ["area_total_ha","Área Total (ha)","number",""],
                  ["area_agricola_ha","Área Agrícola (ha)","number",""],
                  ["topografia","Topografia","text","plana / ondulada / montanhosa"],
                  ["solo","Tipo de Solo","text","Ex: Latossolo Vermelho-Amarelo"],
                  ["fonte_agua","Fonte de Água","text","Ex: Ribeirão das Pedras + represa"],
                  ["contato_preferencial","Contato Preferencial","text","WhatsApp ou telefone"],
                  ["consultor_responsavel","Consultor Responsável","text",""],
                ].map(([key,label,type,ph])=>(
                  <div key={key} style={key==="acesso_propriedade"||key==="fonte_agua"?{gridColumn:"1/-1"}:{}}>
                    <div style={{fontSize:10,color:"var(--dim)",marginBottom:4,fontWeight:600,letterSpacing:.5}}>{label.toUpperCase()}</div>
                    <input type={type} value={memForm[key]||""} onChange={e=>setMemForm(f=>({...f,[key]:e.target.value}))}
                      placeholder={ph} style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"6px 9px",fontSize:12,color:"var(--text)",boxSizing:"border-box"}}/>
                  </div>
                ))}
                <div style={{gridColumn:"1/-1"}}>
                  <div style={{fontSize:10,color:"var(--dim)",marginBottom:4,fontWeight:600,letterSpacing:.5}}>INFRAESTRUTURA</div>
                  <textarea value={memForm.infraestrutura||""} onChange={e=>setMemForm(f=>({...f,infraestrutura:e.target.value}))}
                    placeholder="Casa sede, galpão de máquinas, tulha, terreiro, energia elétrica rural, irrigação..."
                    rows={3} style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"6px 9px",fontSize:12,color:"var(--text)",boxSizing:"border-box",resize:"vertical"}}/>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <div style={{fontSize:10,color:"var(--dim)",marginBottom:4,fontWeight:600,letterSpacing:.5}}>OBSERVAÇÕES GERAIS</div>
                  <textarea value={memForm.observacoes_gerais||""} onChange={e=>setMemForm(f=>({...f,observacoes_gerais:e.target.value}))}
                    placeholder="Anotações livres sobre o produtor, família, histórico de relacionamento..."
                    rows={3} style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"6px 9px",fontSize:12,color:"var(--text)",boxSizing:"border-box",resize:"vertical"}}/>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <button className="btn btn-green" onClick={salvarPropriedade} disabled={saving}>
                    <Icon d={IC.check} size={11}/> {saving?"SALVANDO...":"SALVAR MEMÓRIA"}
                  </button>
                </div>
              </div>
            )}

            {/* ABA: VISTORIAS */}
            {aba==="vistorias" && memoria && (
              <div>
                <div style={{background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:6,padding:14,marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--dim)",letterSpacing:1,marginBottom:10}}>REGISTRAR VISTORIA</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[["data","Data","date"],["tecnico","Técnico Responsável","text"],["area_visitada_ha","Área Visitada (ha)","number"]].map(([k,l,t])=>(
                      <div key={k}>
                        <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>{l}</div>
                        <input type={t} value={vForm[k]} onChange={e=>setVForm(f=>({...f,[k]:e.target.value}))}
                          style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)",boxSizing:"border-box"}}/>
                      </div>
                    ))}
                    <div>
                      <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>TIPO</div>
                      <select value={vForm.tipo} onChange={e=>setVForm(f=>({...f,tipo:e.target.value}))}
                        style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)"}}>
                        <option value="vistoria_inicial">Inicial</option>
                        <option value="renovacao">Renovação</option>
                        <option value="monitoramento">Monitoramento</option>
                        <option value="emergencia">Emergência</option>
                      </select>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>CONFORMIDADE</div>
                      <select value={vForm.conformidade} onChange={e=>setVForm(f=>({...f,conformidade:e.target.value}))}
                        style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)"}}>
                        <option value="regular">Regular</option>
                        <option value="irregular">Irregular</option>
                        <option value="pendente">Pendente</option>
                        <option value="embargado">Embargado</option>
                      </select>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6,paddingTop:18}}>
                      <input type="checkbox" checked={vForm.fotos_realizadas} onChange={e=>setVForm(f=>({...f,fotos_realizadas:e.target.checked}))} id="fotos"/>
                      <label htmlFor="fotos" style={{fontSize:11,color:"var(--dim)"}}>Fotos realizadas</label>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>OBSERVAÇÕES</div>
                      <textarea value={vForm.observacoes} onChange={e=>setVForm(f=>({...f,observacoes:e.target.value}))}
                        rows={2} style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)",boxSizing:"border-box",resize:"vertical"}}/>
                    </div>
                  </div>
                  <button className="btn btn-green" style={{marginTop:10}} onClick={addVistoria} disabled={saving||!vForm.tecnico}>
                    <Icon d={IC.check} size={11}/> {saving?"SALVANDO...":"REGISTRAR VISTORIA"}
                  </button>
                </div>
                {memoria.vistorias?.length === 0 && <div style={{color:"var(--dim)",fontSize:12}}>Nenhuma vistoria registrada.</div>}
                {[...( memoria.vistorias||[])].reverse().map(v => (
                  <div key={v.id} style={{background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:6,padding:12,marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{v.data} · {v.tecnico}</div>
                      <div style={{display:"flex",gap:6}}>
                        <span style={{fontSize:10,padding:"2px 7px",borderRadius:3,background:"var(--bg3)",color:conformidadeCor[v.conformidade]||"var(--dim)",border:`1px solid ${conformidadeCor[v.conformidade]||"var(--bdr)"}`}}>{v.conformidade.toUpperCase()}</span>
                        <span style={{fontSize:10,padding:"2px 7px",borderRadius:3,background:"var(--bg3)",color:"var(--dim)",border:"1px solid var(--bdr)"}}>{v.tipo.replace("_"," ")}</span>
                      </div>
                    </div>
                    {v.area_visitada_ha && <div style={{fontSize:11,color:"var(--dim)",marginTop:4}}>Área visitada: {v.area_visitada_ha} ha {v.fotos_realizadas?"· 📷 Fotos":""}</div>}
                    {v.observacoes && <div style={{fontSize:12,color:"var(--mid)",marginTop:6}}>{v.observacoes}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* ABA: HISTÓRICO CRÉDITO */}
            {aba==="credito" && memoria && (
              <div>
                <div style={{background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:6,padding:14,marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--dim)",letterSpacing:1,marginBottom:10}}>REGISTRAR OPERAÇÃO ANTERIOR</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[["banco","Banco/Cooperativa","text"],["linha","Linha","text"],["ano","Ano","number"],["valor","Valor (R$)","number"]].map(([k,l,t])=>(
                      <div key={k}>
                        <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>{l}</div>
                        <input type={t} value={hcForm[k]} onChange={e=>setHcForm(f=>({...f,[k]:e.target.value}))}
                          style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)",boxSizing:"border-box"}}/>
                      </div>
                    ))}
                    <div>
                      <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>STATUS</div>
                      <select value={hcForm.status} onChange={e=>setHcForm(f=>({...f,status:e.target.value}))}
                        style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)"}}>
                        <option value="quitado">Quitado</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="inadimplente">Inadimplente</option>
                        <option value="renegociado">Renegociado</option>
                      </select>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>OBSERVAÇÕES</div>
                      <input value={hcForm.observacoes} onChange={e=>setHcForm(f=>({...f,observacoes:e.target.value}))}
                        style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                  <button className="btn btn-green" style={{marginTop:10}} onClick={addCredito} disabled={saving||!hcForm.valor}>
                    <Icon d={IC.check} size={11}/> {saving?"SALVANDO...":"REGISTRAR"}
                  </button>
                </div>
                {memoria.historico_credito?.length === 0 && <div style={{color:"var(--dim)",fontSize:12}}>Nenhum histórico de crédito registrado.</div>}
                {[...(memoria.historico_credito||[])].reverse().map((hc,i) => (
                  <div key={i} style={{background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:6,padding:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{hc.banco} · {hc.linha} · {hc.ano}</div>
                      <div style={{fontSize:12,color:"var(--dim)",marginTop:2}}>R$ {Number(hc.valor).toLocaleString("pt-BR")} {hc.observacoes?`· ${hc.observacoes}`:""}</div>
                    </div>
                    <span style={{fontSize:10,padding:"3px 9px",borderRadius:3,
                      background: hc.status==="quitado"?"rgba(109,181,128,.15)":hc.status==="inadimplente"?"rgba(220,38,38,.15)":"rgba(234,179,8,.15)",
                      color: hc.status==="quitado"?"var(--green)":hc.status==="inadimplente"?"var(--red)":"var(--gold)",
                      border:`1px solid ${hc.status==="quitado"?"rgba(109,181,128,.3)":hc.status==="inadimplente"?"rgba(220,38,38,.3)":"rgba(234,179,8,.3)"}`}}>
                      {hc.status.replace("_"," ").toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ABA: HISTÓRICO PRODUTIVO */}
            {aba==="produtivo" && memoria && (
              <div>
                <div style={{background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:6,padding:14,marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--dim)",letterSpacing:1,marginBottom:10}}>REGISTRAR SAFRA</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[["safra","Safra (ex: 2023/2024)","text"],["cultura","Cultura","text"],["area_plantada_ha","Área Plantada (ha)","number"],["produtividade_sc_ha","Produtividade sc/ha","number"],["producao_total_sc","Produção Total (sc)","number"],["perdas_percent","Perdas (%)","number"]].map(([k,l,t])=>(
                      <div key={k}>
                        <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>{l}</div>
                        <input type={t} value={hpForm[k]} onChange={e=>setHpForm(f=>({...f,[k]:e.target.value}))}
                          style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)",boxSizing:"border-box"}}/>
                      </div>
                    ))}
                    <div style={{display:"flex",alignItems:"center",gap:6,paddingTop:18}}>
                      <input type="checkbox" checked={hpForm.irrigacao} onChange={e=>setHpForm(f=>({...f,irrigacao:e.target.checked}))} id="irrig"/>
                      <label htmlFor="irrig" style={{fontSize:11,color:"var(--dim)"}}>Irrigação</label>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>OBSERVAÇÕES</div>
                      <input value={hpForm.observacoes} onChange={e=>setHpForm(f=>({...f,observacoes:e.target.value}))}
                        style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                  <button className="btn btn-green" style={{marginTop:10}} onClick={addProdutivo} disabled={saving||!hpForm.safra}>
                    <Icon d={IC.check} size={11}/> {saving?"SALVANDO...":"REGISTRAR SAFRA"}
                  </button>
                </div>
                {memoria.historico_produtivo?.length === 0 && <div style={{color:"var(--dim)",fontSize:12}}>Nenhum histórico produtivo registrado.</div>}
                {[...(memoria.historico_produtivo||[])].reverse().map((hp,i) => (
                  <div key={i} style={{background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:6,padding:12,marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{hp.safra} · {hp.cultura}</div>
                      {hp.irrigacao && <span style={{fontSize:10,color:"var(--green)"}}>💧 IRRIGADO</span>}
                    </div>
                    <div style={{display:"flex",gap:16,marginTop:4,fontSize:12,color:"var(--dim)"}}>
                      <span>🌱 {hp.area_plantada_ha} ha</span>
                      {hp.produtividade_sc_ha && <span>⚡ {hp.produtividade_sc_ha} sc/ha</span>}
                      {hp.producao_total_sc && <span>📦 {hp.producao_total_sc} sc</span>}
                      {hp.perdas_percent > 0 && <span style={{color:"var(--red)"}}>⚠ {hp.perdas_percent}% perdas</span>}
                    </div>
                    {hp.observacoes && <div style={{fontSize:11,color:"var(--mid)",marginTop:4}}>{hp.observacoes}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* ABA: ALERTAS */}
            {aba==="alertas" && memoria && (
              <div>
                <div style={{background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:6,padding:14,marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--dim)",letterSpacing:1,marginBottom:10}}>CRIAR ALERTA</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    <div>
                      <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>TIPO</div>
                      <select value={alForm.tipo} onChange={e=>setAlForm(f=>({...f,tipo:e.target.value}))}
                        style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)"}}>
                        <option value="doc_vencendo">Documento Vencendo</option>
                        <option value="embargo">Embargo Ambiental</option>
                        <option value="irregularidade">Irregularidade Fundiária</option>
                        <option value="pendencia">Pendência Geral</option>
                      </select>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>DATA LIMITE</div>
                      <input type="date" value={alForm.data_limite} onChange={e=>setAlForm(f=>({...f,data_limite:e.target.value}))}
                        style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)",boxSizing:"border-box"}}/>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <div style={{fontSize:10,color:"var(--dim)",marginBottom:3}}>DESCRIÇÃO</div>
                      <input value={alForm.descricao} onChange={e=>setAlForm(f=>({...f,descricao:e.target.value}))}
                        placeholder="Ex: CAF vence em 30/06/2025, necessário renovação urgente"
                        style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--bdr)",borderRadius:4,padding:"5px 8px",fontSize:12,color:"var(--text)",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                  <button className="btn btn-red" style={{marginTop:10}} onClick={addAlerta} disabled={saving||!alForm.descricao}>
                    <Icon d={IC.bell} size={11}/> {saving?"SALVANDO...":"CRIAR ALERTA"}
                  </button>
                </div>
                {memoria.alertas?.filter(a=>!a.resolvido).length === 0 && <div style={{color:"var(--green)",fontSize:12}}>✓ Nenhum alerta ativo.</div>}
                {(memoria.alertas||[]).filter(a=>!a.resolvido).map(a => (
                  <div key={a.id} style={{background:"rgba(220,38,38,.06)",border:"1px solid rgba(220,38,38,.2)",borderRadius:6,padding:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:10,padding:"2px 7px",borderRadius:3,background:"rgba(220,38,38,.15)",color:tipoCor[a.tipo]||"var(--red)",border:"1px solid rgba(220,38,38,.3)"}}>{a.tipo.replace(/_/g," ").toUpperCase()}</span>
                        {a.data_limite && <span style={{fontSize:10,color:"var(--gold)"}}>Limite: {a.data_limite}</span>}
                      </div>
                      <div style={{fontSize:12,color:"var(--mid)",marginTop:6}}>{a.descricao}</div>
                    </div>
                    <button className="btn btn-ghost" style={{padding:"3px 10px",fontSize:9}} onClick={()=>resolverAlerta(a.id)}>
                      ✓ RESOLVER
                    </button>
                  </div>
                ))}
                {(memoria.alertas||[]).filter(a=>a.resolvido).length > 0 && (
                  <div style={{marginTop:16}}>
                    <div style={{fontSize:10,color:"var(--dim)",letterSpacing:1,marginBottom:8}}>RESOLVIDOS</div>
                    {(memoria.alertas||[]).filter(a=>a.resolvido).map(a => (
                      <div key={a.id} style={{background:"var(--bg2)",border:"1px solid var(--bdr2)",borderRadius:6,padding:10,marginBottom:6,opacity:.6}}>
                        <div style={{fontSize:11,color:"var(--dim)"}}>✓ {a.tipo.replace(/_/g," ")} · {a.descricao}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,color:"var(--dim)"}}>
          <Icon d={IC.prop} size={32}/>
          <div style={{fontSize:13}}>Selecione um produtor para ver e editar a memória da propriedade</div>
        </div>
      )}
    </div>
  );
}

function GerenciarUsuarios({ setScreen }) {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome:"", email:"", password:"", role:"operador", telefone:"" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const response = await axios.get(`${API}/auth/usuarios`);
      setUsuarios(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
      setLoading(false);
    }
  };

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const criarUsuario = async () => {
    setError("");
    setSuccess("");
    try {
      await axios.post(`${API}/auth/usuarios`, form);
      setSuccess("Usuário criado com sucesso!");
      setShowForm(false);
      setForm({ nome:"", email:"", password:"", role:"operador", telefone:"" });
      carregarUsuarios();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao criar usuário");
    }
  };

  const desativar = async (id) => {
    if (window.confirm("Deseja realmente desativar este usuário?")) {
      try {
        await axios.delete(`${API}/auth/usuarios/${id}`);
        setSuccess("Usuário desativado com sucesso!");
        carregarUsuarios();
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        setError(err.response?.data?.detail || "Erro ao desativar usuário");
      }
    }
  };

  const roleColors = {
    admin: {color:"var(--gold)", bg:"rgba(200,168,75,0.12)", border:"rgba(200,168,75,0.3)"},
    gerente: {color:"var(--blue)", bg:"rgba(122,158,192,0.12)", border:"rgba(122,158,192,0.3)"},
    operador: {color:"var(--green)", bg:"rgba(109,181,128,0.12)", border:"rgba(109,181,128,0.3)"},
    visualizador: {color:"var(--mid)", bg:"rgba(154,158,138,0.12)", border:"rgba(154,158,138,0.3)"}
  };

  const roleLabels = {
    admin: "Administrador",
    gerente: "Gerente",
    operador: "Operador",
    visualizador: "Visualizador"
  };

  if (loading) return <div className="scroll"><div className="loading">Carregando...</div></div>;

  return (
    <div className="scroll">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div className="sl" style={{marginBottom:4}}>Administração</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,color:"var(--text)",letterSpacing:1}}>
            Gerenciar Usuários
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost" onClick={()=>setScreen("dashboard")}>
            <Icon d={IC.back} size={11}/> VOLTAR
          </button>
          <button className="btn btn-gold" onClick={()=>setShowForm(!showForm)}>
            <Icon d={showForm ? IC.back : IC.plus} size={11}/> {showForm?"CANCELAR":"NOVO USUÁRIO"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success"><Icon d={IC.check} size={13}/> {success}</div>}

      {showForm && (
        <div className="form-section" style={{marginBottom:14}}>
          <div className="form-section-title">Novo Usuário</div>
          <div className="form-row" style={{marginBottom:12}}>
            <div className="fg">
              <label>Nome Completo</label>
              <input value={form.nome} onChange={e=>set("nome",e.target.value)} placeholder="Nome do usuário"/>
            </div>
            <div className="fg">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="email@exemplo.com"/>
            </div>
          </div>
          <div className="form-row" style={{marginBottom:12}}>
            <div className="fg">
              <label>Senha</label>
              <input type="password" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Senha forte"/>
            </div>
            <div className="fg">
              <label>Telefone (opcional)</label>
              <input value={form.telefone} onChange={e=>set("telefone",e.target.value)} placeholder="(00) 00000-0000"/>
            </div>
          </div>
          <div className="fg" style={{marginBottom:12}}>
            <label>Nível de Acesso</label>
            <select value={form.role} onChange={e=>set("role",e.target.value)}>
              <option value="visualizador">Visualizador (apenas leitura)</option>
              <option value="operador">Operador (criar/editar produtores e operações)</option>
              <option value="gerente">Gerente (aprovar dossiês + auditoria)</option>
              <option value="admin">Administrador (acesso total)</option>
            </select>
          </div>
          <button className="btn btn-green" onClick={criarUsuario} style={{width:"100%",justifyContent:"center"}}>
            <Icon d={IC.check} size={11}/> CRIAR USUÁRIO
          </button>
        </div>
      )}

      <div className="panel">
        <div className="ph"><span className="pt">[ {usuarios.length} Usuários ]</span></div>
        <table className="tbl">
          <thead><tr>
            <th>Usuário</th><th>Email</th><th>Nível de Acesso</th><th>Status</th><th>Cadastro</th><th></th>
          </tr></thead>
          <tbody>
            {usuarios.map(u => {
              const rc = roleColors[u.role];
              const isCurrentUser = u.id === currentUser.id;
              const created = new Date(u.created_at).toLocaleDateString('pt-BR');
              return (
                <tr key={u.id}>
                  <td>
                    <div className="prod-name">{u.nome}</div>
                    <div className="prod-sub">{u.telefone || "Sem telefone"}</div>
                  </td>
                  <td style={{fontSize:10,color:"var(--mid)"}}>{u.email}</td>
                  <td>
                    <span className="sb2" style={{color:rc.color,background:rc.bg,border:`1px solid ${rc.border}`}}>
                      {roleLabels[u.role]}
                    </span>
                  </td>
                  <td>
                    <span style={{fontSize:9,color:u.ativo?"var(--green)":"var(--red)",fontWeight:600}}>
                      {u.ativo ? "✓ ATIVO" : "✗ DESATIVADO"}
                    </span>
                  </td>
                  <td style={{fontSize:9,color:"var(--dim)"}}>{created}</td>
                  <td>
                    {!isCurrentUser && u.ativo && (
                      <button 
                        className="btn btn-red" 
                        style={{padding:"4px 9px",fontSize:9}}
                        onClick={()=>desativar(u.id)}
                      >
                        <Icon d={IC.trash} size={10}/> DESATIVAR
                      </button>
                    )}
                    {isCurrentUser && (
                      <span style={{fontSize:8,color:"var(--gold)"}}>VOCÊ</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:20,padding:14,background:"var(--bg3)",border:"1px solid var(--bdr2)",borderRadius:6,fontSize:9,color:"var(--mid)",lineHeight:1.6}}>
        <div style={{color:"var(--gold)",fontWeight:600,marginBottom:6}}>NÍVEIS DE ACESSO:</div>
        <div><b style={{color:"var(--gold)"}}>Admin:</b> Acesso total + gerenciar usuários</div>
        <div><b style={{color:"var(--blue)"}}>Gerente:</b> Criar/editar + aprovar dossiês + auditoria</div>
        <div><b style={{color:"var(--green)"}}>Operador:</b> Criar/editar produtores e operações</div>
        <div><b style={{color:"var(--mid)"}}>Visualizador:</b> Apenas consultar (read-only)</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────────────────────
function MayaApp() {
  const { user, logout, isAdmin } = useAuth();
  const [screen, setScreen]       = useState("dashboard");
  const [selectedOp, setSelectedOp] = useState(null);
  const [selectedProd, setSelectedProd] = useState(null);

  const navItems = [
    { key:"dashboard",   label:"Dashboard",      icon:IC.home,  badge:null },
    { key:"cadastro",    label:"Novo Produtor",  icon:IC.users, badge:null },
    { key:"produtores",   label:"Produtores",     icon:IC.prop,  badge:null },
    { key:"operacoes",   label:"Operações",      icon:IC.ops,   badge:null },
    { key:"checklist",   label:"Documentos",     icon:IC.docs,  badge:null },
    { key:"dossie",      label:"Dossiê",         icon:IC.dossie,badge:null },
  ];

  // Adicionar item de gerenciamento apenas para admin
  if (isAdmin()) {
    navItems.push({ key:"usuarios", label:"Usuários", icon:IC.shield, badge:null });
  }

  const today = new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})
    .format(new Date()).replace(/^\w/,c=>c.toUpperCase());

  const screenLabel = {
    dashboard:"Dashboard",
    cadastro:"Novo Produtor",
    operacoes:"Operações",
    produtores:"Produtores",
    checklist:"Documentos",
    dossie:"Dossiê",
    usuarios:"Gerenciar Usuários"
  };

  const roleLabels = {
    admin: "Administrador",
    gerente: "Gerente",
    operador: "Operador",
    visualizador: "Visualizador"
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <aside className="sb">
          <div className="sb-logo">
            <div className="logo">MAYA</div>
            <div className="logo-sub">Crédito Rural · Inteligente</div>
          </div>
          <nav className="sb-nav">
            {navItems.map(n=>(
              <button key={n.key} className={`ni ${screen===n.key?"on":""}`} onClick={()=>setScreen(n.key)}>
                <Icon d={n.icon} size={13} strokeWidth={1.5}/>
                {n.label}
                {n.badge && <span className="nb">{n.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sb-foot">
            <b>Escritório Agrorrural</b>
            <div>Marilândia ES</div>
            <div className="safra">● Plano Safra 25/26 ativo</div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="tb-bc">MAYA&nbsp;/&nbsp;<span>{screenLabel[screen]}</span></div>
            <div className="tb-sp"/>
            <div className="tb-search"><Icon d={IC.search} size={11}/> Buscar produtor ou operação...</div>
            <button className="tb-bell"><Icon d={IC.bell} size={15}/><span className="bdot"/></button>
            <div className="tb-user">
              <Icon d={IC.user} size={13}/>
              <div>
                <div className="tb-user-name">{user?.nome}</div>
                <div className="tb-user-role">{roleLabels[user?.role]}</div>
              </div>
            </div>
            <button className="tb-logout" onClick={logout}>
              <Icon d={IC.logout} size={12}/> Sair
            </button>
            <div className="tb-date">{today}</div>
          </header>

          {screen==="dashboard" && <Dashboard setScreen={setScreen} setSelectedOp={setSelectedOp}/>}
          {screen==="cadastro"  && <CadastroProd setScreen={setScreen} prodId={selectedProd}/>}
          {screen==="operacoes" && <Operacoes setScreen={setScreen} setSelectedOp={setSelectedOp}/>}
          {screen==="produtores" && <ListaProdutores setScreen={setScreen} setSelectedProd={setSelectedProd}/>}
          {screen==="checklist" && selectedOp && <Checklist setScreen={setScreen} selectedOp={selectedOp}/>}
          {screen==="dossie"    && selectedOp && <Dossie setScreen={setScreen} selectedOp={selectedOp}/>}
          {screen==="usuarios"  && isAdmin() && <GerenciarUsuarios setScreen={setScreen}/>}
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}

function AppWithAuth() {
  return <MayaApp />;
}
