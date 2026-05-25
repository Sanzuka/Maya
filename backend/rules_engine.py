# ─────────────────────────────────────────────────────────────────────────────
# MAYA — Motor de Regras MCR
# Regras baseadas no Manual de Crédito Rural do BCB (vigência 2025/2026)
# ─────────────────────────────────────────────────────────────────────────────

from typing import Optional

CREDIT_RULES = {
    "PRONAF": {
        "modalidades": [
            "Custeio Agrícola", "Investimento", "Comercialização",
            "Industrialização", "Agroindustria", "Agroecologia",
            "Mulher", "Jovem", "Mais Alimentos", "Custeio Pecuário"
        ],
        "limite_renda_bruta_anual": 415000,
        "exige_dap_caf": True,
        "modulos_fiscais_max": None,  # sem limite para PRONAF geral
        "limites_por_modalidade": {
            "Custeio Agrícola":  {"min": 1000, "max": 250000},
            "Custeio Pecuário":  {"min": 1000, "max": 250000},
            "Investimento":      {"min": 1000, "max": 330000},
            "Mais Alimentos":    {"min": 1000, "max": 330000},
            "Comercialização":   {"min": 1000, "max": 1500000},
            "Industrialização":  {"min": 1000, "max": 1500000},
            "Agroindustria":     {"min": 1000, "max": 250000},
            "Agroecologia":      {"min": 1000, "max": 250000},
            "Mulher":            {"min": 1000, "max": 250000},
            "Jovem":             {"min": 1000, "max": 250000},
        },
        "documentos_obrigatorios": [
            "RG/CPF", "CAF/DAP", "CCIR Quitado", "ITR últimos 5 anos",
            "CAR Ativo", "Matrícula (<30 dias)", "Inscrição Estadual",
            "Consulta ZARC", "Proposta/Orçamento"
        ],
        "documentos_por_finalidade": {
            "Custeio Agrícola": ["Nota Fiscal Insumos ou Orçamento"],
            "Custeio Pecuário": ["Nota Fiscal Insumos ou Orçamento"],
            "Investimento":     ["Projeto Técnico ou Memorial Descritivo", "3 Orçamentos"],
            "Mais Alimentos":   ["Projeto Técnico ou Memorial Descritivo", "3 Orçamentos"],
        },
        "taxa_referencia": "3–6% a.a.",
    },
    "PRONAMP": {
        "modalidades": ["Custeio Agrícola", "Custeio Pecuário", "Investimento"],
        "limite_renda_bruta_anual": 2400000,
        "exige_dap_caf": False,
        "modulos_fiscais_max": None,
        "limites_por_modalidade": {
            "Custeio Agrícola": {"min": 1000, "max": 1100000},
            "Custeio Pecuário": {"min": 1000, "max": 1100000},
            "Investimento":     {"min": 1000, "max": 660000},
        },
        "documentos_obrigatorios": [
            "RG/CPF", "CCIR Quitado", "ITR últimos 5 anos",
            "CAR Ativo", "Matrícula (<30 dias)", "Imposto de Renda",
            "Consulta ZARC", "Contrato Social (se PJ)"
        ],
        "documentos_por_finalidade": {
            "Investimento": ["Projeto Técnico", "3 Orçamentos"],
        },
        "taxa_referencia": "8% a.a.",
    },
    "Livre": {
        "modalidades": ["Custeio Agrícola", "Custeio Pecuário", "Investimento", "Comercialização"],
        "limite_renda_bruta_anual": None,  # sem limite
        "exige_dap_caf": False,
        "modulos_fiscais_max": None,
        "limites_por_modalidade": {
            "Custeio Agrícola": {"min": 1000, "max": None},
            "Custeio Pecuário": {"min": 1000, "max": None},
            "Investimento":     {"min": 1000, "max": None},
            "Comercialização":  {"min": 1000, "max": None},
        },
        "documentos_obrigatorios": [
            "RG/CPF", "CCIR Quitado", "CAR Ativo", "Matrícula (<30 dias)",
            "Imposto de Renda", "Balanço Patrimonial ou DRE",
            "Consulta ZARC", "Certidão Negativa Débitos Federais"
        ],
        "documentos_por_finalidade": {
            "Investimento": ["Projeto Técnico", "3 Orçamentos"],
        },
        "taxa_referencia": "Taxa de mercado (livre negociação)",
    },
}

