import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the API entry payload', () => {
      expect(appController.getIndex()).toEqual({
        name: 'subo-api',
        version: '0.1.0',
        prefix: '/api',
        modules: [
          'health',
          'site-profile',
          'service-catalog',
          'quotes',
          'crm',
          'orders',
          'procurement',
          'iam',
        ],
      });
    });
  });
});
