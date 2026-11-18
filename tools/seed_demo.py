#!/usr/bin/env python3
"""
Remplit Orgest avec des données de DÉMONSTRATION (boutique « demo », articles avec photos, ventes, échanges,
achats d'or, échéances, commandes atelier) en utilisant l'API réelle — donc ça teste aussi le backend.

Usage sur le VPS :
    sudo python3 tools/seed_demo.py https://orgest.elguennouni.site
    options : --admin-user X --admin-pass Y   (si le mot de passe admin a changé)
              --items 36 --seed 42
Le mot de passe du compte « demo » est (ré)généré et affiché à la fin.
"""
import argparse, http.cookiejar, json, mimetypes, os, random, subprocess, sys, urllib.error, urllib.request, uuid

ROOT = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(ROOT, 'demo-photos')
ENV_FILE = '/etc/orgest/orgest.env'


def read_env(key):
    try:
        for line in open(ENV_FILE):
            if line.startswith(key + '='):
                return line.strip().split('=', 1)[1]
    except OSError:
        pass
    return None


class Client:
    def __init__(self, base):
        self.base = base.rstrip('/')
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def _csrf(self):
        for c in self.jar:
            if c.name == 'XSRF-TOKEN':
                return c.value
        self.op.open(self.base + '/api/auth/csrf').read()
        return self._csrf()

    def call(self, method, path, body=None, files=None, ok_codes=()):
        headers = {'Accept': 'application/json'}
        data = None
        if method != 'GET':
            headers['X-XSRF-TOKEN'] = self._csrf()
        if files:
            boundary = uuid.uuid4().hex
            parts = []
            for name, (fname, content, ctype) in files.items():
                parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{fname}"\r\nContent-Type: {ctype}\r\n\r\n'.encode() + content + b'\r\n')
            data = b''.join(parts) + f'--{boundary}--\r\n'.encode()
            headers['Content-Type'] = f'multipart/form-data; boundary={boundary}'
        elif body is not None:
            data = json.dumps(body).encode()
            headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(self.base + '/api' + path, data=data, method=method, headers=headers)
        try:
            with self.op.open(req) as r:
                raw = r.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            raw = e.read().decode() or '{}'
            if e.code in ok_codes:
                return {'_status': e.code, **(json.loads(raw) if raw.startswith('{') else {})}
            sys.exit(f'✖ {method} {path} -> {e.code} {raw}')


NAMES = {
    'ring': ['Bague solitaire', 'Alliance', 'Bague fleur', 'Chevalière', 'Bague marquise', 'Bague tressée'],
    'bracelet': ['Bracelet rigide', 'Dbilej', 'Bracelet maille', 'Jonc ciselé', 'Bracelet perlé'],
    'necklace': ['Collier maille', 'Collier pendentif', 'Collier rivière', 'Collier ras de cou'],
    'earrings': ['Boucles pendantes', 'Boucles créoles', 'Puces', 'Boucles fantaisie'],
    'pendant': ['Pendentif Khamsa', 'Pendentif cœur', 'Pendentif solitaire', 'Pendentif lettre'],
    'chain': ['Chaîne forçat', 'Chaîne gourmette', 'Chaîne Singapour', 'Chaîne vénitienne'],
    'set': ['Parure mariée', 'Parure collier + boucles', 'Demi-parure'],
}
WEIGHT = {'ring': (2, 9), 'bracelet': (8, 35), 'necklace': (6, 30), 'earrings': (2, 8), 'pendant': (1.5, 6), 'chain': (5, 25), 'set': (20, 60)}
CUSTOMERS = ['Fatima Zahra', 'Khadija Bennani', 'Mohamed Alaoui', 'Amina El Idrissi', 'Youssef Berrada', 'Salma Tazi', 'Hassan Cherkaoui',
             'Naima Lahlou', 'Omar Fassi', 'Imane Benjelloun', 'Rachid Amrani', 'Soukaina Chraibi', 'Hamza Ouazzani', 'Zineb Sekkat']
ARTISANS = [('Haj Abdelkader', '0661000111'), ('Si Mustapha', '0662000222'), ('Maalem Driss', '0663000333')]


