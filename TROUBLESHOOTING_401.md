# 🔧 Troubleshooting 401 Unauthorized - Login API

Guide de diagnostic pour résoudre les erreurs 401 lors du login.

## ✅ Test Rapide

Le login fonctionne correctement avec ces identifiants :

```bash
curl -X POST http://localhost:7700/api/v1/auth/oauth2/signin/authorized \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin07@admin.com",
    "password": "Admin@123"
  }'

# Résultat attendu : 200 OK avec accessToken et refreshToken
```

**Si ce test fonctionne mais pas depuis votre frontend, suivez ce guide.**

---

## 🔍 Causes Possibles du 401

### 1️⃣ **Email Incorrect**

| ✅ Correct | ❌ Incorrect |
|-----------|--------------|
| `admin07@admin.com` | `admin@example.com` |
| `admin07@admin.com` | `admin@admin.com` |
| `admin07@admin.com` | `Admin07@admin.com` (majuscule) |

**Solution :**

```typescript
// Vérifier l'email exact dans la DB
PGPASSWORD='julia037@' psql -h localhost -p 5434 -U postgres -d auth_db \
  -c "SELECT id, email, username FROM users;"
```

---

### 2️⃣ **Mot de Passe Incorrect**

| ✅ Correct | ❌ Incorrect |
|-----------|--------------|
| `Admin@123` | `admin@123` (minuscule) |
| `Admin@123` | `Admin123` (sans @) |
| `Admin@123` | `Admin@1234` (chiffre en plus) |

**Le mot de passe est sensible à la casse !**

---

### 3️⃣ **Headers Manquants**

```typescript
// ✅ BON
await fetch('http://localhost:7700/api/v1/auth/oauth2/signin/authorized', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json', // ✅ OBLIGATOIRE
  },
  body: JSON.stringify({
    email: 'admin07@admin.com',
    password: 'Admin@123',
  }),
});

// ❌ MAUVAIS - Oubli du Content-Type
await fetch('...', {
  method: 'POST',
  body: JSON.stringify({ ... }), // ❌ Content-Type manquant
});
```

---

### 4️⃣ **Body Mal Formaté**

```typescript
// ✅ BON
body: JSON.stringify({
  email: 'admin07@admin.com',
  password: 'Admin@123',
})

// ❌ MAUVAIS - Oubli de JSON.stringify
body: {
  email: 'admin07@admin.com',
  password: 'Admin@123',
}
// → Envoie "[object Object]" au lieu du JSON
```

---

### 5️⃣ **CORS - Origine Non Autorisée**

**Origines autorisées en développement :**
- `http://localhost:3000` ✅
- `http://localhost:3001` ✅
- `http://127.0.0.1:3000` ✅

**Si votre Next.js tourne sur un autre port (ex: 3002) :**

Modifier `src/server.ts` :

```typescript
const allowedOrigins = env.NODE_ENV === 'production' 
  ? ['https://namedomaine.com'] 
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002', // ✅ Ajouter votre port
      'http://127.0.0.1:3000'
    ];
```

---

### 6️⃣ **Serveur Pas Démarré**

```bash
# Vérifier que le serveur tourne
curl http://localhost:7700/health

# Si erreur "Connection refused", démarrer le serveur
npm run dev
```

---

### 7️⃣ **Rate Limiting**

Si vous avez fait **trop de tentatives** (> 100 en 15 min) :

```json
{
  "status": "error",
  "message": "Trop de requêtes depuis cette IP, veuillez réessayer plus tard."
}
```

**Solution :** Attendez 15 minutes ou redémarrez le serveur.

---

## 🛠️ Checklist de Diagnostic

Cochez chaque point :

```typescript
// Frontend Next.js - Template Correct
const loginUser = async () => {
  const response = await fetch('http://localhost:7700/api/v1/auth/oauth2/signin/authorized', {
    method: 'POST',                          // ✅ Méthode POST
    headers: {
      'Content-Type': 'application/json',   // ✅ Content-Type
    },
    body: JSON.stringify({                  // ✅ JSON.stringify
      email: 'admin07@admin.com',           // ✅ Email exact
      password: 'Admin@123',                // ✅ Mot de passe exact (sensible à la casse)
    }),
  });

  const data = await response.json();
  console.log('Response:', data);

  if (data.status === 'success') {
    // ✅ Login réussi
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
  } else {
    // ❌ Erreur
    console.error('Erreur:', data.message);
  }
};
```

