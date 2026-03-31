const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const Redis = require('ioredis');

const TOKEN_FILE = path.join(__dirname, '../.tokens.json');
const TOKEN_ROW_ID = 1;
const PKCE_TTL_SECONDS = 600;

class AuthStorage {
  constructor() {
    this.redis = null;
    this.pgPool = null;
    this.fallbackPkce = new Map();
    this.pgReady = false;
    this.redisReady = false;
    this.initPromise = null;
  }

  async initialize() {
    if (!this.initPromise) {
      this.initPromise = this.initializeInternal();
    }
    return this.initPromise;
  }

  async initializeInternal() {
    await this.initializeRedis();
    await this.initializePostgres();
  }

  async initializeRedis() {
    if (!process.env.REDIS_URL) {
      console.warn('[AUTH] REDIS_URL not set, using in-memory PKCE store (not HA-safe)');
      return;
    }

    try {
      const redisOptions = {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true
      };

      if (process.env.REDIS_URL.startsWith('rediss://')) {
        redisOptions.tls = {
          rejectUnauthorized: false
        };
      }

      this.redis = new Redis(process.env.REDIS_URL, redisOptions);
      this.redis.on('error', (err) => {
        console.warn('[AUTH] Redis client error:', err.message);
      });
      await this.redis.ping();
      this.redisReady = true;
      console.log('[AUTH] Redis connected for PKCE state storage');
    } catch (error) {
      console.error('[AUTH] Redis connection failed, falling back to in-memory PKCE store:', error.message);
      this.redis = null;
      this.redisReady = false;
    }
  }

  async initializePostgres() {
    if (!process.env.DATABASE_URL) {
      console.warn('[AUTH] DATABASE_URL not set, using file token storage (not production durable)');
      return;
    }

    try {
      this.pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
      });

      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS oauth_tokens (
          id INTEGER PRIMARY KEY,
          access_token TEXT,
          refresh_token TEXT,
          instance_url TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      this.pgReady = true;
      console.log('[AUTH] Postgres connected for token persistence');
    } catch (error) {
      console.error('[AUTH] Postgres initialization failed, falling back to file token storage:', error.message);
      this.pgPool = null;
      this.pgReady = false;
    }
  }

  async savePkceState(state, payload) {
    const value = JSON.stringify(payload);
    if (this.redisReady && this.redis) {
      await this.redis.setex(`pkce:${state}`, PKCE_TTL_SECONDS, value);
      return;
    }

    this.fallbackPkce.set(state, { ...payload, timestamp: Date.now() });
    this.cleanupFallbackPkce();
  }

  async consumePkceState(state) {
    if (this.redisReady && this.redis) {
      const key = `pkce:${state}`;
      const value = await this.redis.get(key);
      if (!value) return null;
      await this.redis.del(key);
      return JSON.parse(value);
    }

    const entry = this.fallbackPkce.get(state);
    if (!entry) return null;
    this.fallbackPkce.delete(state);
    if (Date.now() - (entry.timestamp || 0) > PKCE_TTL_SECONDS * 1000) {
      return null;
    }
    return entry;
  }

  cleanupFallbackPkce() {
    const expiry = Date.now() - PKCE_TTL_SECONDS * 1000;
    for (const [key, value] of this.fallbackPkce.entries()) {
      if ((value.timestamp || 0) < expiry) {
        this.fallbackPkce.delete(key);
      }
    }
  }

  async loadTokens() {
    if (this.pgReady && this.pgPool) {
      const result = await this.pgPool.query(
        'SELECT access_token, refresh_token, instance_url FROM oauth_tokens WHERE id = $1 LIMIT 1',
        [TOKEN_ROW_ID]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          accessToken: row.access_token,
          refreshToken: row.refresh_token,
          instanceUrl: row.instance_url
        };
      }
      return null;
    }

    if (fs.existsSync(TOKEN_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    }
    return null;
  }

  async saveTokens(tokens) {
    if (this.pgReady && this.pgPool) {
      await this.pgPool.query(
        `
        INSERT INTO oauth_tokens (id, access_token, refresh_token, instance_url, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          instance_url = EXCLUDED.instance_url,
          updated_at = NOW()
        `,
        [TOKEN_ROW_ID, tokens.accessToken, tokens.refreshToken, tokens.instanceUrl]
      );
      return;
    }

    fs.writeFileSync(
      TOKEN_FILE,
      JSON.stringify(
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          instanceUrl: tokens.instanceUrl,
          savedAt: new Date().toISOString()
        },
        null,
        2
      )
    );
  }

  getStatus() {
    return {
      redis: {
        configured: Boolean(process.env.REDIS_URL),
        connected: this.redisReady,
        mode: this.redisReady ? 'redis' : 'memory_fallback'
      },
      postgres: {
        configured: Boolean(process.env.DATABASE_URL),
        connected: this.pgReady,
        mode: this.pgReady ? 'postgres' : 'file_fallback'
      },
      productionReady: this.redisReady && this.pgReady
    };
  }
}

module.exports = new AuthStorage();
