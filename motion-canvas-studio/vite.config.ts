import {defineConfig} from 'vite';
import motionCanvasRaw from '@motion-canvas/vite-plugin';
import ffmpegRaw from '@motion-canvas/ffmpeg';

const motionCanvas = typeof motionCanvasRaw === 'function' ? motionCanvasRaw
  : (motionCanvasRaw as any).default?.default || (motionCanvasRaw as any).default || motionCanvasRaw;
const ffmpeg = typeof ffmpegRaw === 'function' ? ffmpegRaw
  : (ffmpegRaw as any).default?.default || (ffmpegRaw as any).default || ffmpegRaw;

export default defineConfig({
  plugins: [
    motionCanvas({
      project: './src/project.ts',
    }),
    ffmpeg(),
  ],
  // public/assets -> symlinked to careervivid/public/assets
  // so /assets/ccaf-backplates/*.png works out of the box
});
