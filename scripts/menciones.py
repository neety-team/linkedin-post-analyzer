# -*- coding: utf-8 -*-
"""Para cada company id: ficha de empresa + mejores personas.
DOS REGLAS NUEVAS (Iker, 2026-08-26):
 1. La mencion tiene que tener PODER DE DECISION y, a poder ser, ser de VENTAS.
    Un becario, un tecnico o un responsable de sistemas no compra nada: no se menciona.
 2. La actividad es CUALQUIER actividad en LinkedIn (publicar, comentar o compartir),
    no solo comentar a otros. Ventana: 30 dias ideal, 90 aceptable, 180 como techo.
"""
import sys, io, json, os, re, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import unipile_client as uni

HOY = datetime.date.today()

# --- Poder de decision. Score 0 = NO SE MENCIONA. ---
RANK = [
 (10, r'\b(ceo|director general|directora general|dtor\.? general|managing director|general manager|'
      r'gerente|consejer[oa] delegad|director ejecutivo|presidente|president\b|'
      r'fundador|founder|co-?founder|propietari|owner|socio director|socia directora|dueñ)'),
 (9,  r'\b(director comercial|directora comercial|sales director|director de ventas|head of sales|'
      r'sales manager|chief commercial|cco\b|director de exportaci|export manager|export director|'
      r'export area manager|director internacional|international.{0,12}director|'
      r'business development|desarrollo de negocio|kam\b|key account)'),
 (8,  r'\b(director de marketing|directora de marketing|marketing director|marketing manager|cmo\b|'
      r'brand manager|director de comunicaci)'),
 (6,  r'\b(director industrial|director de operaciones|director de planta|plant manager|'
      r'director de f[aá]brica|operations director|coo\b|director t[eé]cnico comercial)'),
 (7,  r'\b(director|directora)\b'),
]
# Cargos que NO se mencionan aunque esten activos.
VETO = re.compile(r'\b(becari|intern\b|student|estudiante|t[eé]cnico|operari|administrativ|auxiliar|'
                  r'mantenimiento|sistemas|inform[aá]tic|\bit\b|rrhh|rr\.? ?hh\b|recursos humanos|human resources|'
                  r'calidad|quality|prevenci|riesgos laborales|almac[eé]n|log[ií]stic|compras|'
                  r'purchasing|procurement|contab|fiscal|nóminas|analista|analyst|becaria|'
                  r'soporte|support|profesor|docente|consultor de|community manager)'
                  r'|(?<![a-z])qa\b', re.I)

def score(h):
    h = (h or '').lower()
    if VETO.search(h):
        # Solo se salva si ademas es CEO/DG/fundador (p.ej. "CEO y director de calidad")
        # "Deputy General Manager_QA" (grado corporativo, UNO Minda, 16/09) no es
        # un director general: con deputy/assistant/adjunto delante no se salva.
        if not re.search(r'(?<!deputy )(?<!assistant )(?<!adjunto )(?<!adjunta )' + RANK[0][1], h):
            return 0
    for s, pat in RANK:
        if re.search(pat, h):
            return s
    return 0

_REL = re.compile(r'^(\d+)\s*(m|h|d|w|mo|yr|s|min)$', re.I)
def dias_rel(s):
    """'3d' -> 3 · '2w' -> 14 · '1mo' -> 30 · '1yr' -> 365 · '5h' -> 0"""
    if not s: return None
    s = str(s).strip().lower()
    if s in ('now', 'ahora'): return 0
    m = _REL.match(s)
    if not m: return None
    n, u = int(m.group(1)), m.group(2)
    return {'s':0,'min':0,'m':0,'h':0,'d':n,'w':n*7,'mo':n*30,'yr':n*365}.get(u)

def dias_iso(iso):
    try:
        d = datetime.date(int(iso[0:4]), int(iso[5:7]), int(iso[8:10]))
        return (HOY - d).days
    except Exception:
        return None

def actividad(pid):
    """Ultima actividad de CUALQUIER tipo: publicar, compartir o comentar."""
    best, tipo = None, None
    p = uni._req('GET', '/api/v1/users/%s/posts?account_id=%s&limit=3' % (pid, uni.A))
    for it in (p.get('items') or [])[:3] if isinstance(p, dict) else []:
        d = dias_rel(it.get('date'))
        if d is not None and (best is None or d < best):
            best, tipo = d, 'post'
    c = uni.comments(pid, limit=3)
    for it in (c.get('items') or [])[:3] if isinstance(c, dict) else []:
        d = dias_iso(it.get('date'))
        if d is not None and (best is None or d < best):
            best, tipo = d, 'comentario'
    return best, tipo

