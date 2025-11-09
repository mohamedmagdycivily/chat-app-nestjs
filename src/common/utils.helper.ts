import { Expose } from 'class-transformer';
import { ValidationError } from 'class-validator';
import { v4 as UUIDv4 } from 'uuid';
import { Channel, Message } from 'amqplib';
import { randomInt } from 'crypto';
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

/**
 * Generate a cryptographically secure random event ID
 * Uses 15-16 digit number for high volume (millions of events daily)
 * Range: 10^15 to 10^15 + 2^48 - 1 (1,000,000,000,000,000 to 1,281,474,976,710,655)
 * Provides ~281 trillion possible values, sufficient for millions of events daily
 * Note: crypto.randomInt has a limit of max - min <= 2^48 - 1 (281,474,976,710,655)
 * Uses crypto.randomInt for cryptographically secure randomness
 */
export const generateUniqueEventId = (): number => {
  // crypto.randomInt limit: max - min must be <= 2^48 - 1 = 281,474,976,710,655
  const min = 1000000000000000; // 10^15 (15 digits)
  const maxRange = 281474976710655; // 2^48 - 1 (maximum allowed range)
  const max = min + maxRange; // 1,281,474,976,710,655 (16 digits)
  // Use crypto.randomInt for cryptographically secure random number
  // Returns [min, max), so we get values from 10^15 to 1,281,474,976,710,654
  return randomInt(min, max);
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
