<p align="center"><img src="frontend/public/logo-full.png" alt="Orgest" width="360"></p>

# Orgest — Système de Gestion des Commerçants d'Or

SaaS web (arabe RTL + français) pour les bijouteries marocaines : stock avec photos carrées, vente, **échange**,
**achat d'or ancien**, **commandes chez le fabricant**, **vente à tempérament (تقسيط)**, reçus imprimables (A5 / ticket 80 mm),
export Excel, et un **panneau administrateur** pour gérer les abonnements (1 / 3 / 6 / 12 mois ; paiement hors plateforme :
Wafacash, virement bancaire, Cash Plus).

| Couche | Technologie |
|---|---|
| Backend | Spring Boot 4.1 (Java 21), Spring Security, JPA/Hibernate, Flyway |
| Base de données | PostgreSQL |
| API | REST JSON (`/api/**`) |
| Frontend | React 19 + Vite, i18n AR/FR, responsive (PC + navigateur mobile) |
| Déploiement | Ubuntu + aaPanel (Nginx), service systemd, `deploy.sh` |

## Déploiement (VPS Ubuntu + aaPanel)

1. Dans aaPanel : **Website → Add site** pour votre domaine (site statique), puis **SSL → Let's Encrypt** (+ *Force HTTPS*).
2. Sur le VPS :
   ```bash
   git clone https://github.com/elguennouni-dev/Orgest.git && cd Orgest
   sudo ./deploy.sh app.votre-domaine.ma --whatsapp 212612345678
   ```
3. Le script affiche **une seule fois** l'identifiant et le mot de passe de l'administrateur. Connectez-vous sur
   `https://app.votre-domaine.ma/login` puis changez le mot de passe (*Mon compte*).
4. **Mises à jour** : `git pull && sudo ./deploy.sh app.votre-domaine.ma` (les secrets et la base sont conservés).

Ce que fait `deploy.sh` : installe Java 21 / Maven / Node 22 / PostgreSQL si absents, crée la base et un utilisateur
dédié (mot de passe aléatoire), compile backend + frontend, installe le service `orgest` (utilisateur non-root, durci),
écrit la config Nginx dans le « rewrite » du site aaPanel (proxy `/api`, SPA, en-têtes de sécurité) et planifie une
sauvegarde quotidienne (`/var/backups/orgest`, 14 jours).

Base PostgreSQL créée par aaPanel ? `DB_MODE=external DB_URL=jdbc:postgresql://127.0.0.1:5432/ma_base DB_USER=… DB_PASSWORD=… sudo -E ./deploy.sh domaine`.

Commandes utiles : `journalctl -u orgest -f` · `systemctl restart orgest` · `/usr/local/sbin/orgest-backup`.

## Développement local

```bash
# backend (PostgreSQL local requis)
cd backend && export $(grep -v '^#' ../.env.example | xargs) && mvn spring-boot:run
# frontend (proxy /api → :8080)
cd frontend && npm install && npm run dev
```

## Parcours fonctionnel

