/**
 * systemDesignWhatsAppE2EEScript.ts
 *
 * System Design Lesson: WhatsApp End-to-End Encryption & Signal Protocol
 */

export interface BeatSpec {
    id: string;
    renderer: 'VEO' | 'DIAGRAM';
    title: { en: string };
    narration: string;
    conceptTags: string[];
    metrics: string[];
    veoPrompt?: string;
    diagramSpec?: {
        nodes: Array<{
            id: string;
            type: 'client' | 'gateway' | 'scheduler' | 'gpu' | 'vram' | 'storage';
            label: string;
            subtext?: string;
            x: number;
            y: number;
            appearsAtSec: number;
        }>;
        edges: Array<{
            from: string;
            to: string;
            label: string;
            appearsAtSec: number;
        }>;
    };
}

export interface SystemDesignScriptSpec {
    id: string;
    title: string;
    beats: BeatSpec[];
}

export const WHATSAPP_E2EE_SCRIPT: SystemDesignScriptSpec = {
    id: 'sd-whatsapp-e2ee',
    title: 'How to Design WhatsApp End-to-End Encryption & Signal Protocol',
    beats: [
        {
            id: 'sd-whatsapp-e2ee-intro',
            renderer: 'VEO',
            title: { en: 'The 100 Billion Message Encryption Scale' },
            narration: 'How does WhatsApp secure 100 Billion messages daily so that not even WhatsApp servers can read your chats? Let us design the Signal Protocol at scale.',
            conceptTags: ['100B Msg/Day', 'End-to-End Encryption', 'Signal Protocol'],
            metrics: ['📊 100B Msg / Day', '🔒 Zero Server Decryption', '⚡ < 50ms Global Latency', '🛡️ 2B Active Users'],
            veoPrompt: 'SHOT: Medium shot, fast 12 FPS stop-motion paper collage. STYLE: Premium paper-collage animation, aged newsprint backdrop, paper padlocks and glowing key cut-outs. NEGATIVE: no text, no pseudo-latin, no letters.'
        },
        {
            id: 'sd-whatsapp-e2ee-x3dh',
            renderer: 'DIAGRAM',
            title: { en: 'X3DH Offline Key Exchange' },
            narration: 'Before sending a message to an offline recipient, the sender fetches the recipient Curve25519 Prekey bundle from the server and executes Extended Triple Diffie-Hellman, establishing a shared Master Secret without online interaction.',
            conceptTags: ['X3DH Key Exchange', 'Curve25519 Prekeys', 'Master Secret'],
            metrics: ['🔑 Curve25519 Elliptic Curve', '⚡ Shared Master Secret', '⏱️ 4ms Local Key Agreement', '📦 Signed One-Time Prekeys'],
            diagramSpec: {
                nodes: [
                    { id: 'alice', type: 'client', label: 'Sender (Alice)', subtext: 'Initiates X3DH Handshake', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'server', type: 'storage', label: 'WhatsApp Prekey Server', subtext: 'Pre-signed Identity Keys', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'bob', type: 'gateway', label: 'Recipient (Bob)', subtext: 'Offline Device State', x: 82, y: 50, appearsAtSec: 2.5 }
                ],
                edges: [
                    { from: 'alice', to: 'server', label: 'Fetch Bob Prekey Bundle', appearsAtSec: 1.8 },
                    { from: 'server', to: 'alice', label: 'Return Signed Curve25519 Key', appearsAtSec: 3.0 }
                ]
            }
        },
        {
            id: 'sd-whatsapp-e2ee-double-ratchet',
            renderer: 'DIAGRAM',
            title: { en: 'Double Ratchet Key Chain' },
            narration: 'To protect past and future messages, WhatsApp uses the Double Ratchet. Every single message advances a KDF chain and a Diffie-Hellman ratchet, generating fresh AES-256 keys per message.',
            conceptTags: ['Double Ratchet', 'KDF Key Chain', 'AES-256 Per-Msg'],
            metrics: ['🔐 AES-256 GCM Cipher', '⚙️ KDF Chain Step per Msg', '🔄 DH Ratchet per Response', '⚡ 1ms Encryption overhead'],
            diagramSpec: {
                nodes: [
                    { id: 'root_kdf', type: 'scheduler', label: 'Root KDF Chain', subtext: 'Advances on DH Turn', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'msg_kdf', type: 'gpu', label: 'Sending KDF Chain', subtext: 'Generates Per-Msg AES Key', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'cipher', type: 'vram', label: 'AES-256-GCM Ciphertext', subtext: 'Encrypted Message Payload', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'root_kdf', to: 'msg_kdf', label: 'Derive Chain Key', appearsAtSec: 1.8 },
                    { from: 'msg_kdf', to: 'cipher', label: 'Fresh Message Key', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-whatsapp-e2ee-forward-secrecy',
            renderer: 'DIAGRAM',
            title: { en: 'Forward Secrecy & Break-in Recovery' },
            narration: 'If an attacker compromises your phone today, Forward Secrecy ensures they cannot decrypt past messages, while Break-in Recovery prevents them from eavesdropping on future messages after one ratchet step.',
            conceptTags: ['Forward Secrecy', 'Break-in Recovery', 'Ephemeral Keys'],
            metrics: ['🛡️ Ephemeral Key Deletion', '🚫 Zero Retrospective Decryption', '🔄 Auto Healing in 1 Turn', '🔒 Sealed Sender Header'],
            diagramSpec: {
                nodes: [
                    { id: 'compromise', type: 'client', label: 'Compromised Phone State', subtext: 'Attacker Obtains Current State', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'past', type: 'storage', label: 'Past Message History', subtext: 'Keys Deleted Immediately', x: 50, y: 30, appearsAtSec: 1.5 },
                    { id: 'future', type: 'gateway', label: 'Future Ratchet State', subtext: 'Heals On Next DH Response', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'compromise', to: 'past', label: 'Blocked (Keys Shredded)', appearsAtSec: 1.8 },
                    { from: 'compromise', to: 'future', label: 'Blocked (DH Ratchet Reset)', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-whatsapp-e2ee-media-relay',
            renderer: 'DIAGRAM',
            title: { en: 'Encrypted Media Relay Pipeline' },
            narration: 'Encrypted media files are uploaded as AES-GCM ciphertext to Blob Storage. Only the 32-byte encryption key is sent through the end-to-end encrypted chat channel, keeping server costs low.',
            conceptTags: ['AES-GCM Ciphertext', 'Blob Storage', '32-Byte Secret'],
            metrics: ['📦 32-Byte Media Secret', '☁️ Encrypted Blob Storage', '⚡ Sub-40ms CDN Fetch', '💸 90% Bandwidth Saved'],
            diagramSpec: {
                nodes: [
                    { id: 'media_file', type: 'client', label: 'Raw Media Attachment', subtext: 'Photo / Video / Doc', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'blob_store', type: 'storage', label: 'Encrypted Blob Store', subtext: 'AES-GCM Ciphertext Payload', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'e2ee_channel', type: 'gateway', label: 'E2EE Signal Channel', subtext: '32-Byte Secret Key Token', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'media_file', to: 'blob_store', label: 'Upload Ciphertext File', appearsAtSec: 1.8 },
                    { from: 'media_file', to: 'e2ee_channel', label: 'Send 32-Byte Key Token', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-whatsapp-e2ee-failure-modes',
            renderer: 'DIAGRAM',
            title: { en: 'Skip-Key Table & Out-of-Order Buffer' },
            narration: 'What breaks at scale? Out-of-order delivery can cause message decryption failures. WhatsApp handles this using a Skip-Key Table that temporarily buffers missed message keys until late packets arrive.',
            conceptTags: ['Skip-Key Table', 'Out-of-Order Buffer', 'Decryption Fallback'],
            metrics: ['🗄️ 200 Skip-Key Buffer', '⏱️ Max 14-Day TTL', '🛡️ Out-of-Order Packet Guard', '📉 99.999% Delivery Success'],
            diagramSpec: {
                nodes: [
                    { id: 'out_order', type: 'client', label: 'Packet Out of Order', subtext: 'Msg #5 Arrives Before Msg #3', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'skip_table', type: 'scheduler', label: 'Skip-Key Table Buffer', subtext: 'Stores Skipped KDF Keys', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'decryptor', type: 'gpu', label: 'Delayed Decrypt Engine', subtext: 'Decrypted When #3 Arrives', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'out_order', to: 'skip_table', label: 'Save Skipped Msg #3 & #4 Key', appearsAtSec: 1.8 },
                    { from: 'skip_table', to: 'decryptor', label: 'Instant Retrospective Decrypt', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-whatsapp-e2ee-benchmark',
            renderer: 'DIAGRAM',
            title: { en: 'Global Scale Benchmarks' },
            narration: 'WhatsApp Signal Protocol encrypts over 2 Billion active users with zero server decryption overhead, maintaining under 50 millisecond latency globally.',
            conceptTags: ['2B Active Users', 'Zero Server Decryption', '<50ms Latency'],
            metrics: ['👥 2 Billion Active Users', '🔒 100% End-to-End Encrypted', '⚡ < 50ms Global Routing', '🛡️ 99.999% Availability'],
            diagramSpec: {
                nodes: [
                    { id: 'users_ingress', type: 'vram', label: '2 Billion Devices', subtext: 'Client Device Encryption', x: 25, y: 50, appearsAtSec: 0.5 },
                    { id: 'relay_mesh', type: 'gpu', label: 'WebSocket Relay Gateway', subtext: 'Opaque Packet Transport @ <50ms', x: 75, y: 50, appearsAtSec: 2.0 }
                ],
                edges: [
                    { from: 'users_ingress', to: 'relay_mesh', label: 'E2EE Ciphertext Flow', appearsAtSec: 2.8 }
                ]
            }
        },
        {
            id: 'sd-whatsapp-e2ee-call-to-action',
            renderer: 'VEO',
            title: { en: 'Recap & CareerVivid Practice' },
            narration: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            conceptTags: ['Like & Subscribe', 'CareerVivid', 'System Design'],
            metrics: ['🎉 Double Ratchet E2EE', '🚀 100B Messages/Day', '👍 Like & Subscribe', '💻 CareerVivid.app'],
            veoPrompt: 'SHOT: Static wide shot, slow 10% push in. STYLE: Premium paper-collage style, vintage chalkboard newsprint, paper play icon and glowing checkmarks. NEGATIVE: no text, no pseudo-latin, no letters.'
        }
    ]
};
