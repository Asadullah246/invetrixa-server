import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { App } from 'supertest/types';

interface HealthResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    status: string;
    timestamp: string;
    uptime: string;
    version: string;
    environment: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    database: {
      status: string;
      responseTime: number;
    };
    redis: {
      status: string;
      responseTime: number;
    };
  };
}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer() as App)
      .get('/health')
      .expect(200)
      .expect((res: request.Response) => {
        const body = res.body as HealthResponse;
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('status', 'healthy');
      });
  });
});
