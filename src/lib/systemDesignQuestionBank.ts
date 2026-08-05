/**
 * Question banks for the System Design Interview course practice widgets.
 *
 * Content basis: The System Design Primer (github.com/donnemartin/system-design-primer,
 * CC BY 4.0 — attribution rendered in the lessons that use these banks) plus
 * original CareerVivid material. karanpratapsingh/system-design is CC BY-NC-ND
 * and is therefore NOT used as content source — external reference links only.
 */

import { shuffleChoices, shuffleWithSeed } from './deterministicShuffle';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ClarifyOption {
  text: string;
  /** One of the questions a strong candidate must ask before designing. */
  essential: boolean;
  why: string;
}

export interface NumericQuestion {
  prompt: string;
  answer: number;
  /** Accepted relative error, e.g. 0.4 → ±40%. Napkin math, not precision. */
  tolerance: number;
  unit: string;
  working: string;
}

export interface McqQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  why: string;
}

/** One classic interview question as a four-phase drill. */
export interface CaseDrill {
  id: string;
  title: string;
  scenario: string;
  clarify: { options: ClarifyOption[]; requiredCount: number };
  estimate: NumericQuestion[];
  decide: McqQuestion[];
  followup: McqQuestion;
}

/* ------------------------------------------------------------------ */
/* Case drills — classic questions arena                               */
/* ------------------------------------------------------------------ */

