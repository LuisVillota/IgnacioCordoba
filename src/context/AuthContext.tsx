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
    
    setSessionChecked(false);
  }, []);

  useEffect(() => {
    if (sessionChecked) return;
    
    const loadSession = async () => {
      
      const storedUserStr = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      
      
      if (!storedUserStr || !storedToken) {
        setLoading(false);
        setSessionChecked(true);
        return;
      }
      
      let frontendUser: User | null = null;
      let backendUserData: BackendUser | null = null;
      
      try {
        const parsedData = JSON.parse(storedUserStr);
        
        
        const isValidUser = (
          parsedData.id &&
          parsedData.nombre_completo &&
          parsedData.rol &&
          parsedData.estado &&
          typeof parsedData.id === 'string' &&
          typeof parsedData.nombre_completo === 'string'
        );
        
        if (!isValidUser) {
          throw new Error('Datos de usuario inválidos');
        }
        
        if (parsedData.backendUser && parsedData.backendUser.id) {
          backendUserData = parsedData.backendUser;
          frontendUser = mapBackendToFrontendUser(backendUserData!);
        } else {
          frontendUser = {
            id: parsedData.id || '',
            nombre_completo: parsedData.nombre_completo || 'Usuario',
            email: parsedData.email || '',
            rol: parsedData.rol || 'secretaria',
            estado: parsedData.estado || 'activo'
          };
        }
        
        
        setUser(frontendUser);
        setBackendUser(backendUserData);
        setToken(storedToken);
        
      } catch (error) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
        setSessionChecked(true);
      }
    };

    loadSession();
  }, [sessionChecked]);

  const login = async (username: string, password: string): Promise<boolean> => {
    
    let backendUserData: BackendUser | null = null;
    let frontendUser: User | null = null;
    
    try {
      setLoading(true);
      
      const response = await api.login(username, password);
      
      
      if (response && response.error !== true) {
        const userData = response.usuario || response;
        
        
        backendUserData = {
          id: userData.id || 0,
          username: userData.username || username,
          nombre: userData.nombre || userData.username || username || 'Usuario',
          email: userData.email || '',
          rol: userData.rol || 'secretaria',
          activo: userData.activo !== undefined ? userData.activo : true
        };
        
        if (!backendUserData.id || !backendUserData.nombre) {
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
        
        
        setUser(frontendUser);
        setBackendUser(backendUserData);
        
        const authToken = response.token || response.access_token || '';
        setToken(authToken);
        
        localStorage.setItem('user', JSON.stringify(dataToStore));
        if (authToken) {
          localStorage.setItem('token', authToken);
        }
        
        
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setBackendUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
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


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};