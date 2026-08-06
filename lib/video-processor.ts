import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Extracts audio from a video file/URL and saves it as a temporary MP3.
 * Returns the path to the temporary audio file.
 */
export async function extractAudio(videoUrl: string): Promise<string> {
  const tempDir = os.tmpdir();
  const audioPath = path.join(tempDir, `audio_${Date.now()}.mp3`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoUrl)
      .toFormat('mp3')
      .on('error', (err) => {
        console.error('FFmpeg Error:', err);
        reject(err);
      })
      .on('end', () => {
        resolve(audioPath);
      })
      .save(audioPath);
  });
}

/**
 * Cleanup temporary file
 */
export function cleanupTempFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error cleaning up temp file:', err);
  }
}
