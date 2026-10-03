// Ticketmaster's Discovery API accepts only whole-second UTC timestamps
// (YYYY-MM-DDTHH:mm:ssZ) and rejects anything with milliseconds (DIS1015).
// Date#toISOString always includes them, and "now" almost never has .000.
export function toTicketmasterDateTime(date: Date | undefined): string | undefined {
    return date?.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
