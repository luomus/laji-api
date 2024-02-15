import { Test, TestingModule } from '@nestjs/testing';
import { PrepopulatedDocumentService } from './prepopulated-document.service';

describe('PrepopulatedDocumentService', () => {
  let service: PrepopulatedDocumentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrepopulatedDocumentService],
    }).compile();

    service = module.get<PrepopulatedDocumentService>(PrepopulatedDocumentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