def procesa(cid, max_personas=10):
    emp = uni.company(cid)
    if '_error' in emp:
        return {'id': cid, 'error': emp}
    loc = (emp.get('locations') or [{}])[0]
    ficha = {'id': cid, 'name': emp.get('name'), 'pid': emp.get('public_identifier'),
             'logo': emp.get('logo_large'), 'city': loc.get('city'), 'area': loc.get('area'),
             'street': (loc.get('street') or [''])[0], 'cp': loc.get('postalCode'),
             'desc': (emp.get('description') or '')[:400], 'personas': []}
    # 🔧 2026-09-16 (Iker: "Light Systems tiene un director, ¿por qué lo has
    # descartado?"). Dos fallos:
    #  a) la busqueda classic devuelve 25 personas y no se paginaba: en una
    #     empresa de 128 empleados el directivo puede no salir. Ahora se leen
    #     TODOS con Sales Navigator, pagina a pagina.
    #  b) el cargo se puntuaba solo por el TITULAR. Ruben Saez tiene de titular
    #     "Head of R&D en UNO MINDA RINDER" (0 puntos) y de cargo actual
    #     "Director departamento I+D+i". Ahora se puntua titular + cargo, y el
    #     veto mira los dos (asi un "Director de RR. HH." no se cuela por el cargo).
    todos, cur = [], None
    for _ in range(40):
        ruta = '/api/v1/linkedin/search?account_id=%s&limit=25' % uni.A + (('&cursor=%s' % cur) if cur else '')
        r = uni._req('POST', ruta, {'api': 'sales_navigator', 'category': 'people',
                                   'company': {'include': [str(cid)]}})
        its = (r.get('items') or []) if isinstance(r, dict) else []
        todos += its
        cur = r.get('cursor') if isinstance(r, dict) else None
        if not cur or not its:
            break
    if not todos:   # respaldo: la classic de siempre
        r = uni._req('POST', '/api/v1/linkedin/search?account_id=%s&limit=25' % uni.A,
                     {'api': 'classic', 'category': 'people', 'company': [str(cid)]})
        todos = (r.get('items') or []) if isinstance(r, dict) else []
    cands = []
    for it in todos:
        if it.get('name') in (None, 'LinkedIn Member'): continue
        pos = it.get('current_positions') or [{}]
        cargo = (pos[0].get('role') if pos else '') or ''
        s = score((it.get('headline') or '') + ' | ' + cargo)
        if s == 0: continue
        it['_cargo'] = cargo
        cands.append((s, it))
    cands.sort(key=lambda x: -x[0])
    for s, it in cands[:max_personas]:
        pid_miembro = it.get('id')
        if str(pid_miembro).startswith('ACwAA') and it.get('public_identifier'):
            # reference_unipile_sales_navigator: el id de Sales Navigator devuelve
            # listas vacias sin error; hay que pedir el provider_id del miembro
            u = uni.user(it['public_identifier'])
            pid_miembro = u.get('provider_id') or pid_miembro
        d, tipo = actividad(pid_miembro)
        ficha['personas'].append({'name': it.get('name'),
                                  'headline': ((it.get('_cargo') or '') + ' · ' + (it.get('headline') or ''))[:95],
                                  'id': pid_miembro, 'pid': it.get('public_identifier'),
                                  'score': s, 'dias': d, 'tipo': tipo,
                                  'foto': bool(it.get('profile_picture_url'))})
    ficha['personas'].sort(key=lambda p: (p['dias'] if p['dias'] is not None else 9999, -p['score']))
    return ficha

if __name__ == '__main__':
    ids = [l.strip().split()[0] for l in io.open(sys.argv[1], encoding='utf-8') if l.strip() and not l.startswith('#')]
    out, o = [], io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    for cid in ids:
        f = procesa(cid); out.append(f)
        if 'error' in f:
            o.write('!! %s ERROR\n' % cid); continue
        o.write('== %s [%s] %s\n' % (f['name'], f['pid'], f['city']))
        for p in f['personas']:
            o.write('   %s%s | %s | dias=%s (%s) rank=%d\n'
                    % ('OK ' if (p['dias'] is not None and p['dias'] <= 180) else '.. ',
                       p['name'], p['headline'], p['dias'], p['tipo'], p['score']))
        o.flush()
    json.dump(out, io.open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