export const CASE_DRILLS: CaseDrill[] = [
  {
    id: 'url-shortener',
    title: 'Design Bit.ly / Pastebin',
    scenario: 'Design a URL shortener: users submit a long URL and get a short link back; anyone opening the short link is redirected. Assume 12M new links per month.',
    clarify: {
      requiredCount: 3,
      options: [
        { text: 'What is the read:write ratio?', essential: true, why: 'Everything hinges on it — shorteners are ~100:1 read-heavy, which makes caching the centerpiece.' },
        { text: 'Do links expire? Can users pick custom aliases?', essential: true, why: 'Expiry changes storage math and needs a cleanup strategy; custom aliases change the key-generation design.' },
        { text: 'How fast must redirects be, and at what availability?', essential: true, why: 'A redirect in the critical path of every click — p99 latency and availability targets drive the cache/replica design.' },
        { text: 'Which programming language should the service use?', essential: false, why: 'Irrelevant at design time — architecture is language-agnostic.' },
        { text: 'Should we support link-click analytics?', essential: false, why: 'Good scope question but not blocking — it can be an async add-on. Fine to ask, not in the top 3.' },
        { text: 'What does the company logo look like on the landing page?', essential: false, why: 'Not a system design concern.' },
      ],
    },
    estimate: [
      { prompt: '12M writes/month. Reads are 100× writes and peak is 3× average. Peak read QPS ≈ ?', answer: 1400, tolerance: 0.45, unit: 'QPS', working: '12M / 2.6M s/month ≈ 4.6 writes/s → ×100 reads = 460/s → ×3 peak ≈ 1,400 QPS.' },
      { prompt: 'Each link record ≈ 1 KB. New storage per year ≈ ? (GB)', answer: 144, tolerance: 0.4, unit: 'GB/year', working: '12M/month × 12 = 144M records × 1 KB ≈ 144 GB/year. Tiny — storage is NOT the bottleneck here.' },
    ],
    decide: [
      {
        prompt: 'How should short codes be generated?',
        options: ['MD5 the long URL and use the full hash', 'Auto-increment ID encoded in base62', 'Random 4-character string, retry on collision', 'UUIDv4 for every link'],
        correctIndex: 1,
        why: 'Base62(counter) gives short, unique, collision-free codes (7 chars covers 3.5T links). Full MD5/UUID is far too long; 4 random chars collide quickly at scale.',
      },
      {
        prompt: 'Reads are 100× writes. What protects the database on the redirect path?',
        options: ['Bigger database instance', 'Cache-aside (Redis) keyed by short code, TTL + write-invalidate', 'Read from a follower replica for every redirect', 'Store everything in the CDN'],
        correctIndex: 1,
        why: 'A hot-key cache serves the head of the distribution in ~1 ms and absorbs almost all reads. Replicas help but still pay full DB latency; CDN caching breaks analytics/expiry.',
      },
    ],
    followup: {
      prompt: 'New requirement: links may set a custom expiry. Millions of expired rows accumulate — what is the standard cleanup design?',
      options: ['A DELETE cron scanning the whole table nightly', 'Lazy expiry on read + background sweeper over an expiry-time index', 'Drop and recreate the table monthly', 'Store links in memory only so they vanish on restart'],
      correctIndex: 1,
      why: 'Check expiry at read time (correctness) and sweep in bounded batches via an index on expires_at (space). Full-table scans and table drops are outage generators.',
    },
  },
  {
    id: 'twitter-timeline',
    title: 'Design the Twitter timeline',
    scenario: 'Design the home timeline: users follow others and see their tweets, newest first. Assume 500M tweets/day and heavily skewed follower counts.',
    clarify: {
      requiredCount: 3,
      options: [
        { text: 'How fresh must the timeline be after someone tweets?', essential: true, why: 'Freshness SLO decides fan-out on write (fast reads) vs on read (fast writes) — the core trade-off.' },
        { text: 'What is the follower distribution — do celebrity accounts exist?', essential: true, why: 'Fan-out on write dies at 50M followers. The skew forces the hybrid design.' },
        { text: 'Is the timeline strictly chronological or ranked?', essential: true, why: 'Ranking adds an ML scoring pass and changes storage from a simple list to candidate pools.' },
        { text: 'Which cloud provider will we deploy on?', essential: false, why: 'Vendor choice is not an architecture decision at this stage.' },
        { text: 'Do we need to support editing tweets?', essential: false, why: 'A reasonable scope check, but it does not change the timeline architecture materially.' },
        { text: 'What color is the retweet button?', essential: false, why: 'UI detail, not system design.' },
      ],
    },
    estimate: [
      { prompt: '500M tweets/day. Average tweet write rate ≈ ? (tweets/s)', answer: 5800, tolerance: 0.4, unit: 'tweets/s', working: '500M / 86,400 s ≈ 5,800/s average (peak 3-4× that).' },
      { prompt: 'Average 200 followers per user, full fan-out on write. Inbox writes per day ≈ ? (billions)', answer: 100, tolerance: 0.4, unit: 'B/day', working: '500M tweets × 200 followers = 100 BILLION inbox writes/day — why celebrities must use fan-out on read.' },
    ],
    decide: [
      {
        prompt: 'How do you handle a 50M-follower account tweeting?',
        options: ['Fan-out on write like everyone else, with a bigger queue', 'Hybrid: fan-out on write below a follower threshold; merge celebrity tweets at read time', 'Rate-limit celebrity tweets', 'Store their tweets in every follower row up front'],
        correctIndex: 1,
        why: 'The hybrid is the canonical answer: write fan-out for the many (cheap, fast reads), read-time merge for the huge. Name the threshold (~10k) out loud.',
      },
      {
        prompt: 'Where do precomputed home timelines live?',
        options: ['The relational database, joined at read time', 'Redis lists/sorted-sets capped at ~800 entries per user', 'A file per user on S3', 'The client device only'],
        correctIndex: 1,
        why: 'In-memory capped lists give O(1) timeline reads. The relational join at 300k read QPS is exactly what fan-out exists to avoid.',
      },
    ],
    followup: {
      prompt: 'The interviewer adds: "Now support keyword search over all tweets." What changes?',
      options: ['Add LIKE queries on the tweets table', 'A separate inverted-index service (e.g. Elasticsearch) fed asynchronously from the tweet stream', 'Grep over S3 backups', 'Keep an in-memory list of all tweets'],
      correctIndex: 1,
      why: 'Search is a different access pattern → different index. Feed it off the same durable tweet stream so serving and indexing scale independently.',
    },
  },
  {
    id: 'web-crawler',
    title: 'Design a web crawler',
    scenario: 'Design a crawler that fetches ~1B pages per month for a search index, politely and without loops.',
    clarify: {
      requiredCount: 3,
      options: [
        { text: 'How fresh must crawled content be — one-shot or continuous re-crawl?', essential: true, why: 'Re-crawl scheduling (priority by change rate) is half the design if the index must stay fresh.' },
        { text: 'How do we avoid hammering any single site?', essential: true, why: 'Politeness (robots.txt, per-domain rate) is a hard requirement — ignoring it gets you blocked.' },
        { text: 'How do we avoid crawling the same URL twice, at billions of URLs?', essential: true, why: 'Dedupe at this scale needs an explicit memory budget answer (hash set vs Bloom filter).' },
        { text: 'Should the crawler execute JavaScript?', essential: false, why: 'Important scope question but usually deferred to a follow-up — a rendering pool is an add-on.' },
        { text: 'Which HTML parser library is fastest?', essential: false, why: 'Implementation detail, not architecture.' },
        { text: 'What font should the admin dashboard use?', essential: false, why: 'Not a system design concern.' },
      ],
    },
    estimate: [
      { prompt: '1B pages/month. Average fetch rate ≈ ? (pages/s)', answer: 385, tolerance: 0.4, unit: 'pages/s', working: '1B / 2.6M s ≈ 385 pages/s sustained — hundreds of concurrent workers once you include fetch latency.' },
      { prompt: 'Average page ≈ 500 KB stored. New storage per month ≈ ? (TB)', answer: 500, tolerance: 0.4, unit: 'TB/month', working: '1B × 500 KB = 500 TB/month → object storage + compression, not a relational DB.' },
    ],
    decide: [
      {
        prompt: 'Billions of seen-URLs. How do you dedupe with bounded memory?',
        options: ['SQL table with UNIQUE constraint, checked per URL', 'In-memory Bloom filter (tiny, no false negatives) backed by an exact store for positives', 'Keep a sorted file and binary search it', 'Trust sites not to link in circles'],
        correctIndex: 1,
        why: 'A Bloom filter answers "definitely new" in O(1) with ~10 bits/URL; only probable-duplicates hit the exact store. A DB roundtrip per discovered URL cannot keep up.',
      },
      {
        prompt: 'How is politeness enforced?',
        options: ['Global rate limit across all domains', 'URL frontier partitioned per-domain, each domain queue with its own delay + robots.txt rules', 'Crawl at night only', 'Limit total worker count'],
        correctIndex: 1,
        why: 'Politeness is per-domain by definition: one queue per host, one fetch at a time per host with a crawl delay. A global limit still lets 400 workers hit one site.',
      },
    ],
    followup: {
      prompt: '"Many important pages are client-rendered JS." What is the standard extension?',
      options: ['Skip them', 'A separate headless-browser rendering pool, applied selectively to pages that need it (it is ~100× more expensive)', 'Render every page in a browser', 'Ask site owners to email us their HTML'],
      correctIndex: 1,
      why: 'Rendering is two orders of magnitude costlier than fetching — classify pages and route only JS-dependent ones to the render pool.',
    },
  },
  {
    id: 'chat-app',
    title: 'Design WhatsApp',
    scenario: 'Design a mobile chat service: 1:1 and group messages, delivery receipts, offline support. Assume 50M DAU sending 40 messages each per day.',
    clarify: {
      requiredCount: 3,
      options: [
        { text: 'What delivery guarantees do we promise (sent/delivered/read)?', essential: true, why: 'Receipt semantics drive the ack protocol and message-state machine — the heart of chat design.' },
        { text: 'What happens to messages while the recipient is offline?', essential: true, why: 'Offline delivery requires durable per-user queues + push notifications — a major component.' },
        { text: 'Must message order be preserved, and within what scope?', essential: true, why: 'Per-conversation ordering (sequence numbers) is expected; global ordering is impossible/unneeded — say so.' },
        { text: 'Is end-to-end encryption required from day one?', essential: false, why: 'Great scope question — usually explored as the follow-up, not a blocking clarification.' },
        { text: 'Which emoji set do we license?', essential: false, why: 'Not a system design concern.' },
        { text: 'Do we build for iOS or Android first?', essential: false, why: 'Client rollout order does not change the backend design.' },
      ],
    },
    estimate: [
      { prompt: '50M DAU × 40 messages/day. Average message rate ≈ ? (msg/s)', answer: 23000, tolerance: 0.4, unit: 'msg/s', working: '2B messages/day / 86,400 ≈ 23,000 msg/s average — WebSocket gateways must be sharded from day one.' },
      { prompt: '~100 bytes per message. New message storage per day ≈ ? (GB)', answer: 200, tolerance: 0.4, unit: 'GB/day', working: '2B × 100 B = 200 GB/day (text is small — media goes to object storage via URLs).' },
    ],
    decide: [
      {
        prompt: 'How are messages delivered to an ONLINE recipient?',
        options: ['Recipient polls every 5 seconds', 'Persistent WebSocket: gateway looks up the recipient\'s connection and pushes after the message is durably stored', 'Email forwarding', 'Direct peer-to-peer between phones'],
        correctIndex: 1,
        why: 'Persist first (source of truth), then push over the socket. Polling wastes battery/bandwidth; pure P2P fails offline and multi-device.',
      },
      {
        prompt: 'How is per-conversation ordering achieved across distributed servers?',
        options: ['Trust client clocks', 'A per-conversation monotonically increasing sequence number assigned at write time', 'NTP-synchronized timestamps', 'Deliver in arrival order and hope'],
        correctIndex: 1,
        why: 'Client clocks skew and NTP is ±ms at best. A per-conversation sequence (single writer per conversation shard) gives gap-free ordering AND lets clients detect missing messages.',
      },
    ],
    followup: {
      prompt: '"Add end-to-end encryption." What can the server no longer do?',
      options: ['Deliver messages', 'Read message content — it stores/forwards ciphertext only, so server-side search and content moderation must move on-device', 'Store messages', 'Support group chats'],
      correctIndex: 1,
      why: 'E2E means keys live on devices; the server becomes a ciphertext router. Anything needing plaintext (search, moderation, smart replies) relocates to the client.',
    },
  },
  {
    id: 'rate-limiter',
    title: 'Design an API rate limiter',
    scenario: 'Design the rate-limiting layer for a public API platform: per-user limits, ~50k requests/s across the gateway fleet, near-zero added latency.',
    clarify: {
      requiredCount: 3,
      options: [
        { text: 'What is limited — user, API key, IP, endpoint, or combinations?', essential: true, why: 'The limit KEY is the design: it decides state size, where auth must happen, and abuse resistance.' },
        { text: 'Must bursts be allowed, or is the limit strictly uniform?', essential: true, why: 'Burst tolerance is the token-bucket vs fixed-window decision — the central algorithm choice.' },
        { text: 'What does a rejected caller experience?', essential: true, why: '429 + Retry-After + rate-limit headers is a product contract; silently dropping requests breaks clients.' },
        { text: 'How precise must limits be across a distributed fleet?', essential: false, why: 'Excellent deeper question — usually surfaced in the follow-up. Asking it early is a bonus, not required.' },
        { text: 'Which Redis client library should we use?', essential: false, why: 'Implementation detail.' },
        { text: 'Should the docs page show the limits?', essential: false, why: 'Docs matter but do not shape the architecture.' },
      ],
    },
    estimate: [
      { prompt: '10M active API users, ~100 bytes of limiter state each. Total state ≈ ? (GB)', answer: 1, tolerance: 0.5, unit: 'GB', working: '10M × 100 B = 1 GB — fits comfortably in one Redis cluster; state size is not the hard part, latency is.' },
      { prompt: 'Gateway does one atomic Redis op per request at 50k req/s. Redis ops/s ≈ ?', answer: 50000, tolerance: 0.3, unit: 'ops/s', working: '1:1 → 50k ops/s. A single Redis node handles ~100k ops/s, so one cluster suffices — but adds a network hop to EVERY request. Mention local caching or Lua batching.' },
    ],
    decide: [
      {
        prompt: 'Which algorithm allows controlled bursts with smooth sustained rates?',
        options: ['Fixed window counter (reset every minute)', 'Token bucket: capacity = burst size, refill = sustained rate', 'Random rejection above a threshold', 'Queue every request until capacity frees'],
        correctIndex: 1,
        why: 'Token bucket handles the classic "2× at the window boundary" flaw of fixed windows and expresses burst-vs-sustained as two clean parameters.',
      },
      {
        prompt: 'Where should the check run?',
        options: ['Inside each backend service', 'At the API gateway, after authentication resolves the user key, before any expensive work', 'In the client SDK', 'In the database'],
        correctIndex: 1,
        why: 'Gateway placement rejects abusive traffic before it consumes compute — but must sit AFTER auth if the key is user-based. Client-side limits are advisory only.',
      },
    ],
    followup: {
      prompt: '"Deploy in 3 regions." Users can hit different regions — what is the pragmatic design?',
      options: ['One global Redis all regions call synchronously', 'Local buckets per region with async sync, accepting bounded over-admission (~N× worst case briefly)', 'Sticky-route every user to one region forever', 'Disable limits during failover'],
      correctIndex: 1,
      why: 'A cross-ocean Redis call (~150 ms) on every request destroys the latency budget. Local enforcement + async reconciliation trades bounded accuracy error for speed — say the bound out loud.',
    },
  },
  {
    id: 'file-sync',
    title: 'Design Dropbox sync',
    scenario: 'Design file sync across devices: a user edits a file on one device and it appears on their other devices. Support large files and offline edits.',
    clarify: {
      requiredCount: 3,
      options: [
        { text: 'What file sizes must we handle, up to what limit?', essential: true, why: 'GB-scale files force chunked upload/download, resume, and delta sync — the core of the design.' },
        { text: 'What happens when two devices edit the same file offline?', essential: true, why: 'Conflict policy (last-writer-wins vs conflicted copies) must be decided, not discovered.' },
        { text: 'How quickly must other devices see a change?', essential: true, why: 'Near-real-time sync needs a notification channel (long poll/WebSocket); "eventually" allows simple polling.' },
        { text: 'Do we need file versioning/history?', essential: false, why: 'Good scope probe — chunk-based storage gives cheap versioning almost for free, usually a follow-up.' },
        { text: 'What icon should the tray app use?', essential: false, why: 'Not a system design concern.' },
        { text: 'Which compression codec is best?', essential: false, why: 'Tunable detail, not architecture.' },
      ],
    },
    estimate: [
      { prompt: 'Files are chunked at 4 MB. A 1 GB file = ? chunks', answer: 250, tolerance: 0.15, unit: 'chunks', working: '1 GB / 4 MB = 250 chunks — each hashed (SHA-256); only chunks whose hash changed get re-uploaded (delta sync).' },
      { prompt: '10M users × 2 GB average, with 30% cross-user chunk dedupe. Stored bytes ≈ ? (PB)', answer: 14, tolerance: 0.4, unit: 'PB', working: '10M × 2 GB = 20 PB logical × 0.7 = 14 PB physical. Content-hash chunks make dedupe automatic.' },
    ],
    decide: [
      {
        prompt: 'A user edits 1 line in a 1 GB file. What gets uploaded?',
        options: ['The whole file again', 'Only the ~4 MB chunk whose content hash changed, plus updated file metadata', 'A text diff of the line', 'Nothing until they click save twice'],
        correctIndex: 1,
        why: 'Chunk-level content hashing = delta sync: re-upload only changed chunks. This is Dropbox\'s signature bandwidth optimization.',
      },
      {
        prompt: 'How do other devices learn a file changed?',
        options: ['Poll the server every second', 'A notification channel (long poll / WebSocket) that pushes "namespace changed", then the client fetches metadata deltas', 'Daily email digest', 'OS file-system magic'],
        correctIndex: 1,
        why: 'Push notification + pull deltas: tiny idle cost, near-real-time sync, and clients recover missed updates by asking "changes since cursor X".',
      },
    ],
    followup: {
      prompt: '"Two devices edited the same file offline and both come online." The standard resolution?',
      options: ['Overwrite with whichever synced last', 'Keep both: latest wins the filename, the other becomes a "conflicted copy (device, date)" — never silently drop data', 'Refuse to sync until the user picks', 'Merge the bytes automatically'],
      correctIndex: 1,
      why: 'For opaque binary files auto-merge is impossible and silent loss is unforgivable. Conflicted copies preserve both truths and let the human decide — exactly what Dropbox ships.',
    },
  },
];

