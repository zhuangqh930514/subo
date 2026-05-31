import { execFile } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, RecordStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface PublicServiceCatalogItem {
  id: string;
  code: string;
  category: string;
  project: string;
  name: string;
  specification: string;
  price: number;
  priceNote: string;
}

export interface PublicServiceCatalogProject {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  items: PublicServiceCatalogItem[];
}

export interface PublicServiceCatalogCategory {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  projects: PublicServiceCatalogProject[];
}

export interface PublicServiceCatalogResponse {
  demoMode: boolean;
  summary: {
    categoryCount: number;
    itemCount: number;
  };
  categories: PublicServiceCatalogCategory[];
  items: PublicServiceCatalogItem[];
}

export type AdminServiceCatalogStatus = 'active' | 'inactive' | 'archived';

export interface AdminServiceCatalogOverviewInput {
  search?: string;
  categoryId?: number;
  projectId?: number;
  status?: string;
  limit: number;
}

export interface AdminServiceCatalogFilterCategory {
  id: string;
  name: string;
  projectCount: number;
  itemCount: number;
}

export interface AdminServiceCatalogFilterProject {
  id: string;
  categoryId: string;
  name: string;
  itemCount: number;
}

export interface AdminServiceCatalogItemRecord {
  id: string;
  categoryId: string;
  categoryName: string;
  projectId: string;
  projectName: string;
  code: string;
  displayCode: string;
  name: string;
  specification: string;
  unitPrice: number;
  priceNote: string;
  status: AdminServiceCatalogStatus;
  sourceVersion: string;
  updatedAt: string;
}

export interface AdminServiceCatalogOverviewResponse {
  demoMode: boolean;
  summary: {
    categoryCount: number;
    projectCount: number;
    itemCount: number;
    activeItemCount: number;
  };
  filters: {
    categories: AdminServiceCatalogFilterCategory[];
    projects: AdminServiceCatalogFilterProject[];
    statuses: AdminServiceCatalogStatus[];
  };
  items: AdminServiceCatalogItemRecord[];
}

export interface UpdateAdminServiceCatalogItemPayload {
  name?: string;
  specification?: string;
  unitPrice?: number;
  priceNote?: string;
  status?: string;
}

export interface BulkUpdateAdminServiceCatalogStatusPayload {
  ids?: Array<number | string>;
  status?: string;
}

export interface ReimportServiceCatalogPayload {
  workbookPath?: string;
}

export interface ServiceCatalogCountSummary {
  categoryCount: number;
  projectCount: number;
  itemCount: number;
}

interface ImportServiceCatalogScriptResult {
  mode: 'apply';
  workbookPath: string;
  backupPath?: string;
  parsed?: {
    categoryCount?: number;
    projectCount?: number;
    itemCount?: number;
  };
  existingCounts?: {
    service_categories?: number | string;
    service_projects?: number | string;
    service_items?: number | string;
  };
}

const demoCatalog = buildDemoCatalog();
const execFileAsync = promisify(execFile);
const DEFAULT_IMPORT_WORKBOOK_PATH = '/Users/zqh/Documents/ppt/副本技术服务单项报价.xlsx';
const IMPORT_SCRIPT_RELATIVE_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  'scripts',
  'import-service-catalog-from-xlsx.cjs',
);

@Injectable()
export class ServiceCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicCatalog(): Promise<PublicServiceCatalogResponse> {
    if (!this.prisma.isConfigured) {
      return {
        demoMode: true,
        ...demoCatalog,
      };
    }

