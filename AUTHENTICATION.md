# 🎯 Dealss - Flow d'Authentification Complété

## Résumé du travail

Implémentation complète du flux d'authentification de l'application Dealss, du Welcome Screen jusqu'à la page de garde (Home).

## 📁 Fichiers créés/modifiés

### Backend (Node.js/Express)
```
backend/
├── src/
│   ├── index.ts              # Serveur Express
│   ├── types/index.ts        # Types TypeScript
│   ├── routes/auth.ts        # Endpoints d'authentification
│   └── services/
│       ├── authService.ts    # Gestion JWT/bcrypt
│       └── database.ts       # Stockage en mémoire
├── package.json              # Dépendances
├── tsconfig.json            # Config TypeScript
├── .env.example             # Variables d'environnement
└── README.md                # Documentation backend
```

**Dépendances backend:**
- Express: Framework HTTP
- bcryptjs: Hachage des passwords
- jsonwebtoken: Gestion JWT
- typescript: Type-safe

### Frontend (React)
```
src/app/
├── context/
│   ├── AuthContext.tsx         # Pool global d'authentification
│   └── ProtectedRoute.tsx      # Routes protégées
├── screens/
│   ├── WelcomeScreen.tsx       # Page d'accueil
│   ├── SignUpScreen.tsx        # Inscription
│   ├── SignInScreen.tsx        # Connexion
│   ├── ForgotPasswordScreen.tsx # Demande de réinitialisation
│   └── ResetPasswordScreen.tsx  # Réinitialisation du password
└── routes.tsx                  # Routing mis à jour
```

## 🔑 Fonctionnalités

### ✅ Implémentées

1. **Sign Up** ✅
   - Validation du formulaire
   - Hachage du password (bcrypt)
   - Création utilisateur
   - Token JWT automatique
   - Persistance localStorage

2. **Sign In** ✅
   - Authentification email/password
   - Vérification JWT
   - Session persistante
   - Redirection automatique

3. **Forgot Password** ✅
   - Génération token de réinitialisation
   - Affichage du token (dev mode)
   - Lien vers formulaire de réinitialisation
   - Copie du token en 1 clic

4. **Reset Password** ✅
   - Vérification du token
   - Validation des mots de passe
   - Mise à jour sécurisée
   - Suppression du token après utilisation

5. **Authentification persistante** ✅
   - Vérification du token au démarrage
   - localStorage pour persistence
   - Redirection automatique si session expire

6. **Mode Invité** ✅
   - Accès à Home sans connexion
   - "Continue as Guest" sur Welcome
   - Boutons Sign In/Up accessibles depuis Home

## 🚀 Comment démarrer

### Option 1: Script de démarrage automatique

**Sur macOS/Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Sur Windows:**
```bash
start.cmd
```

### Option 2: Manuel - Backend

```bash
# Installation
cd backend
npm install

# Configuration
cp .env.example .env

# Lancer
npm run dev
# Serveur sur http://localhost:5000
```

### Option 2: Manuel - Frontend

```bash
# Configuration (une seule fois)
cp .env.local.example .env.local  # ou le fichier existe déjà

# Installation (une seule fois)
npm install

# Lancer
npm run dev
# App sur http://localhost:5173
```

## 📡 Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React/Vite)                              │
│  ┌─────────────────────────────────┐                │
│  │ AuthProvider (contexte global)  │                │
│  ├─────────────────────────────────┤                │
│  │ - useState: user, token         │                │
│  │ - localStorage persistence      │                │
│  │ - signin, signup, logout        │                │
│  │ - forgotPassword, resetPassword │                │
│  └─────────────────────────────────┘                │
│  ┌─────────────────────────────────┐                │
│  │ Router                          │                │
│  ├─────────────────────────────────┤                │
│  │ - /welcome (public)             │                │
│  │ - /signup (public)              │                │
│  │ - /signin (public)              │                │
│  │ - /forgot-password (public)     │                │
│  │ - /reset-password (public)      │                │
│  │ - / (Home - accessible)         │                │
│  │ - /profile (avec user)          │                │
│  └─────────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
         ↓ HTTP (fetch)
┌─────────────────────────────────────────────────────┐
│  Backend API (Express/Node.js)                      │
│  ┌─────────────────────────────────┐                │
│  │ JWT Authentication Service      │                │
│  ├─────────────────────────────────┤                │
│  │ - generateToken()               │                │
│  │ - verifyToken()                 │                │
│  │ - hashPassword()                │                │
│  │ - comparePassword()             │                │
│  └─────────────────────────────────┘                │
│  ┌─────────────────────────────────┐                │
│  │ Database (Memory - Dev)         │                │
│  ├─────────────────────────────────┤                │
│  │ - users Map                     │                │
│  │ - resetTokens Map               │                │
│  │ - emailToUserId Map             │                │
│  └─────────────────────────────────┘                │
│  ┌─────────────────────────────────┐                │
│  │ Routes                          │                │
│  ├─────────────────────────────────┤                │
│  │ POST /api/auth/signup           │                │
│  │ POST /api/auth/signin           │                │
│  │ POST /api/auth/forgot-password  │                │
│  │ POST /api/auth/reset-password   │                │
│  │ POST /api/auth/verify-token     │                │
│  │ GET  /api/auth/me               │                │
│  └─────────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

