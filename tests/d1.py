
import sys, json, sqlite3
db = sqlite3.connect(':memory:', isolation_level=None)
import os
HERE = os.path.dirname(os.path.abspath(__file__))
db.executescript(open(os.path.join(HERE, 'legacy-schema.sql')).read())
db.executescript(open(os.path.join(HERE, '..', 'schema.sql')).read())
def run(sql, args, mode):
    cur = db.execute(sql, args)
    if mode in ('all', 'first'):
        cols = [d[0] for d in cur.description] if cur.description else []
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        return {'results': rows, 'row': rows[0] if rows else None}
    return {'changes': cur.rowcount}
for line in sys.stdin:
    req = json.loads(line)
    try:
        if req['op'] == 'batch':
            db.execute('BEGIN')
            try:
                out = [run(s['sql'], s['args'], 'run') for s in req['stmts']]
                db.execute('COMMIT')
            except Exception:
                db.execute('ROLLBACK')
                raise
            res = {'ok': True, 'out': out}
        else:
            res = {'ok': True, **run(req['sql'], req['args'], req['mode'])}
    except Exception as e:
        res = {'ok': False, 'error': str(e)}
    res['id'] = req['id']
    print(json.dumps(res), flush=True)
