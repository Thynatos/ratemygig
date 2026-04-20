import { describe, expect, it } from 'vitest'
import { reviewKeys } from '../api/reviews'

describe('reviewKeys', () => {
    it('generates all key', () => {
        expect(reviewKeys.all).toEqual(['reviews'])
    })

    it('generates list key', () => {
        expect(reviewKeys.lists()).toEqual(['reviews', 'list'])
    })

    it('generates eventReviews key', () => {
        expect(reviewKeys.eventReviews('evt-1')).toEqual(['reviews', 'list', 'event', 'evt-1'])
    })

    it('generates detail key', () => {
        expect(reviewKeys.detail('rev-1')).toEqual(['reviews', 'detail', 'rev-1'])
    })
})

describe('reactionKeys', () => {
    it('generates all key', () => {
        expect(reviewKeys.all).toEqual(['reviews'])
    })
})

import { reactionKeys } from '../api/reviews'

describe('reactionKeys', () => {
    it('generates forReview key', () => {
        expect(reactionKeys.forReview('rev-1')).toEqual(['review-reactions', 'review', 'rev-1'])
    })

    it('generates userReaction key', () => {
        expect(reactionKeys.userReaction('rev-1')).toEqual(['review-reactions', 'user', 'rev-1'])
    })
})