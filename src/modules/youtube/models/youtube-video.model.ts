import { z } from 'zod'

export const YouTubeVideoAPIResponseModel = z.object({
  id: z.string(),
  title: z.string(),
  thumbnail: z.object({
    thumbnails: z.array(
      z.object({
        url: z.string(),
        width: z.number(),
        height: z.number()
      })
    )
  }),
  channelTitle: z.string(),
  channelId: z.string(),
  description: z.string(),
  viewCount: z.string().optional(),
  publishDate: z.string().optional(),
  publishedText: z.string().optional(),
  lengthText: z.string().optional(),
  isLive: z.boolean().optional()
})

export const YouTubeVideoModel = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('youtube'),
  duration: z.number().nullable(),
  url: z.string(),
  image: z.array(
    z.object({
      quality: z.string(),
      url: z.string()
    })
  ),
  channel: z.object({
    id: z.string(),
    name: z.string()
  }),
  description: z.string(),
  publishDate: z.string().nullable(),
  viewCount: z.number().nullable(),
  isLive: z.boolean(),
  streamUrl: z.string().nullable()
})

export type YouTubeVideo = z.infer<typeof YouTubeVideoModel>
export type YouTubeVideoAPIResponse = z.infer<typeof YouTubeVideoAPIResponseModel>
