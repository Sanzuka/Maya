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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


# MongoDB connection - Railway production
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url, authSource="admin")
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
# MODELS - AUTENTICAÇÃO