* **Données de démo** : `sudo python3 tools/seed_demo.py https://votre-domaine` crée le compte `demo` avec articles + photos, ventes, échanges, achats, échéances et commandes atelier.
* **Admin** : crée le compte d'un commerçant (identifiant + mot de passe généré, à envoyer par WhatsApp), enregistre le paiement
  (Wafacash / virement / Cash Plus), **renouvelle** (+1/3/6/12 mois), **suspend / réactive**, réinitialise le mot de passe,
  suit l'historique des paiements. Un abonnement expiré ou suspendu bloque l'accès aux données (le client voit une page d'expiration).
* **Commerçant** (un seul utilisateur par boutique) : prix de l'or du jour → stock (photo carrée) → vente / échange / achat d'or →
  reçu imprimable → échéances → atelier → rapports et exports Excel.
* **Échange** : modélisé comme deux opérations liées sur un reçu (reprise de l'ancien au prix d'achat avec déduction éventuelle,
  puis vente du nouveau) ; la différence à payer — ou à rendre — est calculée.
* **Tempérament** : le prix est figé en dirhams ; avance + mensualités ; suivi des retards et rappel WhatsApp.

## Sécurité — OWASP Top 10 (2021)

| # | Risque | Mesures dans Orgest |
|---|---|---|
| A01 | Broken Access Control | Rôles `ADMIN`/`SHOP` par URL (`/api/admin/**`, `/api/shop/**`), **isolation par commerçant** : chaque requête SQL filtre sur l'identifiant du commerçant authentifié (jamais fourni par le client), `denyAll` par défaut, photos servies uniquement via endpoint authentifié, verrou pessimiste anti double-vente |
| A02 | Cryptographic Failures | BCrypt (coût 12), JWT HS256 avec secret ≥ 32 car. fourni par l'environnement, cookie `HttpOnly; Secure; SameSite=Strict`, HSTS, secrets hors du code (`/etc/orgest/orgest.env`, chmod 640) |
| A03 | Injection | Requêtes JPA/JPQL paramétrées uniquement, validation Bean Validation sur tous les DTO, aucune concaténation SQL, **protection contre l'injection de formules** dans les exports Excel, React échappe le HTML (aucun `dangerouslySetInnerHTML`) |
| A04 | Insecure Design | DTO dédiés (pas de mass assignment), montants recalculés **côté serveur**, numérotation atomique, upload d'images validé (signature, taille, pixels) et **ré-encodé** en JPEG, limites de pagination et de période |
| A05 | Security Misconfiguration | En-têtes CSP / X-Content-Type-Options / X-Frame-Options / Referrer-Policy / Permissions-Policy (Nginx + Spring), pas de stack-trace ni de message d'erreur détaillé, actuator désactivé, backend lié à `127.0.0.1`, service systemd durci, `server_tokens off` |
| A06 | Vulnerable Components | Dépendances gérées par le BOM Spring Boot ; `mvn -Psecurity verify` (OWASP dependency-check) et `npm audit` ; versions à jour |
| A07 | Identification & Auth Failures | Verrouillage après 5 échecs (15 min), limiteur par IP, comparaison à temps constant (hash factice), messages génériques, politique de mot de passe, **invalidation des sessions** (`tokenVersion`) lors du changement/réinitialisation du mot de passe ou de la suspension, expiration JWT 12 h |
| A08 | Software & Data Integrity | JWT signé et vérifié, pas de désérialisation non fiable, build reproductible (`npm ci`, Maven), migrations Flyway versionnées |
| A09 | Logging & Monitoring | Journal d'audit en base (connexions réussies/échouées, verrouillages, actions admin, changements de mot de passe) avec nettoyage anti log-injection ; logs systemd |
| A10 | SSRF | Aucun appel sortant déclenché par une entrée utilisateur (les liens WhatsApp sont construits côté navigateur) |

CSRF : cookie `XSRF-TOKEN` (double-submit) + en-tête `X-XSRF-TOKEN` obligatoire sur toute requête non-GET, en plus de `SameSite=Strict`.

## Configuration

| Variable | Rôle |
|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Connexion PostgreSQL |
| `JWT_SECRET` | Clé de signature (≥ 32 caractères) |
| `COOKIE_SECURE` | `true` en HTTPS (défaut) |
| `UPLOAD_DIR` | Dossier des photos (hors racine web) |
| `ORGEST_ADMIN_USERNAME` / `ORGEST_ADMIN_PASSWORD` | Création du premier admin si aucun n'existe (≥ 12 car.) |
| `VITE_WHATSAPP` | Numéro WhatsApp de la page d'accueil (build du frontend) |

## Structure

```
backend/    Spring Boot (api, sécurité, JPA, migrations Flyway)
frontend/   React + Vite (landing, login, app commerçant, admin)
deploy.sh   Déploiement Ubuntu + aaPanel
```

## Domaine, déploiement automatique et Docker

**Nouveau domaine (ex. `orgest.tech`)** : DNS → enregistrement A vers l'IP du VPS · aaPanel > Website > Add site (statique) > SSL Let's Encrypt + Force HTTPS · puis
`cd /opt/orgest-src && git pull && sudo ./deploy.sh orgest.tech --whatsapp 212680376294`.

**Déploiement automatique (GitHub Actions)** : sur le VPS `sudo ./tools/setup-ci-deploy.sh orgest.tech 212680376294`, puis copier les 4 valeurs affichées dans GitHub > Settings > Secrets and variables > Actions (`VPS_HOST`, `VPS_USER`, `VPS_KNOWN_HOSTS`, `VPS_SSH_KEY`). Chaque push sur `main` compile/teste puis déploie. La clé SSH ne peut exécuter que `orgest-deploy`.

**Docker (alternative)** : `cp .env.docker.example .env && nano .env && docker compose up -d --build` ; le site écoute sur `127.0.0.1:8088` (à mettre derrière le proxy HTTPS d'aaPanel). Ne pas lancer en même temps que le déploiement systemd sur le même domaine.
