import { describe, expect, it } from 'vitest'
import { userFollowKeys } from './follows'
import { artistFollowKeys } from '../../artists/api/artists'
import { venueFollowKeys } from '../../venues/api/venues'

describe('userFollowKeys', () => {
    it('generates all key', () => {
        expect(userFollowKeys.all).toEqual(['user-follows'])
    })

    it('generates isFollowing key scoped to the viewer', () => {
        expect(userFollowKeys.isFollowing('user-1', 'viewer-1')).toEqual(['user-follows', 'is-following', 'user-1', 'viewer-1'])
    })

    it('generates followers key', () => {
        expect(userFollowKeys.followers('user-1')).toEqual(['user-follows', 'followers', 'user-1'])
    })

    it('generates following key', () => {
        expect(userFollowKeys.following('user-1')).toEqual(['user-follows', 'following', 'user-1'])
    })

    it('generates followerCount key', () => {
        expect(userFollowKeys.followerCount('user-1')).toEqual(['user-follows', 'follower-count', 'user-1'])
    })

    it('generates followingCount key', () => {
        expect(userFollowKeys.followingCount('user-1')).toEqual(['user-follows', 'following-count', 'user-1'])
    })
})

describe('artistFollowKeys', () => {
    it('generates all key', () => {
        expect(artistFollowKeys.all).toEqual(['artist-follows'])
    })

    it('generates isFollowing key', () => {
        expect(artistFollowKeys.isFollowing('artist-1')).toEqual(['artist-follows', 'is-following', 'artist-1'])
    })

    it('generates followedArtists key scoped to the user', () => {
        expect(artistFollowKeys.followedArtists('user-1')).toEqual(['artist-follows', 'followed', 'user-1'])
    })
})

describe('venueFollowKeys', () => {
    it('generates all key', () => {
        expect(venueFollowKeys.all).toEqual(['venue-follows'])
    })

    it('generates isFollowing key', () => {
        expect(venueFollowKeys.isFollowing('venue-1')).toEqual(['venue-follows', 'is-following', 'venue-1'])
    })

    it('generates followedVenues key scoped to the user', () => {
        expect(venueFollowKeys.followedVenues('user-1')).toEqual(['venue-follows', 'followed', 'user-1'])
    })
})