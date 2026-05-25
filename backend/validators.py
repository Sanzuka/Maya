# ─────────────────────────────────────────────────────────────────────────────
# MAYA — Validação Automática de Documentos
# Validações algorítmicas sem dependência de APIs externas
# ─────────────────────────────────────────────────────────────────────────────

import re


# ─────────────────────────────────────────────────────────────────────────────
# CPF
# ─────────────────────────────────────────────────────────────────────────────
async def validate_cpf(cpf: str) -> dict:
    """
    Valida CPF pelo algoritmo dos dígitos verificadores.
    Não depende de API externa.

    Retorna: {"valid": bool, "formatted": "000.000.000-00", "message": str}
    """
    # Remover tudo que não for dígito
    digits = re.sub(r"\D", "", str(cpf))

    # Deve ter exatamente 11 dígitos
    if len(digits) != 11:
        return {
            "valid": False,
            "formatted": cpf,
            "message": "CPF deve conter 11 dígitos numéricos.",
        }

    # CPFs com todos os dígitos iguais são inválidos (ex: 111.111.111-11)
    if len(set(digits)) == 1:
        return {
            "valid": False,
            "formatted": _format_cpf(digits),
            "message": "CPF inválido (dígitos repetidos).",
        }

    # Cálculo do primeiro dígito verificador
    soma = sum(int(digits[i]) * (10 - i) for i in range(9))
    resto = soma % 11
    d1 = 0 if resto < 2 else 11 - resto

    if int(digits[9]) != d1:
        return {
            "valid": False,
            "formatted": _format_cpf(digits),
            "message": "CPF inválido (dígito verificador incorreto).",
        }

    # Cálculo do segundo dígito verificador
    soma = sum(int(digits[i]) * (11 - i) for i in range(10))
    resto = soma % 11
    d2 = 0 if resto < 2 else 11 - resto

    if int(digits[10]) != d2:
        return {
            "valid": False,
            "formatted": _format_cpf(digits),
            "message": "CPF inválido (segundo dígito verificador incorreto).",
        }

    return {
        "valid": True,
        "formatted": _format_cpf(digits),
        "message": "CPF válido.",
    }


def _format_cpf(digits: str) -> str:
    """Formata 11 dígitos como 000.000.000-00."""
    if len(digits) == 11:
        return f"{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}"
    return digits


