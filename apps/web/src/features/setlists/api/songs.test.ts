import { describe, expect, it, vi } from 'vitest'
import { getOrCreateSongIdWithDeps, isUniqueViolation, songKeys, type SongLookupDeps } from './songs'

function deps(overrides: Partial<SongLookupDeps> = {}): SongLookupDeps {
    return {
        findSongId: vi.fn(async () => null),
        insertSong: vi.fn(async () => 'new-song'),
        ...overrides,
    }
}

describe('getOrCreateSongIdWithDeps', () => {
    it('reuses an existing song without inserting', async () => {
        const d = deps({ findSongId: vi.fn(async () => 'existing-song') })
        await expect(getOrCreateSongIdWithDeps('Brianstorm', 'artist-1', d)).resolves.toBe('existing-song')
        expect(d.insertSong).not.toHaveBeenCalled()
    })

    it('creates the song under its artist when it does not exist', async () => {
        const d = deps()
        await expect(getOrCreateSongIdWithDeps('Brianstorm', 'artist-1', d)).resolves.toBe('new-song')
        expect(d.findSongId).toHaveBeenCalledWith('Brianstorm', 'artist-1')
        expect(d.insertSong).toHaveBeenCalledWith('Brianstorm', 'artist-1')
    })

    it('keeps artist-less songs artist-less', async () => {
        const d = deps()
        await getOrCreateSongIdWithDeps('Brianstorm', null, d)
        expect(d.insertSong).toHaveBeenCalledWith('Brianstorm', null)
    })

    it('re-reads the winning row after losing an insert race (23505)', async () => {
        const findSongId = vi.fn<SongLookupDeps['findSongId']>()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce('raced-song')
        const d = deps({
            findSongId,
            insertSong: vi.fn(async () => Promise.reject({ code: '23505', message: 'duplicate key' })),
        })
        await expect(getOrCreateSongIdWithDeps('Brianstorm', 'artist-1', d)).resolves.toBe('raced-song')
        expect(findSongId).toHaveBeenCalledTimes(2)
    })

    it('rethrows other insert errors', async () => {
        const rlsError = { code: '42501', message: 'new row violates row-level security policy' }
        const d = deps({ insertSong: vi.fn(async () => Promise.reject(rlsError)) })
        await expect(getOrCreateSongIdWithDeps('Brianstorm', 'artist-1', d)).rejects.toBe(rlsError)
        expect(d.findSongId).toHaveBeenCalledTimes(1)
    })

    it('rethrows the unique violation if the winning row still cannot be found', async () => {
        const conflict = { code: '23505', message: 'duplicate key' }
        const d = deps({ insertSong: vi.fn(async () => Promise.reject(conflict)) })
        await expect(getOrCreateSongIdWithDeps('Brianstorm', 'artist-1', d)).rejects.toBe(conflict)
    })

    it('surfaces lookup errors instead of treating them as "not found"', async () => {
        const badFilter = { code: 'PGRST100', message: 'failed to parse filter' }
        const d = deps({ findSongId: vi.fn(async () => Promise.reject(badFilter)) })
        await expect(getOrCreateSongIdWithDeps('Brianstorm', 'artist-1', d)).rejects.toBe(badFilter)
        expect(d.insertSong).not.toHaveBeenCalled()
    })
})

describe('isUniqueViolation', () => {
    it('recognises Postgres unique violations only', () => {
        expect(isUniqueViolation({ code: '23505' })).toBe(true)
        expect(isUniqueViolation({ code: '23503' })).toBe(false)
        expect(isUniqueViolation(new Error('23505'))).toBe(false)
        expect(isUniqueViolation(null)).toBe(false)
    })
})

describe('songKeys', () => {
    it('generates all key', () => {
        expect(songKeys.all).toEqual(['songs'])
    })

    it('generates search key scoped to the artist', () => {
        expect(songKeys.search('brian', 'artist-1')).toEqual(['songs', 'search', 'brian', 'artist-1'])
    })
})
