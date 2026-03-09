from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from enum import Enum
import os

# Configurações JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "maya-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 dias

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ─────────────────────────────────────────────────────────────────────────────
# ENUMS E MODELS
# ─────────────────────────────────────────────────────────────────────────────
class UserRole(str, Enum):
    ADMIN = "admin"
    GERENTE = "gerente"
    OPERADOR = "operador"
    VISUALIZADOR = "visualizador"

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# ─────────────────────────────────────────────────────────────────────────────
# FUNÇÕES DE SENHA
# ─────────────────────────────────────────────────────────────────────────────
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha está correta"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Gera hash da senha"""
    return pwd_context.hash(password)

# ─────────────────────────────────────────────────────────────────────────────
# FUNÇÕES JWT
# ─────────────────────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Cria um token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[TokenData]:
    """Decodifica e valida um token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None:
            return None
        return TokenData(email=email, role=role)
    except JWTError:
        return None

# ─────────────────────────────────────────────────────────────────────────────
# DEPENDÊNCIAS DE AUTENTICAÇÃO
# ─────────────────────────────────────────────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = None
):
    """Obtém o usuário atual a partir do token JWT"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    token_data = decode_access_token(token)
    
    if token_data is None or token_data.email is None:
        raise credentials_exception
    
    # Buscar usuário no banco (será injetado pelo endpoint)
    if db is None:
        raise credentials_exception
    
    user = await db.usuarios.find_one({"email": token_data.email, "ativo": True}, {"_id": 0})
    
    if user is None:
        raise credentials_exception
    
    return user

def require_role(allowed_roles: list[UserRole]):
    """Decorator para verificar se o usuário tem a role necessária"""
    def decorator(user: dict):
        if user.get("role") not in [role.value for role in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Necessário: {', '.join([r.value for r in allowed_roles])}"
            )
        return user
    return decorator

# ─────────────────────────────────────────────────────────────────────────────
# FUNÇÕES DE PERMISSÃO
# ─────────────────────────────────────────────────────────────────────────────
def can_create_user(user: dict) -> bool:
    """Verifica se o usuário pode criar outros usuários"""
    return user.get("role") == UserRole.ADMIN.value

def can_edit_user(user: dict) -> bool:
    """Verifica se o usuário pode editar outros usuários"""
    return user.get("role") == UserRole.ADMIN.value

def can_manage_operations(user: dict) -> bool:
    """Verifica se o usuário pode criar/editar operações"""
    return user.get("role") in [UserRole.ADMIN.value, UserRole.GERENTE.value, UserRole.OPERADOR.value]

def can_approve_dossier(user: dict) -> bool:
    """Verifica se o usuário pode aprovar dossiês"""
    return user.get("role") in [UserRole.ADMIN.value, UserRole.GERENTE.value]

def can_view_audit(user: dict) -> bool:
    """Verifica se o usuário pode ver auditoria"""
    return user.get("role") in [UserRole.ADMIN.value, UserRole.GERENTE.value]

def is_read_only(user: dict) -> bool:
    """Verifica se o usuário tem apenas leitura"""
    return user.get("role") == UserRole.VISUALIZADOR.value
