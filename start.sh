#!/bin/bash

# Script pour démarrer le backend et le frontend ensemble

echo "🚀 Démarrage de Dealss..."
echo ""

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances du frontend..."
  npm install
fi

if [ ! -d "backend/node_modules" ]; then
  echo "📦 Installation des dépendances du backend..."
  cd backend
  npm install
  cd ..
fi

echo ""
echo "🔥 Démarrage des serveurs..."
echo ""

# Démarrer le backend en arrière-plan
echo "📡 Démarrage du backend sur http://localhost:5000..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Attendre que le backend soit prêt
sleep 2

# Démarrer le frontend
echo "🎨 Démarrage du frontend sur http://localhost:5173..."
npm run dev

# Faire un cleanup si on arrête
cleanup() {
  echo ""
  echo "🛑 Arrêt des serveurs..."
  kill $BACKEND_PID
  exit
}

trap cleanup SIGINT
wait
