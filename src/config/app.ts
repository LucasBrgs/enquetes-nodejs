export const server = {
  host: process.env.SERVER_HOST || 'localhost',
  port: Number(process.env.SERVER_PORT) || 3000
}