# Mapeamento dos campos do produtor para os documentos obrigatórios do MCR
PRODUTOR_DOCS_MAP = {
    # campo no modelo Produtor -> nome no MCR
    "cpf":   "RG/CPF",
    "caf":   "CAF/DAP",
    "ccir":  "CCIR Quitado",
    "car":   "CAR Ativo",
}

# Documentos que dependem de checklist externo (não estão no cadastro básico)
DOCS_CHECKLIST_ONLY = [
    "ITR últimos 5 anos",
    "Matrícula (<30 dias)",
    "Inscrição Estadual",
    "Consulta ZARC",
    "Proposta/Orçamento",
    "Imposto de Renda",
    "Contrato Social (se PJ)",
    "Balanço Patrimonial ou DRE",
    "Certidão Negativa Débitos Federais",
    "Nota Fiscal Insumos ou Orçamento",
    "Projeto Técnico ou Memorial Descritivo",
    "Projeto Técnico",
    "3 Orçamentos",
    "Memorial Descritivo",
]


def _produtor_possui_doc(produtor: dict, doc_name: str) -> bool:
    """Verifica se o produtor possui um documento pelo nome MCR."""
    for campo, nome_mcr in PRODUTOR_DOCS_MAP.items():
        if nome_mcr == doc_name:
            valor = produtor.get(campo, "")
            return bool(valor and str(valor).strip())
    # Documentos que não vêm do cadastro são considerados desconhecidos
    return False


def _sugerir_alternativa(linha: str, renda: float) -> Optional[str]:
    """Sugere uma linha alternativa se o produtor não for elegível."""
    if linha == "PRONAF":
        # Se renda cabe em PRONAMP
        if renda <= CREDIT_RULES["PRONAMP"]["limite_renda_bruta_anual"]:
            return "PRONAMP"
        return "Livre"
    if linha == "PRONAMP":
        # Se renda abaixo do limite PRONAF (possível se mudar de categoria)
        if renda <= CREDIT_RULES["PRONAF"]["limite_renda_bruta_anual"]:
            return "PRONAF"
        return "Livre"
    return None  # Livre já é a última opção


