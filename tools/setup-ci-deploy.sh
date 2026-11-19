#!/usr/bin/env bash
# À lancer sur le VPS (root), depuis /opt/orgest-src :
#   sudo ./tools/setup-ci-deploy.sh orgest.tech 212680376294            (première fois)
#   sudo ./tools/setup-ci-deploy.sh orgest.tech 212680376294 --rotate   (nouvelle clé, l'ancienne est révoquée)
# Crée la commande « orgest-deploy » et une clé SSH qui ne peut faire QUE cela (GitHub Actions).
set -Eeuo pipefail
ROTATE=0; ARGS=()
for a in "$@"; do [[ "$a" == "--rotate" ]] && ROTATE=1 || ARGS+=("$a"); done
DOMAIN="${ARGS[0]:?Usage: $0 <domaine> [numero_whatsapp] [--rotate]}"; WA="${ARGS[1]:-212680376294}"
[[ $EUID -eq 0 ]] || { echo "Exécutez en root."; exit 1; }
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ -f "$REPO/deploy.sh" ]] || { echo "Lancez depuis le dépôt Orgest."; exit 1; }

cat > /usr/local/sbin/orgest-deploy <<SCRIPT
#!/usr/bin/env bash
# Mise à jour d'Orgest : git pull + deploy.sh (un seul déploiement à la fois).
set -Eeuo pipefail
exec 9>/run/orgest-deploy.lock
flock -w 1200 9
cd "$REPO"
git fetch --quiet origin main
git reset --hard origin/main
./deploy.sh "$DOMAIN" --whatsapp "$WA" 2>&1 | tee -a /var/log/orgest-deploy.log
SCRIPT
chmod 750 /usr/local/sbin/orgest-deploy; chown root:root /usr/local/sbin/orgest-deploy

KEY=/root/.ssh/orgest_ci_ed25519
install -d -m 700 /root/.ssh
AK=/root/.ssh/authorized_keys; touch "$AK"; chmod 600 "$AK"
if [[ "$ROTATE" == 1 ]]; then
  sed -i '/github-actions-orgest/d' "$AK"; rm -f "$KEY" "$KEY.pub"
  echo "Ancienne clé révoquée."
fi
[[ -f "$KEY" ]] || ssh-keygen -t ed25519 -N '' -C "github-actions-orgest" -f "$KEY" >/dev/null
PUB="$(cat "$KEY.pub")"
# commande forcée : « deploy » -> orgest-deploy ; tout le reste est refusé
LINE="command=\"[ \\\"\$SSH_ORIGINAL_COMMAND\\\" = deploy ] && exec /usr/local/sbin/orgest-deploy || { echo refused >&2; exit 1; }\",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty $PUB"
grep -qF "$PUB" "$AK" || echo "$LINE" >> "$AK"

HOSTV="$(curl -fsS4 https://ifconfig.me 2>/dev/null || echo '<IP du VPS>')"
echo; echo "=========== GITHUB > Settings > Secrets and variables > Actions > onglet « Secrets » (PAS « Variables ») ==========="
echo "VPS_HOST        = $HOSTV"
echo "VPS_USER        = root"
echo; echo "VPS_KNOWN_HOSTS = (la ligne suivante)"; ssh-keyscan -t ed25519 localhost 2>/dev/null | sed "s/^localhost/$HOSTV/"
echo; echo "VPS_SSH_KEY     = (UNE seule ligne, copiez-la entièrement, sans espace ni retour à la ligne)"; base64 -w0 "$KEY"; echo
echo "============================================================================================================"
echo "⚠ Ne collez jamais cette clé dans un chat, un ticket ou une « Variable » GitHub : seulement dans un Secret."
