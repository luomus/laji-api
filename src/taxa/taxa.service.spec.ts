import { Test, TestingModule } from '@nestjs/testing';
import { TaxaService } from './taxa.service';

describe('TaxaService', () => {
  let service: TaxaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaxaService],
    }).compile();

    service = module.get<TaxaService>(TaxaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
