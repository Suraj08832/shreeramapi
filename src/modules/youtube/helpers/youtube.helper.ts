import type { YouTubeVideo, YouTubeVideoAPIResponse } from '../models'
import { getYouTubeStreamUrl } from '#common/utils/spawn'

export class YouTubeHelper {
  static parseDuration(lengthText: string | undefined): number | null {
    if (!lengthText) return null

    const parts = lengthText.split(':').reverse()
    let seconds = 0

    parts.forEach((part, index) => {
      seconds += Number.parseInt(part) * Math.pow(60, index)
    })

    return seconds
  }

  static parseViewCount(viewCountText: string | undefined): number | null {
    if (!viewCountText) return null
    const match = viewCountText.match(/[\d,]+/)
    return match ? Number.parseInt(match[0].replace(/,/g, '')) : null
  }

  static formatImageQuality(width: number): string {
    if (width >= 1280) return '1280x720'
    if (width >= 640) return '640x480'
    if (width >= 480) return '480x360'
    if (width >= 320) return '320x180'
    return '120x90'
  }

  static async transformYouTubeVideo(
    video: YouTubeVideoAPIResponse,
    includeStreamUrl: boolean = false
  ): Promise<YouTubeVideo> {
    const images = video.thumbnail.thumbnails.map((thumb) => ({
      quality: this.formatImageQuality(thumb.width),
      url: thumb.url
    }))

    let streamUrl: string | null = null
    if (includeStreamUrl) {
      try {
        streamUrl = await getYouTubeStreamUrl(video.id)
      } catch (error) {
        console.error(`Failed to get stream URL for ${video.id}:`, error)
      }
    }

    return {
      id: video.id,
      name: video.title,
      type: 'youtube',
      duration: this.parseDuration(video.lengthText),
      url: `https://www.youtube.com/watch?v=${video.id}`,
      image: images,
      channel: {
        id: video.channelId,
        name: video.channelTitle
      },
      description: video.description || '',
      publishDate: video.publishDate || null,
      viewCount: this.parseViewCount(video.viewCount),
      isLive: video.isLive || false,
      streamUrl
    }
  }
}
