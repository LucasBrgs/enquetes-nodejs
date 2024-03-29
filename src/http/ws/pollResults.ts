import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { voting } from '../../utils/pubSub';

export async function pollResults(app: FastifyInstance) {
  app.get('/polls/:pollId/results', { websocket: true }, async (conn, req) => {
    const pollResultsParams = z.object({
      pollId: z.string().uuid(),
    });

    const { pollId } = pollResultsParams.parse(req.params);

    voting.subscribe(pollId, (message) => {
      conn.socket.send(JSON.stringify(message));
    });
  });
}
