import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Module({
  providers: [DocumentsService]
})
export class DocumentsModule {}
