# Référence Rapide - Bodies à Envoyer (Next.js)

Guide de référence rapide pour tous les bodies à envoyer aux APIs existantes depuis Next.js.

## Authentication

### 1. Login

**Endpoint:** `POST /api/v1/auth/oauth2/signin/authorized`

**Format:** JSON

```typescript
// TypeScript
interface LoginBody {
  email: string;
  password: string;
}

// Exemple Next.js
const loginUser = async () => {
  const response = await fetch('http://localhost:7700/api/v1/auth/oauth2/signin/authorized', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin07@admin.com',
      password: 'Admin@123',
    }),
  });
  
  const data = await response.json();
  // Stocker les tokens
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
};
```

---

### 2. Logout

**Endpoint:** `POST /api/v1/auth/singout/oauth2/authorized`

**Format:** Pas de body, juste le token dans les headers

```typescript
const logoutUser = async () => {
  const token = localStorage.getItem('accessToken');
  
  await fetch('http://localhost:7700/api/v1/auth/singout/oauth2/authorized', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};
```

---

### 3. Refresh Token

**Endpoint:** `POST /api/v1/auth/refresh-token`

**Format:** JSON

```typescript
interface RefreshTokenBody {
  refreshToken: string;
}

// Exemple Next.js
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('http://localhost:7700/api/v1/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  
  const data = await response.json();
  localStorage.setItem('accessToken', data.data.accessToken);
};
```

---

### 4. Get Current User

**Endpoint:** `GET /api/v1/auth/me`

**Format:** Pas de body

```typescript
const getCurrentUser = async () => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://localhost:7700/api/v1/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};
```

---

## Users

### 1. Create User

**Endpoint:** `POST /api/v1/users`

**Format:** FormData (avec photo) ou JSON (sans photo)

```typescript
// Avec FormData (photo incluse)
const createUserWithPhoto = async () => {
  const formData = new FormData();
  formData.append('email', 'newuser@example.com');
  formData.append('username', 'newuser');
  formData.append('password', 'SecurePass@123');
  formData.append('firstName', 'John');
  formData.append('lastName', 'Doe');
  formData.append('phone', '+33612345678');
  formData.append('profileId', '1');
  formData.append('employmentStatusId', '1');
  
  // Fichier photo
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (fileInput?.files?.[0]) {
    formData.append('profilePhoto', fileInput.files[0]);
  }
  
  const token = localStorage.getItem('accessToken');
  
  await fetch('http://localhost:7700/api/v1/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Ne PAS définir Content-Type pour FormData
    },
    body: formData,
  });
};

// Sans photo (JSON)
const createUserWithoutPhoto = async () => {
  const token = localStorage.getItem('accessToken');
  
  await fetch('http://localhost:7700/api/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'SecurePass@123',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+33612345678',
      profileId: 1,
      employmentStatusId: 1,
    }),
  });
};
```

---

### 2. Update User

**Endpoint:** `PUT /api/v1/users/:id`

**Format:** FormData ou JSON

```typescript
const updateUser = async (userId: number) => {
  const formData = new FormData();
  formData.append('firstName', 'Jane');
  formData.append('lastName', 'Smith');
  formData.append('phone', '+33698765432');
  
  // Photo optionnelle
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (fileInput?.files?.[0]) {
    formData.append('profilePhoto', fileInput.files[0]);
  }
  
  const token = localStorage.getItem('accessToken');
  
  await fetch(`http://localhost:7700/api/v1/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
};
```

---

### 3. Delete User

**Endpoint:** `DELETE /api/v1/users/:id`

**Format:** Pas de body

```typescript
const deleteUser = async (userId: number) => {
  const token = localStorage.getItem('accessToken');
  
  await fetch(`http://localhost:7700/api/v1/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};
```

---

## Profiles

### 1. Create Profile

**Endpoint:** `POST /api/v1/profil`

**Format:** JSON

```typescript
interface CreateProfileBody {
  label: string;
  description?: string;
  roleIds?: number[];
}

const createProfile = async () => {
  const token = localStorage.getItem('accessToken');
  
  await fetch('http://localhost:7700/api/v1/profil', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      label: 'Manager Commercial',
      description: 'Responsable de l\'équipe commerciale',
      roleIds: [2, 3], // IDs des rôles à associer
    }),
  });
};
```

---

### 2. Update Profile

**Endpoint:** `PUT /api/v1/profil/:id`

**Format:** JSON

```typescript
const updateProfile = async (profileId: number) => {
  const token = localStorage.getItem('accessToken');
  
  await fetch(`http://localhost:7700/api/v1/profil/${profileId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      label: 'Manager Commercial Senior',
      description: 'Responsable principal de l\'équipe commerciale',
    }),
  });
};
```

---

## Roles

### 1. Create Role

**Endpoint:** `POST /api/v1/roles`

**Format:** JSON

```typescript
interface CreateRoleBody {
  label: string;
  description?: string;
}

