import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import {
  type ProductDetailContract,
  type ProductListContract,
} from './product.contract';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@Query() query: ListProductsQueryDto): Promise<ProductListContract> {
    return this.productsService.list(query);
  }

  @Get(':id')
  detail(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ProductDetailContract> {
    return this.productsService.detail(id);
  }
}
