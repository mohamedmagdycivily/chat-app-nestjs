import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

/**
 * Maxwell CDC Event Structure
 * This is what Maxwell publishes from the outbox table
 */
interface MaxwellCDCEvent {
  database: string;
  table: string;
  type: 'insert' | 'update' | 'delete';
  ts: number;
  data: {
    id: number;
    event_id: string;
    event_type: string;
    aggregate_id: string;
    timestamp: string;
    data: any; // The actual event payload
    exchange: string; // Target exchange from outbox
    routing_key: string; // Target routing key from outbox
    created_at: string;
    updated_at: string;
  };
}

/**
 * OutboxTransformerProcessor
 *
 * Purpose:
 * - Consumes CDC events from Maxwell (routing key: "outbox.event")
 * - Extracts the actual event data and target routing information
 * - Re-publishes to the correct exchange and routing key
 *
 * Why this is needed:
 * - Maxwell cannot dynamically read routing keys from outbox data
 * - Maxwell's routing_key_template can only access row metadata, not data fields
 * - This service bridges the gap between CDC and application-level routing
 */
@Injectable()
export class OutboxTransformerProcessor {
  private readonly logger = new Logger(OutboxTransformerProcessor.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  @RabbitSubscribe({
    exchange: process.env.CHAT_EXCHANGE || 'x.chat-service',
    routingKey: 'outbox.event', // Maxwell publishes all outbox events here
    queue: 'q.outbox.transformer',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'x.dlx.chat-service',
      },
    },
  })
  async handleOutboxEvent(msg: MaxwellCDCEvent) {
    try {
      this.logger.log(
        `🌟 🌟 🌟 🌟 🌟  Received CDC event: ${msg.data.event_type} (${msg.data.event_id})`,
      );
      this.logger.log(`🌟 🌟 🌟 🌟 🌟  msg: ${JSON.stringify(msg)}`);

      // Only process INSERT events (new outbox records)
      if (msg.type !== 'insert') {
        this.logger.debug(`Ignoring ${msg.type} event for outbox`);
        return;
      }

      // Extract the target routing information from the outbox record
      const targetExchange = msg.data.exchange;
      const targetRoutingKey = msg.data.routing_key;

      // Extract the actual event payload
      const eventPayload = {
        eventId: msg.data.event_id,
        eventType: msg.data.event_type,
        aggregateId: msg.data.aggregate_id,
        timestamp: msg.data.timestamp,
        data: msg.data.data, // The actual business data
      };

      // Re-publish to the correct exchange and routing key
      await this.amqpConnection.publish(
        targetExchange,
        targetRoutingKey,
        eventPayload,
        {
          persistent: true,
          contentType: 'application/json',
        },
      );

      this.logger.log(
        `✅ Transformed and published: ${targetRoutingKey} → ${targetExchange}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to transform outbox event: ${error.message}`,
        error.stack,
      );
      throw error; // Let RabbitMQ handle retry/DLQ
    }
  }
}
