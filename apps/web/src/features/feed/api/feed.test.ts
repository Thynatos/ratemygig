import { describe, expect, it } from 'vitest'
import { feedKeys } from './feed'

describe('feedKeys', () => {
    it('generates all key', () => {
        expect(feedKeys.all).toEqual(['feed'])
    })

    it('generates timeline key with page', () => {
        expect(feedKeys.timeline(1)).toEqual(['feed', 'timeline', 1])
        expect(feedKeys.timeline(3)).toEqual(['feed', 'timeline', 3])
    })
})