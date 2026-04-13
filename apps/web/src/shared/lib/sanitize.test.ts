import { describe, it, expect } from 'vitest'
import { sanitizeText, sanitizeHtml, sanitizeRichText } from './sanitize'

describe('sanitizeText', () => {
    it('passes through plain text unchanged', () => {
        expect(sanitizeText('Hello world')).toBe('Hello world')
    })

    it('strips HTML tags', () => {
        expect(sanitizeText('<script>alert("xss")</script>Hello')).toBe('Hello')
    })

    it('strips all HTML elements', () => {
        expect(sanitizeText('<b>bold</b> text')).toBe('bold text')
    })

    it('strips anchor tags', () => {
        expect(sanitizeText('<a href="https://evil.com">click</a>')).toBe('click')
    })

    it('handles empty string', () => {
        expect(sanitizeText('')).toBe('')
    })

    it('strips event handlers', () => {
        expect(sanitizeText('<img src=x onerror="alert(1)">')).toBe('')
    })
})

describe('sanitizeHtml', () => {
    it('strips all tags by default', () => {
        expect(sanitizeHtml('<p>Hello</p>')).toBe('Hello')
    })
})

describe('sanitizeRichText', () => {
    it('allows safe formatting tags', () => {
        expect(sanitizeRichText('<b>bold</b> and <em>italic</em>')).toBe('<b>bold</b> and <em>italic</em>')
    })

    it('allows links with href', () => {
        const result = sanitizeRichText('<a href="https://example.com">link</a>')
        expect(result).toContain('href="https://example.com"')
        expect(result).toContain('link')
    })

    it('strips script tags', () => {
        expect(sanitizeRichText('<script>alert(1)</script>text')).toBe('text')
    })

    it('strips dangerous attributes', () => {
        const result = sanitizeRichText('<p onclick="alert(1)">safe</p>')
        expect(result).not.toContain('onclick')
    })
})