/**
 * PCM helpers for Gemini Live sessions.
 *
 * Extracted from `useAIInterviewAgentSession` so the Career Agent's voice
 * session shares one implementation rather than a second copy. Getting the
 * sample rates or the Int16 conversion subtly different between two copies
 * produces audio that is quiet, fast, or silent — with nothing in the logs.
 *
 * The Live API contract these encode for:
 *   input   16 kHz mono PCM16, base64        (`audio/pcm;rate=16000`)
 *   output  24 kHz mono PCM16, base64
 */

export const LIVE_INPUT_SAMPLE_RATE = 16_000;
export const LIVE_OUTPUT_SAMPLE_RATE = 24_000;

export const encodeBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
};

export const decodeBase64 = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

/** Interleaved PCM16 → AudioBuffer for playback. */
export const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
};

/**
 * Box-average downsample. Upsampling is not supported — a device already below
 * the target rate is returned untouched rather than interpolated, since
 * inventing samples would degrade recognition rather than help it.
 */
export const downsampleBuffer = (
    buffer: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number,
): Float32Array => {
    if (inputSampleRate <= outputSampleRate) return buffer;

    const ratio = inputSampleRate / outputSampleRate;
    const result = new Float32Array(Math.round(buffer.length / ratio));

    for (let i = 0; i < result.length; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.floor((i + 1) * ratio);
        let sum = 0;
        let count = 0;
        for (let j = start; j < end && j < buffer.length; j++) {
            sum += buffer[j];
            count++;
        }
        result[i] = count ? sum / count : 0;
    }
    return result;
};

/** Float32 mic samples → base64 PCM16 at the Live input rate. */
export const toPcm16Base64 = (samples: Float32Array, inputSampleRate: number): string => {
    const down = downsampleBuffer(samples, inputSampleRate, LIVE_INPUT_SAMPLE_RATE);
    const pcm = new Int16Array(down.length);
    for (let i = 0; i < down.length; i++) {
        const s = Math.max(-1, Math.min(1, down[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return encodeBase64(new Uint8Array(pcm.buffer));
};
