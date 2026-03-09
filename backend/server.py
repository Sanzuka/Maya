from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
from enum import Enum

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

# ─────────────────────────────────────────────────────────────────────────────
# ENUMS E CONSTANTES
# ─────────────────────────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────────────────────────
# MODELS - PRODUTOR
# ─────────────────────────────────────────────────────────────────────────────
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

class ProdutorComEnquadramento(Produtor):
    enquadramento: Dict

# ─────────────────────────────────────────────────────────────────────────────
# MODELS - OPERAÇÃO
# ─────────────────────────────────────────────────────────────────────────────
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

class OperacaoComProdutor(Operacao):
    produtor: Optional[Produtor] = None
    documentos: Optional[Dict[str, str]] = None
    progresso_docs: Optional[Dict] = None

# ─────────────────────────────────────────────────────────────────────────────
# MODELS - DOCUMENTOS
# ─────────────────────────────────────────────────────────────────────────────
class DocumentoStatusUpdate(BaseModel):
    documentos: Dict[str, StatusDocumento]  # {"rg": "ok", "caf": "pendente", ...}

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
            "bg": "rgba(200,168,75,0.12)",
            "border": "rgba(200,168,75,0.3)",
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

def deserialize_datetime(obj, fields=['created_at', 'timestamp', 'uploaded_at']):
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

# ─────────────────────────────────────────────────────────────────────────────
# ROUTES - PRODUTORES
# ─────────────────────────────────────────────────────────────────────────────
@api_router.post("/produtores", response_model=ProdutorComEnquadramento)
async def criar_produtor(input: ProdutorCreate):
    """Criar novo produtor com enquadramento automático"""
    produtor_dict = input.model_dump()
    produtor = Produtor(**produtor_dict)
    
    # Calcular enquadramento
    enquadramento = calcular_enquadramento(produtor.renda)
    
    # Salvar no MongoDB
    doc = serialize_datetime(produtor.model_dump())
    await db.produtores.insert_one(doc)
    
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
async def criar_operacao(input: OperacaoCreate):
    """Criar nova operação de crédito"""
    # Verificar se produtor existe
    produtor = await db.produtores.find_one({"id": input.prod_id})
    if not produtor:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    
    operacao_dict = input.model_dump()
    operacao = Operacao(**operacao_dict)
    
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
    
    return operacao

@api_router.get("/operacoes", response_model=List[OperacaoComProdutor])
async def listar_operacoes(status: Optional[str] = None):
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
async def atualizar_operacao(id: str, status: StatusOperacao):
    """Atualizar status da operação"""
    result = await db.operacoes.update_one(
        {"id": id},
        {"$set": {"status": status.value}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Operação não encontrada")
    
    return {"success": True, "message": "Status atualizado"}

# ─────────────────────────────────────────────────────────────────────────────
# ROUTES - DOCUMENTOS
# ─────────────────────────────────────────────────────────────────────────────
@api_router.put("/operacoes/{id}/documentos", response_model=DocumentoStatusResponse)
async def atualizar_documentos(id: str, input: DocumentoStatusUpdate):
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
                "updated_at": datetime.now(timezone.utc).isoformat()
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
    
    # Taxa de aprovação (simulada)
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
# ROUTE RAIZ
# ─────────────────────────────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "API MAYA - Sistema de Crédito Rural", "version": "1.0.0"}

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
