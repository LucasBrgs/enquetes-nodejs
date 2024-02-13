import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { randomUUID } from 'crypto';
import { redis } from '../lib/redis';
import { voting } from '../utils/pubSub';

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/vote', async (req, res) => {
    const voteOnPollParams = z.object({
      pollId: z.string().uuid(),
    });

    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid(),
    });

    const { pollId } = voteOnPollParams.parse(req.params);
    const { pollOptionId } = voteOnPollBody.parse(req.body);

    let { sessionId } = req.cookies;

    if (sessionId) {
      const userPreviousVote = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId,
          },
        },
      });

      if (userPreviousVote && userPreviousVote.pollOptionId !== pollOptionId) {
        await prisma.vote.delete({
          where: {
            id: userPreviousVote.id,
          },
        });

        const votes = await redis.zincrby(pollId, -1, userPreviousVote.pollOptionId);

        voting.publish(pollId, {
          pollOptionId: userPreviousVote.pollOptionId,
          votes: Number(votes),
        });

      } else if (userPreviousVote) {
        return res
          .status(400)
          .send({ message: 'Você já votou nessa enquete.' });
      }
    }

    if (!sessionId) {
      sessionId = randomUUID();

      res.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        signed: true,
        httpOnly: true,
      });
    }

    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId,
      },
    });

    const votes = await redis.zincrby(pollId, 1, pollOptionId);

    voting.publish(pollId, {
      pollOptionId,
      votes: Number(votes),
    });

    res.status(201).send();
  });
}
