import {defineConfig} from 'vite';
import motionCanvasRaw from '@motion-canvas/vite-plugin';
import ffmpegRaw from '@motion-canvas/ffmpeg';

const motionCanvas = typeof motionCanvasRaw === 'function' ? motionCanvasRaw
  : (motionCanvasRaw as any).default?.default || (motionCanvasRaw as any).default || motionCanvasRaw;
const ffmpeg = typeof ffmpegRaw === 'function' ? ffmpegRaw
  : (ffmpegRaw as any).default?.default || (ffmpegRaw as any).default || ffmpegRaw;

const normalizeLegacyBuildTarget = (entry: any): any => {
  if (Array.isArray(entry)) return entry.map(normalizeLegacyBuildTarget);
  if (!entry || entry.name !== 'motion-canvas:project' || typeof entry.config !== 'function') {
    return entry;
  }

  const originalConfig = entry.config;
  return {
    ...entry,
    config(this: unknown, config: unknown, environment: unknown) {
      const result = originalConfig.call(this, config, environment);
      const normalize = (resolved: any) => {
        if (resolved?.build?.target === 'modules') resolved.build.target = 'es2015';
        return resolved;
      };
      return result instanceof Promise ? result.then(normalize) : normalize(result);
    },
  };
};

export default defineConfig({
  build: {
    target: 'es2015',
  },
  plugins: [
    normalizeLegacyBuildTarget(motionCanvas({
      project: './src/project.ts',
    })),
    ffmpeg(),
  ],
  // public/assets -> symlinked to careervivid/public/assets
  // so /assets/ccaf-backplates/*.png works out of the box
});
