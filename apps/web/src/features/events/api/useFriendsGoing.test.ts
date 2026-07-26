import { describe, expect, it } from 'vitest'
import { friendsGoingKeys, groupFriendsByEvent } from './useFriendsGoing'
import type { FriendsAttendanceRow } from './useFriendsGoing'

describe('friendsGoingKeys', () => {
    it('generates all key', () => {
        expect(friendsGoingKeys.all).toEqual(['friends-going'])
    })

    it('generates events key', () => {
        expect(friendsGoingKeys.events(['evt-1', 'evt-2'])).toEqual(['friends-going', 'events', ['evt-1', 'evt-2']])
    })

    it('sorts event ids for a stable key', () => {
        expect(friendsGoingKeys.events(['evt-2', 'evt-1'])).toEqual(['friends-going', 'events', ['evt-1', 'evt-2']])
    })

    it('does not mutate the input array', () => {
        const ids = ['evt-2', 'evt-1']
        friendsGoingKeys.events(ids)
        expect(ids).toEqual(['evt-2', 'evt-1'])
    })
})

describe('groupFriendsByEvent', () => {
    const row = (eventId: string, userId: string, displayName: string | null = 'Alex', avatarUrl: string | null = null): FriendsAttendanceRow => ({
        event_id: eventId,
        user_id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
    })

    it('returns an empty map for empty input', () => {
        expect(groupFriendsByEvent([]).size).toBe(0)
    })

    it('groups a single row under its event id', () => {
        const grouped = groupFriendsByEvent([row('evt-1', 'user-1')])
        expect(grouped.get('evt-1')).toEqual([
            { userId: 'user-1', displayName: 'Alex', avatarUrl: null },
        ])
    })

    it('groups multiple friends under the same event', () => {
        const grouped = groupFriendsByEvent([
            row('evt-1', 'user-1', 'Alex'),
            row('evt-1', 'user-2', 'Sam', 'https://example.com/sam.jpg'),
        ])
        expect(grouped.get('evt-1')).toEqual([
            { userId: 'user-1', displayName: 'Alex', avatarUrl: null },
            { userId: 'user-2', displayName: 'Sam', avatarUrl: 'https://example.com/sam.jpg' },
        ])
    })

    it('keeps rows for different events in separate buckets', () => {
        const grouped = groupFriendsByEvent([
            row('evt-1', 'user-1'),
            row('evt-2', 'user-1'),
            row('evt-2', 'user-2'),
        ])
        expect(grouped.size).toBe(2)
        expect(grouped.get('evt-1')).toHaveLength(1)
        expect(grouped.get('evt-2')).toHaveLength(2)
    })

    it('falls back to a default display name when null', () => {
        const grouped = groupFriendsByEvent([row('evt-1', 'user-1', null)])
        expect(grouped.get('evt-1')![0].displayName).toBe('Friend')
    })
})
