
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { createFileUploadInputSchema, getFileInputSchema } from './schema';
import { uploadFile } from './handlers/upload_file';
import { getFile } from './handlers/get_file';
import { getFileInfo } from './handlers/get_file_info';
import { getFileStats } from './handlers/get_file_stats';
import { cleanupExpiredFiles } from './handlers/cleanup_expired_files';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Upload a new file
  uploadFile: publicProcedure
    .input(createFileUploadInputSchema)
    .mutation(({ input }) => uploadFile(input)),
  
  // Get file for download (increments counter)
  getFile: publicProcedure
    .input(getFileInputSchema)
    .query(({ input }) => getFile(input)),
  
  // Get file information without downloading
  getFileInfo: publicProcedure
    .input(getFileInputSchema)
    .query(({ input }) => getFileInfo(input)),
  
  // Get overall file statistics
  getFileStats: publicProcedure
    .query(() => getFileStats()),
  
  // Clean up expired files (for maintenance)
  cleanupExpiredFiles: publicProcedure
    .mutation(() => cleanupExpiredFiles()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`File sharing server listening at port: ${port}`);
  console.log('Created by Earl Store');
}

start();
