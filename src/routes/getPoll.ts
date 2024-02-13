import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export async function getPoll(app: FastifyInstance) {
  app.get('/polls/:pollId', async (req, res) => {
    const getPollParams = z.object({
      pollId: z.string().uuid(),
    });

    const { pollId } = getPollParams.parse(req.params);

    const poll = await prisma.poll.findUnique({
      where: {
        id: pollId,
      },
      include: {
        options: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!poll)
      return res.status(400).send({ message: 'Enquete não encontrada.' });

    const result = await redis.zrange(pollId, 0, -1, 'WITHSCORES');

    const votes = result.reduce((obj, line, index) => {
      if (index % 2 === 0) {
        const score = result[index + 1];

        Object.assign(obj, { [line]: score });
      }

      return obj;
    }, {} as Record<string, number>);

    return res.send({
      poll: {
        id: poll.id,
        title: poll.title,
        options: poll.options.map((option) => {
          return {
            id: option.id,
            title: option.title,
            votes: option.id in votes ? votes[option.id] : 0,
          };
        }),
      },
    });
  });
}