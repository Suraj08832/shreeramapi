# JioSaavn API

## Overview

An unofficial TypeScript API wrapper for JioSaavn that provides programmatic access to songs, albums, artists, playlists, and YouTube video search. The API is built using modern TypeScript with Hono framework and can be deployed on multiple platforms (Vercel, Cloudflare Workers, or locally with Bun/Node.js).

The project serves as a RESTful API proxy to JioSaavn's internal endpoints, transforming their responses into clean, typed data models with enhanced features like multi-quality download links and image variants.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Web Framework & API Design

**Technology**: Hono with OpenAPI/Zod validation  
**Pattern**: Modular controller-based architecture

The application uses Hono, a lightweight web framework, with OpenAPI integration for automatic API documentation. Each feature domain (songs, albums, artists, playlists, search, YouTube) is organized as a separate module with its own controller, service layer, use cases, models, and helpers.

**Rationale**: Hono provides excellent TypeScript support, is framework-agnostic (works on Node, Bun, Cloudflare Workers, Vercel), and has minimal overhead. The OpenAPI integration automatically generates interactive API documentation at `/docs` using Scalar.

### Module Structure (Clean Architecture)

**Pattern**: Feature-based modules with layered architecture

Each module follows a consistent structure:
- **Controllers**: Handle HTTP requests/responses, route definitions, OpenAPI schemas
- **Services**: Coordinate use cases and business logic
- **Use Cases**: Single-responsibility business operations (e.g., GetSongById, SearchAlbums)
- **Models**: Zod schemas for API responses and internal data structures
- **Helpers**: Transformation utilities and payload creators

**Rationale**: This separation of concerns makes the codebase maintainable and testable. Use cases are isolated, making it easy to modify business logic without affecting HTTP handling. The pattern scales well as new features are added.

### Request Handling & Data Transformation

**Approach**: Fetch from JioSaavn API → Parse → Transform → Validate

The `useFetch` helper acts as the central HTTP client, handling:
- JioSaavn API endpoint construction
- Random user-agent rotation (to avoid 403 errors from JioSaavn)
- API context switching (web6dot0 vs android contexts for different endpoints)

Data flows through helper functions that transform JioSaavn's API responses into clean, typed models:
- `createSongPayload`: Transforms raw song data, generates multi-quality download links
- `createAlbumPayload`: Structures album data with nested artist information
- `createSearchPayload`: Normalizes search results across different entity types

**Rationale**: JioSaavn's API returns inconsistently structured data with unclear field names. The transformation layer standardizes this into predictable, well-typed responses while adding value (like multiple image sizes and bitrate options).

### Download Link Generation

**Technology**: DES-ECB decryption using node-forge

JioSaavn provides encrypted media URLs. The `createDownloadLinks` helper:
1. Base64 decodes the encrypted URL
2. Decrypts using DES-ECB with hardcoded key/IV
3. Generates URLs for multiple bitrates (12kbps to 320kbps)

**Rationale**: This allows users to choose audio quality based on their needs without making multiple API calls.

### Type Safety & Validation

**Technology**: Zod for runtime schema validation

Every external API response is validated against a Zod schema before transformation. This provides:
- Runtime type checking of JioSaavn responses
- Automatic TypeScript type inference
- Early error detection if JioSaavn's API changes
- OpenAPI schema generation for documentation

**Rationale**: JioSaavn's API is undocumented and can change without notice. Runtime validation catches breaking changes immediately rather than silently failing.

### Path Aliases

**Configuration**: TypeScript paths with tsc-alias

The project uses path aliases for clean imports:
- `#modules/*` → Module-level imports
- `#common/*` → Shared utilities, types, helpers

**Rationale**: Avoids deep relative imports (`../../../../common/helpers`) and makes refactoring easier.

### Testing Strategy

**Technology**: Vitest

Tests focus on use cases and controllers, validating:
- Actual API responses against Zod schemas
- Link/ID extraction from URLs
- Data transformation accuracy

Tests use real API calls with retry logic and extended timeouts to handle network variability.

**Rationale**: Integration tests catch real-world API changes better than mocked unit tests for an API wrapper.

### CORS & Caching

**Configuration**: Permissive CORS, 5-minute cache with stale-while-revalidate

Headers configured in `vercel.json` and middleware:
- Allow all origins (`*`)
- 5-minute cache (`s-maxage=300`)
- Stale content served while revalidating

**Rationale**: Public API design for maximum accessibility. Short cache reduces stale data while minimizing load on JioSaavn's servers.

### Error Handling

**Approach**: HTTPException with descriptive messages

Controllers throw `HTTPException` from Hono with appropriate status codes:
- 404: Resource not found
- 500: Station creation or data fetching failures

Global error handler in `app.ts` catches and formats these consistently.

**Rationale**: Provides clear, actionable error messages to API consumers while maintaining consistent error response structure.

## External Dependencies

### JioSaavn Internal API

**Type**: Third-party music streaming service  
**Endpoints**: `www.jiosaavn.com/api.php`

The entire application acts as a wrapper around JioSaavn's undocumented internal API. Various endpoints are abstracted in `src/common/constants/endpoint.constant.ts`:
- Search (songs, albums, artists, playlists)
- Content retrieval (by ID or permalink)
- Song stations and suggestions

**Integration Method**: Direct HTTP requests with query parameters, user-agent rotation to avoid rate limiting.

### YouTube Data API v3 (Optional)

**Type**: Google API for video search  
**Authentication**: API key via `YOUTUBE_API_KEY` environment variable

The YouTube module (`src/modules/youtube`) provides video search functionality:
- Search videos by keyword
- Fetch video metadata (duration, views, thumbnails)
- Optional stream URL extraction using yt-dlp

**Integration Method**: REST API calls to `googleapis.com/youtube/v3/search` and `videos` endpoints.

### yt-dlp (Optional)

**Type**: Command-line tool for video URL extraction  
**Usage**: Spawns subprocess to extract best audio stream URL

When `stream=true` is requested in YouTube search, the system:
1. Spawns `yt-dlp` process with video URL
2. Extracts direct audio stream URL
3. Returns in API response

**Note**: Requires yt-dlp binary to be available in system PATH.

### Cryptography

**Library**: node-forge  
**Purpose**: DES-ECB decryption of JioSaavn media URLs

Used exclusively in `createDownloadLinks` helper to decrypt media URLs provided by JioSaavn's API.

### Deployment Platforms

**Supported**: Vercel (primary), Cloudflare Workers, Docker, Node.js/Bun

- **Vercel**: Configured via `vercel.json`, uses serverless function wrapper in `api/index.ts`
- **Cloudflare Workers**: Hono's platform-agnostic design allows deployment via Wrangler
- **Local/Docker**: Direct server execution via Bun or Node.js

**Runtime**: Bun (development/production) or Node.js (v20+) with TypeScript compilation.