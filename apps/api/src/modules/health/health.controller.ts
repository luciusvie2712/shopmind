import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import { HealthService, type HealthResult } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<HealthResult> {
    const result = await this.healthService.check();
    if (result.status === 'error') {
      throw new ApiException(
        ERROR_CODES.INTERNAL_ERROR,
        'Service is not ready',
        503,
      );
    }
    return result;
  }
}