    const categories = await this.prisma.serviceCategory.findMany({
      where: {
        deletedAt: null,
        status: RecordStatus.ACTIVE,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        projects: {
          where: {
            deletedAt: null,
            status: RecordStatus.ACTIVE,
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: {
            items: {
              where: {
                deletedAt: null,
                status: RecordStatus.ACTIVE,
              },
              orderBy: [{ id: 'asc' }],
            },
          },
        },
      },
    });

    const normalizedCategories = categories
      .map((category) => {
        const projects = category.projects
          .map((project) => {
            const items = project.items.map((item) => ({
              id: String(item.id),
              code: toDisplayCode(item.itemCode),
              category: category.name,
              project: project.name,
              name: item.name,
              specification: item.specification ?? '',
              price: Number(item.unitPrice),
              priceNote: normalizePriceNote(item.priceNote),
            }));

            return {
              id: String(project.id),
              name: project.name,
              description: project.description ?? '',
              itemCount: items.length,
              items,
            } satisfies PublicServiceCatalogProject;
          })
          .filter((project) => project.itemCount > 0);

        const itemCount = projects.reduce((sum, project) => sum + project.itemCount, 0);

        return {
          id: String(category.id),
          name: category.name,
          description: category.description ?? '',
          itemCount,
          projects,
        } satisfies PublicServiceCatalogCategory;
      })
      .filter((category) => category.itemCount > 0);

    const items = normalizedCategories.flatMap((category) =>
      category.projects.flatMap((project) => project.items),
    );

    return {
      demoMode: false,
      summary: {
        categoryCount: normalizedCategories.length,
        itemCount: items.length,
      },
      categories: normalizedCategories,
      items,
    };
  }