---

## 🧪 Tests de Diagnostic

### Test 1 : Curl (Terminal)

```bash
# Test simple
curl -X POST http://localhost:7700/api/v1/auth/oauth2/signin/authorized \
  -H "Content-Type: application/json" \
  -d '{"email": "admin07@admin.com", "password": "Admin@123"}'

# Résultat attendu : {"status":"success",...}
```

### Test 2 : Console Navigateur

```javascript
// Ouvrir la console (F12) et exécuter :
fetch('http://localhost:7700/api/v1/auth/oauth2/signin/authorized', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin07@admin.com',
    password: 'Admin@123',
  }),
})
  .then(res => res.json())
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err));
```

### Test 3 : Vérifier les Logs Serveur

```bash
# Voir les logs du serveur
# Le serveur devrait afficher les erreurs
npm run dev
```

---

## 📋 Vérifications Base de Données

### Vérifier l'utilisateur

```sql
-- Se connecter à la DB
PGPASSWORD='julia037@' psql -h localhost -p 5434 -U postgres -d auth_db

-- Voir tous les utilisateurs
SELECT id, email, username, first_name, last_name FROM users;

-- Vérifier l'email exact
SELECT email FROM users WHERE email LIKE '%admin%';
```

### Recréer l'utilisateur admin (si nécessaire)

```bash
# Supprimer l'ancien
PGPASSWORD='julia037@' psql -h localhost -p 5434 -U postgres -d auth_db \
  -c "DELETE FROM users WHERE email = 'admin07@admin.com';"

# Recréer
npm run seed:admin
```

---

## 🔧 Solutions par Scénario

### Scénario 1 : "Email ou mot de passe incorrect"

**Cause :** Les identifiants ne correspondent pas.

**Solution :**

```typescript
// Utilisez EXACTEMENT ces identifiants
const credentials = {
  email: 'admin07@admin.com',  // ✅ Tout en minuscules
  password: 'Admin@123',       // ✅ A majuscule, @ et 123
};
```

---

### Scénario 2 : Erreur CORS dans la console

```
Access to fetch at 'http://localhost:7700/...' from origin 
'http://localhost:3002' has been blocked by CORS policy
```

**Solution :**

Modifier `src/server.ts` :

```typescript
const allowedOrigins = env.NODE_ENV === 'production' 
  ? ['https://namedomaine.com'] 
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002', // ✅ Ajouter votre port Next.js
      'http://127.0.0.1:3000'
    ];
```

---

### Scénario 3 : "Cannot read property 'data' of undefined"

```typescript
// Le fetch échoue avant d'arriver au serveur

// Vérifier :
1. Le serveur est démarré (npm run dev)
2. L'URL est correcte (http://localhost:7700)
3. Pas d'erreur réseau (F12 → Network tab)
```

---

## 🎯 Template Next.js Complet et Testé

**`src/app/login/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin07@admin.com'); // Pré-rempli pour test
  const [password, setPassword] = useState('Admin@123');    // Pré-rempli pour test
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔄 Tentative de connexion...');
      console.log('Email:', email);
      console.log('Password:', password.replace(/./g, '*')); // Masquer le password

      const response = await fetch('http://localhost:7700/api/v1/auth/oauth2/signin/authorized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Status:', response.status);

      const data = await response.json();
      console.log('📦 Response:', data);

      if (data.status === 'success') {
        // ✅ Connexion réussie
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        
        console.log('✅ Connexion réussie !');
        router.push('/dashboard');
      } else {
        // ❌ Erreur
        setError(data.message || 'Erreur de connexion');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError('Impossible de se connecter au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Connexion</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        {/* Debug Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded text-xs">
          <p className="font-semibold mb-2">Identifiants de test :</p>
          <p>Email: admin07@admin.com</p>
          <p>Password: Admin@123</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 🐛 Debugging Avancé

### Activer les Logs Détaillés

```typescript
// src/controllers/auth/auth.controller.ts
export const oauthAuthorize = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('🔍 Login attempt:', { email }); // ✅ Ajouter ce log

    const user = await User.findOne({ where: { email } });
    console.log('👤 User found:', !!user); // ✅ Ajouter ce log

    if (!user) {
      console.log('❌ User not found'); // ✅ Ajouter ce log
      throw new AppError(401, 'Email ou mot de passe incorrect');
    }

    const isPasswordValid = await user.comparePassword(password);
    console.log('🔑 Password valid:', isPasswordValid); // ✅ Ajouter ce log

    // ... reste du code
  }
};
```

### Vérifier dans la Console Navigateur

**F12 → Network → Voir la requête :**

```
Request URL: http://localhost:7700/api/v1/auth/oauth2/signin/authorized
Request Method: POST
Status Code: 401 Unauthorized (ou 200 OK)

