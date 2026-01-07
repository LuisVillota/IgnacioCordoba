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
      // 🔧 CONFIGURACIÓN: Cambiar a false para deshabilitar "recordar sesión"
      const ENABLE_AUTO_LOGIN = false; // ⬅️ Cambia a true si quieres restaurar sesión automáticamente
      
      if (!ENABLE_AUTO_LOGIN) {
        console.log('⚠️ Auto-login deshabilitado, mostrando página de login');
        setLoading(false);
        return;
      }
      
      const storedUserStr = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      
      if (storedUserStr && storedToken) {
        try {
          const parsedData = JSON.parse(storedUserStr);
          
          // ✅ VALIDAR QUE EL TOKEN SEA VÁLIDO
          try {
            console.log('🔐 Validando token almacenado...');
            const response = await api.testConnection();
            
            if (response.success) {
              console.log('✅ Token válido, restaurando sesión');
              
              // ⚠️ IMPORTANTE: Verificar la estructura correcta del usuario
              let frontendUser: User;
              let backendUserData: BackendUser | null = null;
              
              // Si tiene la estructura completa con backendUser
              if (parsedData.backendUser) {
                frontendUser = {
                  id: parsedData.id,
                  nombre_completo: parsedData.nombre_completo,
                  email: parsedData.email,
                  rol: parsedData.rol,
                  estado: parsedData.estado
                };
                backendUserData = parsedData.backendUser;
              } 
              // Si solo tiene la estructura frontend
              else if (parsedData.nombre_completo) {
                frontendUser = parsedData;
              }
              // Si tiene estructura backend directa
              else if (parsedData.nombre) {
                const backendData: BackendUser = {
                  id: parsedData.id,
                  username: parsedData.username || '',
                  nombre: parsedData.nombre,
                  email: parsedData.email,
                  rol: parsedData.rol,
                  activo: parsedData.activo !== false
                };
                frontendUser = mapBackendToFrontendUser(backendData);
                backendUserData = backendData;
              }
              // Fallback: estructura desconocida
              else {
                console.error('❌ Estructura de usuario desconocida:', parsedData);
                logout();
                setLoading(false);
                return;
              }
              
              // Validar que el usuario tenga los campos requeridos
              if (!frontendUser.nombre_completo || !frontendUser.email || !frontendUser.rol) {
                console.error('❌ Usuario incompleto:', frontendUser);
                logout();
                setLoading(false);
                return;
              }
              
              setUser(frontendUser);
              setBackendUser(backendUserData);
              setToken(storedToken);
              
              console.log('👤 Usuario restaurado:', {
                nombre: frontendUser.nombre_completo,
                email: frontendUser.email,
                rol: frontendUser.rol
              });
              
            } else {
              console.warn('⚠️ Token inválido, limpiando sesión');
              logout();
            }
          } catch (error) {
            console.error('❌ Error validando token:', error);
            logout();
          }
          
        } catch (error) {
          console.error('❌ Error parseando usuario de localStorage:', error);
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
      
      console.log('🔐 Intentando login...');
      const response = await api.login(username, password);
      
      if (response.success && response.usuario) {
        console.log('✅ Login exitoso');
        
        const backendUserData: BackendUser = {
          id: response.usuario.id,
          username: response.usuario.username,
          nombre: response.usuario.nombre,
          email: response.usuario.email,
          rol: response.usuario.rol,
          activo: response.usuario.activo
        };
        
        const frontendUser = mapBackendToFrontendUser(backendUserData);
        
        const dataToStore = {
          id: frontendUser.id,
          nombre_completo: frontendUser.nombre_completo,
          email: frontendUser.email,
          rol: frontendUser.rol,
          estado: frontendUser.estado,
          backendUser: backendUserData
        };
        
        setUser(frontendUser);
        setBackendUser(backendUserData);
        setToken(response.token || response.access_token || '');
        
        localStorage.setItem('user', JSON.stringify(dataToStore));
        localStorage.setItem('token', response.token || response.access_token || '');
        
        console.log('💾 Sesión guardada');
        console.log('👤 Usuario logueado');
        
        // ✅ NO hacer ninguna llamada extra aquí
        // Solo retornar true para que el componente sepa que fue exitoso
        
        return true;
      } else {
        console.error('❌ Login fallido:', response);
        return false;
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('🚪 Cerrando sesión...');
    setUser(null);
    setBackendUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    console.log('✅ Sesión cerrada');
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