  async getAdminOverview(
    input: AdminServiceCatalogOverviewInput,
  ): Promise<AdminServiceCatalogOverviewResponse> {
    if (!this.prisma.isConfigured) {
      return buildAdminDemoOverview(input);
    }

    const normalizedStatus = normalizeAdminStatus(input.status);
    const itemWhere = buildAdminItemWhere({
      search: input.search,
      categoryId: input.categoryId,
      projectId: input.projectId,
      status: normalizedStatus,
    });

    const [categoryCount, projectCount, itemCount, activeItemCount, categories, projects, items] =
      await Promise.all([
        this.prisma.serviceCategory.count({
          where: {
            deletedAt: null,
          },
        }),
        this.prisma.serviceProject.count({
          where: {
            deletedAt: null,
          },
        }),
        this.prisma.serviceItem.count({
          where: {
            deletedAt: null,
          },
        }),
        this.prisma.serviceItem.count({
          where: {
            deletedAt: null,
            status: RecordStatus.ACTIVE,
          },
        }),
        this.prisma.serviceCategory.findMany({
          where: {
            deletedAt: null,
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: {
            projects: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
              },
            },
            items: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
              },
            },
          },
        }),
        this.prisma.serviceProject.findMany({
          where: {
            deletedAt: null,
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: {
            items: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
              },
            },
          },
        }),
        this.prisma.serviceItem.findMany({
          where: itemWhere,
          take: input.limit,
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
      ]);

    return {
      demoMode: false,
      summary: {
        categoryCount,
        projectCount,
        itemCount,
        activeItemCount,
      },
      filters: {
        categories: categories.map((item) => ({
          id: String(item.id),
          name: item.name,
          projectCount: item.projects.length,
          itemCount: item.items.length,
        })),
        projects: projects.map((item) => ({
          id: String(item.id),
          categoryId: String(item.categoryId),
          name: item.name,
          itemCount: item.items.length,
        })),
        statuses: ['active', 'inactive', 'archived'],
      },
      items: items.map((item) => mapAdminItemRecord(item)),
    };
  }

  async updateAdminItem(id: number, payload: UpdateAdminServiceCatalogItemPayload) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能修改服务目录。',
      );
    }

    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('服务条目 ID 无效。');
    }

    const data = buildAdminItemUpdateData(payload);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('没有可更新的字段。');
    }

    const existing = await this.prisma.serviceItem.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('服务条目不存在。');
    }

    const updated = await this.prisma.serviceItem.update({
      where: {
        id,
      },
      data,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      message: '服务条目已更新。',
      item: mapAdminItemRecord(updated),
    };
  }

  async bulkUpdateAdminItemsStatus(payload: BulkUpdateAdminServiceCatalogStatusPayload) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能批量修改服务目录。',
      );
    }

    const ids = normalizeAdminItemIds(payload.ids);
    if (ids.length === 0) {
      throw new BadRequestException('请至少选择 1 个服务条目。');
    }

    const status = normalizeAdminStatus(payload.status);
    if (!status) {
      throw new BadRequestException('批量状态无效。');
    }

    const result = await this.prisma.serviceItem.updateMany({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
      },
      data: {
        status: mapAdminStatusToPrisma(status),
      },
    });

    return {
      message: `已批量更新 ${result.count} 条服务目录记录。`,
      updatedCount: result.count,
    };
  }

  async reimportAdminCatalog(payload?: ReimportServiceCatalogPayload) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能重新导入服务目录。',
      );
    }

    const workbookPath = payload?.workbookPath?.trim() || DEFAULT_IMPORT_WORKBOOK_PATH;

    try {
      await access(workbookPath, fsConstants.R_OK);
    } catch {
      throw new BadRequestException(`目录工作簿不可读取：${workbookPath}`);
    }

    const before = await this.readServiceCatalogCountSummary();
    const scriptPath = IMPORT_SCRIPT_RELATIVE_PATH;

    try {
      const { stdout } = await execFileAsync(
        process.execPath,
        [scriptPath, '--apply', '--workbook', workbookPath],
        {
          cwd: join(__dirname, '..', '..', '..'),
          maxBuffer: 8 * 1024 * 1024,
          env: {
            ...process.env,
          },
        },
      );

      const parsed = parseImportServiceCatalogScriptResult(stdout);
      const after =
        parsed.existingCounts !== undefined
          ? mapScriptCounts(parsed.existingCounts)
          : await this.readServiceCatalogCountSummary();

      return {
        message: '服务目录已重新导入。',
        workbookPath: parsed.workbookPath || workbookPath,
        imported: {
          categoryCount: Number(parsed.parsed?.categoryCount ?? 0),
          projectCount: Number(parsed.parsed?.projectCount ?? 0),
          itemCount: Number(parsed.parsed?.itemCount ?? 0),
        },
        before,
        after,
        backupPath: parsed.backupPath ?? undefined,
      };
    } catch (error) {
      throw new BadRequestException(extractImportScriptErrorMessage(error));
    }
  }

  private async readServiceCatalogCountSummary(): Promise<ServiceCatalogCountSummary> {
    const [categoryCount, projectCount, itemCount] = await Promise.all([
      this.prisma.serviceCategory.count({
        where: {
          deletedAt: null,
        },
      }),
      this.prisma.serviceProject.count({
        where: {
          deletedAt: null,
        },
      }),
      this.prisma.serviceItem.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    return {
      categoryCount,
      projectCount,
      itemCount,
    };
  }
}

function normalizePriceNote(value: string | null) {
  if (!value) {
    return '';
  }

  if (value.startsWith('legacy_stock=')) {
    return '';
  }

  return value;
}

function toDisplayCode(value: string) {
  return value.replace(/__R\d+$/, '');
}

function normalizeAdminStatus(value: string | undefined): AdminServiceCatalogStatus | undefined {
  if (!value) {
    return undefined;
  }

  if (value === 'active' || value === 'inactive' || value === 'archived') {
    return value;
  }

  return undefined;
}

function buildAdminItemWhere(input: {
  search?: string;
  categoryId?: number;
  projectId?: number;
  status?: AdminServiceCatalogStatus;
}): Prisma.ServiceItemWhereInput {
  const where: Prisma.ServiceItemWhereInput = {
    deletedAt: null,
  };

  if (input.categoryId) {
    where.categoryId = input.categoryId;
  }

  if (input.projectId) {
    where.projectId = input.projectId;
  }

  if (input.status) {
    where.status = mapAdminStatusToPrisma(input.status);
  }

  const search = input.search?.trim();
  if (search) {
    where.OR = [
      { itemCode: { contains: search } },
      { name: { contains: search } },
      { specification: { contains: search } },
      { category: { name: { contains: search } } },
      { project: { name: { contains: search } } },
    ];
  }

  return where;
}

function mapAdminStatusToPrisma(status: AdminServiceCatalogStatus) {
  if (status === 'inactive') {
    return RecordStatus.INACTIVE;
  }

  if (status === 'archived') {
    return RecordStatus.ARCHIVED;
  }

  return RecordStatus.ACTIVE;
}

function mapPrismaStatusToAdmin(status: RecordStatus): AdminServiceCatalogStatus {
  if (status === RecordStatus.INACTIVE) {
    return 'inactive';
  }

  if (status === RecordStatus.ARCHIVED) {
    return 'archived';
  }

  return 'active';
}

function mapAdminItemRecord(item: {
  id: number;
  categoryId: number;
  projectId: number;
  itemCode: string;
  name: string;
  specification: string | null;
  unitPrice: Prisma.Decimal | number;
  priceNote: string | null;
  status: RecordStatus;
  sourceVersion: string | null;
  updatedAt: Date;
  category: { id: number; name: string };
  project: { id: number; name: string };
}): AdminServiceCatalogItemRecord {
  return {
    id: String(item.id),
    categoryId: String(item.categoryId),
    categoryName: item.category.name,
    projectId: String(item.projectId),
    projectName: item.project.name,
    code: item.itemCode,
    displayCode: toDisplayCode(item.itemCode),
    name: item.name,
    specification: item.specification ?? '',
    unitPrice: Number(item.unitPrice),
    priceNote: normalizePriceNote(item.priceNote),
    status: mapPrismaStatusToAdmin(item.status),
    sourceVersion: item.sourceVersion ?? '',
    updatedAt: item.updatedAt.toISOString(),
  };
}

function buildAdminItemUpdateData(payload: UpdateAdminServiceCatalogItemPayload) {
  const data: Prisma.ServiceItemUpdateInput = {};

  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (!name) {
      throw new BadRequestException('条目名称不能为空。');
    }
    data.name = name;
  }

  if (payload.specification !== undefined) {
    data.specification = normalizeNullableText(payload.specification);
  }

  if (payload.priceNote !== undefined) {
    data.priceNote = normalizeNullableText(payload.priceNote);
  }

  if (payload.unitPrice !== undefined) {
    const unitPrice = Number(payload.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new BadRequestException('单价无效。');
    }

    data.unitPrice = unitPrice.toFixed(2);
  }

  if (payload.status !== undefined) {
    const status = normalizeAdminStatus(payload.status);
    if (!status) {
      throw new BadRequestException('状态无效。');
    }

    data.status = mapAdminStatusToPrisma(status);
  }

  return data;
}

