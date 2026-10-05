import { describe, expect, it } from 'vitest';
import { FakeSupabase } from './fake-supabase.js';

const event = (id: string, extra: Record<string, unknown> = {}) => ({
    provider: 'ticketmaster',
    provider_event_id: id,
    name: `Show ${id}`,
    start_at: '2026-12-01T20:00:00.000Z',
    city: 'New York',
    country: 'US',
    ...extra,
});

describe('FakeSupabase', () => {
    it('rejects a DO UPDATE batch that repeats a conflict key and writes nothing', async () => {
        const fake = new FakeSupabase();

        const { error } = await fake
            .from('artists')
            .upsert([{ name: 'Interpol', image_url: null }, { name: 'Interpol', image_url: 'x' }], { onConflict: 'name' });

        expect(error).toMatchObject({ code: '21000' });
        expect(fake.rows('artists')).toEqual([]);
    });

    it('lets DO NOTHING skip repeated keys and returns only the rows it inserted', async () => {
        const fake = new FakeSupabase();
        await fake.from('artists').upsert({ name: 'Interpol' }, { onConflict: 'name' });

        const { data } = await fake
            .from('artists')
            .upsert([{ name: 'Interpol' }, { name: 'Beach House' }, { name: 'Beach House' }], {
                onConflict: 'name',
                ignoreDuplicates: true,
            })
            .select('id,name');

        expect(data).toEqual([{ id: expect.any(String), name: 'Beach House' }]);
        expect(fake.rows('artists')).toHaveLength(2);
        expect(fake.insertTriggerFires.artists).toBe(2);
    });

    it('returns inserted and merged rows for DO UPDATE, firing insert triggers only for new ones', async () => {
        const fake = new FakeSupabase();
        await fake.from('events').upsert([event('e1')], { onConflict: 'provider,provider_event_id' });
        const before = fake.rows('events')[0];

        const { data } = await fake
            .from('events')
            .upsert([event('e1', { name: 'Renamed' }), event('e2')], { onConflict: 'provider,provider_event_id' })
            .select('id,provider_event_id');

        expect(data).toHaveLength(2);
        expect(fake.insertTriggerFires.events).toBe(2);
        const after = fake.rows('events').find(row => row.provider_event_id === 'e1');
        expect(after).toMatchObject({ id: before.id, name: 'Renamed', created_at: before.created_at });
        expect(after?.updated_at).not.toBe(before.updated_at);
    });

    it('writes NULL for a key one row lacks when another row has it, like supabase-js', async () => {
        const fake = new FakeSupabase();

        const { error } = await fake
            .from('events')
            .upsert([event('e1', { lineup: ['Interpol'] }), event('e2')], { onConflict: 'provider,provider_event_id' });

        expect(error).toMatchObject({ code: '23502' });
        expect(fake.rows('events')).toEqual([]);
    });

    it('uses the column default when no row in the statement carries the key', async () => {
        const fake = new FakeSupabase();

        await fake.from('events').upsert([event('e1'), event('e2')], { onConflict: 'provider,provider_event_id' });

        expect(fake.rows('events').map(row => row.lineup)).toEqual([[], []]);
    });

    it('rejects a conflict target that matches no unique constraint', async () => {
        const fake = new FakeSupabase();

        const { error } = await fake.from('venues').upsert({ name: 'The Garden', city: 'NYC', country: 'US' }, { onConflict: 'name' });

        expect(error).toMatchObject({ code: '42P10' });
    });

    it('checks NOT NULL before it looks for a conflict', async () => {
        const fake = new FakeSupabase();
        await fake.from('artists').upsert({ name: 'Interpol' }, { onConflict: 'name' });

        const { error } = await fake
            .from('artists')
            .upsert([{ name: 'Interpol' }, { name: undefined }], { onConflict: 'name', ignoreDuplicates: true });

        expect(error).toMatchObject({ code: '23502' });
    });

    it('throws instead of returning the error after throwOnError', async () => {
        const fake = new FakeSupabase();

        await expect(
            fake.from('artists').upsert({ name: undefined }, { onConflict: 'name' }).throwOnError()
        ).rejects.toMatchObject({ code: '23502' });
    });
});
