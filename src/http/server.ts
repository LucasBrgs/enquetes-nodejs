import fastify from 'fastify';
import { server } from '../config/app';
import { createPoll } from '../routes/createPoll';
import { getPoll } from '../routes/getPoll';
import cookie from '@fastify/cookie';
import { voteOnPoll } from '../routes/voteOnPoll';
import websocket from '@fastify/websocket';
import { pollResults } from './ws/pollResults';

const app = fastify();

app.register(cookie, {
  secret: '123456',
  hook: 'onRequest',
});

app.register(websocket);

app.register(createPoll);
app.register(getPoll);
app.register(voteOnPoll);

app.register(pollResults);

app.listen({ host: server.host, port: server.port }).then(() => {
  console.log(`HTTP server is running on host [${server.host}] port [${server.port}]`);
});