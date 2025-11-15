import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { YouTubeVideoModel } from '../models'
import { YouTubeService } from '../services'
import { z } from 'zod'
import type { Routes } from '#common/types'

export class YouTubeController implements Routes {
  public controller: OpenAPIHono
  private youtubeService: YouTubeService

  constructor() {
    this.controller = new OpenAPIHono()
    this.youtubeService = new YouTubeService()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/youtube/search',
        tags: ['YouTube'],
        summary: 'Search YouTube videos',
        description: 'Search for YouTube videos by keyword with optional stream URL fetching',
        operationId: 'searchYouTube',
        request: {
          query: z.object({
            query: z.string().openapi({
              title: 'Search Query',
              description: 'Keywords to search for',
              type: 'string',
              example: 'lofi hip hop'
            }),
            limit: z
              .string()
              .optional()
              .default('10')
              .transform((val) => Number.parseInt(val))
              .openapi({
                title: 'Limit',
                description: 'Maximum number of results (default: 10)',
                type: 'string',
                example: '10'
              }),
            stream: z
              .string()
              .optional()
              .default('false')
              .transform((val) => val === 'true')
              .openapi({
                title: 'Include Stream URL',
                description: 'Include audio stream URLs (slower but enables playback)',
                type: 'string',
                example: 'true'
              })
          })
        },
        responses: {
          200: {
            description: 'Successful search results',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean().openapi({ example: true }),
                  data: z.array(YouTubeVideoModel)
                })
              }
            }
          },
          400: { description: 'Bad request - missing query parameter' }
        }
      }),
      async (ctx) => {
        const { query, limit, stream } = ctx.req.valid('query')

        if (!query) {
          return ctx.json({ success: false, message: 'Query parameter is required' }, 400)
        }

        try {
          const { videos } = await this.youtubeService.searchVideos(query, limit, stream)
          return ctx.json({ success: true, data: videos })
        } catch (error) {
          return ctx.json({ success: false, message: 'Search failed' }, 500)
        }
      }
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/youtube/video/:id',
        tags: ['YouTube'],
        summary: 'Get YouTube video details',
        description: 'Retrieve detailed information about a specific YouTube video including stream URL',
        operationId: 'getYouTubeVideo',
        request: {
          params: z.object({
            id: z.string().openapi({
              title: 'Video ID',
              description: 'YouTube video ID',
              type: 'string',
              example: 'dQw4w9WgXcQ'
            })
          }),
          query: z.object({
            stream: z
              .string()
              .optional()
              .default('true')
              .transform((val) => val === 'true')
              .openapi({
                title: 'Include Stream URL',
                description: 'Include audio stream URL (default: true)',
                type: 'string',
                example: 'true'
              })
          })
        },
        responses: {
          200: {
            description: 'Video details retrieved successfully',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean().openapi({ example: true }),
                  data: YouTubeVideoModel
                })
              }
            }
          },
          404: { description: 'Video not found' }
        }
      }),
      async (ctx) => {
        const { id } = ctx.req.valid('param')
        const { stream } = ctx.req.valid('query')

        try {
          const video = await this.youtubeService.getVideoById(id, stream)
          return ctx.json({ success: true, data: video })
        } catch (error) {
          return ctx.json({ success: false, message: 'Video not found' }, 404)
        }
      }
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/youtube/stream/:id',
        tags: ['YouTube'],
        summary: 'Get audio stream URL',
        description: 'Get the direct audio stream URL for a YouTube video',
        operationId: 'getYouTubeStream',
        request: {
          params: z.object({
            id: z.string().openapi({
              title: 'Video ID',
              description: 'YouTube video ID',
              type: 'string',
              example: 'dQw4w9WgXcQ'
            })
          })
        },
        responses: {
          200: {
            description: 'Stream URL retrieved successfully',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean().openapi({ example: true }),
                  data: z.object({
                    streamUrl: z.string()
                  })
                })
              }
            }
          },
          404: { description: 'Stream not available' }
        }
      }),
      async (ctx) => {
        const { id } = ctx.req.valid('param')

        try {
          const streamUrl = await this.youtubeService.getStreamUrl(id)
          return ctx.json({ success: true, data: { streamUrl } })
        } catch (error) {
          return ctx.json({ success: false, message: 'Stream not available' }, 404)
        }
      }
    )

    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/youtube/suggestions/:id',
        tags: ['YouTube'],
        summary: 'Get video suggestions',
        description: 'Get suggested/related videos for a specific YouTube video',
        operationId: 'getYouTubeSuggestions',
        request: {
          params: z.object({
            id: z.string().openapi({
              title: 'Video ID',
              description: 'YouTube video ID',
              type: 'string',
              example: 'dQw4w9WgXcQ'
            })
          }),
          query: z.object({
            limit: z
              .string()
              .optional()
              .default('10')
              .transform((val) => Number.parseInt(val))
              .openapi({
                title: 'Limit',
                description: 'Maximum number of suggestions (default: 10)',
                type: 'string',
                example: '10'
              })
          })
        },
        responses: {
          200: {
            description: 'Suggestions retrieved successfully',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean().openapi({ example: true }),
                  data: z.array(YouTubeVideoModel)
                })
              }
            }
          }
        }
      }),
      async (ctx) => {
        const { id } = ctx.req.valid('param')
        const { limit } = ctx.req.valid('query')

        const suggestions = await this.youtubeService.getSuggestions(id, limit)
        return ctx.json({ success: true, data: suggestions })
      }
    )
  }
}
