import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';

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
      exchanges: [],
      connectionInitOptions: { wait: false },
    }),
  ],
  providers: [],
  exports: [RabbitMQModule],
})
export class MessagingModule {}
