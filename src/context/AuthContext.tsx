import { createContext, useState, useEffect, ReactNode } from 'react';
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

  useEffect(() => {
    const loadSession = async () => {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      
      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setBackendUser(parsedUser.backendUser);
          setToken(storedToken);
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };

    loadSession();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const response = await api.login(username, password);
      
      if (response.success && response.usuario) {
        const backendUserData: BackendUser = {
          id: response.usuario.id,
          username: response.usuario.username,
          nombre: response.usuario.nombre,
          email: response.usuario.email,
          rol: response.usuario.rol,
          activo: response.usuario.activo
        };
        
        const frontendUser = mapBackendToFrontendUser(backendUserData);
        
        const fullUserData = {
          ...frontendUser,
          backendUser: backendUserData
        };
        
        setUser(frontendUser);
        setBackendUser(backendUserData);
        setToken(response.token || response.access_token || '');
        
        localStorage.setItem('user', JSON.stringify(fullUserData));
        localStorage.setItem('token', response.token || response.access_token || '');
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
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