import type { DesignSpec } from './LiveWhiteboard';

export interface QuestDemo {
    id: string;
    company: string;
    /** Quest slug — every one resolves to a company guide that exists. */
    slug: string;
    prompt: string;
    /** The headline of the first gap the coach found. */
    gap: string;
    /** The coach's diagnosis of this exact design, condensed from the session. */
    note: string;
    initials: string;
    spec: DesignSpec;
    /** Drop a recorded walkthrough here and the card plays it instead. */
    videoSrc?: string;
}

/*
 * Real sessions, not written copy.
 *
 * Each `spec` below is the exact design that was put to the Career Agent, and
 * `gap` / `note` come from what it sent back — the numbered critique of that
 * drawing, condensed but not reworded. That pairing is the point: the diagnosis
 * on screen is answering the diagram on screen, so the page cannot drift into
 * promising a sharper coach than the one that ships.
 *
 * The agent also closes each reply with a follow-up question. Those are real
 * too, but they move on to the next topic rather than explaining the drawing,
 * so they are deliberately not what the card shows.
 *
 * Re-run: open /agent and ask "I drew <the spec> for <the prompt>. What is
 * wrong with my design?" — then update both fields together, never one alone.
 */
export const QUEST_DEMOS: QuestDemo[] = [
    {
        id: 'google',
        company: 'Google',
        slug: 'google',
        prompt: 'Design a URL shortener',
        gap: 'No key generation service',
        note: 'Computing short keys on the API servers means concurrent writes race, or every write pays for a collision lookup. You need a key generation service that pre-generates keys and hands blocks out.',
        initials: 'G',
        spec: {
            nodes: [
                { id: 'client', label: 'client', x: 22, y: 34 },
                { id: 'api', label: 'api', x: 123, y: 34 },
                { id: 'cache', label: 'cache', x: 224, y: 34 },
                { id: 'db', label: 'database', x: 216, y: 128, w: 90 },
            ],
            edges: [
                { from: 'client', to: 'api' },
                { from: 'api', to: 'cache' },
                { from: 'cache', to: 'db' },
            ],
        },
    },
    {
        id: 'anthropic',
        company: 'Anthropic',
        slug: 'anthropic',
        prompt: 'Design an API rate limiter',
        gap: 'A Redis hop on every request',
        note: 'A network call to Redis per request adds milliseconds and centralises the bottleneck. Embed the limiter in the edge tier on local counters, and sync across instances asynchronously.',
        initials: 'A',
        spec: {
            nodes: [
                { id: 'client', label: 'client', x: 20, y: 34 },
                { id: 'edge', label: 'edge', x: 120, y: 34, w: 64 },
                { id: 'limiter', label: 'rate limiter', x: 210, y: 34, w: 96 },
                { id: 'redis', label: 'redis', x: 228, y: 128, w: 64 },
            ],
            edges: [
                { from: 'client', to: 'edge' },
                { from: 'edge', to: 'limiter' },
                { from: 'limiter', to: 'redis' },
            ],
        },
    },
    {
        id: 'openai',
        company: 'OpenAI',
        slug: 'openai',
        prompt: 'Design a realtime voice API',
        gap: 'Sockets pinned to GPU workers',
        note: 'Wiring client sockets straight to model instances binds expensive GPU workers to long-lived connections and I/O waits. Put a stateless tier and a buffer in between.',
        initials: 'O',
        spec: {
            nodes: [
                { id: 'mic', label: 'mic', x: 24, y: 34, w: 60 },
                { id: 'ws', label: 'websocket', x: 112, y: 34, w: 92 },
                { id: 'stream', label: 'stream in', x: 228, y: 34, w: 80 },
                { id: 'model', label: 'model', x: 232, y: 128, w: 72 },
            ],
            edges: [
                { from: 'mic', to: 'ws' },
                { from: 'ws', to: 'stream' },
                { from: 'stream', to: 'model' },
            ],
        },
    },
    {
        id: 'uber',
        company: 'Uber',
        slug: 'uber',
        prompt: 'Design ride dispatch',
        gap: 'Location pings drown the matcher',
        note: 'Drivers ping every 4–5 seconds. Routing that volume through dispatch buries your matching logic in writes — location needs its own ingestion stream feeding an in-memory spatial index.',
        initials: 'U',
        spec: {
            nodes: [
                { id: 'rider', label: 'rider', x: 20, y: 26, w: 70 },
                { id: 'driver', label: 'driver', x: 20, y: 130, w: 70 },
                { id: 'dispatch', label: 'dispatch', x: 126, y: 78, w: 84 },
                { id: 'geo', label: 'geo index', x: 232, y: 26, w: 80 },
                { id: 'trips', label: 'trips', x: 238, y: 130, w: 68 },
            ],
            edges: [
                { from: 'rider', to: 'dispatch' },
                { from: 'driver', to: 'dispatch' },
                { from: 'dispatch', to: 'geo' },
                { from: 'dispatch', to: 'trips' },
            ],
        },
    },
    {
        id: 'whatsapp',
        company: 'Meta · WhatsApp',
        slug: 'meta-facebook',
        prompt: 'Design an encrypted messenger',
        gap: 'Queue-to-peer breaks when offline',
        note: 'Delivering queue-straight-to-peer drops the message the moment the recipient is offline or switching networks. It needs store-and-forward that holds it until the device reconnects and acks.',
        initials: 'W',
        spec: {
            nodes: [
                { id: 'phone', label: 'phone', x: 20, y: 26, w: 70 },
                { id: 'gateway', label: 'gateway', x: 118, y: 26, w: 82 },
                { id: 'queue', label: 'queue', x: 226, y: 26, w: 72 },
                { id: 'keys', label: 'key store', x: 112, y: 130, w: 88 },
                { id: 'peer', label: 'peer', x: 230, y: 130, w: 64 },
            ],
            edges: [
                { from: 'phone', to: 'gateway' },
                { from: 'gateway', to: 'queue' },
                { from: 'queue', to: 'peer' },
                { from: 'phone', to: 'keys' },
            ],
        },
    },
];
