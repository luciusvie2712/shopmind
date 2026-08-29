import type { MultimodalSearchContract } from '@shopmind/contracts';
import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { config } from '../../common/config';
import { MultimodalSearchDto } from './dto/multimodal-search.dto';
import { MultimodalSearchService } from './multimodal-search.service';
interface UploadedImage {
  readonly buffer: Buffer;
  readonly mimetype: string;
}
@Controller('search')
export class MultimodalSearchController {
  constructor(private readonly searchService: MultimodalSearchService) {}
  @Post('image')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: config.ai.multimodalMaxUploadBytes, files: 1 },
    }),
  )
  search(
    @UploadedFile() file: UploadedImage | undefined,
    @Body() input: MultimodalSearchDto,
  ): Promise<MultimodalSearchContract> {
    return this.searchService.search(file, input);
  }
}