def phone(r):
    return '06' + ''.join(str(r.randint(0, 9)) for _ in range(8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('base')
    ap.add_argument('--admin-user', default=read_env('ORGEST_ADMIN_USERNAME') or 'admin')
    ap.add_argument('--admin-pass', default=read_env('ORGEST_ADMIN_PASSWORD'))
    ap.add_argument('--items', type=int, default=36)
    ap.add_argument('--seed', type=int, default=42)
    a = ap.parse_args()
    if not a.admin_pass:
        sys.exit('Mot de passe admin introuvable : utilisez --admin-pass')
    r = random.Random(a.seed)

    # ---- 1. Compte admin : créer / réinitialiser la boutique démo ----
    adm = Client(a.base)
    adm.call('POST', '/auth/login', {'username': a.admin_user, 'password': a.admin_pass})
    created = adm.call('POST', '/admin/shops', {
        'shopName': 'Bijouterie Démo Orgest', 'ownerName': 'Compte de démonstration', 'phone': '0600000000', 'city': 'Marrakech',
        'username': 'demo', 'password': None, 'months': 3, 'method': 'WAFACASH', 'amount': 0, 'reference': 'DEMO'}, ok_codes=(409,))
    if created.get('_status') == 409:
        shops = adm.call('GET', '/admin/shops')
        sid = next(s['id'] for s in shops if s['username'] == 'demo')
        adm.call('POST', f'/admin/shops/{sid}/renew', {'months': 3, 'method': 'CASH', 'amount': 0, 'reference': 'DEMO', 'note': 'demo'})
        created = adm.call('POST', f'/admin/shops/{sid}/reset-password')
    password = created['password']
    print('✔ compte demo prêt')

    # ---- 2. Connexion boutique ----
    c = Client(a.base)
    c.call('POST', '/auth/login', {'username': 'demo', 'password': password})
    prices = {18: (640 + r.randint(-15, 15), 0), 21: (747 + r.randint(-15, 15), 0), 24: (853 + r.randint(-15, 15), 0)}
    c.call('PUT', '/shop/prices', {'prices': [{'karat': k, 'sellPerGram': v[0], 'buyPerGram': round(v[0] * 0.875)} for k, v in prices.items()]})
    sell = {k: v[0] for k, v in prices.items()}
    buy = {k: round(v[0] * 0.875) for k, v in prices.items()}

    # ---- 3. Stock avec photos ----
    cats = list(NAMES)
    items = []
    for i in range(a.items):
        cat = cats[i % len(cats)]
        lo, hi = WEIGHT[cat]
        item = c.call('POST', '/shop/items', {
            'name': r.choice(NAMES[cat]), 'category': cat, 'karat': r.choice([18, 18, 18, 21, 24]),
            'weightG': round(r.uniform(lo, hi), 3), 'makingPerGram': r.choice([45, 55, 65, 75, 90]), 'note': None})
        path = os.path.join(PHOTOS, f'{cat}-{r.randint(1, 4)}.jpg')
        c.call('POST', f'/shop/items/{item["id"]}/photo', files={'file': ('photo.jpg', open(path, 'rb').read(), 'image/jpeg')})
        items.append(item)
    print(f'✔ {len(items)} articles avec photos')

    # ---- 4. Ventes / échanges / tempérament ----
    pool = items[:]
    r.shuffle(pool)
    n_sales = 0
    for i in range(14):
        k = r.randint(1, 2)
        if len(pool) < k + 8:  # garde du stock disponible
            break
        chosen = [pool.pop() for _ in range(k)]
        body = {
            'type': 'SALE', 'customerName': r.choice(CUSTOMERS), 'customerPhone': phone(r),
            'lines': [{'itemId': it['id'], 'pricePerGram': sell[it['karat']], 'makingPerGram': it['makingPerGram']} for it in chosen],
            'oldGold': None, 'paymentMode': 'CASH', 'downPayment': None, 'months': None}
        mode = i % 5
        if mode in (1, 3):  # échange
            kt = r.choice([18, 21])
            body['type'] = 'EXCHANGE'
            body['oldGold'] = {'karat': kt, 'grossWeightG': round(r.uniform(3, 12), 3), 'deductionPct': r.choice([0, 2, 3, 5]), 'pricePerGram': buy[kt], 'description': 'Ancienne bague / bracelet'}
        if mode in (2, 4):  # tempérament
            total = sum(float(it['weightG']) * (sell[it['karat']] + float(it['makingPerGram'])) for it in chosen)
            body['paymentMode'] = 'INSTALLMENT'
            body['months'] = r.choice([3, 6, 10])
            body['downPayment'] = round(total * r.choice([0.2, 0.3, 0.4]), 2)
        c.call('POST', '/shop/sales', body)
        n_sales += 1
    print(f'✔ {n_sales} ventes (comptant, échanges, tempérament)')

    # ---- 5. Achats d'or ----
    for _ in range(6):
        kt = r.choice([18, 18, 21])
        c.call('POST', '/shop/buybacks', {
            'customerName': r.choice(CUSTOMERS) if r.random() > .3 else None, 'customerPhone': phone(r) if r.random() > .5 else None,
            'customerCin': None, 'description': r.choice(['Bague cassée', 'Chaîne', 'Bracelet ancien', 'Boucles']),
            'karat': kt, 'grossWeightG': round(r.uniform(2, 25), 3), 'deductionPct': r.choice([0, 2, 3, 5]), 'pricePerGram': buy[kt]})
    print('✔ 6 achats d\'or')

    # ---- 6. Atelier ----
    wk = []
    for i in range(6):
        art = r.choice(ARTISANS)
        w = c.call('POST', '/shop/workshop', {
            'customerName': r.choice(CUSTOMERS), 'customerPhone': phone(r), 'description': r.choice(['Alliance sur mesure', 'Bracelet gravé', 'Collier prénom', 'Bague mariage']),
            'karat': 18, 'artisanName': art[0], 'artisanPhone': art[1], 'givenWeightG': round(r.uniform(5, 20), 3),
            'labourCost': r.choice([300, 450, 600]), 'depositAmount': r.choice([0, 500, 1000]), 'agreedPrice': r.choice([4500, 6200, 8000]),
            'dueDate': None, 'note': None})
        wk.append(w)
    for w in wk[:3]:
        c.call('POST', f'/shop/workshop/{w["id"]}/status', {'status': 'READY', 'receivedWeightG': round(float(w['givenWeightG']) - r.uniform(1.5, 3), 3)})
    c.call('POST', f'/shop/workshop/{wk[0]["id"]}/status', {'status': 'DELIVERED', 'receivedWeightG': None})
    print('✔ 6 commandes atelier')

    # ---- 7. Échéances : quelques-unes payées ----
    plans = c.call('GET', '/shop/installments')
    for p in plans[:2]:
        c.call('POST', f'/shop/installments/{p["installments"][0]["id"]}/pay')
    print(f'✔ {len(plans)} plans d\'échéances')

    # ---- 8. Étaler les dates sur 45 jours + créer des retards (SQL direct) ----
    sql = """
    UPDATE sale SET created_at = now() - (random() * interval '45 days') WHERE shop_id = (SELECT id FROM app_user WHERE username='demo');
    UPDATE buyback SET created_at = now() - (random() * interval '45 days') WHERE shop_id = (SELECT id FROM app_user WHERE username='demo');
    UPDATE item SET created_at = now() - (random() * interval '90 days') WHERE shop_id = (SELECT id FROM app_user WHERE username='demo');
    UPDATE installment SET due_date = current_date - 12 WHERE id IN (SELECT id FROM installment WHERE paid = false AND shop_id = (SELECT id FROM app_user WHERE username='demo') ORDER BY id LIMIT 2);
    """
    try:
        subprocess.run(['runuser', '-u', 'postgres', '--', 'psql', '-d', 'orgest', '-v', 'ON_ERROR_STOP=1', '-q', '-c', sql], check=True)
        print('✔ dates étalées sur 45 jours + 2 échéances en retard')
    except Exception as e:  # base externe / pas root
        print('⚠ étalement des dates ignoré :', e)

    print('\n══════════ Compte de démonstration ══════════')
    print(f'  URL         : {a.base}/login')
    print('  utilisateur : demo')
    print(f'  mot de passe: {password}')


if __name__ == '__main__':
    main()
