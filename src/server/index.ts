/**
 * Here Lies - Devvit Web Server
 * Main entrypoint for all server-side code.
 */

// Note: @devvit/public-api will be installed during actual development
// For now, we use minimal type definitions

type Context = unknown;

export default {
  name: 'here-lies',
  version: '0.1.0',
  
  async fetch(request: Request, _context: Context) {
    const url = new URL(request.url);
    
    // Route to appropriate handler
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request);
    }
    
    if (url.pathname.startsWith('/internal/')) {
      return handleInternalRequest(request);
    }
    
    return new Response('Not Found', { status: 404 });
  },
};

async function handleApiRequest(_request: Request): Promise<Response> {
  // TODO: Route to specific API endpoints
  // - GET /api/today
  // - POST /api/run/start
  // - POST /api/act
  // - POST /api/epitaph
  // - GET /api/reveal
  // - POST /api/vote
  // - POST /api/share
  // - GET /api/leaderboard
  // - GET /api/practice/:kind
  // - POST /api/ugc/submit
  
  return new Response(
    JSON.stringify({ error: 'API endpoint not implemented' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleInternalRequest(_request: Request): Promise<Response> {
  // TODO: Route to internal endpoints
  // - POST /internal/cron/daily
  // - POST /internal/cron/necropolis
  // - POST /internal/triggers/install
  // - POST /internal/menu/create-today
  // - POST /internal/menu/review-ugc
  // - POST /internal/menu/remove-epitaph
  
  return new Response(
    JSON.stringify({ error: 'Internal endpoint not implemented' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  );
}
