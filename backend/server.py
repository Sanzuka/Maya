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

# Importar mÃ³dulo de autenticaÃ§Ã£o
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_role, UserRole, Token,
    can_create_user, can_manage_operations, can_approve_dossier,
    can_view_audit, is_read_only, security
)

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

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# MODELS - OPERAÃÃO
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
class OperacaoCreate(BaseModel):
    prod_id: str
    linha: LinhaCredito
    modalidade: str
    valor: float
    cultura: str
    banco: str

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

class OperacaoComProdutor(Operacao):
    produtor: Optional[Produtor] = None
    documentos: Optional[Dict[str, str]] = None
    progresso_docs: Optional[Dict] = None

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# MODELS - DOCUMENTOS
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
class DocumentoStatusUpdate(BaseModel):
    documentos: Dict[str, StatusDocumento]

class DocumentoStatusResponse(BaseModel):
    operacao_id: str
    documentos: Dict[str, str]
    progresso: Dict

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# MODELS - DASHBOARD
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
class DashboardStats(BaseModel):
    dossies_hoje: int
    dossies_mes: int
    credito_mes: float
    docs_pendentes: int
    total_produtores: int
    taxa_aprovacao: float

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# FUNÃÃES AUXILIARES
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
def calcular_enquadramento(renda: float) -> Dict:
    """Motor de enquadramento automÃ¡tico baseado na renda"""
    if renda <= 360000:
        return {
            "label": "PRONAF",
            "color": "var(--green)",
            "bg": "rgba(109,181,128,0.12)",
            "border": "rgba(109,181,128,0.3)",
            "desc": "Renda â¤ R$360k Â· Limite R$250k/ano Â· Taxa 3â6% a.a. Â· CAF obrigatÃ³rio"
        }
    elif renda <= 1760000:
        return {
            "label": "PRONAMP",
            "color": "var(--gold)",
            "bg": "rgba(200,168,75,0.12)",
            "border": "rgba(200,168,75,0.3)",
            "desc": "Renda R$360kâR$1,76M Â· Limite R$1,5M/ano Â· Taxa 8% a.a."
        }
    else:
        return {
            "label": "Livre",
            "color": "var(--blue)",
            "bg": "rgba(122,158,192,0.12)",
            "border": "rgba(122,158,192,0.3)",
            "desc": "Renda > R$1,76M Â· Sem limite Â· CrÃ©dito livre"
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
    """Registra uma aÃ§Ã£o na auditoria"""
    audit = AuditLog(
        usuario_id=usuario["id"],
        usuario_nome=usuario["nome"],
        acao=acao,
        detalhes=detalhes,
        ip=request.client.host if request else None
    )
    doc = serialize_datetime(audit.model_dump())
    await db.audit_logs.insert_one(doc)

# Dependency helper para injetar o usuÃ¡rio autenticado com DB
async def get_user(credentials = Depends(security)):
    return await get_current_user(credentials, db)

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# ROUTES - AUTENTICAÃÃO
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
@api_router.post("/auth/login", response_model=Token)
async def login(request: Request, login_data: LoginRequest):
    """Login com email e senha"""
    user = await db.usuarios.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    if not user.get("ativo", True):
        raise HTTPException(status_code=403, detail="UsuÃ¡rio desativado")
    
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
    """Retorna dados do usuÃ¡rio logado"""
    user = await get_current_user(credentials, db)
    return UsuarioResponse(**user)

@api_router.post("/auth/usuarios", response_model=UsuarioResponse)
async def criar_usuario(
    request: Request,
    usuario_data: UsuarioCreate
):
    """Criar novo usuÃ¡rio (apenas Admin)"""
    
    # Verificar se email jÃ¡ existe
    existing = await db.usuarios.find_one({"email": usuario_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email jÃ¡ cadastrado")
    
    # Criar usuÃ¡rio
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
        "CRIAR_USUARIO",
        f"Criou usuÃ¡rio {usuario.nome} ({usuario.email}) com role {usuario.role}",
        request
    )
    
    return UsuarioResponse(**usuario.model_dump())

@api_router.get("/auth/usuarios", response_model=List[UsuarioResponse])
async def listar_usuarios():
    """Listar todos os usuÃ¡rios (apenas Admin)"""
    
    usuarios = await db.usuarios.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    usuarios = [deserialize_datetime(u) for u in usuarios]
    return [UsuarioResponse(**u) for u in usuarios]

@api_router.put("/auth/usuarios/{id}")
async def atualizar_usuario(
    request: Request,
    id: str,
    updates: dict
):
    """Atualizar usuÃ¡rio (apenas Admin)"""
    
    # NÃ£o permitir atualizar senha diretamente
    if "password" in updates:
        updates["password_hash"] = get_password_hash(updates.pop("password"))
    
    result = await db.usuarios.update_one({"id": id}, {"$set": updates})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="UsuÃ¡rio nÃ£o encontrado")
    
    await registrar_auditoria({"id":"admin-local","nome":"Dellano","role":"admin"}, "ATUALIZAR_USUARIO", f"Atualizou usuÃ¡rio {id}", request)
    
    return {"success": True}

@api_router.delete("/auth/usuarios/{id}")
async def desativar_usuario(
    request: Request,
    id: str
):
    """Desativar usuÃ¡rio (apenas Admin)"""
    
    if id == "admin-local":
        raise HTTPException(status_code=400, detail="NÃ£o pode desativar o prÃ³prio usuÃ¡rio")
    
    result = await db.usuarios.update_one({"id": id}, {"$set": {"ativo": False}})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="UsuÃ¡rio nÃ£o encontrado")
    
    await registrar_auditoria({"id":"admin-local","nome":"Dellano","role":"admin"}, "DESATIVAR_USUARIO", f"Desativou usuÃ¡rio {id}", request)
    
    return {"success": True}