/**
 * Case drills are authored answer-first — the essential clarifying questions
 * come before the distractors, and the right design decision is written before
 * the wrong ones — because that is the readable way to write them. Serving them
 * in that order would let a learner clear every arena question by picking the
 * first three and then the second option, so the order is permuted here.
 *
 * Seeded on the drill and prompt text: stable for a given learner across
 * retries and reloads, unrelated to where the author happened to type it.
 */
export const getCaseDrill = (id: string): CaseDrill | undefined => {
  const drill = CASE_DRILLS.find((c) => c.id === id);
  if (!drill) return undefined;
  const decide = drill.decide.map((question) => ({
    ...question,
    ...shuffleChoices(question.options, question.correctIndex, `${drill.id}:${question.prompt}`),
  }));
  return {
    ...drill,
    clarify: {
      ...drill.clarify,
      options: shuffleWithSeed(drill.clarify.options, `${drill.id}:clarify`),
    },
    decide,
    followup: {
      ...drill.followup,
      ...shuffleChoices(drill.followup.options, drill.followup.correctIndex, `${drill.id}:${drill.followup.prompt}`),
    },
  };
};

/* ------------------------------------------------------------------ */
/* Latency numbers (Jeff Dean / system-design-primer, CC BY 4.0)       */
/* ------------------------------------------------------------------ */

