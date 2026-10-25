import { describe, expect, it } from 'vitest';
import { SaveManager, parseSave } from '../src/engine/save/saves';
import { MemoryBackend } from '../src/engine/save/storage';
import { newGameState } from '../src/engine/core/state';
import { CURRENT_SAVE_VERSION, migrate } from '../src/engine/save/migrations';

describe('SaveManager', () => {
  it('round-trips state and lists slots', async () => {
    const sm = new SaveManager(new MemoryBackend());
    const st = newGameState('dev_yard', 3, 4);
    st.flags.test = 5;
    await sm.write('slot1', { label: 'x', locationId: 'dev_yard', locationName: 'Yard', minutes: st.minutes, playtimeSec: 1 }, st);
    const back = await sm.read('slot1');
    expect(back?.state).toEqual(st);
    expect(Object.keys(await sm.list())).toEqual(['slot1']);
    expect((await sm.latest())?.slot).toBe('slot1');
  });
  it('rejects garbage and future versions', () => {
    expect(() => parseSave('nope')).toThrow();
    expect(() => parseSave(JSON.stringify({ version: CURRENT_SAVE_VERSION + 1 }))).toThrow(/newer/);
  });
  it('migrate is identity at current version', () => {
    const s = { version: CURRENT_SAVE_VERSION, a: 1 };
    expect(migrate(s)).toEqual(s);
  });
});
