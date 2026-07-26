import { describe, expect, it } from 'vitest'
import { applyCommentAdded, applyCommentRemoved, commentKeys } from './comments'
import type { CommentWithProfile } from './comments'

const comment = (id: string, createdAt: string): CommentWithProfile => ({
    id,
    review_id: 'review-1',
    user_id: 'user-1',
    body: 'Great review',
    created_at: createdAt,
    updated_at: createdAt,
    profile: null,
})

describe('commentKeys', () => {
    it('generates all key', () => {
        expect(commentKeys.all).toEqual(['comments'])
    })

    it('generates byReview key', () => {
        expect(commentKeys.byReview('review-1')).toEqual(['comments', 'review', 'review-1'])
    })

    it('generates byUser key', () => {
        expect(commentKeys.byUser('user-1')).toEqual(['comments', 'user', 'user-1'])
    })
})

describe('applyCommentAdded', () => {
    it('appends a new comment chronologically', () => {
        const existing = [comment('c1', '2026-01-01T10:00:00Z'), comment('c2', '2026-01-01T11:00:00Z')]
        const result = applyCommentAdded(existing, comment('c3', '2026-01-01T12:00:00Z'))
        expect(result.map((c) => c.id)).toEqual(['c1', 'c2', 'c3'])
    })

    it('keeps comments sorted when an older comment is inserted', () => {
        const existing = [comment('c2', '2026-01-01T11:00:00Z')]
        const result = applyCommentAdded(existing, comment('c1', '2026-01-01T10:00:00Z'))
        expect(result.map((c) => c.id)).toEqual(['c1', 'c2'])
    })
})

describe('applyCommentRemoved', () => {
    it('removes the comment with the matching id', () => {
        const existing = [comment('c1', '2026-01-01T10:00:00Z'), comment('c2', '2026-01-01T11:00:00Z')]
        const result = applyCommentRemoved(existing, 'c1')
        expect(result.map((c) => c.id)).toEqual(['c2'])
    })

    it('no-ops on an unknown id', () => {
        const existing = [comment('c1', '2026-01-01T10:00:00Z')]
        expect(applyCommentRemoved(existing, 'unknown')).toEqual(existing)
    })
})
