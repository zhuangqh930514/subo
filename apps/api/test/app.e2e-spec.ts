import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let originalDatabaseUrl: string | undefined;
  let adminToken: string;

  beforeEach(async () => {
    originalDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({
        username: 'admin',
        password: 'admin123',
      })
      .expect(201);

    adminToken = loginResponse.body.token;
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect({
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

  it('/api/service-catalog/catalog (GET) returns demo catalog without database', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/service-catalog/catalog')
      .expect(200);

    expect(response.body.demoMode).toBe(true);
    expect(response.body.summary).toEqual({
      categoryCount: 2,
      itemCount: 4,
    });
    expect(response.body.categories).toHaveLength(2);
    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'GA1093',
          name: '裸鼠皮下移植瘤',
        }),
      ]),
    );
  });

  it('/api/site-profile/public (GET) returns the current default homepage copy without database', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/site-profile/public')
      .expect(200);

    expect(response.body.source).toBe('default');
    expect(response.body.profile).toEqual(
      expect.objectContaining({
        companyName: '广州溯博生物科技有限公司',
        eyebrow: '广州溯博生物科技有限公司',
        heroTitle: '溯源科学，博行致远',
        heroSummary:
          '广州溯博生物科技有限公司面向高校、医院、科研团队与企业客户，提供技术服务、试剂耗材代采与商务协同支持。',
      }),
    );
  });

  it('/api/service-catalog/admin/overview (GET) returns demo overview without database', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/service-catalog/admin/overview?search=GA1093&limit=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.demoMode).toBe(true);
    expect(response.body.summary).toEqual({
      categoryCount: 2,
      projectCount: 2,
      itemCount: 4,
      activeItemCount: 4,
    });
    expect(response.body.filters.statuses).toEqual(['active', 'inactive', 'archived']);
    expect(response.body.items).toEqual([
      expect.objectContaining({
        code: 'GA1093',
        displayCode: 'GA1093',
        name: '裸鼠皮下移植瘤',
        status: 'active',
      }),
    ]);
  });

  it('/api/admin/customers/overview (GET) returns demo overview without database', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/customers/overview?limit=3')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.demoMode).toBe(true);
    expect(response.body.summary).toEqual({
      totalCustomers: 0,
      totalInvoiceProfiles: 0,
      customersWithOrders: 0,
      customersMissingInvoiceProfiles: 0,
    });
    expect(response.body.recentCustomers).toEqual([]);
    expect(response.body.recentInvoiceProfiles).toEqual([]);
  });

  it('/api/admin/orders/overview (GET) returns demo overview without database', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/orders/overview?limit=3')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.demoMode).toBe(true);
    expect(response.body.summary).toEqual({
      totalOrders: 0,
      serviceOrderCount: 0,
      procurementOrderCount: 0,
      paidOrderCount: 0,
      pendingPaymentCount: 0,
      totalOrderAmount: 0,
      totalOrderAmountLabel: '￥0.00',
    });
    expect(response.body.recentOrders).toEqual([]);
  });

  it('/api/admin/contracts/overview (GET) returns demo overview without database', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/contracts/overview?limit=3')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.demoMode).toBe(true);
    expect(response.body.summary).toEqual({
      totalContracts: 0,
      linkedOrderContracts: 0,
      unlinkedContracts: 0,
      legacyContracts: 0,
    });
    expect(response.body.recentContracts).toEqual([]);
  });

  it('/api/procurement/lists/generate (POST) keeps generate-list flow available without database', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/procurement/lists/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierLinkIds: [100018, 100019],
        linkedInquiry: '广东省人民医院代采需求',
        remark: '演示联调',
        exportFormat: 'Excel',
      })
      .expect(201);

    expect(response.body.demoMode).toBe(true);
    expect(response.body.message).toBe('已生成 1 份采购清单。');
    expect(response.body.records).toEqual([
      expect.objectContaining({
        platform: '锐竟',
        status: '已生成',
        itemCount: 2,
      }),
    ]);
  });

  it('/api/iam/me (GET) returns bootstrap admin session without database', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/iam/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual({
      authenticated: true,
      user: {
        id: 'bootstrap-admin',
        username: 'admin',
        displayName: '系统管理员',
        nickname: '系统管理员',
        roles: [],
        source: 'bootstrap',
      },
    });
  });

  it('/api/service-catalog/admin/overview (GET) rejects unauthenticated access', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/service-catalog/admin/overview')
      .expect(401);

    expect(response.body.message).toBe('请先登录后台。');
  });

  it('/api/admin/customers/overview (GET) rejects unauthenticated access', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/customers/overview')
      .expect(401);

    expect(response.body.message).toBe('请先登录后台。');
  });

  it('/api/admin/contracts/overview (GET) rejects unauthenticated access', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/contracts/overview')
      .expect(401);

    expect(response.body.message).toBe('请先登录后台。');
  });

  it('/api/admin/orders/:id/contracts (POST) rejects unauthenticated access', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/admin/orders/1/contracts')
      .attach('file', Buffer.from('demo'), 'demo-contract.txt')
      .field('contractName', '演示合同')
      .expect(401);

    expect(response.body.message).toBe('请先登录后台。');
  });

  it('/api/service-catalog/admin/items/:id (PUT) is unavailable without database', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/service-catalog/admin/items/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '联调测试',
      })
      .expect(503);

    expect(response.body.message).toBe('DATABASE_URL 未配置，当前不能修改服务目录。');
  });

  it('/api/service-catalog/admin/items/bulk-status (POST) is unavailable without database', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/service-catalog/admin/items/bulk-status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ids: [1, 2],
        status: 'inactive',
      })
      .expect(503);

    expect(response.body.message).toBe('DATABASE_URL 未配置，当前不能批量修改服务目录。');
  });

  it('/api/service-catalog/admin/reimport (POST) is unavailable without database', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/service-catalog/admin/reimport')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(503);

    expect(response.body.message).toBe('DATABASE_URL 未配置，当前不能重新导入服务目录。');
  });

  it('/api/admin/orders/:id/contracts (POST) is unavailable without database', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/admin/orders/1/contracts')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('demo'), 'demo-contract.txt')
      .field('contractName', '演示合同')
      .expect(503);

    expect(response.body.message).toBe('DATABASE_URL 未配置，当前不能上传合同文件。');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }

    process.env.DATABASE_URL = originalDatabaseUrl;
  });
});
