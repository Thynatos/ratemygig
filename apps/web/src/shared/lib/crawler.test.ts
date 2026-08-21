import { describe, it, expect } from 'vitest'
import { CRAWLER_UA_PATTERN, isCrawlerUserAgent } from './crawler'

describe('CRAWLER_UA_PATTERN', () => {
    it('matches known crawler user agents', () => {
        expect(CRAWLER_UA_PATTERN.test('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true)
        expect(CRAWLER_UA_PATTERN.test('facebookexternalhit/1.1')).toBe(true)
        expect(CRAWLER_UA_PATTERN.test('Twitterbot/1.0')).toBe(true)
        expect(CRAWLER_UA_PATTERN.test('WhatsApp/2.23.20.0')).toBe(true)
    })

    it('is case-insensitive', () => {
        expect(CRAWLER_UA_PATTERN.test('GOOGLEBOT/2.1')).toBe(true)
        expect(CRAWLER_UA_PATTERN.test('twitterbot/1.0')).toBe(true)
    })
})

describe('isCrawlerUserAgent', () => {
    it('returns true for crawler user agents', () => {
        expect(isCrawlerUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true)
        expect(isCrawlerUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true)
        expect(isCrawlerUserAgent('Twitterbot/1.0')).toBe(true)
        expect(isCrawlerUserAgent('WhatsApp/2.23.20.0')).toBe(true)
        expect(isCrawlerUserAgent('Slackbot-LinkExpanding 1.0')).toBe(true)
        expect(isCrawlerUserAgent('LinkedInBot/1.0 (compatible; Mozilla/5.0)')).toBe(true)
        expect(isCrawlerUserAgent('Discordbot/2.0')).toBe(true)
        expect(isCrawlerUserAgent('TelegramBot (like TwitterBot)')).toBe(true)
        expect(isCrawlerUserAgent('Pinterest/0.2 (+https://www.pinterest.com/bot.html)')).toBe(true)
        expect(isCrawlerUserAgent('GOOGLEBOT/2.1')).toBe(true)
        expect(isCrawlerUserAgent('twitterbot/1.0')).toBe(true)
        expect(isCrawlerUserAgent('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true)
    })

    it('returns false for normal browser user agents', () => {
        expect(
            isCrawlerUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
            )
        ).toBe(false)
        expect(
            isCrawlerUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
            )
        ).toBe(false)
        expect(
            isCrawlerUserAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
            )
        ).toBe(false)
        expect(isCrawlerUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0')).toBe(false)
    })

    it('returns false for empty or missing user agents', () => {
        expect(isCrawlerUserAgent(null)).toBe(false)
        expect(isCrawlerUserAgent(undefined)).toBe(false)
        expect(isCrawlerUserAgent('')).toBe(false)
    })
})
