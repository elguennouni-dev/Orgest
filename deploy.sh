#!/usr/bin/env bash
# =============================================================================
#  Orgest — déploiement sur VPS Ubuntu avec aaPanel
#
#  Usage (en root, depuis la racine du dépôt cloné) :
#      sudo ./deploy.sh <domaine> [--whatsapp 2126XXXXXXXX]
#  Exemple :
#      sudo ./deploy.sh app.orgest.ma --whatsapp 212612345678
#
#  Avant la première exécution :
#    1. aaPanel > Website > Add site > <domaine>  (PHP: statique / Pure static)
#    2. (recommandé) aaPanel > site > SSL > Let's Encrypt  (puis « Force HTTPS »)
#
#  Le script est idempotent : relancez-le après chaque `git pull` pour mettre à jour.
#  Ce qu'il fait :
#    - installe Java 21, Maven, Node 22, PostgreSQL (si absents)
#    - crée la base PostgreSQL + un utilisateur dédié (mot de passe aléatoire)
#    - compile le backend (Spring Boot) et le frontend (React/Vite)
#    - installe le service systemd « orgest » (utilisateur non-root, durci)
#    - configure Nginx (proxy /api + SPA + en-têtes de sécurité) via aaPanel
#    - installe une sauvegarde quotidienne (base + photos)
#
#  Variables optionnelles : DB_MODE=external DB_URL DB_USER DB_PASSWORD (base fournie par aaPanel),
#                           SKIP_TESTS=1, WHATSAPP_NUMBER, ADMIN_USERNAME
# =============================================================================
set -Eeuo pipefail

# ---------- Affichage ----------
c_ok=$'\e[32m'; c_warn=$'\e[33m'; c_err=$'\e[31m'; c_dim=$'\e[2m'; c_off=$'\e[0m'
log()  { echo "${c_ok}▶${c_off} $*"; }
warn() { echo "${c_warn}⚠${c_off} $*" >&2; }
die()  { echo "${c_err}✖ $*${c_off}" >&2; exit 1; }
trap 'die "Échec à la ligne $LINENO (commande : $BASH_COMMAND)"' ERR

# ---------- Arguments ----------
DOMAIN=""; WHATSAPP_NUMBER="${WHATSAPP_NUMBER:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --whatsapp) WHATSAPP_NUMBER="${2:-}"; shift 2 ;;
    -h|--help)  sed -n '2,28p' "$0"; exit 0 ;;
    *)          if [[ -z "$DOMAIN" ]]; then DOMAIN="$1"; shift; else die "Argument inconnu : $1"; fi ;;
  esac
