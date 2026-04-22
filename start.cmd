@echo off
REM Script pour démarrer le backend et le frontend ensemble sur Windows

echo.
echo 🚀 Démarrage de Dealss...
echo.

REM Vérifier si node_modules existe
if not exist "node_modules" (
  echo 📦 Installation des dépendances du frontend...
  call npm install
)

if not exist "backend\node_modules" (
  echo 📦 Installation des dépendances du backend...
  cd backend
  call npm install
  cd ..
)

echo.
echo 🔥 Démarrage des serveurs...
echo.

REM Démarrer le backend dans une nouvelle fenêtre
echo 📡 Démarrage du backend sur http://localhost:5000...
start "Backend - Dealss" cmd /k "cd backend && npm run dev"

REM Attendre 3 secondes
timeout /t 3 /nobreak

REM Démarrer le frontend dans la fenêtre actuelle
echo 🎨 Démarrage du frontend sur http://localhost:5173...
call npm run dev

pause
