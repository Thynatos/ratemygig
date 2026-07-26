import { describe, expect, it } from 'vitest'
import {
    applyEventListToggle,
    applyListItemAdded,
    applyListItemCountDelta,
    applyListItemRemoved,
    listKeys,
} from './lists'
import type { ListItemWithEvent, ListWithItemCount, ListWithItems } from './lists'

const item = (id: string, eventId: string, position: number): ListItemWithEvent => ({
    id,
    list_id: 'list-1',
    event_id: eventId,
    notes: null,
    position,
    created_at: '2026-01-01T00:00:00Z',
    event: null,
})

const listWithItems = (items: ListItemWithEvent[]): ListWithItems => ({
    id: 'list-1',
    user_id: 'user-1',
    name: 'My List',
    description: null,
    is_public: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    items,
    profile: null,
})

const listWithCount = (id: string, itemCount: number): ListWithItemCount => ({
    id,
    user_id: 'user-1',
    name: 'List',
    description: null,
    is_public: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    item_count: itemCount,
})

describe('listKeys', () => {
    it('generates all key', () => {
        expect(listKeys.all).toEqual(['lists'])
    })

    it('generates byUser key', () => {
        expect(listKeys.byUser('user-1')).toEqual(['lists', 'user', 'user-1'])
    })

    it('generates detail key', () => {
        expect(listKeys.detail('list-1')).toEqual(['lists', 'detail', 'list-1'])
    })

    it('generates event key', () => {
        expect(listKeys.event('event-1')).toEqual(['lists', 'event', 'event-1'])
    })
})

describe('applyEventListToggle', () => {
    it('adds the list id when absent', () => {
        expect(applyEventListToggle(['list-1'], 'list-2')).toEqual(['list-1', 'list-2'])
    })

    it('removes the list id when present', () => {
        expect(applyEventListToggle(['list-1', 'list-2'], 'list-1')).toEqual(['list-2'])
    })

    it('restores the original list when toggled twice', () => {
        const ids = ['list-1']
        expect(applyEventListToggle(applyEventListToggle(ids, 'list-2'), 'list-2')).toEqual(ids)
    })

    it('does not mutate the input array', () => {
        const ids = ['list-1']
        applyEventListToggle(ids, 'list-2')
        applyEventListToggle(ids, 'list-1')
        expect(ids).toEqual(['list-1'])
    })
})

describe('applyListItemAdded', () => {
    it('appends the item at the next position and keeps position sort', () => {
        const list = listWithItems([item('i1', 'event-1', 0)])
        const result = applyListItemAdded(list, item('i2', 'event-2', 1))
        expect(result.items.map((i) => i.id)).toEqual(['i1', 'i2'])
        expect(result.items[1].position).toBe(1)
    })

    it('re-sorts items when positions arrive out of order', () => {
        const list = listWithItems([item('i1', 'event-1', 1)])
        const result = applyListItemAdded(list, item('i2', 'event-2', 0))
        expect(result.items.map((i) => i.id)).toEqual(['i2', 'i1'])
    })
})

describe('applyListItemRemoved', () => {
    it('removes the item with the matching event_id', () => {
        const list = listWithItems([item('i1', 'event-1', 0), item('i2', 'event-2', 1)])
        const result = applyListItemRemoved(list, 'event-1')
        expect(result.items.map((i) => i.id)).toEqual(['i2'])
    })
})

describe('applyListItemCountDelta', () => {
    it('increments the item count for the matching list', () => {
        const lists = [listWithCount('list-1', 2), listWithCount('list-2', 5)]
        const result = applyListItemCountDelta(lists, 'list-1', 1)
        expect(result[0].item_count).toBe(3)
        expect(result[1].item_count).toBe(5)
    })

    it('decrements the item count and floors at 0', () => {
        expect(applyListItemCountDelta([listWithCount('list-1', 1)], 'list-1', -1)[0].item_count).toBe(0)
        expect(applyListItemCountDelta([listWithCount('list-1', 0)], 'list-1', -1)[0].item_count).toBe(0)
    })
})