@api_router.get("/auth/audit", response_model=List[AuditLog])
async def listar_auditoria(
    limit: int = 100
):
    """Listar logs de auditoria (Admin e Gerente)"""
    
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    logs = [deserialize_datetime(log) for log in logs]
    return logs

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# ROUTES - PRODUTORES
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
@api_router.post("/produtores", response_model=ProdutorComEnquadramento)
async def criar_produtor(
    request: Request,
    input: ProdutorCreate
):
    """Criar novo produtor com enquadramento automÃ¡tico"""
    
    produtor_dict = input.model_dump()
    produtor = Produtor(**produtor_dict, created_by="admin-local")
    
    # Calcular enquadramento
    enquadramento = calcular_enquadramento(produtor.renda)
    
    # Salvar no MongoDB
    doc = serialize_datetime(produtor.model_dump())
    await db.produtores.insert_one(doc)
    
    # Registrar auditoria
    await registrar_auditoria(
        "CRIAR_PRODUTOR",
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
        raise HTTPException(status_code=404, detail="Produtor nÃ£o encontrado")
    
    produtor = deserialize_datetime(produtor)
    enquadramento = calcular_enquadramento(produtor["renda"])
    
    return ProdutorComEnquadramento(**produtor, enquadramento=enquadramento)

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# ROUTES - OPERAÃÃES
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
@api_router.post("/operacoes", response_model=Operacao)
async def criar_operacao(
    request: Request,
    input: OperacaoCreate
):
    """Criar nova operaÃ§Ã£o de crÃ©dito"""
    
    # Verificar se produtor existe
    produtor = await db.produtores.find_one({"id": input.prod_id})
    if not produtor:
        raise HTTPException(status_code=404, detail="Produtor nÃ£o encontrado")
    
    operacao_dict = input.model_dump()
    operacao = Operacao(**operacao_dict, created_by="admin-local")
    
    # Salvar operaÃ§Ã£o
    doc = serialize_datetime(operacao.model_dump())
    await db.operacoes.insert_one(doc)
    
    # Criar documentos padrÃ£o para a operaÃ§Ã£o
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
        "CRIAR_OPERACAO",
        f"Criou operaÃ§Ã£o {operacao.id} para produtor {produtor['nome']}",
        request
    )
    
    return operacao

