import { createContext, useContext } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Usuário fixo — sem login necessário
const FIXED_USER = {
  id: 'admin-local',
  nome: 'Dellano',
  email: 'admin@maya.com',
  role: 'admin',
  ativo: true,
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Remove qualquer header de auth anterior
  delete axios.defaults.headers.common['Authorization'];

  const logout = () => {
    // Sem efeito — acesso aberto
  };

  const hasRole = (roles) => roles.includes(FIXED_USER.role);
  const isAdmin = () => true;
  const isGerente = () => true;
  const canManage = () => true;
  const isReadOnly = () => false;

  return (
    <AuthContext.Provider value={{
      user: FIXED_USER,
      token: null,
      loading: false,
      login: async () => ({ success: true }),
      logout,
      hasRole,
      isAdmin,
      isGerente,
      canManage,
      isReadOnly,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