export interface LatencyCard {
  operation: string;
  /** Display answer. */
  answer: string;
  /** Distractor options shown alongside the answer. */
  distractors: string[];
  insight: string;
}

export const LATENCY_CARDS: LatencyCard[] = [
  { operation: 'L1 cache reference', answer: '0.5 ns', distractors: ['50 ns', '5 µs', '0.5 ms'], insight: 'The fastest thing a CPU does — everything else is measured against this.' },
  { operation: 'Main memory reference', answer: '100 ns', distractors: ['1 ns', '10 µs', '1 ms'], insight: '200× slower than L1 — why cache-friendly data layouts matter.' },
  { operation: 'Read 4 KB randomly from SSD', answer: '150 µs', distractors: ['150 ns', '15 ms', '1.5 s'], insight: '~1,000× slower than RAM. "Just read it from disk" is never free.' },
  { operation: 'Round trip within same datacenter', answer: '500 µs', distractors: ['5 µs', '50 ms', '500 ms'], insight: 'Every microservice hop costs ~0.5 ms before any work happens — chatty architectures pay this repeatedly.' },
  { operation: 'Read 1 MB sequentially from SSD', answer: '1 ms', distractors: ['10 µs', '100 ms', '1 s'], insight: 'Sequential SSD ≈ 1 GB/s. Reading the same 1 MB as 256 random 4 KB pages costs ~38 ms — sequential wins by ~40×, and by far more on HDD.' },
  { operation: 'HDD disk seek', answer: '10 ms', distractors: ['10 µs', '100 µs', '1 s'], insight: '20× a datacenter round trip — why databases fight so hard to avoid random disk I/O.' },
  { operation: 'Packet round trip CA → Netherlands → CA', answer: '150 ms', distractors: ['1.5 ms', '15 ms', '1.5 s'], insight: 'Physics. No cross-ocean synchronous call belongs in a request path — this number justifies CDNs and regional deployments.' },
  { operation: 'Read 1 MB sequentially from memory', answer: '250 µs', distractors: ['250 ns', '25 ms', '250 ms'], insight: 'RAM streams at ~4 GB/s. The same megabyte takes ~1 ms from SSD (4×) and ~30 ms from HDD (120×) — that spread is the whole argument for caching.' },
];

