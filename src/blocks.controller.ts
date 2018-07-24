import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from 'app.service';

@Controller('blocks')
export class BlocksController {

  constructor(
    private readonly appService: AppService
  ) { }

  @Get()
  async findAll(): Promise<any> {
    return await this.appService.getBlocks(3);
  }

  @Get(':id')
  async findOne(@Param('id') id): Promise<any[]> {
    return await this.appService.getBlock(id);
  }
}
