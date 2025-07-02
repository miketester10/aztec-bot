#!/bin/bash

# === CONFIGURAZIONI ===
PORT=3000
ENV_FILE=".env"
NGROK_BIN="ngrok"

echo "============================="
echo "🚀 Avvio di ngrok sulla porta $PORT..."

# Avvia ngrok in background, disattiva output per pulizia terminale
$NGROK_BIN http $PORT > /dev/null &
NGROK_PID=$!

# Attendi alcuni secondi per permettere a ngrok di inizializzarsi
sleep 3

# Verifica che ngrok abbia avviato correttamente l'interfaccia API
if ! curl -s http://127.0.0.1:4040/api/tunnels > /dev/null; then
  echo "❌ Errore: ngrok non è stato avviato correttamente."
  kill $NGROK_PID
  exit 1
fi

# Estrai l'URL pubblico da ngrok
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url')

# Controlla se l'URL è valido
if [[ -z "$NGROK_URL" || "$NGROK_URL" == "null" ]]; then
  echo "❌ Errore: Impossibile ottenere l'URL pubblico da ngrok."
  kill $NGROK_PID
  exit 1
fi

echo "✅ Ngrok attivo: $NGROK_URL"

# === AGGIORNA IL FILE .env ===
if [ -f "$ENV_FILE" ]; then
  echo "📝 Aggiornamento di $ENV_FILE..."

  # Sostituisce WEBHOOK_URL se già esiste
  if grep -q "^WEBHOOK_URL=" "$ENV_FILE"; then
    sed -i "s|^WEBHOOK_URL=.*|WEBHOOK_URL=$NGROK_URL|g" "$ENV_FILE"
  else
    echo "WEBHOOK_URL=$NGROK_URL" >> "$ENV_FILE"
  fi

  echo "✅ Variabile WEBHOOK_URL aggiornata in $ENV_FILE"
else
  echo "⚠️  File .env non trovato nella cartella corrente!"
  kill $NGROK_PID
  exit 1
fi

# === MESSAGGIO FINALE ===
echo "============================="
echo "🎉 Tutto pronto!"
echo "🔗 URL Ngrok:        $NGROK_URL"
echo "📄 File aggiornato:  $ENV_FILE"
echo "🔄 Variabile:        WEBHOOK_URL=$NGROK_URL"
echo "🔁 ngrok è attivo finché non chiudi il terminale o termini il processo."
echo "============================="

# Tieni ngrok attivo in foreground
wait $NGROK_PID
