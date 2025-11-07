import { Expose } from 'class-transformer';
import { ValidationError } from 'class-validator';
import { v4 as UUIDv4 } from 'uuid';
import { Channel, Message } from 'amqplib';
export class ErrorItem {
  @Expose()
  message: string;
  @Expose()
  path?: string;
}

const bypassPhoneNumber = process.env.BYPASS_PHONE_NUMBER?.split(',') || [];

export const generateCode = (phone?: string) => {
  if (bypassPhoneNumber.includes(phone?.toString() || '')) {
    return '000000';
  }

  return process.env.NODE_ENV !== 'production' &&
    phone?.toString().startsWith('018')
    ? '000000'
    : Math.floor(100000 + Math.random() * 900000).toString();
};

export const addMinutesToDate = (dateToUse: Date, minutes: number) => {
  const dateTemp = new Date(dateToUse);
  dateTemp.setTime(dateTemp.getTime() + minutes * 60 * 1000);
  return dateTemp;
};

export const subMinutesToDate = (dateToUse: Date, minutes: number) => {
  const dateTemp = new Date(dateToUse);
  dateTemp.setTime(dateTemp.getTime() - minutes * 60 * 1000);
  return dateTemp;
};

export const getPastDateInDays = (numberOfDay: number) => {
  return new Date(Date.now() - numberOfDay * 24 * 60 * 60 * 1000);
};

export const generateUUID = () => {
  return UUIDv4(); // Ex ⇨ '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
};

export function flattenValidationErrors(
  validationErrors: ValidationError[] = [],
  property: string,
) {
  const errors: ErrorItem[] = [];
  for (const validationError of validationErrors) {
    for (const key in validationError.constraints) {
      errors.push({
        message: validationError.constraints[key],
        path: `${property === '' ? '' : `${property}.`}${
          validationError.property
        }`,
      });
    }
    if (validationError.children?.length) {
      errors.push(
        ...flattenValidationErrors(
          validationError.children,
          `${property === '' ? '' : `${property}.`}${validationError.property}`,
        ),
      );
    }
  }
  return errors;
}

export const createRabbitErrorHandler = (eventHandlerName: string) => {
  return (channel: Channel, msg: Message, err: any) => {
    if (err.status >= 500 || !err.status) {
      // case of unhandled error (ex: db connection error, internal server error, .. etc) => nack the event requeueing it after 2 seconds
      console.warn(
        `Trying to handle ${eventHandlerName} with eventId ${JSON.parse(msg.content.toString('utf-8')).eventId} for the ${msg.properties.headers?.['x-delivery-count']} time`,
        {
          methodName: createRabbitErrorHandler.name,
          className: 'RabbitErrorHandler',
          eventHandlerName,
          eventId: JSON.parse(msg.content.toString('utf-8')).eventId,
          deliveryCount: msg.properties.headers?.['x-delivery-count'],
        },
      );
      setTimeout(() => {
        channel.nack(msg, false, true);
      }, 2000);
    } else {
      // case of handled error (ex: DTO validation failed, not found error, .. etc) => nack the event sending it to DLQ
      console.error(
        `Error while handling ${eventHandlerName} with eventId ${JSON.parse(msg.content.toString('utf-8')).eventId}, ${JSON.stringify(err)}`,
        {
          methodName: createRabbitErrorHandler.name,
          className: 'RabbitErrorHandler',
          eventHandlerName,
          eventId: JSON.parse(msg.content.toString('utf-8')).eventId,
          error: err,
        },
      );
      channel.nack(msg, false, false);
    }
  };
};
