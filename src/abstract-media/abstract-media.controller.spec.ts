import { Test, TestingModule } from '@nestjs/testing';
import { AbstractMediaController } from './abstract-media.controller';

describe('AbstractMediaController', () => {
  let controller: AbstractMediaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AbstractMediaController],
    }).compile();

    controller = module.get<AbstractMediaController>(AbstractMediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
