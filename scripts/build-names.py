"""Regenerate js/names.js from PokéAPI's species-name table: python3 scripts/build-names.py"""
import csv, io, json, urllib.request

URL = 'https://cdn.jsdelivr.net/gh/PokeAPI/pokeapi@master/data/v2/csv/pokemon_species_names.csv'
JA_KANA, JA, EN = '1', '11', '9'   # local_language_id: ja-Hrkt, ja, en
LAST = 1025

rows = csv.DictReader(io.StringIO(urllib.request.urlopen(URL).read().decode('utf-8')))
names = {}
for r in rows:
    i = int(r['pokemon_species_id'])
    if i <= LAST:
        names.setdefault(i, {})[r['local_language_id']] = r['name']

table = [[n.get(JA_KANA) or n[JA], n[EN]] for _, n in sorted(names.items())]
assert len(table) == LAST, len(table)

with open('js/names.js', 'w', encoding='utf-8') as f:
    f.write('// Japanese (katakana) and English names, NAMES[dexNumber - 1].\n')
    f.write('// Generated from PokéAPI data by scripts/build-names.py; do not edit by hand.\n')
    f.write('const NAMES = [\n')
    for ja, en in table:
        f.write(f'  {json.dumps([ja, en], ensure_ascii=False)},\n')
    f.write('];\n')
print(f'wrote {len(table)} names')
