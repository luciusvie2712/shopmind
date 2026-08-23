import type { AiCompareContract } from '@shopmind/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { RequestWithId } from '../../common/http/request-context.middleware';
import type { CompareProductsDto } from './dto/compare-products.dto';
import { ProductComparisonFactsService } from './product-comparison-facts.service';
import {
  AI_SEARCH_PROVIDER,
  type AiProvider,
  AiProviderInvalidOutputError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from './provider/ai-provider';

@Injectable()
export class CompareService {
  constructor(
    @Inject(AI_SEARCH_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly facts: ProductComparisonFactsService,
  ) {}

  async compare(
    input: CompareProductsDto,
    requestId: RequestWithId['requestId'],
  ): Promise<AiCompareContract> {
    const products = await this.facts.getFacts(input.productIds);
    try {
      const result = await this.aiProvider.compareProducts({ products });
      return {
        products,
        summary: result.summary,
        referencedProductIds: result.referencedProductIds,
        status: 'success',
        requestId,
      };
    } catch (error) {
      const fallbackReason = this.fallbackReason(error);
      if (fallbackReason === undefined) throw error;
      return {
        products,
        referencedProductIds: [],
        status: 'fallback',
        fallbackReason,
        requestId,
      };
    }
  }

  private fallbackReason(error: unknown) {
    if (error instanceof AiProviderInvalidOutputError) {
      return 'AI_INVALID_OUTPUT' as const;
    }
    if (
      error instanceof AiProviderTimeoutError ||
      error instanceof AiProviderUnavailableError
    ) {
      return 'AI_PROVIDER_TIMEOUT' as const;
    }
    return undefined;
  }
}
