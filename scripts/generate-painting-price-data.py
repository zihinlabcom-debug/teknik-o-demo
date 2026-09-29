"""Generate explicit runtime TypeScript prices from the audited workbook rows."""
import json
from pathlib import Path

audit = json.loads(Path('test-results/painting/source-audit.json').read_text(encoding='utf-8'))
positions = audit['positions']
if len(positions) != 21:
    raise ValueError('Expected exactly 21 source positions')
# Semantic labels follow the source descriptions and its question tree.
specs = [
    ('old_painted', 'white_lime', 3, False),
    ('old_painted', 'silicone_matte', 2, False),
    ('old_painted', 'plastic_matte', 2, False),
    ('old_painted', 'silicone_silk_matte', 2, False),
    ('old_painted', 'silicone_semi_matte', 2, False),
    ('old_painted', 'antibacterial_silicone_matte', 2, False),
    ('old_painted', 'antibacterial_silicone_silk_matte', 2, False),
    ('old_painted', 'antibacterial_plastic_matte', 2, False),
    ('old_painted', 'synthetic_gloss', 2, False),
    ('old_painted', 'synthetic_matte', 2, False),
    ('new_plaster', 'silicone_matte', 2, True),
    ('new_plaster', 'silicone_soft_matte', 2, True),
    ('new_plaster', 'plastic_matte', 2, True),
    ('new_plaster', 'silicone_matte', 2, False),
    ('new_plaster', 'silicone_soft_matte', 2, False),
    ('new_plaster', 'plastic_matte', 2, False),
    ('satin_plaster_drywall', 'silicone_soft_matte', 2, False),
    ('satin_plaster_drywall', 'plastic_matte', 2, False),
    ('old_painted_ceiling', 'ceiling_water_based', 2, False),
    ('new_plaster_ceiling', 'ceiling_water_based', 2, False),
    ('satin_plaster_ceiling', 'ceiling_water_based', 2, False),
]
def ingredient(position, text):
    return [row for row in position['ingredients'] if text in row['label'].casefold()]

for p, (surface, paint, coats, putty) in zip(positions, specs):
    label = p['description'].casefold()
    if surface == 'old_painted' and not label.startswith('eski boyalı'):
        raise ValueError(f'Unexpected surface: {p["summaryRow"]}')
    if surface == 'new_plaster' and not label.startswith('yeni sıva'):
        raise ValueError(f'Unexpected surface: {p["summaryRow"]}')
    if surface == 'satin_plaster_drywall' and not label.startswith('saten alçı'):
        raise ValueError(f'Unexpected surface: {p["summaryRow"]}')
    if 'ceiling' in surface and 'tavan' not in label:
        raise ValueError(f'Unexpected ceiling: {p["summaryRow"]}')
    if coats == 3 and 'üç kat' not in label or coats == 2 and 'iki kat' not in label:
        raise ValueError(f'Unexpected coat count: {p["summaryRow"]}')
    if putty and not ingredient(p, 'iç cephe macunu'):
        raise ValueError(f'Missing putty input: {p["summaryRow"]}')
    calculated = sum(row['amount'] for row in p['ingredients']) * 1.2
    if abs(calculated - p['unitPriceM2']) > 1e-8:
        raise ValueError(f'Calculated price mismatch: {p["summaryRow"]}: {calculated}')

with_putty = positions[10:13]
without_putty = positions[13:16]
putty_costs = []
for with_poz, without_poz in zip(with_putty, without_putty):
    macun = ingredient(with_poz, 'iç cephe macunu')
    workers_with = ingredient(with_poz, 'usta')
    workers_without = ingredient(without_poz, 'usta')
    if len(macun) != 1 or len(workers_with) != 1 or len(workers_without) != 1:
        raise ValueError('Putty input not unambiguous')
    labor_delta = (workers_with[0]['quantity'] - workers_without[0]['quantity']) * workers_with[0]['unitPrice']
    putty_costs.append((macun[0]['amount'] + labor_delta) * 1.2)
if max(putty_costs) - min(putty_costs) > 1e-8:
    raise ValueError(f'Putty component mismatch: {putty_costs}')

ts = [
    '// Generated from BOYA_Son Hali.xlsx; do not edit prices by hand.',
    f'// Source SHA-256: {audit["sha256"]}',
    'export type PaintingSurface = "old_painted" | "new_plaster" | "satin_plaster_drywall" |',
    '  "old_painted_ceiling" | "new_plaster_ceiling" | "satin_plaster_ceiling";',
    'export type PaintingType = "white_lime" | "silicone_matte" | "plastic_matte" |',
    '  "silicone_silk_matte" | "silicone_semi_matte" | "antibacterial_silicone_matte" |',
    '  "antibacterial_silicone_silk_matte" | "antibacterial_plastic_matte" |',
    '  "synthetic_gloss" | "synthetic_matte" | "silicone_soft_matte" | "ceiling_water_based";',
    'export interface PaintingPoz {',
    '  id:string; summaryRow:number; nameCell:string; priceCell:string; description:string;',
    '  surface:PaintingSurface; paintType:PaintingType; coats:number; widePuttyInputIncluded:boolean;',
    '  materialCostM2:number; laborCostM2:number; primerMaterialCostM2:number; priceM2:number;',
    '}',
    f'export const PAINTING_SOURCE_SHA256="{audit["sha256"]}";',
    f'export const MARKET_COST_FACTOR=1.2;',
    f'export const EXTRA_PUTTY_PRICE_M2={putty_costs[0]:.10g};',
    'export const PAINTING_POSITIONS:readonly PaintingPoz[]=[',
]
for p, (surface, paint, coats, putty) in zip(positions, specs):
    labor = sum(i['amount'] for i in ingredient(p, 'usta'))
    material = sum(i['amount'] for i in p['ingredients']) - labor
    primer = sum(i['amount'] for i in p['ingredients'] if 'astar' in i['label'].casefold()) * 1.2
    as_js = lambda value: json.dumps(value, ensure_ascii=False)
    fields = {
        'id': f'{p["nameCell"]}_{p["priceCell"]}',
        'summaryRow': p['summaryRow'],
        'nameCell': p['nameCell'],
        'priceCell': p['priceCell'],
        'description': p['description'],
        'surface': surface,
        'paintType': paint,
        'coats': coats,
        'widePuttyInputIncluded': putty,
        'materialCostM2': round(material, 10),
        'laborCostM2': round(labor, 10),
        'primerMaterialCostM2': round(primer, 10),
        'priceM2': round(p['unitPriceM2'], 10),
    }
    ts.append('  {' + ','.join(f'{key}:{as_js(value)}' for key, value in fields.items()) + '},')
ts += ['];', 'export const OLD_PAINTED_CEILING_POZ=PAINTING_POSITIONS.find(p=>p.summaryRow===23)!;', '']
output = Path('src/lib/painting-price-data.ts')
output.write_text('\n'.join(ts), encoding='utf-8')
fixture = Path('tests/fixtures/painting-workbook-source.json')
fixture.write_text(json.dumps({'sha256': audit['sha256'], 'sheets': audit['sheets'],
    'positions': positions, 'extraPuttyComponentsM2': putty_costs}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'generated={output} positions={len(positions)} putty={putty_costs[0]}')