done
[[ -n "$DOMAIN" ]] || die "Usage : sudo ./deploy.sh <domaine> [--whatsapp 2126XXXXXXXX]"
[[ "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] || die "Domaine invalide : $DOMAIN"
[[ $EUID -eq 0 ]] || die "Exécutez ce script en root (sudo)."
command -v apt-get >/dev/null || die "Ubuntu/Debian requis."

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$SRC_DIR/backend/pom.xml" && -f "$SRC_DIR/frontend/package.json" ]] || die "Lancez le script depuis la racine du dépôt Orgest."

APP_USER="orgest"
APP_HOME="/opt/orgest"
DATA_DIR="/var/lib/orgest"
UPLOAD_DIR="$DATA_DIR/uploads"
ENV_DIR="/etc/orgest"
ENV_FILE="$ENV_DIR/orgest.env"
BACKUP_DIR="/var/backups/orgest"
WEB_ROOT="/var/www/orgest/$DOMAIN"   # hors du dossier du site aaPanel (jamais de rsync --delete sur le dépôt)
VHOST_DIR="/www/server/panel/vhost/nginx"
REWRITE_DIR="/www/server/panel/vhost/rewrite"
NGINX_BIN="/www/server/nginx/sbin/nginx"
DB_NAME="orgest"; DB_USER_DEFAULT="orgest"
export DEBIAN_FRONTEND=noninteractive

rand() { openssl rand -base64 "$1" | tr -dc 'A-Za-z0-9' | head -c "$2"; }
get_env() { [[ -f "$ENV_FILE" ]] && grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- || true; }

# ---------- 1. Paquets ----------
log "Installation des dépendances système…"
apt-get update -y -qq
apt-get install -y -qq curl ca-certificates openssl git rsync unzip cron >/dev/null

JAVA_HOME_21="$(ls -d /usr/lib/jvm/java-21-openjdk-* 2>/dev/null | head -1 || true)"
if [[ -z "$JAVA_HOME_21" || ! -x "$JAVA_HOME_21/bin/javac" ]]; then
  apt-get install -y -qq openjdk-21-jdk-headless >/dev/null || die "Impossible d'installer OpenJDK 21."
  JAVA_HOME_21="$(ls -d /usr/lib/jvm/java-21-openjdk-* | head -1)"
fi
# Java 21 explicite (la machine peut avoir Java 17 par défaut) : utilisé pour Maven ET pour le service.
export JAVA_HOME="$JAVA_HOME_21"; export PATH="$JAVA_HOME/bin:$PATH"
command -v mvn >/dev/null || apt-get install -y -qq maven >/dev/null
if ! command -v node >/dev/null || [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 20 ]]; then
  log "Installation de Node.js 22…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
log "Java : $(java -version 2>&1 | head -1) · Node : $(node -v) · Maven : $(mvn -v | head -1)"

# ---------- 2. Utilisateur système + dossiers ----------
id "$APP_USER" &>/dev/null || useradd --system --home "$APP_HOME" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_HOME" "$UPLOAD_DIR" "$ENV_DIR" "$BACKUP_DIR"
chown -R "$APP_USER":"$APP_USER" "$DATA_DIR" "$APP_HOME"
chmod 750 "$DATA_DIR" "$UPLOAD_DIR"; chmod 700 "$BACKUP_DIR" "$ENV_DIR"

# ---------- 3. PostgreSQL ----------
DB_MODE="${DB_MODE:-local}"
if [[ "$DB_MODE" == "external" ]]; then
  [[ -n "${DB_URL:-}" && -n "${DB_USER:-}" && -n "${DB_PASSWORD:-}" ]] || die "DB_MODE=external requiert DB_URL, DB_USER et DB_PASSWORD."
  log "Base de données externe (aaPanel) : $DB_URL"
else
  if ! command -v psql >/dev/null || ! systemctl list-unit-files | grep -q '^postgresql'; then
    log "Installation de PostgreSQL…"
    apt-get install -y -qq postgresql postgresql-contrib >/dev/null
  fi
  systemctl enable --now postgresql >/dev/null 2>&1 || true
  DB_USER="${DB_USER:-$(get_env DB_USER)}"; DB_USER="${DB_USER:-$DB_USER_DEFAULT}"
  DB_PASSWORD="${DB_PASSWORD:-$(get_env DB_PASSWORD)}"; DB_PASSWORD="${DB_PASSWORD:-$(rand 48 32)}"
  DB_URL="jdbc:postgresql://127.0.0.1:5432/$DB_NAME"
  psql_admin() { runuser -u postgres -- psql -v ON_ERROR_STOP=1 -qAt "$@"; }
  if [[ "$(psql_admin -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")" != "1" ]]; then
    psql_admin -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD'"
  else
    psql_admin -c "ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD'"
  fi
  if [[ "$(psql_admin -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")" != "1" ]]; then
    psql_admin -c "CREATE DATABASE $DB_NAME OWNER $DB_USER ENCODING 'UTF8'"
  fi
  psql_admin -c "REVOKE ALL ON DATABASE $DB_NAME FROM PUBLIC"
  log "PostgreSQL prêt (base « $DB_NAME », utilisateur « $DB_USER », écoute locale uniquement)."
fi

# ---------- 4. Fichier d'environnement (secrets) ----------
# Port local du backend : le 8080 est souvent déjà pris (autre service du VPS) -> on choisit un port libre.
systemctl stop orgest 2>/dev/null || true
port_free() { ! ss -ltn "sport = :$1" 2>/dev/null | grep -q LISTEN; }
APP_PORT="$(get_env SERVER_PORT)"
if [[ -z "$APP_PORT" ]] || ! port_free "$APP_PORT"; then
  APP_PORT=""
  for p in $(seq 18080 18199); do port_free "$p" && { APP_PORT="$p"; break; }; done
  [[ -n "$APP_PORT" ]] || die "Aucun port libre entre 18080 et 18199."
fi
log "Port local du backend : $APP_PORT"
JWT_SECRET="$(get_env JWT_SECRET)"; JWT_SECRET="${JWT_SECRET:-$(rand 96 64)}"
ADMIN_USERNAME="${ADMIN_USERNAME:-$(get_env ORGEST_ADMIN_USERNAME)}"; ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="$(get_env ORGEST_ADMIN_PASSWORD)"
FIRST_RUN_ADMIN_PASSWORD=""
if [[ ! -f "$ENV_FILE" || -z "$ADMIN_PASSWORD" ]]; then
  # Mot de passe admin initial : utilisé uniquement si AUCUN admin n'existe encore en base.
  ADMIN_PASSWORD="$(rand 48 18)Aa1"
  FIRST_RUN_ADMIN_PASSWORD="$ADMIN_PASSWORD"
fi
HTTPS=false
[[ -f "$VHOST_DIR/$DOMAIN.conf" ]] && grep -qE 'listen[[:space:]]+443' "$VHOST_DIR/$DOMAIN.conf" && HTTPS=true
[[ "$HTTPS" == true ]] || warn "SSL non détecté pour $DOMAIN : activez Let's Encrypt dans aaPanel puis relancez ce script (cookies « Secure » requis en production)."

SCHEME_FOR_ENV=http; [[ "$HTTPS" == true ]] && SCHEME_FOR_ENV=https
umask 077
cat > "$ENV_FILE" <<EOF
# Généré par deploy.sh — contient des secrets (chmod 600)
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=$APP_PORT
DB_URL=$DB_URL
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
JWT_TTL_HOURS=12
COOKIE_SECURE=$HTTPS
UPLOAD_DIR=$UPLOAD_DIR
ORGEST_ADMIN_USERNAME=$ADMIN_USERNAME
ORGEST_ADMIN_PASSWORD=$ADMIN_PASSWORD
SITE_URL=$SCHEME_FOR_ENV://$DOMAIN
INDEX_FILE=$WEB_ROOT/index.html
ORGEST_WHATSAPP=${WHATSAPP_NUMBER:-212680376294}
EOF
chown root:"$APP_USER" "$ENV_FILE"; chmod 640 "$ENV_FILE"
umask 022

# ---------- 5. Backend ----------
log "Compilation du backend (Maven)…"
MVN_ARGS=(-B -q -f "$SRC_DIR/backend/pom.xml" clean package)
[[ "${SKIP_TESTS:-0}" == "1" ]] && MVN_ARGS+=(-DskipTests)
mvn "${MVN_ARGS[@]}"
JAR="$SRC_DIR/backend/target/orgest.jar"
[[ -f "$JAR" ]] || die "JAR introuvable : $JAR"
install -o "$APP_USER" -g "$APP_USER" -m 640 "$JAR" "$APP_HOME/orgest.jar.new"
mv -f "$APP_HOME/orgest.jar.new" "$APP_HOME/orgest.jar"

cat > /etc/systemd/system/orgest.service <<EOF
[Unit]
Description=Orgest backend (Spring Boot)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_HOME
EnvironmentFile=$ENV_FILE
ExecStart=$JAVA_HOME/bin/java -Xms256m -Xmx512m -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/urandom -jar $APP_HOME/orgest.jar
Restart=on-failure
RestartSec=5
SuccessExitStatus=143
# Durcissement
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA_DIR
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
CapabilityBoundingSet=
LockPersonality=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable orgest >/dev/null 2>&1
systemctl restart orgest

# ---------- 6. Frontend ----------
log "Compilation du frontend (React/Vite)…"
pushd "$SRC_DIR/frontend" >/dev/null
npm ci --no-audit --no-fund --loglevel=error
VITE_WHATSAPP="$WHATSAPP_NUMBER" npm run build >/dev/null
popd >/dev/null
mkdir -p "$WEB_ROOT"
rsync -a --delete "$SRC_DIR/frontend/dist/" "$WEB_ROOT/"
chown -R root:root "$WEB_ROOT"; chmod 755 /var/www /var/www/orgest
# robots.txt, llms.txt, sitemap.xml et feed.xml sont générés dynamiquement par le backend (rien à écrire ici)
rm -f "$WEB_ROOT/robots.txt"
find "$WEB_ROOT" -type d -exec chmod 755 {} \; ; find "$WEB_ROOT" -type f -exec chmod 644 {} \;

# ---------- 7. Nginx (aaPanel) ----------
HSTS=""; [[ "$HTTPS" == true ]] && HSTS='add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;'
SEC_HEADERS="add_header Content-Security-Policy \"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'\" always;
        add_header X-Content-Type-Options \"nosniff\" always;
        add_header X-Frame-Options \"DENY\" always;
        add_header Referrer-Policy \"no-referrer\" always;
        add_header Permissions-Policy \"camera=(self), microphone=(), geolocation=(), payment=()\" always;
        add_header Cross-Origin-Opener-Policy \"same-origin\" always;
        $HSTS"

NGINX_BODY="# --- Orgest (généré par deploy.sh, ne pas modifier à la main) ---
client_max_body_size 8m;
server_tokens off;

location ^~ /api/ {
    proxy_pass http://127.0.0.1:$APP_PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 60s;
    proxy_hide_header X-Powered-By;
}
location = /robots.txt     { proxy_pass http://127.0.0.1:$APP_PORT/api/public/robots.txt;    proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; }
location = /llms.txt       { proxy_pass http://127.0.0.1:$APP_PORT/api/public/llms.txt;      proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; }
location = /llms-full.txt  { proxy_pass http://127.0.0.1:$APP_PORT/api/public/llms-full.txt; proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; }
location = /sitemap.xml    { proxy_pass http://127.0.0.1:$APP_PORT/api/public/sitemap.xml;   proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; }
location = /feed.xml       { proxy_pass http://127.0.0.1:$APP_PORT/api/public/feed.xml;      proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; }
# Pages publiques rendues par le backend (meta, JSON-LD, contenu) ; repli sur le HTML statique si le backend est indisponible
location = / {
    proxy_pass http://127.0.0.1:$APP_PORT/api/public/seo/home;
    proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme;
    error_page 500 502 503 504 = @spa;
    $SEC_HEADERS
}
location = /blog {
    proxy_pass http://127.0.0.1:$APP_PORT/api/public/seo/blog;
    proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme;
    error_page 500 502 503 504 = @spa;
    $SEC_HEADERS
}
location ~ ^/blog/([a-z0-9-]+)/?\$ {
    rewrite ^/blog/([a-z0-9-]+)/?\$ /api/public/seo/blog/\$1 break;
    proxy_pass http://127.0.0.1:$APP_PORT;
    proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme;
    error_page 500 502 503 504 = @spa;
    $SEC_HEADERS
}
location = /outils {
    proxy_pass http://127.0.0.1:$APP_PORT/api/public/seo/tools;
    proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme;
    error_page 500 502 503 504 = @spa;
    $SEC_HEADERS
}
location ~ ^/outils/([a-z0-9-]+)/?\$ {
    rewrite ^/outils/([a-z0-9-]+)/?\$ /api/public/seo/tools/\$1 break;
    proxy_pass http://127.0.0.1:$APP_PORT;
    proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme;
    error_page 500 502 503 504 = @spa;
    $SEC_HEADERS
}
location @spa {
    root $WEB_ROOT;
    rewrite ^ /index.html break;
    $SEC_HEADERS
}
# Espaces privés : jamais indexés
location ~ ^/(app|admin|login)(/|\$) {
    root $WEB_ROOT;
    try_files /index.html =404;
    add_header X-Robots-Tag \"noindex, nofollow\" always;
    add_header Cache-Control \"no-cache\" always;
    $SEC_HEADERS
}
location ~ /\\.(?!well-known) { deny all; }
location ^~ /assets/ {
    root $WEB_ROOT;
    try_files \$uri =404;
    expires 30d;
    add_header Cache-Control \"public, immutable\" always;
    $SEC_HEADERS
}
location / {
    root $WEB_ROOT;
    try_files \$uri \$uri/ /index.html;
    add_header Cache-Control \"no-cache\" always;
    $SEC_HEADERS
}
# --- fin Orgest ---"

if [[ -f "$VHOST_DIR/$DOMAIN.conf" ]]; then
  mkdir -p "$REWRITE_DIR"
  [[ -f "$REWRITE_DIR/$DOMAIN.conf" && ! -f "$REWRITE_DIR/$DOMAIN.conf.pre-orgest" ]] && cp "$REWRITE_DIR/$DOMAIN.conf" "$REWRITE_DIR/$DOMAIN.conf.pre-orgest"
  printf '%s\n' "$NGINX_BODY" > "$REWRITE_DIR/$DOMAIN.conf"
  log "Configuration Nginx écrite dans le « rewrite » du site aaPanel ($REWRITE_DIR/$DOMAIN.conf)."
else
  warn "Site $DOMAIN introuvable dans aaPanel : création d'un vhost HTTP minimal. Créez le site dans aaPanel pour activer SSL."
  cat > "$VHOST_DIR/$DOMAIN.conf" <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    root $WEB_ROOT;
    index index.html;
    $NGINX_BODY
}
EOF
fi
if [[ -x "$NGINX_BIN" ]]; then
  "$NGINX_BIN" -t 2>&1 | sed "s/^/  nginx: /"
  "$NGINX_BIN" -s reload
else
  nginx -t && systemctl reload nginx
fi

# ---------- 8. Sauvegardes ----------
cat > /usr/local/sbin/orgest-backup <<EOF
#!/usr/bin/env bash
set -euo pipefail
set -a; . $ENV_FILE; set +a
STAMP=\$(date +%F_%H%M)
DB_NAME_FROM_URL=\${DB_URL##*/}
PGPASSWORD="\$DB_PASSWORD" pg_dump -h 127.0.0.1 -U "\$DB_USER" "\$DB_NAME_FROM_URL" | gzip > $BACKUP_DIR/db_\$STAMP.sql.gz
tar -czf $BACKUP_DIR/uploads_\$STAMP.tar.gz -C $DATA_DIR uploads
find $BACKUP_DIR -type f -mtime +14 -delete
chmod 600 $BACKUP_DIR/*
EOF
chmod 700 /usr/local/sbin/orgest-backup
echo "17 3 * * * root /usr/local/sbin/orgest-backup >/var/log/orgest-backup.log 2>&1" > /etc/cron.d/orgest-backup
chmod 644 /etc/cron.d/orgest-backup

# ---------- 9. Vérification ----------
log "Attente du démarrage du backend…"
ok=0
for _ in $(seq 1 60); do
  if [[ "$(curl -s -H 'X-Orgest-Client: web' -o /dev/null -w '%{http_code}' http://127.0.0.1:$APP_PORT/api/auth/csrf)" == "204" ]]; then ok=1; break; fi
  sleep 2
done
if [[ $ok -ne 1 ]]; then
  journalctl -u orgest -n 60 --no-pager || true
  die "Le backend ne répond pas. Consultez : journalctl -u orgest -n 200"
fi

SCHEME=http; [[ "$HTTPS" == true ]] && SCHEME=https
echo
echo "${c_ok}══════════════════════════════════════════════════════════${c_off}"
echo "${c_ok} Orgest est en ligne : $SCHEME://$DOMAIN${c_off}"
echo "${c_ok}══════════════════════════════════════════════════════════${c_off}"
if [[ -n "$FIRST_RUN_ADMIN_PASSWORD" ]]; then
  echo " Compte administrateur (affiché UNE SEULE FOIS — notez-le puis changez le mot de passe) :"
  echo "   utilisateur : $ADMIN_USERNAME"
  echo "   mot de passe : $FIRST_RUN_ADMIN_PASSWORD"
  echo "   (valable uniquement si aucun admin n'existait encore ; stocké dans $ENV_FILE)"
else
  echo " Mise à jour terminée (identifiants existants conservés dans $ENV_FILE)."
fi
echo " Logs      : journalctl -u orgest -f"
echo " Sauvegarde: /usr/local/sbin/orgest-backup  (quotidienne 03:17 → $BACKUP_DIR)"
[[ "$HTTPS" == true ]] || echo "${c_warn} N'oubliez pas d'activer SSL dans aaPanel puis de relancer ./deploy.sh $DOMAIN${c_off}"
