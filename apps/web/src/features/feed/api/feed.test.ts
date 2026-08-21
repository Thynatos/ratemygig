import { describe, expect, it } from 'vitest'
import { feedKeys } from './feed'

describe('feedKeys', () => {
    it('generates all key', () => {
        expect(feedKeys.all).toEqual(['feed'])
    })

    it('generates timeline key scoped to the user and page', () => {
        expect(feedKeys.timeline('user-1', 1)).toEqual(['feed', 'timeline', 'user-1', 1])
        expect(feedKeys.timeline('user-1', 3)).toEqual(['feed', 'timeline', 'user-1', 3])
    })
})