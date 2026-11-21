// Nx loads .env into the task env, so the proxy follows the service ports.
export default {
  '/api/auth': {
    target: `http://localhost:${process.env.AUTH_SERVICE_PORT ?? 3001}`,
    secure: false,
  },
  '/api/events': {
    target: `http://localhost:${process.env.REALTIME_GATEWAY_PORT ?? 3003}`,
    secure: false,
  },
  '/api/menu': {
    target: `http://localhost:${process.env.MENU_SERVICE_PORT ?? 3002}`,
    secure: false,
  },
  '/api/discount': {
    target: `http://localhost:${process.env.MENU_SERVICE_PORT ?? 3002}`,
    secure: false,
  },
  '/api': {
    target: `http://localhost:${process.env.BACKEND_PORT ?? 3000}`,
    secure: false,
  },
};
