export const CRAWLER_UA_PATTERN =
    /bot|crawl|spider|slurp|facebookexternalhit|Twitterbot|Slackbot|LinkedInBot|Discordbot|WhatsApp|TelegramBot|Pinterest|embed|preview/i

export function isCrawlerUserAgent(ua: string | null | undefined): boolean {
    if (!ua) return false
    return CRAWLER_UA_PATTERN.test(ua)
}
