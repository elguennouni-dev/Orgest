#!/usr/bin/env bash
# À lancer UNE fois sur le VPS (root), depuis /opt/orgest-src :
#   sudo ./tools/setup-ci-deploy.sh orgest.tech 212680376294
# Crée la commande « orgest-deploy » et une clé SSH qui ne peut faire QUE cela (GitHub Actions).
set -Eeuo pipefail
DOMAIN="${1:?Usage: $0 <domaine> [numero_whatsapp]}"; WA="${2:-212680376294}"
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
[[ -f "$KEY" ]] || ssh-keygen -t ed25519 -N '' -C "github-actions-orgest" -f "$KEY" >/dev/null
PUB="$(cat "$KEY.pub")"
AK=/root/.ssh/authorized_keys; touch "$AK"; chmod 600 "$AK"
# commande forcée : « deploy » -> orgest-deploy ; tout le reste est refusé
LINE="command=\"[ \\\"\$SSH_ORIGINAL_COMMAND\\\" = deploy ] && exec /usr/local/sbin/orgest-deploy || { echo refused >&2; exit 1; }\",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty $PUB"
grep -qF "$PUB" "$AK" || echo "$LINE" >> "$AK"

echo; echo "=================== À METTRE DANS GITHUB (Settings > Secrets and variables > Actions) ==================="
echo "VPS_HOST        = $(curl -fsS4 https://ifconfig.me 2>/dev/null || echo '<IP du VPS>')"
echo "VPS_USER        = root"
echo; echo "VPS_KNOWN_HOSTS = (la ligne suivante)"; ssh-keyscan -t ed25519 localhost 2>/dev/null | sed 's/^localhost/<IP-ou-domaine-du-VPS>/' 
echo "   ↑ remplacez <IP-ou-domaine-du-VPS> par la même valeur que VPS_HOST"
echo; echo "VPS_SSH_KEY     = (clé privée, tout le bloc ci-dessous, y compris BEGIN/END)"; cat "$KEY"
echo "========================================================================================================="
