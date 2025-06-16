# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev    # Start the application (runs on port 3000)
npm start      # Same as dev - starts the application

# With environment variables
NODE_ENV=development LOG_LEVEL=debug npm run dev
PORT=8080 npm start
```

### Dependencies
```bash
npm install    # Install all dependencies
```

## Architecture

This is a monolithic Japanese memo application built with Fastify. The application has been enhanced with improved security, error handling, and performance features.

### Key Architectural Decisions:
- **Single file architecture**: All server and client code in `index.js` (planned to be refactored)
- **File-based storage**: Uses `data.json` for persistence with optional caching
- **No build process**: Runs directly with Node.js, no compilation or bundling
- **Embedded frontend**: HTML/CSS/JS served inline (CSS/JS can be extracted to `/public`)

### Security Features:
- **XSS Protection**: HTML escaping function for all user input
- **Input Validation**: JSON Schema validation for all API endpoints
- **Error Handling**: Global error handler with proper error messages
- **Process Management**: Graceful shutdown and uncaught exception handling

### Performance Features:
- **Memory Caching**: Optional in-memory cache for read operations
- **ID Management**: Efficient ID generation without array scanning
- **Static File Caching**: 7-day cache headers for production static files

### API Endpoints:
- `GET /` - Serves the main HTML page with embedded frontend
- `GET /api/memos` - Returns all memos as JSON
- `POST /api/memos` - Creates a new memo (validated: title, content required)
- `PUT /api/memos/:id` - Updates an existing memo (validated)
- `DELETE /api/memos/:id` - Deletes a memo

### Environment Variables:
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `DATA_FILE` - Data file path (default: ./data.json)
- `CACHE_ENABLED` - Enable caching (default: true)
- `CACHE_DURATION` - Cache TTL in ms (default: 5000)
- `BACKUP_ENABLED` - Enable backups on save (default: false)

### Data Structure:
Memos are stored in `data.json` with this structure:
```json
{
  "id": 1,
  "title": "タイトル",
  "content": "内容",
  "createdAt": "ISO date string",
  "updatedAt": "ISO date string"
}
```

### Validation Rules:
- Title: 1-200 characters, no HTML tags
- Content: 1-5000 characters
- ID: Numeric string pattern

### Important Notes:
- The application uses UTF-8 encoding throughout for proper Japanese text support
- No authentication or user management is implemented
- No tests are currently written (test script exits with error)
- Enhanced logging with structured output in development mode
- Graceful error handling with user-friendly messages