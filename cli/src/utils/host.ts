/**
 * Hostname matching for ATS URLs.
 *
 * These checks used to be `url.toLowerCase().includes("lever.co")` and
 * friends. Substring matching on a whole URL matches far more than the
 * intended domain: `https://evil.example/?ref=lever.co` and
 * `https://lever.co.attacker.net/` both pass. That decides which ATS adapter
 * runs, and an adapter fills the user's name, email, phone and resume into
 * whatever form it finds — so getting it wrong on an attacker-controlled page
 * hands over PII.
 *
 * Match the parsed hostname against the registrable domain instead, allowing
 * subdomains but nothing else.
 */

/** Extract a lowercased hostname, or null if the URL will not parse. */
export function hostnameOf(url: string): string | null {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return null;
    }
}

/**
 * True when `host` is `domain` itself or a subdomain of it.
 *
 *   hostMatches("jobs.lever.co", "lever.co")        → true
 *   hostMatches("lever.co", "lever.co")             → true
 *   hostMatches("lever.co.attacker.net", "lever.co") → false
 *   hostMatches("notlever.co", "lever.co")          → false
 */
export function hostMatches(host: string | null, domain: string): boolean {
    if (!host) return false;
    const h = host.toLowerCase();
    const d = domain.toLowerCase();
    return h === d || h.endsWith(`.${d}`);
}

/** True when the URL's host matches any of the given registrable domains. */
export function urlHostMatchesAny(url: string, domains: string[]): boolean {
    const host = hostnameOf(url);
    return domains.some((d) => hostMatches(host, d));
}
