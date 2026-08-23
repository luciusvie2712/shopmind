import type {
  ProductListContract,
  SemanticSearchContract,
} from '@shopmind/contracts';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SearchProductsQueryDto } from './dto/search-products-query.dto';
import { SemanticSearchDto } from './dto/semantic-search.dto';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query() query: SearchProductsQueryDto): Promise<ProductListContract> {
    return this.searchService.search(query);
  }

  @Post('semantic')
  semantic(@Body() input: SemanticSearchDto): Promise<SemanticSearchContract> {
    return this.searchService.semantic(input);
  }
}
