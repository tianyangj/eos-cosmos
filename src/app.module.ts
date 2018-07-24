import { Module } from '@nestjs/common';
import { AppController } from 'app.controller';
import { BlocksController } from 'blocks.controller';
import { AppService } from 'app.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    BlocksController
  ],
  providers: [
    AppService
  ],
})
export class AppModule { }