## 🔄 Flux utilisateur

### Première visite
```
Page Load
  ↓
AuthProvider initialise (vérifie localStorage)
Si pas de token → Loading → Home/Welcome
Si token existe → Vérifie auprès backend
  - Valide → Load user data
  - Expiré → Clear token → Free version
  ↓
Router affiche:
  - Welcome Screen si première visite
  - Home si vu avant
  - Buttons Sign In/Up disponibles
```

### Scénario Inscription
```
Welcome → Clic "Create Account"
  ↓
SignUp Screen
  ↓
Formulaire: name, email, password, confirm
  ↓
handleSubmit → auth.signup()
  ↓
POST /api/auth/signup
  ↓
Backend: validate → hash password → create user → JWT
  ↓
Frontend: save token → localStorage
  ↓
Redirect → Home (connecté)
```

### Scénario Connexion
```
SignIn Screen
  ↓
Formulaire: email, password
  ↓
handleSubmit → auth.signin()
  ↓
POST /api/auth/signin
  ↓
Backend: find user → compare password → JWT
  ↓
Frontend: save token → localStorage
  ↓
Redirect → Home (connecté)
```

### Scénario Mot de passe oublié
```
SignIn → Clic "Forgot?"
  ↓
ForgotPassword Screen
  ↓
Saisir email
  ↓
POST /api/auth/forgot-password
  ↓
Backend: find user → generate reset token → return
  ↓
Frontend: display token + copy button
  ↓
Clic "Continue to Reset Password"
  ↓
Reset Password Screen (token en URL)
  ↓
Saisir nouveau password
  ↓
POST /api/auth/reset-password
  ↓
Backend: verify token → hash password → update
  ↓
Success → Redirect SignIn
  ↓
Connexion avec nouveau password
```

## 🛡️ Sécurité

- ✅ **Passwords**: Hachés avec bcrypt (10 rounds)
- ✅ **JWT**: Signé avec secret configurable
- ✅ **CORS**: Configuré pour localhost:5173
- ✅ **Valid**: Validation côté serveur obligatoire
- ✅ **localStorage**: Jamais stocker de données sensibles
- ⚠️ **À améliorer**:
  - HTTPS en production
  - Refresh tokens
  - Rate limiting
  - Email verification
  - 2FA

## 📊 Endpoints API

### Authentication Routes

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "name": "John Doe"
}

Response 201:
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "token": "eyJhbGc...",
  "expiresIn": "7d"
}
```

```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "success": true,
  "message": "Signed in successfully",
  "user": { /* user object */ },
  "token": "eyJhbGc...",
  "expiresIn": "7d"
}
```

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response 200:
{
  "success": true,
  "message": "Reset token generated",
  "resetToken": "abc123def456...",
  "expiresIn": "24 hours"
}
```

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "abc123def456...",
  "password": "newpassword123",
  "confirmPassword": "newpassword123"
}

Response 200:
{
  "success": true,
  "message": "Password reset successfully"
}
```

```http
POST /api/auth/verify-token
Content-Type: application/json

{
  "token": "eyJhbGc..."
}

Response 200:
{
  "success": true,
  "message": "Token is valid",
  "user": { /* user object */ }
}
```

```http
GET /api/auth/me
Authorization: Bearer eyJhbGc...

Response 200:
{
  "success": true,
  "user": { /* user object */ }
}
```

## 📝 Variables d'environnement

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:5000/api
```

## 🚀 Déploiement

### Frontend
```bash
npm run build
# Dossier dist/ prêt pour deployment
# Deploy sur Vercel, Netlify, ou serveur statique
```

### Backend
```bash
cd backend
npm run build
npm start
# Ou utiliser Docker, Heroku, Railway, etc.
```

## 🔜 Prochaines améliorations

- [ ] Refresh tokens
- [ ] Email verification
- [ ] Password strength validation
- [ ] OAuth (Google, GitHub)
- [ ] 2FA
- [ ] Account recovery
- [ ] Session management UI
- [ ] Rate limiting
- [ ] Database (MongoDB/PostgreSQL)
- [ ] Email service intégré
- [ ] Audit logs

## 📚 Fichiers de documentation

- [AUTH_FLOW.md](./AUTH_FLOW.md) - Détails du flux
- [backend/README.md](./backend/README.md) - Guide backend

## 🤝 Questions?

Check AuthContext, ProtectedRoute, et les screens pour comprendre le flux complet.
