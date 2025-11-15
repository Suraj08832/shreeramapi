import { spawn } from 'child_process'
import { YtdlCore } from '@ybd-project/ytdl-core'

/**
 * Cross-runtime spawn utility that works in both Bun and Node.js
 */
export async function execCommand(
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args)
    
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('error', (error) => {
      reject(error)
    })

    proc.on('close', (exitCode) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: exitCode || 0
      })
    })
  })
}

/**
 * Get YouTube stream URL using pure JavaScript (serverless-compatible)
 * Works on both Bun and Node.js, including Vercel
 */
export async function getYouTubeStreamUrl(videoId: string): Promise<string> {
  // Get YouTube cookies from environment variable (set in Vercel)
  const ytCookies = process.env.YOUTUBE_COOKIES || ''
  
  const ytdl = new YtdlCore({
    clients: ['ios', 'web'],
    logDisplay: ['error'],
    rewriteRequest: (url: string, options: RequestInit) => {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': '*/*',
      }
      
      // Add YouTube cookies if available
      if (ytCookies) {
        headers['Cookie'] = ytCookies
      }
      
      return {
        url,
        options: {
          ...options,
          headers: {
            ...options.headers,
            ...headers,
          }
        }
      }
    }
  })
  
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  
  const info = await ytdl.getBasicInfo(videoUrl)
  
  // Get best quality audio-only format (more reliable than video+audio)
  const audioFormat = info.formats
    .filter((f: any) => f.hasAudio && !f.hasVideo)
    .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]
  
  if (audioFormat && audioFormat.url) {
    return audioFormat.url
  }
  
  // Fallback: try any format with audio
  const anyFormat = info.formats
    .filter((f: any) => f.hasAudio)
    .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]
  
  if (!anyFormat || !anyFormat.url) {
    throw new Error('No suitable format found')
  }
  
  return anyFormat.url
}