# ─────────────────────────────────────────────────────────────────────────────
# CCIR
# ─────────────────────────────────────────────────────────────────────────────
async def validate_ccir_format(ccir: str) -> dict:
    """
    Valida o formato do CCIR (Certificado de Cadastro de Imóvel Rural) do INCRA.
    
    Padrões aceitos pelo INCRA:
    - 8 a 13 dígitos numéricos (CCIR antigo)
    - Formato com hífen: XXXXXXXX-X (8 dígitos + dígito verificador)

    Retorna: {"valid": bool, "formatted": str, "message": str}
    """
    value = str(ccir).strip()
    # Remover espaços e hífens para verificação numérica
    digits_only = re.sub(r"[-\s]", "", value)

    # CCIR puro: 8 a 13 dígitos numéricos
    if re.match(r"^\d{8,13}$", digits_only):
        return {
            "valid": True,
            "formatted": value,
            "message": "Formato CCIR válido.",
        }

    # Formato legado com texto "CCIR-"
    if re.match(r"^CCIR[-\s]?\d{4}[-\s]?\d{2,8}$", value, re.IGNORECASE):
        return {
            "valid": True,
            "formatted": value.upper(),
            "message": "Formato CCIR válido.",
        }

    return {
        "valid": False,
        "formatted": value,
        "message": (
            "Formato CCIR inválido. Informe o número do CCIR conforme emitido pelo INCRA "
            "(ex: 12345678-9 ou sequência numérica de 8 a 13 dígitos)."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# CAR
# ─────────────────────────────────────────────────────────────────────────────

# UFs válidas do Brasil
_UFS_VALIDAS = {
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
    "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
    "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
}

async def validate_car_format(car: str) -> dict:
    """
    Valida o formato do CAR (Cadastro Ambiental Rural) — padrão SICAR.

    Formato oficial SICAR: UF-XXXXXXXXXXXXXXXXXXX
    - UF: sigla do estado (2 letras)
    - Separado por hífen
    - Código numérico de 7 a 25 dígitos (varia por estado)

    Retorna: {"valid": bool, "state": str | None, "formatted": str, "message": str}
    """
    value = str(car).strip().upper()

    # Padrão SICAR: UF-SEQUÊNCIA_NUMÉRICA
    match = re.match(r"^([A-Z]{2})-(\d{7,25})$", value)
    if match:
        uf = match.group(1)
        if uf in _UFS_VALIDAS:
            return {
                "valid": True,
                "state": uf,
                "formatted": value,
                "message": f"CAR válido para o estado {uf}.",
            }
        else:
            return {
                "valid": False,
                "state": None,
                "formatted": value,
                "message": f"UF '{uf}' inválida no código CAR.",
            }

    # Padrão estendido: UF-NNNNNNNNNN-NN (com segundo bloco)
    match2 = re.match(r"^([A-Z]{2})-(\d{6,})-(\d{2,})$", value)
    if match2:
        uf = match2.group(1)
        if uf in _UFS_VALIDAS:
            return {
                "valid": True,
                "state": uf,
                "formatted": value,
                "message": f"CAR válido para o estado {uf}.",
            }

    return {
        "valid": False,
        "state": None,
        "formatted": value,
        "message": (
            "Formato CAR inválido. Use o padrão SICAR: UF-XXXXXXXXXXXXXXXXX "
            "(ex: ES-3200300-XXXXXXXXXXXXXXXXXX ou ES-0000000000000000000)."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# CAF
# ─────────────────────────────────────────────────────────────────────────────

async def validate_caf_format(caf: str) -> dict:
    """
    Valida o formato do CAF (Cadastro da Agricultura Familiar).

    Formatos aceitos:
    - CAF-UF-NNNNN  (formato padrão antigo DAP/CAF)
    - CAF-NNNNNNNNNNN  (formato numérico de 11 dígitos — novo MAPA)
    - Apenas dígitos numéricos de 11 dígitos (CAF simplificado)

    Retorna: {"valid": bool, "message": str, "formatted": str}
    """
    value = str(caf).strip().upper()

    # Formato clássico: CAF-UF-NNNNN
    match = re.match(r"^CAF-([A-Z]{2})-(\d{4,8})$", value)
    if match:
        uf = match.group(1)
        if uf in _UFS_VALIDAS:
            return {
                "valid": True,
                "formatted": value,
                "message": f"CAF válido — estado {uf}.",
            }
        else:
            return {
                "valid": False,
                "formatted": value,
                "message": f"UF '{uf}' inválida no CAF.",
            }

    # Formato numérico MAPA 11 dígitos
    if re.match(r"^CAF-\d{11}$", value):
        return {
            "valid": True,
            "formatted": value,
            "message": "CAF válido (formato numérico MAPA).",
        }

    # Apenas os 11 dígitos numéricos
    digits_only = re.sub(r"\D", "", value)
    if len(digits_only) == 11:
        return {
            "valid": True,
            "formatted": f"CAF-{digits_only}",
            "message": "CAF válido (número de 11 dígitos).",
        }

    # Qualquer sequência começando com CAF e tendo caracteres alfanuméricos (flexível)
    if re.match(r"^CAF[-/][\w-]{4,20}$", value):
        return {
            "valid": True,
            "formatted": value,
            "message": "CAF com formato reconhecível.",
        }

    return {
        "valid": False,
        "formatted": value,
        "message": (
            "Formato CAF inválido. Use: CAF-UF-NNNNN (ex: CAF-ES-00001) "
            "ou o número de 11 dígitos do novo CAF (MAPA)."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# DISPATCHER
# ─────────────────────────────────────────────────────────────────────────────

async def validate_documento(tipo: str, valor: str) -> dict:
    """
    Função unificada de validação. Chama o validador correto conforme o tipo.

    Tipos suportados: CPF, CCIR, CAR, CAF
    """
    tipo_upper = tipo.upper().strip()

    if tipo_upper == "CPF":
        return await validate_cpf(valor)
    elif tipo_upper == "CCIR":
        return await validate_ccir_format(valor)
    elif tipo_upper == "CAR":
        return await validate_car_format(valor)
    elif tipo_upper == "CAF":
        return await validate_caf_format(valor)
    else:
        return {
            "valid": False,
            "formatted": valor,
            "message": f"Tipo de documento '{tipo}' não suportado. Use: CPF, CCIR, CAR ou CAF.",
        }
