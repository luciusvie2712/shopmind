import { IsString, MaxLength, MinLength } from 'class-validator';
import { ListProductsQueryDto } from '../../products/dto/list-products-query.dto';

export class SearchProductsQueryDto extends ListProductsQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  q!: string;
}