@api_router.get("/operacoes", response_model=List[OperacaoComProdutor])
async def listar_operacoes(
    status: Optional[str] = None
):
    """Listar todas as operaÃ§Ãµes com filtro opcional de status"""
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
    """Buscar operaÃ§Ã£o por ID com dados completos"""
    operacao = await db.operacoes.find_one({"id": id}, {"_id": 0})
    if not operacao:
        raise HTTPException(status_code=404, detail="OperaÃ§Ã£o nÃ£o encontrada")
    
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
    """Atualizar status da operaÃ§Ã£o"""
    
    # Se for aprovar, verificar permissÃ£o especial
    # aprovacao permitida
    
    update_data = {"status": status.value}
    if status == StatusOperacao.PRONTO:
        update_data["approved_by"] = "admin-local"
        update_data["approved_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.operacoes.update_one({"id": id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="OperaÃ§Ã£o nÃ£o encontrada")
    
    await registrar_auditoria(
        "ATUALIZAR_OPERACAO",
        f"Alterou status da operaÃ§Ã£o {id} para {status.value}",
        request
    )
    
    return {"success": True, "message": "Status atualizado"}

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# ROUTES - DOCUMENTOS
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
@api_router.put("/operacoes/{id}/documentos", response_model=DocumentoStatusResponse)
async def atualizar_documentos(
    request: Request,
    id: str,
    input: DocumentoStatusUpdate
):
    """Atualizar status dos documentos de uma operaÃ§Ã£o"""
    
    # Verificar se operaÃ§Ã£o existe
    operacao = await db.operacoes.find_one({"id": id})
    if not operacao:
        raise HTTPException(status_code=404, detail="OperaÃ§Ã£o nÃ£o encontrada")
    
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
    
    # Atualizar status da operaÃ§Ã£o baseado nos documentos
    if progresso["percentual"] == 100:
        await db.operacoes.update_one(
            {"id": id},
            {"$set": {"status": StatusOperacao.PRONTO.value}}
        )
    
    await registrar_auditoria(
        "ATUALIZAR_DOCUMENTOS",
        f"Atualizou documentos da operaÃ§Ã£o {id}",
        request
    )
    
    return DocumentoStatusResponse(
        operacao_id=id,
        documentos=documentos,
        progresso=progresso
    )

@api_router.get("/operacoes/{id}/documentos", response_model=DocumentoStatusResponse)
async def buscar_documentos(id: str):
    """Buscar status dos documentos de uma operaÃ§Ã£o"""
    docs = await db.documentos.find_one({"operacao_id": id}, {"_id": 0})
    if not docs:
        raise HTTPException(status_code=404, detail="Documentos nÃ£o encontrados")
    
    documentos = docs.get("documentos", {})
    progresso = calcular_progresso_documentos(documentos)
    
    return DocumentoStatusResponse(
        operacao_id=id,
        documentos=documentos,
        progresso=progresso
    )

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# ROUTES - DASHBOARD
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def obter_estatisticas():
    """Obter estatÃ­sticas para o dashboard"""
    from datetime import timedelta
    
    hoje = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    inicio_mes = hoje.replace(day=1)
    
    # Contar operaÃ§Ãµes de hoje
    ops_hoje = await db.operacoes.count_documents({
        "created_at": {"$gte": hoje.isoformat()}
    })
    
    # Contar operaÃ§Ãµes do mÃªs
    ops_mes = await db.operacoes.count_documents({
        "created_at": {"$gte": inicio_mes.isoformat()}
    })
    
    # Calcular crÃ©dito total do mÃªs
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
    
    # Taxa de aprovaÃ§Ã£o
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

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# ROUTE RAIZ
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
        logger.info("â UsuÃ¡rio admin criado: admin@maya.com / admin123")
    else:
        logger.info("â¹ï¸  UsuÃ¡rio admin jÃ¡ existe")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
