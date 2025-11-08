import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { AppRepository } from '../storage/main/repositories/app.repository';
import { CreateAppDto } from '../dtos/create-app.dto';
import { UpdateAppDto } from '../dtos/update-app.dto';
import { App } from '../storage/main/models/app.model';

@Injectable()
export class AppService {
  constructor(private readonly appRepository: AppRepository) {}
  async create(createAppDto: CreateAppDto): Promise<{ token: number }> {
    let attempts = 0;
    const maxAttempts = 10;

    // Keep trying until we get a unique token in DB
    while (attempts < maxAttempts) {
      try {
        // Create app with auto-generated token
        const app = await this.appRepository.create({
          name: createAppDto.name,
        });
        console.log('🌟 App created successfully', app);
        return { token: app.token };
      } catch (error) {
        // Handle unique constraint violation
        if (error.name === 'SequelizeUniqueConstraintError') {
          attempts++;
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException(
      'Failed to generate unique token after multiple attempts',
    );
  }

  async findAll(): Promise<App[]> {
    return this.appRepository.findAll();
  }

  async findByToken(token: number): Promise<App> {
    const app = await this.appRepository.findByToken(token);
    if (!app) {
      throw new NotFoundException('Application not found');
    }
    return app;
  }

  async update(token: number, updateAppDto: UpdateAppDto): Promise<App> {
    const app = await this.findByToken(token);

    await this.appRepository.update(app.id, {
      name: updateAppDto.name,
    });

    // Fetch updated app
    return this.findByToken(token);
  }
}