/* ------------------------------------------------------------------ */
/* Capacity quick-fire                                                 */
/* ------------------------------------------------------------------ */

export const CAPACITY_QUICKFIRE: NumericQuestion[] = [
  { prompt: '1M requests/day ≈ how many requests per second (average)?', answer: 11.6, tolerance: 0.35, unit: 'req/s', working: '1,000,000 / 86,400 ≈ 11.6 — memorize "1M/day ≈ 12/s" and scale from there.' },
  { prompt: '50M DAU × 10 requests each ≈ average QPS?', answer: 5787, tolerance: 0.35, unit: 'QPS', working: '500M / 86,400 ≈ 5,800 QPS. (≈ 500 × the 1M/day unit.)' },
  { prompt: 'Average QPS is 6,000 and peak factor is 4×. Provision for ? QPS', answer: 24000, tolerance: 0.2, unit: 'QPS', working: '6,000 × 4 = 24,000. Sizing to the average is an outage plan.' },
  { prompt: '10M records × 500 bytes ≈ ? GB', answer: 5, tolerance: 0.25, unit: 'GB', working: '10M × 500 B = 5×10⁹ B = 5 GB. Records-times-size first, then convert units.' },
  { prompt: 'A 1 Gbps link moves at most ? MB per second', answer: 125, tolerance: 0.25, unit: 'MB/s', working: '1 Gbps / 8 = 125 MB/s — divide bits by 8; real throughput is lower still.' },
  { prompt: '500M posts/day × 200 followers, full fan-out ≈ ? billion inbox writes/day', answer: 100, tolerance: 0.3, unit: 'B writes/day', working: '500M × 200 = 100B/day ≈ 1.2M writes/s — the number that kills naive fan-out.' },
];

