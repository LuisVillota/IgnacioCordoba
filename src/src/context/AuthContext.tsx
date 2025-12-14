import { createContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { Permission, rolePermissions } from '@/types/permissions';

// Interface que coincide con tu backend
export interface BackendUser {
  id: number;
  username: string;
  nombre: string;
  email: string;
  rol: keyof typeof rolePermissions;  // "admin" | "secretaria" | "doctor" | "programacion"
  activo: boolean;
}

// Interface para compatibilidad con tu frontend existente
export interface User {
  id: string;  // Convertir de number a string para compatibilidad
  nombre_completo: string;
  email: string;
  rol: keyof typeof rolePermissions; // Usa el tipo de rolePermissions
  estado: "activo" | "inactivo";
}

export interface AuthContextType {
  user: User | null;
  backendUser: BackendUser | null; // Usuario del backend
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

// Mapear usuario del backend al formato del frontend
const mapBackendToFrontendUser = (backendUser: BackendUser): User => {
  // Verificar que el rol exista en rolePermissions
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

  // Cargar sesión desde localStorage al iniciar
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
          console.error('Error cargando sesión:', error);
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
      console.log('🔐 Intentando login con:', { username });
      
      const response = await api.login(username, password);
      
      console.log('📥 Respuesta del backend:', response);
      
      // Verificar la estructura de la respuesta
      // Tu backend devuelve { success, message, usuario, token } 
      if (response.success && response.usuario) {
        const backendUserData: BackendUser = {
          id: response.usuario.id,
          username: response.usuario.username,
          nombre: response.usuario.nombre,
          email: response.usuario.email,
          rol: response.usuario.rol, // Asegúrate que el backend devuelve uno de: "admin", "secretaria", "doctor", "programacion"
          activo: response.usuario.activo
        };
        
        console.log('👤 Backend user data:', backendUserData);
        console.log('🔑 Rol recibido:', backendUserData.rol);
        console.log('📋 Roles disponibles:', Object.keys(rolePermissions));
        
        const frontendUser = mapBackendToFrontendUser(backendUserData);
        
        // Guardar ambos formatos
        const fullUserData = {
          ...frontendUser,
          backendUser: backendUserData // Guardar también el usuario original del backend
        };
        
        setUser(frontendUser);
        setBackendUser(backendUserData);
        setToken(response.token || response.access_token || 'simulado_para_desarrollo');
        
        localStorage.setItem('user', JSON.stringify(fullUserData));
        localStorage.setItem('token', response.token || response.access_token || 'simulado_para_desarrollo');
        
        console.log('✅ Login exitoso, usuario:', frontendUser);
        return true;
      } else {
        console.error('❌ Login falló, respuesta:', response);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      console.error('Mensaje de error:', error.message);
      console.error('Stack trace:', error.stack);
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
    console.log('👋 Sesión cerrada');
  };

  // Función para verificar permisos individuales
  const hasPermission = (permission: Permission): boolean => {
    if (!user) {
      console.log('❌ No hay usuario, no se puede verificar permiso');
      return false;
    }
    
    const permissions = rolePermissions[user.rol] || [];
    const hasPerm = permissions.includes(permission);
    
    console.log(`🔍 Verificando permiso ${permission} para rol ${user.rol}:`, hasPerm);
    console.log('Permisos disponibles:', permissions);
    
    return hasPerm;
  };

  // Función para verificar si tiene al menos uno de los permisos
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.some(p => hasPermission(p));
  };

  // Función para verificar si tiene todos los permisos
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