export type ServiceStatus = 'up' | 'down';

/** Response body of `GET /api/health`. */
export interface HealthResponse {
  status: ServiceStatus;
  database: ServiceStatus;
  timestamp: string;
}
