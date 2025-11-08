import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import {
  chatReplicationEvents,
  contactReplicationEvents,
  deadLetterExchange,
  exchanges,
  messageReplicationEvents,
} from '../../common/messaging.config';
const replicationEvents = [
  ...contactReplicationEvents,
  ...chatReplicationEvents,
  ...messageReplicationEvents,
];
const deadLetterQueues = [...replicationEvents]
  .map((event) => event.routingKey)
  .map((routingKey) => ({
    name: `q.dlx.${process.env.MODULE_NAME}.${routingKey}`,
    exchange: deadLetterExchange.name,
    routingKey: routingKey,
    options: {
      arguments: {
        'x-queue-type': 'quorum',
      },
    },
  }));

@Module({
  imports: [
    RabbitMQModule.forRoot({
      uri: `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}/${process.env.NODE_ENV}`,
      channels: {
        default: {
          default: true,
          prefetchCount: 10,
        },
      },
      exchanges: [...exchanges, deadLetterExchange],
      queues: [...deadLetterQueues],
      connectionInitOptions: { wait: false },
    }),
  ],
  providers: [],
  exports: [RabbitMQModule],
})
export class MessagingModule {}
