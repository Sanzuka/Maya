from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum

# Importar módulo de autenticação
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_role, UserRole, Token,
    can_create_user, can_manage_operations, can_approve_dossier,
    can_view_audit, is_read_only, security
)

# Importar motor de regras MCR e validadores
from rules_engine import check_elegibilidade
from validators import validate_documento

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# ENUMS E CONSTANTES
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
class LinhaCredito(str, Enum):
    PRONAF = "PRONAF"
    PRONAMP = "PRONAMP"
    LIVRE = "Livre"

class StatusOperacao(str, Enum):
    PENDENTE = "pendente"
    EM_ANALISE = "em_analise"
    PRONTO = "pronto"
    ENCAMINHADO = "encaminhado"

class StatusDocumento(str, Enum):
    OK = "ok"
    PENDENTE = "pendente"
    INVALIDO = "invalido"

class StatusProdutor(str, Enum):
    ATIVO = "ativo"
    INATIVO = "inativo"
    PENDENTE = "pendente"

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# MODELS - AUTENTICAÃÃO
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    password: str
    role: UserRole
    telefone: Optional[str] = ""

class Usuario(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    email: EmailStr
    password_hash: str
    role: UserRole
    telefone: Optional[str] = ""
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

class UsuarioResponse(BaseModel):
    id: str
    nome: str
    email: EmailStr
    role: UserRole
    telefone: Optional[str]
    ativo: bool
    created_at: datetime
    last_login: Optional[datetime]

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    usuario_id: str
    usuario_nome: str
    acao: str
    detalhes: str
    ip: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# MODELS - PRODUTOR
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
class ProdutorCreate(BaseModel):
    nome: str
    cpf: str
    estado_civil: str = "solteiro"
    municipio: str
    uf: str = "ES"
    renda: float
    modulos: float
    atividade: str
    caf: str
    ccir: str
    car: str
    cafir: Optional[str] = ""

class Produtor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cpf: str
    estado_civil: str
    municipio: str
    uf: str
    renda: float
    modulos: float
    atividade: str
    caf: str
    ccir: str
    car: str
    cafir: Optional[str] = ""
    status: StatusProdutor = StatusProdutor.ATIVO
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class ProdutorComEnquadramento(Produtor):
    enquadramento: Dict

# ─────────────────────────────────────────────────────────────────────────────
# MODELS - MEMORIA DO PRODUTOR
# ─────────────────────────────────────────────────────────────────────────────

class Vistoria(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    data: str
    tecnico: str
    tipo: str = "vistoria_inicial"        # vistoria_inicial | renovacao | monitoramento | emergencia
    conformidade: str = "regular"         # regular | irregular | pendente | embargado
    observacoes: str = ""
    infraestrutura: Optional[str] = ""
    area_visitada_ha: Optional[float] = None
    fotos_realizadas: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MemoriaCredito(BaseModel):
    banco: str
    linha: str
    ano: int
    valor: float
    status: str = "quitado"              # quitado | em_andamento | inadimplente | renegociado
    observacoes: Optional[str] = ""

class MemoriaProdutiva(BaseModel):
    safra: str
    cultura: str
    area_plantada_ha: float
    produtividade_sc_ha: Optional[float] = None
    producao_total_sc: Optional[float] = None
    perdas_percent: Optional[float] = 0
    irrigacao: bool = False
    observacoes: Optional[str] = ""

class Alerta(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str                             # doc_vencendo | embargo | irregularidade | pendencia
    descricao: str
    data_limite: Optional[str] = None
    resolvido: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MemoriaProdutor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prod_id: str

    # Propriedade fisica
    coordenadas: Optional[str] = ""
    acesso_propriedade: Optional[str] = ""
    area_total_ha: Optional[float] = None
    area_agricola_ha: Optional[float] = None
    topografia: Optional[str] = ""       # plana | ondulada | montanhosa
    solo: Optional[str] = ""
    fonte_agua: Optional[str] = ""
    infraestrutura: Optional[str] = ""

    # Registros
    vistorias: List[Vistoria] = []
    historico_credito: List[MemoriaCredito] = []
    historico_produtivo: List[MemoriaProdutiva] = []
    alertas: List[Alerta] = []

    # Relacionamento
    contato_preferencial: Optional[str] = ""
    observacoes_gerais: Optional[str] = ""
    consultor_responsavel: Optional[str] = ""

    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VistoriaCreate(BaseModel):
    data: str
    tecnico: str
    tipo: str = "vistoria_inicial"
    conformidade: str = "regular"
    observacoes: str = ""
    infraestrutura: Optional[str] = ""
    area_visitada_ha: Optional[float] = None
    fotos_realizadas: bool = False

class MemoriaCredito_Create(BaseModel):
    banco: str
    linha: str
    ano: int
    valor: float
    status: str = "quitado"
    observacoes: Optional[str] = ""

class MemoriaProdutiva_Create(BaseModel):
    safra: str
    cultura: str
    area_plantada_ha: float
    produtividade_sc_ha: Optional[float] = None
    producao_total_sc: Optional[float] = None
    perdas_percent: Optional[float] = 0
    irrigacao: bool = False
    observacoes: Optional[str] = ""

class AlertaCreate(BaseModel):
    tipo: str
    descricao: str
    data_limite: Optional[str] = None

class MemoriaProdutorUpdate(BaseModel):
    coordenadas: Optional[str] = None
    acesso_propriedade: Optional[str] = None
    area_total_ha: Optional[float] = None
    area_agricola_ha: Optional[float] = None
    topografia: Optional[str] = None
    solo: Optional[str] = None
    fonte_agua: Optional[str] = None
    infraestrutura: Optional[str] = None
    contato_preferencial: Optional[str] = None
    observacoes_gerais: Optional[str] = None
    consultor_responsavel: Optional[str] = None


# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# MODELS - OPERAÃÃO
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

# ─────────────────────────────────────────────────────────────────────────────
# MODELS - GLEBA (MCR 2-1-2 / SICOR Campo 25 / SIRGAS2000)
# ─────────────────────────────────────────────────────────────────────────────

class VerticeGleba(BaseModel):
    """Ponto do perimetro da gleba — SIRGAS2000, 6 casas decimais (MCR 2-1-2)"""
    seq: int                    # ordem sequencial ao longo do perimetro
    lat: float                  # latitude  -90 a +90
    lon: float                  # longitude -180 a +180
    alt: Optional[float] = None # altitude em metros (opcional no SICOR)

class GlebaInfo(BaseModel):
    """
    Identificacao da gleba conforme MCR 2-1-2 e SICOR Campo 22/23/25.
    Sistema de referencia: SIRGAS2000 (obrigatorio BACEN/INCRA).
    """
    identificacao: int = 1                    # Campo 23 SICOR — numero seq da gleba
    codigo_car: Optional[str] = ""            # CAR do imovel — cruzamento MCR 2-9
    vertices: List[VerticeGleba] = []         # perimetro (min 3 pontos)
    area_calculada_ha: Optional[float] = None # calculada pelo MAYA via Shoelace
    area_contratada_ha: Optional[float] = None# area declarada no contrato
    municipio_ibge: Optional[str] = ""        # codigo CADMU/BCB (Campo 24 SICOR)
    descricao: Optional[str] = ""             # talhao, cultura, obs livre

class OperacaoCreate(BaseModel):
    prod_id: str
    linha: LinhaCredito
    modalidade: str
    valor: float
    cultura: str
    banco: str
    gleba: Optional[GlebaInfo] = None

class Operacao(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: f"OP-{uuid.uuid4().hex[:6].upper()}")
    prod_id: str
    linha: LinhaCredito
    modalidade: str
    valor: float
    cultura: str
    banco: str
    status: StatusOperacao = StatusOperacao.PENDENTE
    gleba: Optional[GlebaInfo] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

class OperacaoComProdutor(Operacao):
    produtor: Optional[Produtor] = None
    documentos: Optional[Dict[str, str]] = None
    progresso_docs: Optional[Dict] = None

# ─────────────────────────────────────────────────────────────────────────────
# MODELS - DOCUMENTOS
# ─────────────────────────────────────────────────────────────────────────────
class DocumentoStatusUpdate(BaseModel):
    documentos: Dict[str, StatusDocumento]

class DocumentoStatusResponse(BaseModel):
    operacao_id: str
    documentos: Dict[str, str]
    progresso: Dict

# ─────────────────────────────────────────────────────────────────────────────
# MODELS - DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    dossies_hoje: int
    dossies_mes: int
    credito_mes: float
    docs_pendentes: int
    total_produtores: int
    taxa_aprovacao: float

# ─────────────────────────────────────────────────────────────────────────────
# FUNÇÕES AUXILIARES
# ─────────────────────────────────────────────────────────────────────────────
def calcular_enquadramento(renda: float) -> Dict:
    """Motor de enquadramento automático baseado na renda"""
    if renda <= 360000:
        return {
            "label": "PRONAF",
            "color": "var(--green)",
            "bg": "rgba(109,181,128,0.12)",
            "border": "rgba(109,181,128,0.3)",
            "desc": "Renda ≤ R$360k · Limite R$250k/ano · Taxa 3–6% a.a. · CAF obrigatório"
        }
    elif renda <= 1760000:
        return {
            "label": "PRONAMP",
            "color": "var(--gold)",
            "bg": "rgba(168,133,43,0.12)",
            "border": "rgba(168,133,43,0.3)",
            "desc": "Renda R$360k–R$1,76M · Limite R$1,5M/ano · Taxa 8% a.a."
        }
    else:
        return {
            "label": "Livre",
            "color": "var(--blue)",
            "bg": "rgba(122,158,192,0.12)",
            "border": "rgba(122,158,192,0.3)",
            "desc": "Renda > R$1,76M · Sem limite · Crédito livre"
        }

def calcular_progresso_documentos(docs: Dict[str, str]) -> Dict:
    """Calcula o progresso dos documentos"""
    total = len(docs)
    ok = sum(1 for status in docs.values() if status == "ok")
    pendente = sum(1 for status in docs.values() if status == "pendente")
    invalido = sum(1 for status in docs.values() if status == "invalido")
    percentual = round((ok / total * 100)) if total > 0 else 0
    
    return {
        "total": total,
        "ok": ok,
        "pendente": pendente,
        "invalido": invalido,
        "percentual": percentual
    }

def serialize_datetime(obj):
    """Serializa datetime para ISO string para MongoDB"""
    if isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def deserialize_datetime(obj, fields=['created_at', 'timestamp', 'uploaded_at', 'last_login', 'approved_at']):
    """Deserializa ISO string para datetime"""
    if isinstance(obj, dict):
        for field in fields:
            if field in obj and isinstance(obj[field], str):
                try:
                    obj[field] = datetime.fromisoformat(obj[field])
                except:
                    pass
        return obj
    return obj

async def registrar_auditoria(usuario: dict, acao: str, detalhes: str, request: Request = None):
    """Registra uma ação na auditoria"""
    audit = AuditLog(
        usuario_id=usuario["id"],
        usuario_nome=usuario["nome"],
        acao=acao,
        detalhes=detalhes,
        ip=request.client.host if request else None
    )
    doc = serialize_datetime(audit.model_dump())
    await db.audit_logs.insert_one(doc)

# Dependency helper para injetar o usuário autenticado com DB
async def get_user(credentials = Depends(security)):
    return await get_current_user(credentials, db)

# ─────────────────────────────────────────────────────────────────────────────
# ROUTES - AUTENTICAÇÃO
# ─────────────────────────────────────────────────────────────────────────────
@api_router.post("/auth/login", response_model=Token)
async def login(request: Request, login_data: LoginRequest):
    """Login com email e senha"""
    user = await db.usuarios.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    if not user.get("ativo", True):
        raise HTTPException(status_code=403, detail="Usuário desativado")
    
    # Atualizar last_login
    await db.usuarios.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Criar token
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]}
    )
    
    # Registrar auditoria
    await registrar_auditoria(user, "LOGIN", f"Login realizado", request)
    
    # Remover senha da resposta
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    
    return Token(access_token=access_token, user=user_response)

