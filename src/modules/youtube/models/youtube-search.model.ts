import { z } from 'zod'
import { YouTubeVideoModel } from './youtube-video.model'

export const YouTubeSearchResultModel = z.object({
  success: z.boolean(),
  data: z.array(YouTubeVideoModel),
  nextPageToken: z.string().optional()
})

export type YouTubeSearchResult = z.infer<typeof YouTubeSearchResultModel>
