export const exchanges = [
  process.env.CHAT_EXCHANGE,
  process.env.MESSAGE_EXCHANGE,
].map((exchangeName) => ({
  name: exchangeName,
  type: 'topic',
}));
export const chatEvents = {
  CreateChatEvent: 'CreateChatEvent',
  ChatCreatedEvent: 'ChatCreatedEvent',
};
export const messageEvents = {
  CreateMessageEvent: 'CreateMessageEvent',
  MessageCreatedEvent: 'MessageCreatedEvent',
  MessageDeletedEvent: 'MessageDeletedEvent',
};
export const contactReplicationEvents = [
  'ContactCreatedEvent',
  'ContactDeletedEvent',
].map((eventName) => ({
  routingKey: eventName,
  exchange: process.env.CHAT_SERVICE_EXCHANGE,
  moduleName: 'chat-service',
}));

export const chatReplicationEvents = [chatEvents.CreateChatEvent].map(
  (eventName) => ({
    routingKey: eventName,
    exchange: process.env.CHAT_SERVICE_EXCHANGE,
    moduleName: 'chat-service',
  }),
);

export const messageReplicationEvents = [
  messageEvents.CreateMessageEvent,
  // messageEvents.MessageCreatedEvent,
  // messageEvents.MessageDeletedEvent,
].map((eventName) => ({
  routingKey: eventName,
  exchange: process.env.CHAT_SERVICE_EXCHANGE,
  moduleName: 'chat-service',
}));

export const deadLetterExchange = {
  name: `x.dlx.${process.env.MODULE_NAME}`,
  type: 'topic',
};
