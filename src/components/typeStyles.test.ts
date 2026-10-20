import { describe, expect, it } from 'vitest';
import { entryIcon, guessIcon, ICON_PRESETS } from './typeStyles';
import { dueLabel } from '../lib/dates';

describe('ikonos', () => {
  it('spėja ikoną pagal lietuvišką pavadinimą', () => {
    expect(guessIcon('Sporto salė')).toBe('dumbbell');
    expect(guessIcon('Treniruotė')).toBe('dumbbell');
    expect(guessIcon('Vakarienė')).toBe('food');
    // Šeima svarbiau už maistą
    expect(guessIcon('Vakarienė su šeima')).toBe('heart');
    expect(guessIcon('Aplankyti mamą')).toBe('heart');
    expect(guessIcon('Scenarijų kalbų kontrolinis')).toBe('cap');
    expect(guessIcon('Egzaminas')).toBe('cap');
    expect(guessIcon('Nupirkti pieno')).toBe('cart');
    expect(guessIcon('Paskambinti vadovui')).toBe('phone');
    expect(guessIcon('Kažkas visai kito')).toBeUndefined();
  });

  it('įrašo ikona – pasirinkta arba pagal tipą', () => {
    expect(entryIcon({ type: 'exam' })).toBe('cap');
    expect(entryIcon({ type: 'personal' })).toBe('user');
    expect(entryIcon({ type: 'personal', icon: 'heart' })).toBe('heart');
  });

  it('rinkinyje yra šeima (širdelė) ir sportas (hantelis), ikonos nesikartoja', () => {
    expect(ICON_PRESETS.find((p) => p.label === 'Šeima')?.icon).toBe('heart');
    expect(ICON_PRESETS.find((p) => p.label === 'Sportas')?.icon).toBe('dumbbell');
    expect(new Set(ICON_PRESETS.map((p) => p.icon)).size).toBe(ICON_PRESETS.length);
  });
});

describe('darbų terminai', () => {
  it('rodo santykinę datą arba vėlavimą', () => {
    expect(dueLabel('2026-11-10', '2026-11-10')).toBe('Šiandien');
    expect(dueLabel('2026-11-11', '2026-11-10')).toBe('Rytoj');
    expect(dueLabel('2026-11-09', '2026-11-10')).toBe('Vėluoja (vakar)');
    expect(dueLabel('2026-11-07', '2026-11-10')).toBe('Vėluoja 3 d.');
    expect(dueLabel('2026-11-13', '2026-11-10')).toBe('Pn, lapkričio 13 d.');
  });
});
