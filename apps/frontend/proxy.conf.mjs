// Nx loads .env into the task env, so the proxy follows BACKEND_PORT.
export default {
  '/api': {
    target: `http://localhost:${process.env.BACKEND_PORT ?? 3000}`,
    secure: false,
  },
};