const createRole = async () => {
  const token = localStorage.getItem('accessToken');
  
  await fetch('http://localhost:7700/api/v1/roles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      label: 'Responsable RH',
      description: 'Gestion des ressources humaines',
    }),
  });
};
```

---

## Permissions

### 1. Create Permission

**Endpoint:** `POST /api/v1/permissions`

**Format:** JSON

```typescript
interface CreatePermissionBody {
  name: string;
  resource: string;
  action: 'read' | 'create' | 'update' | 'delete' | '*' | 'execute' | 'manage';
  description?: string;
  category?: string;
  conditions?: Record<string, any>;
}

const createPermission = async () => {
  const token = localStorage.getItem('accessToken');
  
  await fetch('http://localhost:7700/api/v1/permissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'reports:read',
      resource: 'reports',
      action: 'read',
      description: 'Lire les rapports',
      category: 'analytics',
      conditions: {
        department: ['sales', 'marketing'],
      },
    }),
  });
};
```

---

### 2. Assign Permission to Role

**Endpoint:** `POST /api/v1/permissions/assign`

**Format:** JSON

```typescript
interface AssignPermissionBody {
  roleId: number;
  permissionId: number;
  overrideConditions?: Record<string, any>;
}

const assignPermissionToRole = async () => {
  const token = localStorage.getItem('accessToken');
  
  await fetch('http://localhost:7700/api/v1/permissions/assign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      roleId: 2,
      permissionId: 5,
      overrideConditions: {
        department: ['sales'],
        region: ['north'],
      },
    }),
  });
};
```

---

### 3. Revoke Permission from Role

**Endpoint:** `POST /api/v1/permissions/revoke`

**Format:** JSON

```typescript
interface RevokePermissionBody {
  roleId: number;
  permissionId: number;
}

const revokePermissionFromRole = async () => {
  const token = localStorage.getItem('accessToken');
  
  await fetch('http://localhost:7700/api/v1/permissions/revoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      roleId: 2,
      permissionId: 5,
    }),
  });
};
```

---

## Employment Status

### 1. Create Employment Status

**Endpoint:** `POST /api/v1/statut-employe`

**Format:** JSON

```typescript
interface CreateEmploymentStatusBody {
  label: string;
  description?: string;
}

const createEmploymentStatus = async () => {
  const token = localStorage.getItem('accessToken');
  
  await fetch('http://localhost:7700/api/v1/statut-employe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      label: 'Freelance',
      description: 'Consultant externe',
    }),
  });
};
```

---

## Audit

### 1. Get Audit Logs

**Endpoint:** `GET /api/v1/audit?page=1&limit=50`

**Format:** Query parameters

```typescript
const getAuditLogs = async (page = 1, limit = 50) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(
    `http://localhost:7700/api/v1/audit?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  return response.json();
};
```

---

## Résumé par Format

### JSON (la plupart des APIs)

```typescript
// Template générique
const apiCall = async (endpoint: string, body: any) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`http://localhost:7700/api/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  
  return response.json();
};

// Utilisation
await apiCall('/roles', {
  label: 'Nouveau rôle',
  description: 'Description du rôle',
});
```

---

### FormData (upload de fichiers)

```typescript
// Template générique
const apiCallWithFile = async (endpoint: string, data: Record<string, any>) => {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  
  // Ajouter tous les champs
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  });
  
  const response = await fetch(`http://localhost:7700/api/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // ⚠️ Ne PAS définir Content-Type
    },
    body: formData,
  });
  
  return response.json();
};

// Utilisation
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
await apiCallWithFile('/users', {
  email: 'user@example.com',
  username: 'johndoe',
  password: 'Pass@123',
  firstName: 'John',
  lastName: 'Doe',
  profilePhoto: fileInput?.files?.[0],
});
```

---

## Checklist Rapide

Avant d'envoyer une requête :

- Token dans `Authorization: Bearer <token>`
- `Content-Type: application/json` pour JSON
- **PAS** de `Content-Type` pour FormData
- Valider les données côté client
- Gérer les erreurs (try/catch)
- Afficher un loader pendant la requête

---

## Hook React Réutilisable

```typescript
// src/hooks/useApi.ts
'use client';

import { useState } from 'react';

export function useApi<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`http://localhost:7700/api/v1${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la requête');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { call, loading, error };
}

// Utilisation
function MyComponent() {
  const { call, loading, error } = useApi();

  const handleCreateUser = async () => {
    const result = await call('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test@123',
        firstName: 'Test',
        lastName: 'User',
      }),
    });

    if (result) {
      console.log('Utilisateur créé:', result);
    }
  };

  return (
    <div>
      {loading && <p>Chargement...</p>}
      {error && <p className="text-red-600">{error}</p>}
      <button onClick={handleCreateUser}>Créer utilisateur</button>
    </div>
  );
}
```

---

**Référence complète pour toutes vos APIs !**
