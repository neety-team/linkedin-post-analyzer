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
                  r'mantenimiento|sistemas|inform[aá]tic|\bit\b|rrhh|recursos humanos|human resources|'
                  r'calidad|quality|prevenci|riesgos laborales|almac[eé]n|log[ií]stic|compras|'
                  r'purchasing|procurement|contab|fiscal|nóminas|analista|analyst|becaria|'
                  r'soporte|support|profesor|docente|consultor de|community manager)', re.I)

def score(h):
    h = (h or '').lower()
    if VETO.search(h):
        # Solo se salva si ademas es CEO/DG/fundador (p.ej. "CEO y director de calidad")
        if not re.search(RANK[0][1], h):
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

def procesa(cid, max_personas=6):
    emp = uni.company(cid)
    if '_error' in emp:
        return {'id': cid, 'error': emp}
    loc = (emp.get('locations') or [{}])[0]
    ficha = {'id': cid, 'name': emp.get('name'), 'pid': emp.get('public_identifier'),
             'logo': emp.get('logo_large'), 'city': loc.get('city'), 'area': loc.get('area'),
             'street': (loc.get('street') or [''])[0], 'cp': loc.get('postalCode'),
             'desc': (emp.get('description') or '')[:400], 'personas': []}
    r = uni._req('POST', '/api/v1/linkedin/search?account_id=%s&limit=25' % uni.A,
                 {'api': 'classic', 'category': 'people', 'company': [str(cid)]})
    cands = []
    for it in (r.get('items') or []) if isinstance(r, dict) else []:
        if it.get('name') in (None, 'LinkedIn Member'): continue
        s = score(it.get('headline'))
        if s == 0: continue
        cands.append((s, it))
    cands.sort(key=lambda x: -x[0])
    for s, it in cands[:max_personas]:
        d, tipo = actividad(it['id'])
        ficha['personas'].append({'name': it.get('name'), 'headline': (it.get('headline') or '')[:95],
                                  'id': it.get('id'), 'pid': it.get('public_identifier'),
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