/* ------------------------------------------------------------------ */
/* Spot-the-flaw scenes                                                */
/* ------------------------------------------------------------------ */

export interface FlawComponent { id: string; label: string; detail: string }
export interface FlawScene {
  id: string;
  title: string;
  brief: string;
  components: FlawComponent[];
  flawedId: string;
  explanation: string;
}

export const FLAW_SCENES: FlawScene[] = [
  {
    id: 'sticky-sessions',
    title: 'The login that keeps logging out',
    brief: 'Users report being randomly logged out. Traffic is round-robin across the fleet. Find the flawed component.',
    components: [
      { id: 'lb', label: 'Load balancer', detail: 'round-robin, health checks on' },
      { id: 'api', label: 'API servers ×3', detail: 'keep user sessions in local memory' },
      { id: 'db', label: 'PostgreSQL primary + replica', detail: 'stores user data' },
      { id: 'cdn', label: 'CDN', detail: 'serves static assets' },
    ],
    flawedId: 'api',
    explanation: 'Sessions in LOCAL memory + round-robin = the next request lands on a server that has never seen you → logged out. Fix: externalize sessions (Redis) or use signed tokens; servers must be stateless.',
  },
  {
    id: 'spof-db',
    title: 'The nine-hour outage',
    brief: 'A disk died and the product was down for 9 hours while restoring from a week-old dump. Find the flawed component.',
    components: [
      { id: 'lb', label: 'Load balancer pair', detail: 'active-passive failover' },
      { id: 'api', label: 'API fleet ×6', detail: 'stateless, autoscaled' },
      { id: 'db', label: 'MySQL — single node', detail: 'no replica, weekly backups' },
      { id: 'queue', label: 'Job queue', detail: 'durable, replicated' },
    ],
    flawedId: 'db',
    explanation: 'Everything is redundant except the one stateful component. A single DB node with weekly backups = guaranteed data loss + long RTO. Fix: streaming replica + automated failover + continuous (point-in-time) backups.',
  },
  {
    id: 'stale-cache',
    title: 'The price that never updates',
    brief: 'Merchants update prices but customers see old ones for hours. Find the flawed component.',
    components: [
      { id: 'api', label: 'Read API', detail: 'cache-aside with 6h TTL' },
      { id: 'cache', label: 'Redis cache', detail: 'filled on read, TTL 6h, no other expiry' },
      { id: 'writer', label: 'Write API', detail: 'updates the DB directly' },
      { id: 'db', label: 'Database', detail: 'source of truth, correct data' },
    ],
    flawedId: 'cache',
    explanation: 'Writes go to the DB but nothing INVALIDATES the cached key — readers see stale data until the 6h TTL expires. Fix: write path deletes/updates the cache key (or publishes an invalidation event); TTL becomes the fallback, not the mechanism.',
  },
  {
    id: 'no-dlq',
    title: 'The queue that stopped moving',
    brief: 'One malformed event arrived at 02:00; no notification has been delivered since. Find the flawed component.',
    components: [
      { id: 'producer', label: 'Producer', detail: 'emits notification events' },
      { id: 'topic', label: 'Topic (3 partitions)', detail: 'durable, keyed by user' },
      { id: 'consumer', label: 'Consumer', detail: 'retries failures forever, in place' },
      { id: 'push', label: 'Push service', detail: 'sends to devices, healthy' },
    ],
    flawedId: 'consumer',
    explanation: 'Infinite in-place retry on a poison event blocks the partition behind it — one bad message stops ALL users on that partition. Fix: bounded retries with backoff, then dead-letter queue + alert; the partition keeps flowing.',
  },
];