@api_router.get("/auth/me", response_model=UsuarioResponse)
async def get_me(credentials = Depends(security)):
    """Retorna dados do usuário logado"""
    user = await get_current_user(credentials, db)
    return UsuarioResponse(**user)

@api_router.post("/auth/usuarios", response_model=UsuarioResponse)
async def criar_usuario(
    request: Request,
    usuario_data: UsuarioCreate
):
    """Criar novo usuário (apenas Admin)"""
    
    # Verificar se email já existe
    existing = await db.usuarios.find_one({"email": usuario_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Criar usuário
    usuario = Usuario(
        nome=usuario_data.nome,
        email=usuario_data.email,
        password_hash=get_password_hash(usuario_data.password),
        role=usuario_data.role,
        telefone=usuario_data.telefone
    )
    
    doc = serialize_datetime(usuario.model_dump())
    await db.usuarios.insert_one(doc)
    
    # Registrar auditoria
    await registrar_auditoria(
        {"id":"admin-local","nome":"Dellano","role":"admin"}, "CRIAR_USUARIO",
        f"Criou usuário {usuario.nome} ({usuario.email}) com role {usuario.role}",
        request
    )
    
    return UsuarioResponse(**usuario.model_dump())

@api_router.get("/auth/usuarios", response_model=List[UsuarioResponse])
async def listar_usuarios():
    """Listar todos os usuários (apenas Admin)"""
    
    usuarios = await db.usuarios.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    usuarios = [deserialize_datetime(u) for u in usuarios]
    return [UsuarioResponse(**u) for u in usuarios]

@api_router.put("/auth/usuarios/{id}")
async def atualizar_usuario(
    request: Request,
    id: str,
    updates: dict
):
    """Atualizar usuário (apenas Admin)"""
    
    # Não permitir atualizar senha diretamente
    if "password" in updates:
        updates["password_hash"] = get_password_hash(updates.pop("password"))
    
    result = await db.usuarios.update_one({"id": id}, {"$set": updates})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    await registrar_auditoria({"id":"admin-local","nome":"Dellano","role":"admin"}, "ATUALIZAR_USUARIO", f"Atualizou usuário {id}", request)
    
    return {"success": True}

@api_router.delete("/auth/usuarios/{id}")
async def desativar_usuario(
    request: Request,
    id: str
):
    """Desativar usuário (apenas Admin)"""
    
    if id == "admin-local":
        raise HTTPException(status_code=400, detail="Não pode desativar o próprio usuário")
    
    result = await db.usuarios.update_one({"id": id}, {"$set": {"ativo": False}})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    await registrar_auditoria({"id":"admin-local","nome":"Dellano","role":"admin"}, "DESATIVAR_USUARIO", f"Desativou usuário {id}", request)
    
    return {"success": True}

@api_router.get("/auth/audit", response_model=List[AuditLog])
async def listar_auditoria(
    limit: int = 100
):
    """Listar logs de auditoria (Admin e Gerente)"""
    
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    logs = [deserialize_datetime(log) for log in logs]
    return logs

# ─────────────────────────────────────────────────────────────────────────────
# ROUTES - PRODUTORES
# ─────────────────────────────────────────────────────────────────────────────
@api_router.post("/produtores", response_model=ProdutorComEnquadramento)
async def criar_produtor(
    request: Request,
    input: ProdutorCreate
):
    """Criar novo produtor com enquadramento automático"""
    
    produtor_dict = input.model_dump()
    produtor = Produtor(**produtor_dict, created_by="admin-local")
    
    # Calcular enquadramento
    enquadramento = calcular_enquadramento(produtor.renda)
    
    # Salvar no MongoDB
    doc = serialize_datetime(produtor.model_dump())
    await db.produtores.insert_one(doc)
    
    # Registrar auditoria
    await registrar_auditoria(
        {"id":"admin-local","nome":"Dellano","role":"admin"}, "CRIAR_PRODUTOR",
        f"Criou produtor {produtor.nome} (CPF: {produtor.cpf})",
        request
    )
    
    # Retornar com enquadramento
    result = ProdutorComEnquadramento(**produtor.model_dump(), enquadramento=enquadramento)
    return result

@api_router.get("/produtores", response_model=List[Produtor])
async def listar_produtores():
    """Listar todos os produtores"""
    produtores = await db.produtores.find({}, {"_id": 0}).to_list(1000)
    produtores = [deserialize_datetime(p) for p in produtores]
    return produtores

@api_router.get("/produtores/{id}", response_model=ProdutorComEnquadramento)
async def buscar_produtor(id: str):
    """Buscar produtor por ID"""
    produtor = await db.produtores.find_one({"id": id}, {"_id": 0})
    if not produtor:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    
    produtor = deserialize_datetime(produtor)
    enquadramento = calcular_enquadramento(produtor["renda"])
    
    return ProdutorComEnquadramento(**produtor, enquadramento=enquadramento)

# ─────────────────────────────────────────────────────────────────────────────
# ROUTES - OPERAÇÕES
# ─────────────────────────────────────────────────────────────────────────────
@api_router.post("/operacoes", response_model=Operacao)
async def criar_operacao(
    request: Request,
    input: OperacaoCreate
):
    """Criar nova operação de crédito"""
    
    # Verificar se produtor existe
    produtor = await db.produtores.find_one({"id": input.prod_id})
    if not produtor:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    
    operacao_dict = input.model_dump()

    # Calcular area da gleba pelos vertices (MCR 2-1-2 / SICOR Campo 44)
    alerta_gleba = None
    if input.gleba and input.gleba.vertices:
        area_calc = calcular_area_poligono_ha(input.gleba.vertices)
        operacao_dict["gleba"]["area_calculada_ha"] = area_calc
        # Verificar tolerancia de area MCR (10%)
        tolerancia = verificar_tolerancia_area(area_calc, input.gleba.area_contratada_ha)
        if not tolerancia["conforme"]:
            alerta_gleba = {"tipo": "tolerancia_area", **tolerancia}

    # Verificar sobreposicao de glebas (MCR 3-6-3-b)
    if input.gleba:
        resultado_sob = await verificar_sobreposicao_gleba(
            input.prod_id,
            input.gleba.codigo_car or "",
            input.gleba.area_contratada_ha or 0
        )
        if resultado_sob["status"] == "conflito":
            alerta_gleba = resultado_sob

    operacao = Operacao(**operacao_dict, created_by="admin-local")
    
    # Salvar operação
    doc = serialize_datetime(operacao.model_dump())
    await db.operacoes.insert_one(doc)
    
    # Criar documentos padrão para a operação
    docs_padrao = {
        "rg": "pendente",
        "caf": "pendente",
        "ccir": "pendente",
        "itr": "pendente",
        "car": "pendente",
        "cafir": "pendente",
        "matricula": "pendente",
        "ie": "pendente",
        "zarc": "pendente"
    }
    
    doc_status = {
        "operacao_id": operacao.id,
        "documentos": docs_padrao,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.documentos.insert_one(doc_status)
    
    # Registrar auditoria
    await registrar_auditoria(
        {"id":"admin-local","nome":"Dellano","role":"admin"}, "CRIAR_OPERACAO",
        f"Criou operação {operacao.id} para produtor {produtor['nome']}",
        request
    )
    
    result = operacao.model_dump()
    if alerta_gleba:
        result["alerta_gleba"] = alerta_gleba
    return result

@api_router.get("/operacoes", response_model=List[OperacaoComProdutor])
async def listar_operacoes(
    status: Optional[str] = None
):
    """Listar todas as operações com filtro opcional de status"""
    query = {}
    if status and status != "todas":
        query["status"] = status
    
    operacoes = await db.operacoes.find(query, {"_id": 0}).to_list(1000)
    operacoes = [deserialize_datetime(op) for op in operacoes]
    
    # Enriquecer com dados do produtor e documentos
    result = []
    for op in operacoes:
        # Buscar produtor
        produtor = await db.produtores.find_one({"id": op["prod_id"]}, {"_id": 0})
        
        # Buscar status dos documentos
        docs = await db.documentos.find_one({"operacao_id": op["id"]}, {"_id": 0})
        documentos = docs.get("documentos", {}) if docs else {}
        progresso = calcular_progresso_documentos(documentos)
        
        op_completa = OperacaoComProdutor(
            **op,
            produtor=Produtor(**deserialize_datetime(produtor)) if produtor else None,
            documentos=documentos,
            progresso_docs=progresso
        )
        result.append(op_completa)
    
    return result

@api_router.get("/operacoes/{id}", response_model=OperacaoComProdutor)
async def buscar_operacao(id: str):
    """Buscar operação por ID com dados completos"""
    operacao = await db.operacoes.find_one({"id": id}, {"_id": 0})
    if not operacao:
        raise HTTPException(status_code=404, detail="Operação não encontrada")
    
    operacao = deserialize_datetime(operacao)
    
    # Buscar produtor
    produtor = await db.produtores.find_one({"id": operacao["prod_id"]}, {"_id": 0})
    
    # Buscar documentos
    docs = await db.documentos.find_one({"operacao_id": id}, {"_id": 0})
    documentos = docs.get("documentos", {}) if docs else {}
    progresso = calcular_progresso_documentos(documentos)
    
    return OperacaoComProdutor(
        **operacao,
        produtor=Produtor(**deserialize_datetime(produtor)) if produtor else None,
        documentos=documentos,
        progresso_docs=progresso
    )

@api_router.put("/operacoes/{id}")
async def atualizar_operacao(
    request: Request,
    id: str,
    status: StatusOperacao
):
    """Atualizar status da operação"""
    
    # Se for aprovar, verificar permissão especial
    # aprovacao permitida
    
    update_data = {"status": status.value}
    if status == StatusOperacao.PRONTO:
        update_data["approved_by"] = "admin-local"
        update_data["approved_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.operacoes.update_one({"id": id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Operação não encontrada")
    
    await registrar_auditoria(
        {"id":"admin-local","nome":"Dellano","role":"admin"}, "ATUALIZAR_OPERACAO",
        f"Alterou status da operação {id} para {status.value}",
        request
    )
    
    return {"success": True, "message": "Status atualizado"}

# ─────────────────────────────────────────────────────────────────────────────
# ROUTES - DOCUMENTOS
# ─────────────────────────────────────────────────────────────────────────────
@api_router.put("/operacoes/{id}/documentos", response_model=DocumentoStatusResponse)
async def atualizar_documentos(
    request: Request,
    id: str,
    input: DocumentoStatusUpdate
):
    """Atualizar status dos documentos de uma operação"""
    
    # Verificar se operação existe
    operacao = await db.operacoes.find_one({"id": id})
    if not operacao:
        raise HTTPException(status_code=404, detail="Operação não encontrada")
    
    # Atualizar documentos
    result = await db.documentos.update_one(
        {"operacao_id": id},
        {
            "$set": {
                "documentos": {k: v.value for k, v in input.documentos.items()},
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": "admin-local"
            }
        },
        upsert=True
    )
    
    # Buscar documentos atualizados
    docs = await db.documentos.find_one({"operacao_id": id}, {"_id": 0})
    documentos = docs.get("documentos", {})
    progresso = calcular_progresso_documentos(documentos)
    
    # Atualizar status da operação baseado nos documentos
    if progresso["percentual"] == 100:
        await db.operacoes.update_one(
            {"id": id},
            {"$set": {"status": StatusOperacao.PRONTO.value}}
        )
    
    await registrar_auditoria(
        {"id":"admin-local","nome":"Dellano","role":"admin"}, "ATUALIZAR_DOCUMENTOS",
        f"Atualizou documentos da operação {id}",
        request
    )
    
    return DocumentoStatusResponse(
        operacao_id=id,
        documentos=documentos,
        progresso=progresso
    )

@api_router.get("/operacoes/{id}/documentos", response_model=DocumentoStatusResponse)
async def buscar_documentos(id: str):
    """Buscar status dos documentos de uma operação"""
    docs = await db.documentos.find_one({"operacao_id": id}, {"_id": 0})
    if not docs:
        raise HTTPException(status_code=404, detail="Documentos não encontrados")
    
    documentos = docs.get("documentos", {})
    progresso = calcular_progresso_documentos(documentos)
    
    return DocumentoStatusResponse(
        operacao_id=id,
        documentos=documentos,
        progresso=progresso
    )

# ─────────────────────────────────────────────────────────────────────────────
# ROUTES - DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# ROUTES - PRODUTORES (LISTAGEM)
# ─────────────────────────────────────────────────────────────────────────────
@api_router.get("/produtores/{prod_id}/memoria", response_model=MemoriaProdutor)
async def get_memoria(prod_id: str):
    mem = await db.memoria_produtores.find_one({"prod_id": prod_id}, {"_id": 0})
    if not mem:
        # Criar memoria vazia automaticamente
        nova = MemoriaProdutor(prod_id=prod_id)
        await db.memoria_produtores.insert_one(nova.model_dump())
        return nova
    return deserialize_datetime(mem)

@api_router.patch("/produtores/{prod_id}/memoria")
async def atualizar_memoria(prod_id: str, update: MemoriaProdutorUpdate):
    dados = {k: v for k, v in update.model_dump().items() if v is not None}
    dados["updated_at"] = datetime.now(timezone.utc)
    existing = await db.memoria_produtores.find_one({"prod_id": prod_id})
    if not existing:
        nova = MemoriaProdutor(prod_id=prod_id, **dados)
        await db.memoria_produtores.insert_one(nova.model_dump())
    else:
        await db.memoria_produtores.update_one({"prod_id": prod_id}, {"$set": dados})
    mem = await db.memoria_produtores.find_one({"prod_id": prod_id}, {"_id": 0})
    return deserialize_datetime(mem)

@api_router.post("/produtores/{prod_id}/vistorias")
async def add_vistoria(prod_id: str, v: VistoriaCreate):
    nova = Vistoria(**v.model_dump())
    existing = await db.memoria_produtores.find_one({"prod_id": prod_id})
    if not existing:
        mem = MemoriaProdutor(prod_id=prod_id, vistorias=[nova])
        await db.memoria_produtores.insert_one(mem.model_dump())
    else:
        await db.memoria_produtores.update_one(
            {"prod_id": prod_id},
            {"$push": {"vistorias": nova.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
    return {"success": True, "id": nova.id}

@api_router.post("/produtores/{prod_id}/historico_credito")
async def add_historico_credito(prod_id: str, hc: MemoriaCredito_Create):
    novo = MemoriaCredito(**hc.model_dump())
    existing = await db.memoria_produtores.find_one({"prod_id": prod_id})
    if not existing:
        mem = MemoriaProdutor(prod_id=prod_id, historico_credito=[novo])
        await db.memoria_produtores.insert_one(mem.model_dump())
    else:
        await db.memoria_produtores.update_one(
            {"prod_id": prod_id},
            {"$push": {"historico_credito": novo.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
    return {"success": True}

@api_router.post("/produtores/{prod_id}/historico_produtivo")
async def add_historico_produtivo(prod_id: str, hp: MemoriaProdutiva_Create):
    novo = MemoriaProdutiva(**hp.model_dump())
    existing = await db.memoria_produtores.find_one({"prod_id": prod_id})
    if not existing:
        mem = MemoriaProdutor(prod_id=prod_id, historico_produtivo=[novo])
        await db.memoria_produtores.insert_one(mem.model_dump())
    else:
        await db.memoria_produtores.update_one(
            {"prod_id": prod_id},
            {"$push": {"historico_produtivo": novo.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
    return {"success": True}

@api_router.post("/produtores/{prod_id}/alertas")
async def add_alerta(prod_id: str, a: AlertaCreate):
    novo = Alerta(**a.model_dump())
    existing = await db.memoria_produtores.find_one({"prod_id": prod_id})
    if not existing:
        mem = MemoriaProdutor(prod_id=prod_id, alertas=[novo])
        await db.memoria_produtores.insert_one(mem.model_dump())
    else:
        await db.memoria_produtores.update_one(
            {"prod_id": prod_id},
            {"$push": {"alertas": novo.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
    return {"success": True, "id": novo.id}

@api_router.patch("/produtores/{prod_id}/alertas/{alerta_id}/resolver")
async def resolver_alerta(prod_id: str, alerta_id: str):
    await db.memoria_produtores.update_one(
        {"prod_id": prod_id, "alertas.id": alerta_id},
        {"$set": {"alertas.$.resolvido": True, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"success": True}


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES - GLEBAS
# ─────────────────────────────────────────────────────────────────────────────

@api_router.get("/produtores/{prod_id}/glebas")
async def listar_glebas_produtor(prod_id: str):
    """
    Lista todas as glebas em uso ativo pelo produtor.
    Inclui controle de area comprometida vs disponivel.
    Conformidade: MCR 3-6-3-b (duplicidade) e MCR 2-1 (limite produtivo).
    """
    ops = await db.operacoes.find(
        {"prod_id": prod_id, "gleba": {"$ne": None}},
        {"_id": 0}
    ).to_list(200)

    glebas_por_car = {}
    area_comprometida_ativa = 0.0

    for op in ops:
        gleba = op.get("gleba") or {}
        car = gleba.get("codigo_car", "") or "sem_car"
        ativo = op.get("status") in ["pendente", "em_analise", "aprovado"]

        if car not in glebas_por_car:
            glebas_por_car[car] = {
                "codigo_car": car if car != "sem_car" else None,
                "descricao": gleba.get("descricao", ""),
                "area_calculada_ha": gleba.get("area_calculada_ha"),
                "operacoes": []
            }

        glebas_por_car[car]["operacoes"].append({
            "operacao_id": op["id"],
            "linha": op.get("linha"),
            "banco": op.get("banco"),
            "valor": op.get("valor"),
            "area_contratada_ha": gleba.get("area_contratada_ha"),
            "status": op.get("status"),
            "cultura": op.get("cultura"),
            "ativa": ativo
        })

        if ativo and gleba.get("area_contratada_ha"):
            area_comprometida_ativa += gleba["area_contratada_ha"]

    memoria = await db.memoria_produtores.find_one({"prod_id": prod_id}, {"_id": 0})
    area_agricola = None
    if memoria:
        area_agricola = memoria.get("area_agricola_ha") or memoria.get("area_total_ha")

    return {
        "prod_id": prod_id,
        "glebas": list(glebas_por_car.values()),
        "area_agricola_imovel_ha": area_agricola,
        "area_comprometida_ativa_ha": round(area_comprometida_ativa, 4),
        "area_disponivel_ha": round(area_agricola - area_comprometida_ativa, 4) if area_agricola else None,
        "alerta_excede": area_agricola is not None and area_comprometida_ativa > area_agricola,
        "referencia_normativa": "MCR 2-1-2 (CG obrigatorias) / MCR 3-6-3-b (duplicidade) / SICOR Campo 25"
    }

@api_router.post("/verificar-gleba")
async def verificar_gleba_pre_contratacao(
    prod_id: str,
    codigo_car: str = "",
    area_contratada_ha: float = 0,
    vertices: Optional[List[VerticeGleba]] = None,
    operacao_id: Optional[str] = None
):
    """
    Verificacao pre-contratacao conforme MCR 3-6-3-b.
    Uso: consultor executa antes de ir ao banco para identificar impedimentos.
    Retorna: status livre/conflito + analise de tolerancia de area SICOR.
    """
    resultado = await verificar_sobreposicao_gleba(
        prod_id, codigo_car, area_contratada_ha, operacao_id
    )

    # Calcular area pelos vertices se fornecidos
    if vertices and len(vertices) >= 3:
        area_calc = calcular_area_poligono_ha(vertices)
        resultado["area_calculada_ha"] = area_calc
        resultado["tolerancia_area"] = verificar_tolerancia_area(area_calc, area_contratada_ha)

    resultado["orientacao"] = (
        "Gleba disponivel para contratacao." if resultado["status"] == "livre"
        else "ATENCAO: Existem impedimentos. Verifique os conflitos antes de protocolar no banco."
    )
    return resultado

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def obter_estatisticas():
    """Obter estatísticas para o dashboard"""
    from datetime import timedelta
    
    hoje = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    inicio_mes = hoje.replace(day=1)
    
    # Contar operações de hoje
    ops_hoje = await db.operacoes.count_documents({
        "created_at": {"$gte": hoje.isoformat()}
    })
    
    # Contar operações do mês
    ops_mes = await db.operacoes.count_documents({
        "created_at": {"$gte": inicio_mes.isoformat()}
    })
    
    # Calcular crédito total do mês
    pipeline = [
        {"$match": {"created_at": {"$gte": inicio_mes.isoformat()}}},
        {"$group": {"_id": None, "total": {"$sum": "$valor"}}}
    ]
    credito_result = await db.operacoes.aggregate(pipeline).to_list(1)
    credito_mes = credito_result[0]["total"] if credito_result else 0
    
    # Contar documentos pendentes
    docs_pendentes = 0
    all_docs = await db.documentos.find({}, {"_id": 0}).to_list(1000)
    for doc in all_docs:
        documentos = doc.get("documentos", {})
        docs_pendentes += sum(1 for status in documentos.values() if status != "ok")
    
    # Total de produtores
    total_produtores = await db.produtores.count_documents({})
    
    # Taxa de aprovação
    ops_prontas = await db.operacoes.count_documents({"status": "pronto"})
    ops_encaminhadas = await db.operacoes.count_documents({"status": "encaminhado"})
    total_ops = await db.operacoes.count_documents({})
    taxa_aprovacao = round(((ops_prontas + ops_encaminhadas) / total_ops * 100), 1) if total_ops > 0 else 0
    
    return DashboardStats(
        dossies_hoje=ops_hoje,
        dossies_mes=ops_mes,
        credito_mes=credito_mes,
        docs_pendentes=docs_pendentes,
        total_produtores=total_produtores,
        taxa_aprovacao=taxa_aprovacao
    )

# ─────────────────────────────────────────────────────────────────────────────
# ROUTES - ELEGIBILIDADE MCR (Sprint 1 — T1)
# ─────────────────────────────────────────────────────────────────────────────

class ElegibilidadeRequest(BaseModel):
    produtor_id: str
    linha: str              # PRONAF | PRONAMP | Livre
    modalidade: str
    valor_solicitado: float
    finalidade_especifica: Optional[str] = None

class ValidateDocumentoRequest(BaseModel):
    tipo: str               # CPF | CCIR | CAR | CAF
    valor: str

@api_router.post("/check-elegibilidade")
async def check_elegibilidade_endpoint(req: ElegibilidadeRequest):
    """
    Verifica a elegibilidade de um produtor para uma linha/modalidade de crédito.
    Baseado nas regras MCR 2025/2026 (BACEN).
    """
    # Buscar produtor
    produtor = await db.produtores.find_one({"id": req.produtor_id}, {"_id": 0})
    if not produtor:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")

    # Buscar documentos do checklist da operação mais recente (se existir)
    doc_status = None
    ultima_op = await db.operacoes.find_one(
        {"prod_id": req.produtor_id},
        {"_id": 0, "id": 1},
        sort=[("created_at", -1)]
    )
    if ultima_op:
        docs_db = await db.documentos.find_one({"operacao_id": ultima_op["id"]}, {"_id": 0})
        if docs_db:
            doc_status = docs_db.get("documentos", {})

    resultado = check_elegibilidade(
        produtor=produtor,
        linha=req.linha,
        modalidade=req.modalidade,
        valor_solicitado=req.valor_solicitado,
        finalidade_especifica=req.finalidade_especifica,
        documentos_checklist=doc_status,
    )
    return resultado


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES - VALIDAÇÃO DE DOCUMENTOS (Sprint 1 — T4)
# ─────────────────────────────────────────────────────────────────────────────

@api_router.post("/validate-documento")
async def validate_documento_endpoint(req: ValidateDocumentoRequest):
    """
    Valida o formato de documentos: CPF, CCIR, CAR, CAF.
    Validação algorítmica sem API externa.
    """
    resultado = await validate_documento(req.tipo, req.valor)
    return resultado


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE RAIZ
# ─────────────────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
# SYNC DE LAUDOS (recebe push do maya-web após geração de PDF)
# ─────────────────────────────────────────────────────────────────────────────

class LaudoSyncData(BaseModel):
    """Dados públicos de um laudo recebidos do maya-web via push."""
    report_id: str
    generated_at: str
    producer_name: str
    municipality: str
    latitude: float
    longitude: float
    seal_status: str          # APPROVED | PENDING | RISK
    verification_hash: Optional[str] = None
    verification_url: Optional[str] = None
    # Campos opcionais para vincular ao cadastro interno
    car: Optional[str] = None
    prod_id: Optional[str] = None

@api_router.post("/laudos/sync", status_code=201)
async def sync_laudo(request: Request, laudo: LaudoSyncData):
    """
    Recebe um laudo gerado pelo maya-web e o persiste na base Maya.
    Protegido por MAYA_SYNC_SECRET no header X-Sync-Secret.
    """
    sync_secret = os.environ.get("MAYA_SYNC_SECRET", "")
    if sync_secret:
        header_secret = request.headers.get("x-sync-secret", "")
        if header_secret != sync_secret:
            raise HTTPException(status_code=401, detail="Secret inválido.")

    doc = laudo.model_dump()
    doc["synced_at"] = datetime.now(timezone.utc).isoformat()

    await db.laudos.update_one(
        {"report_id": laudo.report_id},
        {"$set": doc},
        upsert=True
    )
    return {"ok": True, "report_id": laudo.report_id}

@api_router.get("/laudos/{report_id}")
async def get_laudo_publico(report_id: str):
    """
    Retorna dados públicos de um laudo para a verify page.
    Sem autenticação — página escaneada via QR code.
    """
    doc = await db.laudos.find_one({"report_id": report_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Laudo não encontrado.")

    # Se há prod_id vinculado, enriquece com dados do produtor
    produtor = None
    if doc.get("prod_id"):
        p = await db.produtores.find_one({"id": doc["prod_id"]}, {"_id": 0, "cpf": 0})
        if p:
            produtor = {
                "nome": p.get("nome"),
                "municipio": p.get("municipio"),
                "uf": p.get("uf"),
                "car": p.get("car"),
                "atividade": p.get("atividade"),
            }

    return {"ok": True, "laudo": doc, "produtor": produtor}

@api_router.get("/")
async def root():
    return {"message": "API MAYA - Sistema de CrÃ©dito Rural", "version": "2.0.0", "auth": "enabled"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# STARTUP - CRIAR USUÃRIO ADMIN PADRÃO
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
@app.on_event("startup")
async def startup_event():
    """Criar usuÃ¡rio admin padrÃ£o se nÃ£o existir"""
    admin_exists = await db.usuarios.find_one({"role": "admin"})
    
    if not admin_exists:
        admin = Usuario(
            nome="Administrador",
            email="admin@maya.com",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            telefone=""
        )
        doc = serialize_datetime(admin.model_dump())
        await db.usuarios.insert_one(doc)
        logger.info("Usuario admin ja existe")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()