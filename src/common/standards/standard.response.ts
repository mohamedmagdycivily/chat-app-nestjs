import { ApiProperty } from '@nestjs/swagger';
import { plainToClass } from 'class-transformer';
import { ErrorItem } from '../utils.helper';

export enum STATUS {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export class StandardException {
  public readonly errors: ErrorItem[] = [];
  constructor(errors: ErrorItem[]) {
    for (const error of errors) {
      this.errors.push(
        plainToClass(ErrorItem, error, { excludeExtraneousValues: true }),
      );
    }
  }
}

export class StandardResponse<T> {
  @ApiProperty({
    required: true,
    type: 'string',
    description: 'Response Status',
    example: 'SUCCESS | ERROR',
  })
  status: STATUS;

  @ApiProperty({
    required: false,
    type: 'string',
    description: 'Response Message',
    example: 'Operation Succeeded.',
  })
  message?: string;

  @ApiProperty({
    required: false,
    type: 'string',
    description: 'Response Message Translation Key',
    example: 'SUCCESS_OPERATION',
  })
  key?: string;

  @ApiProperty({
    required: false,
    type: 'any',
    description: 'Response Data',
    example: 'any data',
  })
  data?: T;

  @ApiProperty({
    required: false,
    type: 'array',
    description: 'Array of the existing errors',
    example:
      '[{ "message": "Error Message!", "key": "ERROR_MESSAGE_TRANSLATION_CODE" }]',
  })
  errors?: ErrorItem[];

  constructor({
    status,
    data,
    errors,
  }: {
    status: STATUS;
    data?: any;
    errors?: ErrorItem[];
  }) {
    this.status = status;
    if (status === STATUS.SUCCESS) {
      this.message = data?.message || 'Operation Succeeded.';
      if (data?.message) {
        delete data.message;
      }
      this.key = 'OPERATION_SUCCEEDED';
    }

    if (data && Object.keys(data).length) {
      this.data = data;
    }
    this.errors = errors?.map((errorData: ErrorItem) => ({
      ...errorData,
      key: 'SOME_THING_WENT_WRONG',
    }));
  }
}