def check_elegibilidade(
    produtor: dict,
    linha: str,
    modalidade: str,
    valor_solicitado: float,
    finalidade_especifica: Optional[str] = None,
    documentos_checklist: Optional[dict] = None,
) -> dict:
    """
    Motor de elegibilidade baseado nas regras MCR 2025/2026.

    Parâmetros:
        produtor: dict com dados do produtor (id, nome, cpf, caf, ccir, car, renda, etc.)
        linha: "PRONAF" | "PRONAMP" | "Livre"
        modalidade: string da modalidade (ex: "Custeio Agrícola")
        valor_solicitado: float em reais
        finalidade_especifica: string opcional com finalidade detalhada
        documentos_checklist: dict opcional {"rg": "ok", "caf": "ok", ...} do checklist da operação

    Retorna:
        dict com elegivel, score, motivos_bloqueio, avisos, documentos_faltantes,
        documentos_ok, linha_alternativa_sugerida, observacao_maya
    """
    motivos_bloqueio = []
    avisos = []
    documentos_faltantes = []
    documentos_ok = []

    regras = CREDIT_RULES.get(linha)
    if not regras:
        return {
            "elegivel": False,
            "score": 0,
            "motivos_bloqueio": [f"Linha '{linha}' não reconhecida. Use PRONAF, PRONAMP ou Livre."],
            "avisos": [],
            "documentos_faltantes": [],
            "documentos_ok": [],
            "linha_alternativa_sugerida": None,
            "observacao_maya": "Linha de crédito inválida.",
        }

    renda = float(produtor.get("renda", 0) or 0)
    score = 100  # começa 100, descontamos por problemas

    # ── 1. VERIFICAÇÃO DE RENDA ──────────────────────────────────────────────
    limite_renda = regras["limite_renda_bruta_anual"]
    if limite_renda is not None and renda > limite_renda:
        motivos_bloqueio.append(
            f"Renda bruta anual do produtor (R$ {renda:,.0f}) excede o limite da linha {linha} "
            f"(R$ {limite_renda:,.0f}). Renda necessária para {linha}: até R$ {limite_renda:,.0f}."
        )
        score -= 40

    # ── 2. VERIFICAÇÃO DE MODALIDADE ────────────────────────────────────────
    modalidades_validas = regras["modalidades"]
    if modalidade not in modalidades_validas:
        motivos_bloqueio.append(
            f"Modalidade '{modalidade}' não está disponível para {linha}. "
            f"Modalidades disponíveis: {', '.join(modalidades_validas)}."
        )
        score -= 20

    # ── 3. VERIFICAÇÃO DE VALOR ──────────────────────────────────────────────
    limites_mod = regras["limites_por_modalidade"].get(modalidade, {})
    val_min = limites_mod.get("min", 0)
    val_max = limites_mod.get("max")

    if valor_solicitado < val_min:
        motivos_bloqueio.append(
            f"Valor solicitado (R$ {valor_solicitado:,.0f}) abaixo do mínimo para "
            f"{linha} — {modalidade} (mínimo: R$ {val_min:,.0f})."
        )
        score -= 15

    if val_max is not None and valor_solicitado > val_max:
        motivos_bloqueio.append(
            f"Valor solicitado (R$ {valor_solicitado:,.0f}) excede o limite da modalidade "
            f"{linha} — {modalidade} (limite: R$ {val_max:,.0f})."
        )
        score -= 25

    # ── 4. VERIFICAÇÃO CAF/DAP ───────────────────────────────────────────────
    if regras["exige_dap_caf"]:
        caf_valor = str(produtor.get("caf", "") or "").strip()
        if not caf_valor:
            motivos_bloqueio.append(
                f"{linha} exige CAF/DAP ativa. Produtor não possui CAF cadastrado."
            )
            score -= 20
        else:
            documentos_ok.append("CAF/DAP")

    # ── 5. VERIFICAÇÃO DE DOCUMENTOS DO CADASTRO ────────────────────────────
    docs_obrigatorios = list(regras["documentos_obrigatorios"])

    # Adicionar docs por finalidade, se aplicável
    if finalidade_especifica and "documentos_por_finalidade" in regras:
        docs_extras = regras["documentos_por_finalidade"].get(finalidade_especifica, [])
        docs_extras += regras["documentos_por_finalidade"].get(modalidade, [])
        for d in docs_extras:
            if d not in docs_obrigatorios:
                docs_obrigatorios.append(d)

    for doc in docs_obrigatorios:
        # Verificar no checklist da operação primeiro
        if documentos_checklist:
            chave_map = {
                "RG/CPF":          "rg",
                "CAF/DAP":         "caf",
                "CCIR Quitado":    "ccir",
                "ITR últimos 5 anos": "itr",
                "CAR Ativo":       "car",
                "Matrícula (<30 dias)": "matricula",
                "Inscrição Estadual": "ie",
                "Consulta ZARC":   "zarc",
            }
            chave = chave_map.get(doc)
            if chave and documentos_checklist.get(chave) == "ok":
                if doc not in documentos_ok:
                    documentos_ok.append(doc)
                continue
            elif chave and documentos_checklist.get(chave):
                documentos_faltantes.append(doc)
                score -= 5
                continue

        # Verificar no cadastro do produtor
        possui = _produtor_possui_doc(produtor, doc)
        if possui:
            if doc not in documentos_ok:
                documentos_ok.append(doc)
        elif doc not in DOCS_CHECKLIST_ONLY:
            # É um doc que deveria estar no cadastro mas não está
            documentos_faltantes.append(doc)
            score -= 5
        else:
            # Doc de checklist externo — aviso mas não bloqueia o score
            documentos_faltantes.append(doc)
            score -= 3

    # ── 6. AVISOS NÃO BLOQUEANTES ───────────────────────────────────────────
    if linha == "PRONAF" and renda > 360000 and renda <= 415000:
        avisos.append(
            f"Atenção: renda (R$ {renda:,.0f}) está próxima do teto PRONAF Geral "
            f"(R$ 415.000). Confirme o enquadramento com a instituição financeira."
        )

    if linha == "PRONAMP" and renda > 2000000:
        avisos.append(
            f"Renda (R$ {renda:,.0f}) próxima ao teto PRONAMP (R$ 2.400.000). "
            f"Verifique se há operações anteriores no exercício."
        )

    if valor_solicitado > 0 and val_max and valor_solicitado > val_max * 0.9:
        avisos.append(
            f"Valor solicitado representa mais de 90% do limite máximo para {linha} — {modalidade}. "
            "Verifique se há saldo disponível para o ano safra."
        )

    if not produtor.get("car", "").strip():
        avisos.append(
            "CAR não informado. O Cadastro Ambiental Rural é exigido por todas as linhas. "
            "Regularize antes de protocolar no banco."
        )

    # ── 7. SCORE FINAL E STATUS ──────────────────────────────────────────────
    score = max(0, min(100, score))

    if motivos_bloqueio:
        elegivel = False
    elif score >= 75:
        elegivel = True
    else:
        elegivel = "parcial"

    # ── 8. LINHA ALTERNATIVA ─────────────────────────────────────────────────
    linha_alternativa = None
    if not elegivel or elegivel == "parcial":
        linha_alternativa = _sugerir_alternativa(linha, renda)

    # ── 9. OBSERVAÇÃO DA MAYA ────────────────────────────────────────────────
    if elegivel is True and score >= 90:
        obs = (
            f"Operação enquadrada corretamente em {linha} — {modalidade}. "
            f"Produtor com renda de R$ {renda:,.0f} dentro dos limites. "
            f"Score de elegibilidade: {score}/100. "
            f"{len(documentos_faltantes)} documento(s) pendente(s) de checklist externo."
        )
    elif elegivel is True:
        obs = (
            f"Operação elegível para {linha} — {modalidade} com score {score}/100. "
            f"Atenção para {len(documentos_faltantes)} documento(s) ainda pendente(s). "
            "Recomendamos regularizar antes de protocolar."
        )
    elif elegivel == "parcial":
        obs = (
            f"Elegibilidade parcial para {linha} — {modalidade} (score {score}/100). "
            f"Há pendências que precisam ser resolvidas: {'; '.join(avisos[:2]) if avisos else 'verifique os documentos faltantes'}. "
        )
        if linha_alternativa:
            obs += f"Considere a linha {linha_alternativa} como alternativa."
    else:
        razoes = "; ".join(motivos_bloqueio[:2])
        obs = (
            f"Produtor INELEGÍVEL para {linha} — {modalidade}. "
            f"Motivo(s): {razoes}. "
        )
        if linha_alternativa:
            obs += f"Sugestão: verificar elegibilidade para {linha_alternativa}."

    return {
        "elegivel": elegivel,
        "score": score,
        "motivos_bloqueio": motivos_bloqueio,
        "avisos": avisos,
        "documentos_faltantes": list(dict.fromkeys(documentos_faltantes)),  # deduplica mantendo ordem
        "documentos_ok": list(dict.fromkeys(documentos_ok)),
        "linha_alternativa_sugerida": linha_alternativa,
        "observacao_maya": obs,
    }
