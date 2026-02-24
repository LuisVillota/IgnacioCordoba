"use client"

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { Permission, rolePermissions } from '@/types/permissions';

export interface BackendUser {
  id: number;
  username: string;
  nombre: string;
  email: string;
  rol: keyof typeof rolePermissions;
  activo: boolean;
}

export interface User {
  id: string;
  nombre_completo: string;
  email: string;
  rol: keyof typeof rolePermissions;
  estado: "activo" | "inactivo";
}

export interface AuthContextType {
  user: User | null;
  backendUser: BackendUser | null;
  token: string | null;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loading: boolean;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const mapBackendToFrontendUser = (backendUser: BackendUser): User => {
  const validRol = backendUser.rol in rolePermissions ? backendUser.rol : 'secretaria' as keyof typeof rolePermissions;
  
  return {
    id: backendUser.id.toString(),
    nombre_completo: backendUser.nombre,
    email: backendUser.email,
    rol: validRol,
    estado: backendUser.activo ? "activo" : "inactivo"
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    console.log('🔄 [AUTH] Montando AuthProvider...');
    
    setSessionChecked(false);
  }, []);

  useEffect(() => {
    if (sessionChecked) return;
    
    const loadSession = async () => {
      console.log('🔍 [AUTH] Verificando sesión almacenada...');
      
      const storedUserStr = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      
      console.log('📊 [AUTH] Datos encontrados:', {
        tieneUser: !!storedUserStr,
        tieneToken: !!storedToken,
        userLength: storedUserStr?.length || 0,
        tokenLength: storedToken?.length || 0
      });
      
      if (!storedUserStr || !storedToken) {
        console.log('ℹ️ [AUTH] No hay sesión almacenada');
        setLoading(false);
        setSessionChecked(true);
        return;
      }
      
      let frontendUser: User | null = null;
      let backendUserData: BackendUser | null = null;
      
      try {
        console.log('🔄 [AUTH] Parseando datos de sesión...');
        const parsedData = JSON.parse(storedUserStr);
        
        console.log('📋 [AUTH] Datos parseados:', {
          id: parsedData.id,
          nombre: parsedData.nombre_completo,
          tieneBackendUser: !!parsedData.backendUser,
          timestamp: new Date().toISOString()
        });
        
        const isValidUser = (
          parsedData.id &&
          parsedData.nombre_completo &&
          parsedData.rol &&
          parsedData.estado &&
          typeof parsedData.id === 'string' &&
          typeof parsedData.nombre_completo === 'string'
        );
        
        if (!isValidUser) {
          console.error('❌ [AUTH] Datos de usuario inválidos:', parsedData);
          throw new Error('Datos de usuario inválidos');
        }
        
        if (parsedData.backendUser && parsedData.backendUser.id) {
          console.log('✅ [AUTH] Usando backendUser almacenado');
          backendUserData = parsedData.backendUser;
          frontendUser = mapBackendToFrontendUser(backendUserData!);
        } else {
          console.log('ℹ️ [AUTH] Usando solo datos frontend');
          frontendUser = {
            id: parsedData.id || '',
            nombre_completo: parsedData.nombre_completo || 'Usuario',
            email: parsedData.email || '',
            rol: parsedData.rol || 'secretaria',
            estado: parsedData.estado || 'activo'
          };
        }
        
        console.log('✅ [AUTH] Sesión restaurada exitosamente:', {
          id: frontendUser.id,
          nombre: frontendUser.nombre_completo,
          rol: frontendUser.rol
        });
        
        setUser(frontendUser);
        setBackendUser(backendUserData);
        setToken(storedToken);
        
      } catch (error) {
        console.error('❌ [AUTH] Error cargando sesión:', error);
        console.log('🧹 [AUTH] Limpiando datos corruptos...');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        console.log('🏁 [AUTH] Carga de sesión completada');
        setLoading(false);
        setSessionChecked(true);
      }
    };

    loadSession();
  }, [sessionChecked]);

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log('🔐 [AUTH] Iniciando login para:', username);
    
    let backendUserData: BackendUser | null = null;
    let frontendUser: User | null = null;
    
    try {
      setLoading(true);
      
      console.log('📤 [AUTH] Llamando API login...');
      const response = await api.login(username, password);
      
      console.log('📥 [AUTH] Respuesta de login:', {
        success: response && !response.error,
        tieneUsuario: !!response?.usuario,
        tieneToken: !!(response?.token || response?.access_token),
        mensaje: response?.message
      });
      
      if (response && response.error !== true) {
        const userData = response.usuario || response;
        
        console.log('👤 [AUTH] Datos de usuario recibidos:', userData);
        
        backendUserData = {
          id: userData.id || 0,
          username: userData.username || username,
          nombre: userData.nombre || userData.username || username || 'Usuario',
          email: userData.email || '',
          rol: userData.rol || 'secretaria',
          activo: userData.activo !== undefined ? userData.activo : true
        };
        
        if (!backendUserData.id || !backendUserData.nombre) {
          console.error('❌ [AUTH] Datos insuficientes del backend');
          return false;
        }
        
        frontendUser = mapBackendToFrontendUser(backendUserData);
        
        const dataToStore = {
          id: frontendUser.id,
          nombre_completo: frontendUser.nombre_completo,
          email: frontendUser.email,
          rol: frontendUser.rol,
          estado: frontendUser.estado,
          backendUser: backendUserData,
          timestamp: new Date().toISOString()
        };
        
        console.log('💾 [AUTH] Guardando sesión en localStorage...');
        
        setUser(frontendUser);
        setBackendUser(backendUserData);
        
        const authToken = response.token || response.access_token || '';
        setToken(authToken);
        
        localStorage.setItem('user', JSON.stringify(dataToStore));
        if (authToken) {
          localStorage.setItem('token', authToken);
        }
        
        console.log('✅ [AUTH] Login exitoso!', {
          usuario: frontendUser.nombre_completo,
          tokenGuardado: !!authToken
        });
        
        return true;
      } else {
        console.error('❌ [AUTH] Error en respuesta de API:', response);
        return false;
      }
    } catch (error: any) {
      console.error('❌ [AUTH] Error en login:', {
        mensaje: error.message,
        stack: error.stack
      });
      return false;
    } finally {
      console.log('⏱️ [AUTH] Finalizando login, estableciendo loading=false');
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('🚪 [AUTH] Ejecutando logout...');
    setUser(null);
    setBackendUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    console.log('✅ [AUTH] Logout completado');
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) {
      return false;
    }
    
    const permissions = rolePermissions[user.rol] || [];
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.some(p => hasPermission(p));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.every(p => hasPermission(p));
  };

  const value: AuthContextType = {
    user,
    backendUser,
    token,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    login,
    loading,
    isAuthenticated: !!user
  };

  console.log('🎮 [AUTH] Renderizando AuthProvider, estado:', {
    user: !!user,
    loading,
    isAuthenticated: !!user
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};