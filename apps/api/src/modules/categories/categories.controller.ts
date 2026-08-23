import { Controller, Get } from '@nestjs/common';
import { type CategoryContract } from '../products/product.contract';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list(): Promise<CategoryContract[]> {
    return this.categoriesService.list();
  }
}