/* ------------------------------------------------------------------ */
/* Ordering exercises                                                  */
/* ------------------------------------------------------------------ */

export interface OrderingSet {
  id: string;
  title: string;
  instruction: string;
  /** Items in CORRECT order; the widget shuffles for display. */
  items: string[];
  insight: string;
}

export const ORDERING_SETS: OrderingSet[] = [
  {
    id: 'interview-phases',
    title: 'Order the interview',
    instruction: 'Tap the phases in the order a strong candidate runs them.',
    items: ['Clarify requirements & scope', 'Back-of-envelope estimates', 'High-level design (boxes & arrows)', 'Deep dive the bottleneck', 'Wrap up: recap + limitations'],
    insight: 'Designing before clarifying is the #1 interview failure mode — the order IS the skill.',
  },
  {
    id: 'read-path',
    title: 'Order a cached read',
    instruction: 'Tap the steps in the order one cached read request flows.',
    items: ['DNS resolves the domain', 'Load balancer picks a healthy API server', 'API authenticates & validates the request', 'Check the cache for the key', 'On miss: query the database & fill the cache', 'Return the response to the client'],
    insight: 'Auth before cache: never serve cached data to a caller you have not authenticated.',
  },
  {
    id: 'safe-deploy',
    title: 'Order a safe schema change',
    instruction: 'Tap the steps of an expand/contract migration in order.',
    items: ['Add the new column (nullable, unused)', 'Deploy code that writes BOTH old and new columns', 'Backfill historical rows in batches', 'Switch reads to the new column', 'Stop writing the old column, then drop it'],
    insight: 'Expand → migrate → contract: at every step the previous code version still works, so rollback stays possible.',
  },
];

export const getOrderingSet = (id: string): OrderingSet | undefined => ORDERING_SETS.find((s) => s.id === id);
export const getFlawScene = (id: string): FlawScene | undefined => FLAW_SCENES.find((s) => s.id === id);
