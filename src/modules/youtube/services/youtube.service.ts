import { YouTubeVideoAPIResponseModel } from '../models'
import { YouTubeHelper } from '../helpers'
import type { YouTubeVideo } from '../models'
import { getYouTubeStreamUrl } from '#common/utils/spawn'

export class YouTubeService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || ''
    if (!this.apiKey) {
      console.warn('YOUTUBE_API_KEY not set - YouTube features will not work')
    }
  }

  async searchVideos(
    query: string,
    limit: number = 10,
    includeStreamUrl: boolean = false
  ): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search')
      url.searchParams.set('part', 'snippet')
      url.searchParams.set('q', query)
      url.searchParams.set('maxResults', String(limit))
      url.searchParams.set('type', 'video')
      url.searchParams.set('key', this.apiKey)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(url.toString(), {
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.items || data.items.length === 0) {
        return {
          videos: [],
          nextPageToken: undefined
        }
      }

      const videoIds = data.items.map((item: any) => item.id.videoId).filter((id: string) => id)
      
      if (videoIds.length === 0) {
        return {
          videos: [],
          nextPageToken: data.nextPageToken
        }
      }

      const videos = await this.getVideosByIds(videoIds, includeStreamUrl)

      return {
        videos,
        nextPageToken: data.nextPageToken
      }
    } catch (error) {
      console.error('YouTube search error:', error)
      throw new Error('Failed to search YouTube videos')
    }
  }

  private async getVideosByIds(videoIds: string[], includeStreamUrl: boolean = false): Promise<YouTubeVideo[]> {
    const validIds = videoIds.filter((id) => id && id.trim() !== '')
    
    if (validIds.length === 0) {
      return []
    }

    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos')
      url.searchParams.set('part', 'snippet,contentDetails,statistics')
      url.searchParams.set('id', validIds.join(','))
      url.searchParams.set('key', this.apiKey)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(url.toString(), {
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`)
      }

      const data = await response.json()

      const videos = await Promise.all(
        data.items.map(async (item: any) => {
          const thumbnails = Object.values(item.snippet.thumbnails).map((thumb: any) => ({
            url: thumb.url,
            width: thumb.width,
            height: thumb.height
          }))

          const apiVideo = {
            id: item.id,
            title: item.snippet.title,
            thumbnail: { thumbnails },
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            description: item.snippet.description,
            viewCount: item.statistics?.viewCount,
            publishDate: item.snippet.publishedAt,
            lengthText: this.formatDuration(item.contentDetails.duration),
            isLive: item.snippet.liveBroadcastContent === 'live'
          }

          return YouTubeHelper.transformYouTubeVideo(apiVideo, includeStreamUrl)
        })
      )

      return videos
    } catch (error) {
      console.error('Failed to get video details:', error)
      throw new Error('Failed to fetch video details')
    }
  }

  private formatDuration(isoDuration: string): string {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return '0:00'

    const hours = match[1] ? parseInt(match[1]) : 0
    const minutes = match[2] ? parseInt(match[2]) : 0
    const seconds = match[3] ? parseInt(match[3]) : 0

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  async getVideoById(videoId: string, includeStreamUrl: boolean = true): Promise<YouTubeVideo> {
    try {
      const videos = await this.getVideosByIds([videoId], includeStreamUrl)
      if (videos.length === 0) {
        throw new Error('Video not found')
      }
      return videos[0]
    } catch (error) {
      console.error(`Failed to get video ${videoId}:`, error)
      throw new Error('Failed to fetch YouTube video details')
    }
  }

  async getStreamUrl(videoId: string): Promise<string> {
    try {
      return await getYouTubeStreamUrl(videoId)
    } catch (error) {
      console.error(`Failed to get stream URL for ${videoId}:`, error)
      throw new Error('Failed to get YouTube stream URL')
    }
  }

  async getSuggestions(videoId: string, limit: number = 10): Promise<YouTubeVideo[]> {
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search')
      url.searchParams.set('part', 'snippet')
      url.searchParams.set('relatedToVideoId', videoId)
      url.searchParams.set('type', 'video')
      url.searchParams.set('maxResults', String(limit))
      url.searchParams.set('key', this.apiKey)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(url.toString(), {
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!response.ok) {
        console.error('Failed to get suggestions:', response.status)
        return []
      }

      const data = await response.json()
      
      if (!data.items || data.items.length === 0) {
        return []
      }

      const videoIds = data.items.map((item: any) => item.id.videoId).filter((id: string) => id)
      
      return await this.getVideosByIds(videoIds, false)
    } catch (error) {
      console.error(`Failed to get suggestions for ${videoId}:`, error)
      return []
    }
  }
}
