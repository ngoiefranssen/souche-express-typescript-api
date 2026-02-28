# Guide FormData Next.js - API Express TypeScript

Guide complet pour envoyer des données en **FormData** depuis Next.js vers votre API Express TypeScript.

## Table des matières

- [Pourquoi FormData ?](#pourquoi-formdata)
- [Configuration Backend](#configuration-backend)
- [Helpers Next.js](#helpers-nextjs)
- [APIs Existantes](#apis-existantes)
- [Upload de Fichiers](#upload-de-fichiers)
- [Exemples Complets](#exemples-complets)

---

## Pourquoi FormData ?

### Avantages de FormData

| Avantage | Description |
|----------|-------------|
| **Upload de fichiers** | Gère facilement les fichiers (images, PDF, etc.) |
| **Multipart/form-data** | Format natif pour les formulaires HTML |
| **Pas de stringify** | Pas besoin de `JSON.stringify()` |
| **Compatible navigateur** | Support natif dans tous les navigateurs |

### Quand utiliser FormData vs JSON ?

```typescript
// Utilisez FormData pour :
- Upload de fichiers (photo de profil, documents)
- Formulaires avec fichiers + données
- Données avec types complexes (Date, File)

// Utilisez JSON pour :
- Données simples (login, logout)
- APIs REST classiques
- Pas de fichiers
```

---

## Configuration Backend

### Middleware existant (déjà configuré)

Votre backend Express a déjà `express-fileupload` :

```typescript
// src/server.ts
import fileUpload from 'express-fileupload';

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
}));
```

**Aucune modification nécessaire !**

---

## Helpers Next.js

### 1. Client API avec FormData

**`src/lib/api/formDataClient.ts`**

```typescript
/**
 * Client API pour les requêtes FormData
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7700/api/v1';

export class FormDataClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Récupérer le token d'accès
   */
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  /**
   * Envoyer une requête avec FormData
   */
  async send<T = any>(
    endpoint: string,
    formData: FormData,
    method: 'POST' | 'PUT' | 'PATCH' = 'POST'
  ): Promise<T> {
    const token = this.getAccessToken();

    const headers: HeadersInit = {};
    
    // Ajouter le token si disponible
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // NE PAS définir Content-Type, le navigateur le fait automatiquement
    // avec la boundary correcte pour multipart/form-data

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de la requête');
    }

    return data;
  }

  /**
   * Méthodes helper
   */
  post<T>(endpoint: string, formData: FormData) {
    return this.send<T>(endpoint, formData, 'POST');
  }

  put<T>(endpoint: string, formData: FormData) {
    return this.send<T>(endpoint, formData, 'PUT');
  }

  patch<T>(endpoint: string, formData: FormData) {
    return this.send<T>(endpoint, formData, 'PATCH');
  }
}

export const formDataClient = new FormDataClient();
```

---

### 2. Helper pour créer FormData

**`src/lib/utils/formData.ts`**

```typescript
/**
 * Utilitaires pour créer et manipuler FormData
 */

/**
 * Créer un FormData depuis un objet
 */
export function createFormData(data: Record<string, any>): FormData {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return; // Ignorer les valeurs nulles
    }

    // Gérer les fichiers
    if (value instanceof File) {
      formData.append(key, value);
      return;
    }

    // Gérer les tableaux de fichiers
    if (Array.isArray(value) && value[0] instanceof File) {
      value.forEach((file) => {
        formData.append(key, file);
      });
      return;
    }

    // Gérer les objets (JSON.stringify)
    if (typeof value === 'object' && !(value instanceof Date)) {
      formData.append(key, JSON.stringify(value));
      return;
    }

    // Gérer les dates
    if (value instanceof Date) {
      formData.append(key, value.toISOString());
      return;
    }

    // Valeurs simples
    formData.append(key, String(value));
  });

  return formData;
}

/**
 * Afficher le contenu de FormData (debug)
 */
export function logFormData(formData: FormData): void {
  console.log('=== FormData Content ===');
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(`${key}:`, {
        name: value.name,
        size: value.size,
        type: value.type,
      });
    } else {
      console.log(`${key}:`, value);
    }
  }
  console.log('=======================');
}

/**
 * Ajouter un fichier depuis un input file
 */
export function addFileToFormData(
  formData: FormData,
  key: string,
  fileInput: HTMLInputElement
): void {
  const files = fileInput.files;
  if (!files || files.length === 0) return;

  if (files.length === 1) {
    formData.append(key, files[0]);
  } else {
    Array.from(files).forEach((file) => {
      formData.append(key, file);
    });
  }
}
```

---

## APIs Existantes

### 1. Authentication

#### **Login (JSON - pas de FormData nécessaire)**

```typescript
// src/lib/api/auth.ts
import { apiClient } from './client';

export const authApi = {
  // Login reste en JSON (pas de fichiers)
  async login(credentials: { email: string; password: string }) {
    return apiClient.post('/auth/oauth2/signin/authorized', credentials, {
      skipAuth: true,
    });
  },
};
```

**Utilisation :**

```typescript
'use client';

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  
  await authApi.login({
    email: 'admin07@admin.com',
    password: 'Admin@123',
  });
};
```

---

### 2. Utilisateurs (Users)

#### **Créer un utilisateur avec photo**

**Backend :** Adapter le contrôleur pour accepter FormData

```typescript
// src/controllers/admin/users.controller.ts
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { 
      email, 
      username, 
      password, 
      firstName, 
      lastName, 
      phone, 
      profileId, 
      employmentStatusId 
    } = req.body;

    // Récupérer le fichier uploadé
    const profilePhoto = req.files?.profilePhoto as fileUpload.UploadedFile | undefined;

    let profilePhotoUrl: string | undefined;

    if (profilePhoto) {
      // Upload du fichier
      const uploadPath = path.join(__dirname, '../../../public/uploads/profiles', profilePhoto.name);
      await profilePhoto.mv(uploadPath);
      profilePhotoUrl = `/uploads/profiles/${profilePhoto.name}`;
    }

    const user = await User.create({
      email,
      username,
      password,
      firstName,
      lastName,
      phone: phone || null,
      profilePhoto: profilePhotoUrl,
      profileId: profileId ? Number(profileId) : undefined,
      employmentStatusId: employmentStatusId ? Number(employmentStatusId) : undefined,
    });

    res.status(201).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
```

**Frontend Next.js :**

```typescript
'use client';

import { useState } from 'react';
import { formDataClient } from '@/lib/api/formDataClient';
import { createFormData } from '@/lib/utils/formData';

export function CreateUserForm() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    profileId: '',
    employmentStatusId: '',
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Créer FormData
    const data = createFormData({
      ...formData,
      profilePhoto, // Ajouter le fichier
    });

    try {
      const response = await formDataClient.post('/users', data);
      console.log('Utilisateur créé:', response);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      
      <input
        type="text"
        placeholder="Username"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Prénom"
        value={formData.firstName}
        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Nom"
        value={formData.lastName}
        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        required
      />

      <input
        type="tel"
        placeholder="Téléphone"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      />

      {/* Upload de photo */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Photo de profil
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Créer l'utilisateur
      </button>
    </form>
  );
}
```

---

### 3. Profils (Profiles)

#### **Créer un profil**

**Frontend :**

```typescript
'use client';

import { formDataClient } from '@/lib/api/formDataClient';
import { createFormData } from '@/lib/utils/formData';

async function createProfile(profileData: {
  label: string;
  description?: string;
  roleIds: number[];
}) {
  const formData = createFormData({
    label: profileData.label,
    description: profileData.description || '',
    roleIds: JSON.stringify(profileData.roleIds), // Tableau en JSON
  });

  return formDataClient.post('/profiles', formData);
}

// Utilisation
const handleCreateProfile = async () => {
  await createProfile({
    label: 'Manager Commercial',
    description: 'Gestion de l\'équipe commerciale',
    roleIds: [2, 3], // IDs des rôles
  });
};
```

---

### 4. Permissions

#### **Assigner des permissions à un rôle**

**Frontend :**

```typescript
'use client';

import { formDataClient } from '@/lib/api/formDataClient';
import { createFormData } from '@/lib/utils/formData';

async function assignPermissionsToRole(
  roleId: number,
  permissionIds: number[]
) {
  const formData = createFormData({
    roleId,
    permissionIds: JSON.stringify(permissionIds),
  });

  return formDataClient.post('/permissions/assign', formData);
}

// Utilisation
const handleAssignPermissions = async () => {
  await assignPermissionsToRole(2, [1, 2, 3, 5, 7]); // Assigner 5 permissions au rôle 2
};
```

---

## Upload de Fichiers

### Composant d'Upload Réutilisable

**`src/components/FileUpload.tsx`**

```typescript
'use client';

import { useState, useRef } from 'react';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // en MB
  onFileSelect: (file: File) => void;
  preview?: boolean;
}

export function FileUpload({
  accept = 'image/*',
  maxSize = 5,
  onFileSelect,
  preview = true,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);

    if (!selectedFile) return;

    // Vérifier la taille
    if (selectedFile.size > maxSize * 1024 * 1024) {
      setError(`Le fichier doit faire moins de ${maxSize} MB`);
      return;
    }

    setFile(selectedFile);
    onFileSelect(selectedFile);

    // Créer un aperçu pour les images
    if (preview && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Choisir un fichier
        </label>

        {file && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{file.name}</span>
            <button
              onClick={handleClear}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {previewUrl && (
        <div className="mt-4">
          <img
            src={previewUrl}
            alt="Aperçu"
            className="max-w-xs rounded border"
          />
        </div>
      )}

      {file && !error && (
        <div className="text-sm text-gray-600">
          Taille: {(file.size / 1024 / 1024).toFixed(2)} MB
        </div>
      )}
    </div>
  );
}
```

**Utilisation :**

```typescript
'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { formDataClient } from '@/lib/api/formDataClient';
import { createFormData } from '@/lib/utils/formData';

export function UpdateProfilePhoto() {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    const formData = createFormData({
      profilePhoto: file,
    });

    try {
      await formDataClient.put('/users/1/photo', formData);
      alert('Photo mise à jour !');
    } catch (error) {
      alert('Erreur lors de l\'upload');
    }
  };

  return (
    <div className="space-y-4">
      <FileUpload
        accept="image/*"
        maxSize={5}
        onFileSelect={setFile}
        preview
      />

      <button
        onClick={handleUpload}
        disabled={!file}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        Uploader la photo
      </button>
    </div>
  );
}
```

---

## Exemples Complets

### Exemple 1 : Formulaire avec Fichier + Données

```typescript
'use client';

import { useState } from 'react';
import { formDataClient } from '@/lib/api/formDataClient';
import { createFormData, logFormData } from '@/lib/utils/formData';
import { FileUpload } from '@/components/FileUpload';

export function CompleteUserForm() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    profileId: '1',
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Créer FormData avec tous les champs
      const data = createFormData({
        ...formData,
        profilePhoto,
        profileId: Number(formData.profileId),
      });

      // Debug: afficher le contenu
      logFormData(data);

      // Envoyer au backend
      const response = await formDataClient.post('/users', data);
      
      alert('Utilisateur créé avec succès !');
      console.log('Réponse:', response);
    } catch (error) {
      alert('Erreur lors de la création');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 p-6">
      <h2 className="text-2xl font-bold">Créer un utilisateur</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Username *</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Prénom *</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nom *</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Téléphone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mot de passe *</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Photo de profil
        </label>
        <FileUpload
          accept="image/*"
          maxSize={5}
          onFileSelect={setProfilePhoto}
          preview
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {loading ? 'Création en cours...' : 'Créer l\'utilisateur'}
      </button>
    </form>
  );
}
```

---

### Exemple 2 : Upload Multiple

```typescript
'use client';

import { useState } from 'react';
import { formDataClient } from '@/lib/api/formDataClient';

export function MultipleFileUpload() {
  const [files, setFiles] = useState<File[]>([]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    const formData = new FormData();

    // Ajouter tous les fichiers
    files.forEach((file, index) => {
      formData.append('documents', file); // Même clé pour tous
    });

    // Ajouter des métadonnées
    formData.append('userId', '1');
    formData.append('category', 'diplomas');

    try {
      await formDataClient.post('/documents/upload', formData);
      alert('Documents uploadés !');
    } catch (error) {
      alert('Erreur lors de l\'upload');
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        multiple
        onChange={handleFilesChange}
        className="block w-full"
      />

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">{files.length} fichier(s) sélectionné(s) :</p>
          <ul className="list-disc list-inside">
            {files.map((file, index) => (
              <li key={index} className="text-sm">
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={files.length === 0}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Uploader les documents
      </button>
    </div>
  );
}
```

---

## Tableau Récapitulatif

### Quand utiliser FormData ?

| API Endpoint | Méthode | Format | Raison |
|--------------|---------|--------|--------|
| `/auth/oauth2/signin/authorized` | POST | **JSON** | Pas de fichiers |
| `/auth/me` | GET | - | Lecture seule |
| `/users` | POST | **FormData** | Photo de profil |
| `/users/:id` | PUT | **FormData** | Mise à jour photo |
| `/profiles` | POST | **JSON** | Pas de fichiers |
| `/permissions/assign` | POST | **JSON** | Données simples |
| `/documents/upload` | POST | **FormData** | Upload de documents |

---

## Points Clés

### À Faire

- Ne PAS définir `Content-Type` manuellement
- Utiliser `createFormData()` pour simplifier
- Logger FormData en dev avec `logFormData()`
- Valider la taille des fichiers côté client
- Afficher un aperçu des images

### À Éviter

- Utiliser FormData pour des données simples (privilégier JSON)
- Définir `Content-Type: multipart/form-data` manuellement
- Oublier de convertir les objets en JSON string
- Uploader des fichiers > 50 MB

---

## Résumé

**FormData simplifie l'upload de fichiers !**

```typescript
// 1. Créer FormData
const formData = createFormData({
  email: 'user@example.com',
  username: 'johndoe',
  profilePhoto: file, // File object
});

// 2. Envoyer au backend
await formDataClient.post('/users', formData);

// 3. Backend récupère automatiquement
// req.body.email
// req.files.profilePhoto
```

**Votre backend est déjà prêt avec `express-fileupload` !**
