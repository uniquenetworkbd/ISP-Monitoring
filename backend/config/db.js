export const db = {
  provider: process.env.DB_PROVIDER || 'postgresql',
  url: process.env.DATABASE_URL || ''
};