# Dealss Backend Setup

Backend API pour l'application Dealss.

## Prérequis

- Node.js 18+ 
- npm ou pnpm

## Installation

```bash
cd backend
npm install
# ou
pnpm install
```

## Configuration

1. Créez un fichier `.env` à partir du `.env.example`:

```bash
cp .env.example .env
```

2. Modifiez les variables si nécessaire:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-here-change-in-production
CORS_ORIGIN=http://localhost:5173
```

## Lancer le serveur

### Développement (avec auto-reload)
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Endpoints API

### Authentification

#### Sign Up
```
POST /api/auth/signup
Body: { email, password, confirmPassword, name }
Response: { success, message, user, token, expiresIn }
```

#### Sign In
```
POST /api/auth/signin
Body: { email, password }
Response: { success, message, user, token, expiresIn }
```

#### Forgot Password
```
POST /api/auth/forgot-password
Body: { email }
Response: { success, message, resetToken, expiresIn }
```

#### Reset Password
```
POST /api/auth/reset-password
Body: { token, password, confirmPassword }
Response: { success, message }
```

#### Verify Token
```
POST /api/auth/verify-token
Body: { token }
Response: { success, message, user }
```

#### Get Current User
```
GET /api/auth/me
Headers: { Authorization: "Bearer <token>" }
Response: { success, user }
```

## Structure

```
backend/
├── src/
│   ├── index.ts           # Point d'entrée principal
│   ├── routes/
│   │   └── auth.ts        # Routes d'authentification
│   ├── services/
│   │   ├── authService.ts # Logique d'authentification
│   │   └── database.ts    # Gestion des données
│   └── types/
│       └── index.ts       # Interfaces TypeScript
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

## Notes

- **Mode développement**: Les tokens de réinitialisation de mot de passe sont retournés dans la réponse (à noter dans la production, ils doivent être envoyés par email)
- **Base de données**: Actuellement stockage en mémoire. À remplacer par une vraie BD (MongoDB, PostgreSQL, etc.)
- **Authentification**: JWT-based avec secret configurable

## Prochaines étapes

1. Intégrer une vraie base de données (MongoDB/PostgreSQL)
2. Ajouter la validation des emails
3. Implémenter l'envoi de mails pour la réinitialisation de mot de passe
4. Ajouter les rate limiter
5. Implémenter le refresh token