function normalizeAdminItemIds(input: Array<number | string> | undefined) {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(
    new Set(
      input
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
}

function parseImportServiceCatalogScriptResult(stdout: string): ImportServiceCatalogScriptResult {
  try {
    const parsed = JSON.parse(stdout) as ImportServiceCatalogScriptResult;

    if (!parsed || parsed.mode !== 'apply') {
      throw new Error('导入脚本没有返回 apply 结果。');
    }

    return parsed;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : '无法解析导入脚本返回内容。',
    );
  }
}

function mapScriptCounts(input: ImportServiceCatalogScriptResult['existingCounts']): ServiceCatalogCountSummary {
  return {
    categoryCount: Number(input?.service_categories ?? 0),
    projectCount: Number(input?.service_projects ?? 0),
    itemCount: Number(input?.service_items ?? 0),
  };
}

function extractImportScriptErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const stdout = 'stdout' in error ? String((error as { stdout?: string }).stdout ?? '') : '';
    const stderr = 'stderr' in error ? String((error as { stderr?: string }).stderr ?? '') : '';
    const combined = [stderr, stdout, error.message]
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .join('\n');

    if (combined.length > 0) {
      return combined.split('\n').pop() ?? combined;
    }

    return error.message;
  }

  return '服务目录导入失败。';
}