Request Headers:
  Content-Type: application/json ✅
  Origin: http://localhost:3000

Request Payload:
  {"email":"admin07@admin.com","password":"Admin@123"}
```

---

## 🔄 Tests Étape par Étape

### Étape 1 : Vérifier que le serveur fonctionne

```bash
curl http://localhost:7700/health
# Attendu : {"status":"OK",...}
```

### Étape 2 : Vérifier l'utilisateur en DB

```bash
PGPASSWORD='julia037@' psql -h localhost -p 5434 -U postgres -d auth_db \
  -c "SELECT email, username FROM users WHERE email = 'admin07@admin.com';"

# Attendu : 
#        email        | username 
# --------------------+----------
#  admin07@admin.com  | admin
```

### Étape 3 : Tester avec curl

```bash
curl -X POST http://localhost:7700/api/v1/auth/oauth2/signin/authorized \
  -H "Content-Type: application/json" \
  -d '{"email":"admin07@admin.com","password":"Admin@123"}'

# Attendu : {"status":"success",...}
```

### Étape 4 : Tester depuis Next.js

```typescript
// Dans la console du navigateur (F12)
fetch('http://localhost:7700/api/v1/auth/oauth2/signin/authorized', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin07@admin.com',
    password: 'Admin@123',
  }),
})
  .then(res => {
    console.log('Status:', res.status); // Devrait être 200
    return res.json();
  })
  .then(data => console.log('Data:', data))
  .catch(err => console.error('Error:', err));
```

---

## 📊 Tableau de Diagnostic

| Symptôme | Cause Probable | Solution |
|----------|----------------|----------|
| `401 Unauthorized` | Mauvais identifiants | Vérifier email + password exact |
| `404 Not Found` | Mauvaise URL | Vérifier l'endpoint |
| `403 Forbidden` | CORS | Ajouter origine dans allowedOrigins |
| `500 Internal Error` | Erreur serveur | Voir logs du serveur |
| `Network Error` | Serveur éteint | npm run dev |
| `CORS Error` | Origine non autorisée | Modifier src/server.ts |

---

## ✅ Solution Garantie

Si rien ne fonctionne, utilisez ce code testé :

```typescript
'use client';

import { useState } from 'react';

export default function LoginDebug() {
  const [result, setResult] = useState<any>(null);

  const testLogin = async () => {
    try {
      const response = await fetch('http://localhost:7700/api/v1/auth/oauth2/signin/authorized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin07@admin.com',
          password: 'Admin@123',
        }),
      });

      const data = await response.json();
      setResult({
        status: response.status,
        ok: response.ok,
        data,
      });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <div className="p-8">
      <button
        onClick={testLogin}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Tester Login
      </button>

      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

**Résultat attendu :**

```json
{
  "status": 200,
  "ok": true,
  "data": {
    "status": "success",
    "message": "Connexion réussie",
    "data": {
      "accessToken": "eyJhbG...",
      "refreshToken": "eyJhbG...",
      "user": { ... }
    }
  }
}
```

---

## 🎯 Identifiants Corrects

```
Email:     admin07@admin.com
Password:  Admin@123
           ↑ A majuscule, @ obligatoire, 123 à la fin
```

---

## 📞 Support

Si le problème persiste après avoir suivi ce guide :

1. **Copier la réponse exacte** du `curl` dans le terminal
2. **Copier l'erreur exacte** de la console navigateur (F12 → Console)
3. **Copier les logs** du serveur (terminal où `npm run dev` tourne)

---

**L'API fonctionne ! Le problème vient probablement d'une petite erreur dans la requête frontend. 🔍**
