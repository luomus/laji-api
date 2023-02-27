import { Test, TestingModule } from '@nestjs/testing';
import { ProxyToOldApiService } from './proxy-to-old-api.service';

describe('ProxyToOldApiService', () => {
  let service: ProxyToOldApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProxyToOldApiService],
    }).compile();

    service = module.get<ProxyToOldApiService>(ProxyToOldApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
