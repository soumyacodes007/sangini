// Health Check API
// GET /api/health - Check system health
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getServer } from '@/lib/stellar/transaction';

export const dynamic = 'force-dynamic';

// GET /api/health - Health check endpoint
export async function GET() {
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: {
      database: { status: string; latency?: number };
      stellar: { status: string; latency?: number };
    };
    version: string;
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'unknown' },
      stellar: { status: 'unknown' },
    },
    version: process.env.npm_package_version || '1.0.0',
  };

  // Check MongoDB
  try {
    const dbStart = Date.now();
    const db = await getDb();
    await db.command({ ping: 1 });
    health.services.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    health.services.database = {
      status: 'unhealthy',
    };
    health.status = 'degraded';
  }

  // Check Stellar RPC
  try {
    const stellarStart = Date.now();
    const server = getServer();
    await server.getHealth();
    health.services.stellar = {
      status: 'healthy',
      latency: Date.now() - stellarStart,
    };
  } catch (error) {
    health.services.stellar = {
      status: 'unhealthy',
    };
    health.status = 'degraded';
  }

  // If both services are unhealthy, mark as unhealthy
  if (
    health.services.database.status === 'unhealthy' &&
    health.services.stellar.status === 'unhealthy'
  ) {
    health.status = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
