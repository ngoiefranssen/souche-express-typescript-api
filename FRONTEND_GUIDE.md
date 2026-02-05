# 🔐 Guide d'Intégration Frontend - Système RBAC + ABAC

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du système](#architecture-du-système)
3. [Authentification](#authentification)
4. [Vérification des permissions côté frontend](#vérification-des-permissions-côté-frontend)
5. [API Endpoints disponibles](#api-endpoints-disponibles)
6. [Exemples d'intégration](#exemples-dintégration)
7. [Bonnes pratiques](#bonnes-pratiques)
8. [Gestion des erreurs](#gestion-des-erreurs)

---

## 🎯 Vue d'ensemble

Ce système implémente un contrôle d'accès hybride **RBAC (Role-Based Access Control)** et **ABAC (Attribute-Based Access Control)** conforme aux normes internationales :

- ✅ **RBAC** : Gestion par rôles (ISO/IEC 10181-3)
- ✅ **ABAC** : Contrôle basé sur attributs (NIST SP 800-162)
- ✅ **OAuth 2.0** : Standard d'authentification (RFC 6749)
- ✅ **JWT** : Tokens sécurisés (RFC 7519)
- ✅ **Audit Trail** : Conformité RGPD, SOC2, ISO 27001

### Concepts clés

- **Rôle** : Groupe de permissions (Admin, Manager, User, etc.)
- **Permission** : Droit granulaire au format `resource:action` (ex: `users:read`)
- **Ressource** : Entité système (users, profiles, roles, etc.)
- **Action** : Opération (read, create, update, delete, *, execute, manage)

---

## 🏗️ Architecture du système

```
┌─────────────────────────────────────────────────────────┐
│                       FRONTEND                          │
│  (React, Vue, Angular, Vanilla JS)                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTP Requests + JWT Token
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    API Gateway                          │
│            (Express + Middlewares)                      │
├─────────────────────────────────────────────────────────┤
│  1. authenticateToken (JWT validation)                  │
│  2. authorize (Permission check)                        │
│  3. Controllers (Business logic)                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   Database                              │
│  - users                                                │
│  - profiles                                             │
│  - roles                                                │
│  - permissions                                          │
│  - role_permissions                                     │
│  - audit_logs                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 Authentification

### 1. Login

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "profileId": 2
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

### 2. Stocker le token

**LocalStorage (Simple mais moins sécurisé):**
```javascript
localStorage.setItem('authToken', response.data.token);
```

**SessionStorage (Plus sécurisé):**
```javascript
sessionStorage.setItem('authToken', response.data.token);
```

**Cookie HttpOnly (Le plus sécurisé - géré par le backend):**
Le token est automatiquement stocké dans un cookie httpOnly par le serveur.

### 3. Envoyer le token dans les requêtes

**Avec Axios:**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:7700/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
```

**Avec Fetch:**
```javascript
const token = localStorage.getItem('authToken');

fetch('http://localhost:7700/api/v1/users', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

---

## 🛡️ Vérification des permissions côté frontend

### 1. Récupérer les permissions de l'utilisateur

**Endpoint:** `GET /api/v1/users/:id` (avec les relations chargées)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "admin07@admin.com",
    "profile": {
      "id": 2,
      "label": "Administrateur",
      "roles": [
        {
          "id": 1,
          "label": "Admin",
          "permissions": [
            {
              "id": 1,
              "name": "users:read",
              "resource": "users",
              "action": "read",
              "category": "USER_MANAGEMENT"
            },
            {
              "id": 2,
              "name": "users:create",
              "resource": "users",
              "action": "create"
            }
          ]
        }
      ]
    }
  }
}
```

### 2. Créer une classe PermissionChecker côté frontend

**JavaScript/TypeScript:**
```javascript
class PermissionChecker {
  constructor(userPermissions) {
    // userPermissions = array de noms de permissions
    // ex: ["users:read", "users:create", "profiles:*"]
    this.permissions = new Set(userPermissions);
  }

  /**
   * Vérifie si l'utilisateur a une permission
   * @param {string} permission - Permission au format "resource:action"
   * @returns {boolean}
   */
  hasPermission(permission) {
    // Permission exacte
    if (this.permissions.has(permission)) {
      return true;
    }

    // Wildcard resource:*
    const [resource] = permission.split(':');
    if (this.permissions.has(`${resource}:*`)) {
      return true;
    }

    // Super admin
    if (this.permissions.has('system:*')) {
      return true;
    }

    return false;
  }

  /**
   * Vérifie si l'utilisateur a au moins une des permissions
   * @param {string[]} permissions - Tableau de permissions
   * @returns {boolean}
   */
  hasAnyPermission(permissions) {
    return permissions.some(p => this.hasPermission(p));
  }

  /**
   * Vérifie si l'utilisateur a toutes les permissions
   * @param {string[]} permissions - Tableau de permissions
   * @returns {boolean}
   */
  hasAllPermissions(permissions) {
    return permissions.every(p => this.hasPermission(p));
  }

  /**
   * Vérifie si l'utilisateur a un rôle
   * @param {string} roleName - Nom du rôle
   * @param {string[]} userRoles - Rôles de l'utilisateur
   * @returns {boolean}
   */
  hasRole(roleName, userRoles) {
    return userRoles.includes(roleName);
  }
}

// Utilisation
const userPermissions = ["users:read", "users:create", "profiles:read"];
const checker = new PermissionChecker(userPermissions);

```

### 3. Exemple React Hook

**usePermissions.js:**
```javascript
import { useMemo } from 'react';
import { useAuth } from './useAuth'; // Votre hook d'authentification

export const usePermissions = () => {
  const { user } = useAuth();

  const checker = useMemo(() => {
    if (!user?.profile?.roles) return null;

    // Extraire toutes les permissions de tous les rôles
    const permissions = [];
    user.profile.roles.forEach(role => {
      role.permissions?.forEach(permission => {
        permissions.push(permission.name);
      });
    });

    return new PermissionChecker(permissions);
  }, [user]);

  const hasPermission = (permission) => {
    return checker?.hasPermission(permission) || false;
  };

  const hasAnyPermission = (permissions) => {
    return checker?.hasAnyPermission(permissions) || false;
  };

  const hasAllPermissions = (permissions) => {
    return checker?.hasAllPermissions(permissions) || false;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};
```

**Utilisation dans un composant:**
```jsx
import React from 'react';
import { usePermissions } from './hooks/usePermissions';

const UserManagement = () => {
  const { hasPermission } = usePermissions();

  return (
    <div>
      <h1>Gestion des utilisateurs</h1>
      
      {/* Afficher seulement si permission de lecture */}
      {hasPermission('users:read') && (
        <UserList />
      )}

      {/* Afficher le bouton seulement si permission de création */}
      {hasPermission('users:create') && (
        <button onClick={handleCreateUser}>
          Créer un utilisateur
        </button>
      )}

      {/* Afficher seulement si permission de suppression */}
      {hasPermission('users:delete') && (
        <button onClick={handleDeleteUser}>
          Supprimer
        </button>
      )}
    </div>
  );
};
```

### 4. Composant de protection de route (React Router)

**ProtectedRoute.jsx:**
```jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from './hooks/usePermissions';
import { useAuth } from './hooks/useAuth';

const ProtectedRoute = ({ 
  children, 
  requiredPermission, 
  requiredPermissions = [],
  requireAll = false // true = AND, false = OR
}) => {
  const { isAuthenticated } = useAuth();
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  // Vérifier l'authentification
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier les permissions
  let hasAccess = true;

  if (requiredPermission) {
    hasAccess = hasPermission(requiredPermission);
  } else if (requiredPermissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
  }

  if (!hasAccess) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

**App.jsx:**
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Route protégée par permission */}
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredPermission="users:read">
              <UserList />
            </ProtectedRoute>
          }
        />

        {/* Route nécessitant plusieurs permissions (OR) */}
        <Route
          path="/users/create"
          element={
            <ProtectedRoute 
              requiredPermissions={["users:create", "users:manage"]}
              requireAll={false}
            >
              <CreateUser />
            </ProtectedRoute>
          }
        />

        {/* Route nécessitant toutes les permissions (AND) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute 
              requiredPermissions={["system:manage", "audit:read"]}
              requireAll={true}
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 📡 API Endpoints disponibles

### Permissions

#### 1. Récupérer toutes les permissions
```http
GET /api/v1/permissions
Authorization: Bearer <token>
```

**Query Parameters (optionnels):**
- `category`: Filtrer par catégorie
- `resource`: Filtrer par ressource
- `action`: Filtrer par action

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": 1,
      "name": "users:read",
      "resource": "users",
      "action": "read",
      "description": "Lecture des utilisateurs",
      "category": "USER_MANAGEMENT",
      "priority": 50
    }
  ]
}
```

#### 2. Récupérer les permissions par catégorie
```http
GET /api/v1/permissions/by-category
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "USER_MANAGEMENT": [
      { "id": 1, "name": "users:read", ... },
      { "id": 2, "name": "users:create", ... }
    ],
    "ROLE_MANAGEMENT": [
      { "id": 10, "name": "roles:read", ... }
    ]
  }
}
```

#### 3. Créer une permission
```http
POST /api/v1/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "documents:read",
  "resource": "documents",
  "action": "read",
  "description": "Lecture des documents",
  "category": "DOCUMENT_MANAGEMENT",
  "priority": 50
}
```

#### 4. Assigner une permission à un rôle
```http
POST /api/v1/permissions/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "roleId": 2,
  "permissionId": 5
}
```

#### 5. Récupérer les permissions d'un rôle
```http
GET /api/v1/permissions/role/:roleId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "role": "Admin",
    "permissions": [
      {
        "id": 1,
        "name": "users:read",
        "resource": "users",
        "action": "read"
      }
    ]
  }
}
```

### Utilisateurs (avec permissions)

#### Récupérer un utilisateur avec ses permissions
```http
GET /api/v1/users/:id
Authorization: Bearer <token>
```

L'API retourne automatiquement les rôles et permissions de l'utilisateur.

### Audit

#### Récupérer les logs d'audit
```http
GET /api/v1/audit
Authorization: Bearer <token>
```

**Query Parameters:**
- `userId`: Filtrer par utilisateur
- `action`: Filtrer par action
- `startDate`: Date de début
- `endDate`: Date de fin

---

## 💡 Exemples d'intégration

### Exemple complet React + TypeScript

**1. Types TypeScript:**
```typescript
// types/permissions.ts
export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | '*' | 'execute' | 'manage';
export type PermissionString = `${string}:${PermissionAction}`;

export interface Permission {
  id: number;
  name: PermissionString;
  resource: string;
  action: PermissionAction;
  description?: string;
  category?: string;
}

export interface Role {
  id: number;
  label: string;
  permissions: Permission[];
}

export interface User {
  id: number;
  email: string;
  username: string;
  profile?: {
    id: number;
    label: string;
    roles: Role[];
  };
}
```

**2. Service d'API:**
```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:7700/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour le token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs 401/403
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Permission refusée
      console.error('Accès refusé:', error.response.data.message);
    }
    return Promise.reject(error);
  }
);

export default api;
```

**3. Context Provider:**
```typescript
// context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { User } from '../types/permissions';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Charger l'utilisateur au montage
    const loadUser = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.data);
        } catch (error) {
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data.data;
    
    localStorage.setItem('authToken', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
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
```

**4. Composant de menu avec permissions:**
```tsx
// components/Sidebar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

const Sidebar: React.FC = () => {
  const { hasPermission } = usePermissions();

  return (
    <nav className="sidebar">
      <ul>
        <li>
          <Link to="/dashboard">Dashboard</Link>
        </li>

        {hasPermission('users:read') && (
          <li>
            <Link to="/users">Utilisateurs</Link>
          </li>
        )}

        {hasPermission('profiles:read') && (
          <li>
            <Link to="/profiles">Profils</Link>
          </li>
        )}

        {hasPermission('roles:read') && (
          <li>
            <Link to="/roles">Rôles</Link>
          </li>
        )}

        {hasPermission('permissions:read') && (
          <li>
            <Link to="/permissions">Permissions</Link>
          </li>
        )}

        {hasPermission('audit:read') && (
          <li>
            <Link to="/audit">Audit</Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Sidebar;
```

### Exemple Vue.js 3 + Composition API

**1. Composable usePermissions:**
```javascript
// composables/usePermissions.js
import { computed } from 'vue';
import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();

  const permissions = computed(() => {
    if (!user.value?.profile?.roles) return [];
    
    const perms = new Set();
    user.value.profile.roles.forEach(role => {
      role.permissions?.forEach(permission => {
        perms.add(permission.name);
      });
    });
    
    return Array.from(perms);
  });

  const hasPermission = (permission) => {
    if (permissions.value.includes(permission)) return true;
    
    const [resource] = permission.split(':');
    if (permissions.value.includes(`${resource}:*`)) return true;
    if (permissions.value.includes('system:*')) return true;
    
    return false;
  };

  const hasAnyPermission = (perms) => {
    return perms.some(p => hasPermission(p));
  };

  const hasAllPermissions = (perms) => {
    return perms.every(p => hasPermission(p));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
```

**2. Directive personnalisée:**
```javascript
// directives/permission.js
import { usePermissions } from '../composables/usePermissions';

export const permissionDirective = {
  mounted(el, binding) {
    const { hasPermission } = usePermissions();
    
    if (!hasPermission(binding.value)) {
      el.style.display = 'none';
    }
  },
  updated(el, binding) {
    const { hasPermission } = usePermissions();
    
    el.style.display = hasPermission(binding.value) ? '' : 'none';
  }
};

// main.js
import { createApp } from 'vue';
import App from './App.vue';
import { permissionDirective } from './directives/permission';

const app = createApp(App);
app.directive('permission', permissionDirective);
app.mount('#app');
```

**3. Utilisation:**
```vue
<template>
  <div>
    <h1>Dashboard</h1>
    
    <!-- Afficher seulement avec permission -->
    <button v-permission="'users:create'" @click="createUser">
      Créer un utilisateur
    </button>
    
    <!-- Afficher manuellement -->
    <button v-if="hasPermission('users:delete')" @click="deleteUser">
      Supprimer
    </button>
  </div>
</template>

<script setup>
import { usePermissions } from '@/composables/usePermissions';

const { hasPermission } = usePermissions();

const createUser = () => {
  // Logique de création
};

const deleteUser = () => {
  // Logique de suppression
};
</script>
```

---

## ✅ Bonnes pratiques

### 1. **Toujours vérifier les permissions côté backend**
- ❌ **Ne jamais se fier uniquement au frontend**
- ✅ Le frontend cache l'UI, le backend refuse l'accès

### 2. **Gérer le cache des permissions**
```javascript
// Rafraîchir les permissions après modification
const refreshPermissions = async () => {
  const response = await api.get(`/users/${userId}`);
  setUser(response.data.data);
};
```

### 3. **Optimiser les vérifications**
```javascript
// ❌ Mauvais : Vérifier à chaque render
function Component() {
  const hasAccess = checkPermission('users:read'); // Appelé à chaque render
  return <div>{hasAccess && <UserList />}</div>;
}

// ✅ Bon : Mémoriser le résultat
function Component() {
  const hasAccess = useMemo(
    () => checkPermission('users:read'),
    [permissions]
  );
  return <div>{hasAccess && <UserList />}</div>;
}
```

### 4. **Gérer les permissions expirées**
Le backend gère automatiquement les permissions avec `expiresAt`. Rafraîchissez périodiquement :

```javascript
useEffect(() => {
  const interval = setInterval(() => {
    refreshPermissions();
  }, 5 * 60 * 1000); // Toutes les 5 minutes

  return () => clearInterval(interval);
}, []);
```

### 5. **Logging et debugging**
```javascript
const hasPermission = (permission) => {
  const result = checker.hasPermission(permission);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Permission check: ${permission} = ${result}`);
  }
  
  return result;
};
```

---

## 🚨 Gestion des erreurs

### 1. Erreur 401 - Non authentifié
```javascript
if (error.response?.status === 401) {
  // Rediriger vers login
  localStorage.removeItem('authToken');
  window.location.href = '/login';
}
```

### 2. Erreur 403 - Permission refusée
```javascript
if (error.response?.status === 403) {
  // Afficher message d'erreur
  toast.error('Vous n\'avez pas la permission d\'effectuer cette action');
  
  // Optionnel : Rediriger vers page interdite
  navigate('/forbidden');
}
```

### 3. Composant d'erreur
```jsx
// pages/Forbidden.jsx
const Forbidden = () => {
  return (
    <div className="error-page">
      <h1>403 - Accès refusé</h1>
      <p>Vous n'avez pas la permission d'accéder à cette ressource.</p>
      <Link to="/dashboard">Retour au dashboard</Link>
    </div>
  );
};
```

---

## 📊 Tableau récapitulatif des permissions

| Ressource | Actions disponibles | Description |
|-----------|---------------------|-------------|
| `users` | read, create, update, delete, * | Gestion des utilisateurs |
| `profiles` | read, create, update, delete, * | Gestion des profils |
| `roles` | read, create, update, delete, * | Gestion des rôles |
| `permissions` | read, create, update, delete, manage, * | Gestion des permissions |
| `audit` | read, * | Consultation des logs |
| `employment_status` | read, create, update, delete, * | Statuts d'emploi |
| `sessions` | read, delete, * | Gestion des sessions |
| `system` | *, manage | Administration système |

### Actions spéciales
- `*` : Toutes les actions sur la ressource
- `manage` : Gestion complète (inclut assignation/révocation)
- `execute` : Exécution d'opérations spéciales

---

## 🎓 Résumé

1. **Authentification** : Login → Récupérer JWT → Stocker le token
2. **Permissions** : Charger les permissions de l'utilisateur
3. **Vérification frontend** : Utiliser `PermissionChecker` pour cacher l'UI
4. **Appels API** : Toujours envoyer le token dans `Authorization: Bearer <token>`
5. **Sécurité** : Le backend vérifie TOUJOURS les permissions

---

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@example.com
- 📚 Documentation API complète : http://localhost:7700/api/docs

---

**Version:** 1.0.0  
**Date:** 2026-02-03  
**Auteur:** Ngoie kabamba franssen