function normalizeNullableText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildAdminDemoOverview(
  input: AdminServiceCatalogOverviewInput,
): AdminServiceCatalogOverviewResponse {
  const categories = demoCatalog.categories.map((category) => ({
    id: category.id,
    name: category.name,
    projectCount: category.projects.length,
    itemCount: category.projects.reduce((sum, project) => sum + project.itemCount, 0),
  }));

  const projects = demoCatalog.categories.flatMap((category) =>
    category.projects.map((project) => ({
      id: project.id,
      categoryId: category.id,
      name: project.name,
      itemCount: project.itemCount,
    })),
  );

  const allItems: AdminServiceCatalogItemRecord[] = demoCatalog.categories.flatMap((category) =>
    category.projects.flatMap((project) =>
      project.items.map((item) => ({
        id: item.id,
        categoryId: category.id,
        categoryName: category.name,
        projectId: project.id,
        projectName: project.name,
        code: item.code,
        displayCode: item.code,
        name: item.name,
        specification: item.specification,
        unitPrice: item.price,
        priceNote: item.priceNote,
        status: 'active',
        sourceVersion: 'demo',
        updatedAt: new Date('2026-05-30T00:00:00.000Z').toISOString(),
      })),
    ),
  );

  const filteredItems = allItems.filter((item) => {
    if (input.categoryId && item.categoryId !== String(input.categoryId)) {
      return false;
    }

    if (input.projectId && item.projectId !== String(input.projectId)) {
      return false;
    }

    const status = normalizeAdminStatus(input.status);
    if (status && item.status !== status) {
      return false;
    }

    const search = input.search?.trim().toLowerCase();
    if (!search) {
      return true;
    }

    return [
      item.code,
      item.displayCode,
      item.name,
      item.specification,
      item.categoryName,
      item.projectName,
    ]
      .join(' ')
      .toLowerCase()
      .includes(search);
  });

  return {
    demoMode: true,
    summary: {
      categoryCount: categories.length,
      projectCount: projects.length,
      itemCount: allItems.length,
      activeItemCount: allItems.length,
    },
    filters: {
      categories,
      projects,
      statuses: ['active', 'inactive', 'archived'],
    },
    items: filteredItems.slice(0, input.limit),
  };
}

function buildDemoCatalog() {
  const categories: PublicServiceCatalogCategory[] = [
    {
      id: 'demo-animal',
      name: '动物实验',
      description: '涵盖动物饲养、肿瘤药效模型与实验支持。',
      itemCount: 2,
      projects: [
        {
          id: 'demo-animal-project',
          name: '肿瘤药效组动物实验模型',
          description: '常规动物模型与药效实验支持。',
          itemCount: 2,
          items: [
            {
              id: 'demo-ga1093',
              code: 'GA1093',
              category: '动物实验',
              project: '肿瘤药效组动物实验模型',
              name: '裸鼠皮下移植瘤',
              specification: '只',
              price: 1200,
              priceNote: '商务确认排期',
            },
            {
              id: 'demo-ga1012',
              code: 'GA1012',
              category: '动物实验',
              project: '非肿瘤药效组模型',
              name: '大鼠 CCl4 诱导肝纤维化模型',
              specification: '只',
              price: 1800,
              priceNote: '商务确认排期',
            },
          ],
        },
      ],
    },
    {
      id: 'demo-molecular',
      name: '分子病理',
      description: '覆盖免疫荧光、原位杂交等组织层面检测。',
      itemCount: 2,
      projects: [
        {
          id: 'demo-molecular-project',
          name: '多重免疫荧光',
          description: '适合多指标共定位与组织成像分析。',
          itemCount: 2,
          items: [
            {
              id: 'demo-fl3302',
              code: 'FL3302',
              category: '分子病理',
              project: '多重免疫荧光',
              name: '多重 IF 染色（四标）',
              specification: '张',
              price: 900,
              priceNote: '结果交付 3-5 个工作日',
            },
            {
              id: 'demo-tx5501',
              code: 'TX5501',
              category: '分子病理',
              project: '切片数字化',
              name: '全片扫描 40x',
              specification: '张',
              price: 200,
              priceNote: '结果交付 2-3 个工作日',
            },
          ],
        },
      ],
    },
  ];

  const items = categories.flatMap((category) =>
    category.projects.flatMap((project) => project.items),
  );

  return {
    summary: {
      categoryCount: categories.length,
      itemCount: items.length,
    },
    categories,
    items,
  };
}
