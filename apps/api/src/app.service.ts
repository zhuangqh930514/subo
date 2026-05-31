import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getIndex() {
    return {
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
    };
  }
}
