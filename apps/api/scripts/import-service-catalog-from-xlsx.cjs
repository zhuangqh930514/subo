const fs = require('node:fs/promises');
const path = require('node:path');

const mariadb = require('mariadb');
const XLSX = require('xlsx');

const TARGET_DB = {
  host: process.env.TARGET_DB_HOST ?? '8.138.232.4',
  port: Number(process.env.TARGET_DB_PORT ?? 3306),
  user: process.env.TARGET_DB_USER ?? 'zqh',
  password: process.env.TARGET_DB_PASSWORD ?? '930514',
  database: process.env.TARGET_DB_NAME ?? 'subo1',
  ssl: { rejectUnauthorized: false },
  dateStrings: true,
  bigIntAsNumber: false,
};

const DEFAULT_WORKBOOK_PATH = '/Users/zqh/Documents/ppt/副本技术服务单项报价.xlsx';

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const workbookPath = options.workbookPath ?? DEFAULT_WORKBOOK_PATH;
  const catalog = parseWorkbook(workbookPath);

  if (!options.apply) {
    let existingCounts = null;

    try {
      const conn = await mariadb.createConnection(TARGET_DB);
      try {
        existingCounts = await readServiceCatalogCounts(conn);
      } finally {
        await conn.end();
      }
    } catch (error) {
      existingCounts = {
        error: error instanceof Error ? error.message : String(error),
      };
    }

    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          workbookPath,
          parsed: buildCatalogSummary(catalog),
          existingCounts,
        },
        null,
        2,
      ),
    );
    return;
  }

  const conn = await mariadb.createConnection(TARGET_DB);

  try {
    await assertNoLinkedQuoteRequestItems(conn);
    const backupPath = await backupExistingCatalog(conn);
    await conn.beginTransaction();
    await replaceServiceCatalog(conn, catalog, workbookPath);
    await conn.commit();

    console.log(
      JSON.stringify(
        {
          mode: 'apply',
          workbookPath,
          backupPath,
          parsed: buildCatalogSummary(catalog),
          existingCounts: await readServiceCatalogCounts(conn),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  } finally {
    await conn.end();
  }
}

function parseArgs(argv) {
  const options = {
    apply: false,
    workbookPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--apply') {
      options.apply = true;
      continue;
    }

    if (value === '--workbook') {
      options.workbookPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
  }

  return options;
}

function parseWorkbook(workbookPath) {
  const workbook = XLSX.readFile(workbookPath, {
    cellDates: false,
  });
  const [sheetName] = workbook.SheetNames;

  if (!sheetName) {
    throw new Error(`工作簿 ${workbookPath} 中没有可读取的 sheet。`);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  if (rows.length < 3) {
    throw new Error(`sheet ${sheetName} 数据不足，至少需要标题行和数据行。`);
  }

  const categories = [];
  const categoryMap = new Map();
  const codeOccurrences = new Map();
  const codeEntries = new Map();

  let currentCategoryName = '';
  let currentProjectName = '';

  for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const categoryCell = normalizeText(row[0]);
    const projectCell = normalizeText(row[1]);
    const itemCode = normalizeText(row[2]);
    const itemName = normalizeText(row[3]);
    const specification = normalizeText(row[4]);
    const price = normalizePrice(row[5]);

    if (categoryCell) {
      currentCategoryName = categoryCell;
    }

    if (projectCell) {
      currentProjectName = projectCell;
    }

    if (!itemCode && !itemName) {
      continue;
    }

    if (!currentCategoryName || !currentProjectName) {
      throw new Error(`第 ${rowIndex + 1} 行缺少分类或项目上下文，无法导入。`);
    }

    if (!itemCode || !itemName) {
      throw new Error(`第 ${rowIndex + 1} 行存在不完整条目，缺少货号或名称。`);
    }

    const occurrence = (codeOccurrences.get(itemCode) ?? 0) + 1;
    codeOccurrences.set(itemCode, occurrence);

    const entries = codeEntries.get(itemCode) ?? [];
    entries.push({
      row: rowIndex + 1,
      category: currentCategoryName,
      project: currentProjectName,
      name: itemName,
      price,
    });
    codeEntries.set(itemCode, entries);

    let category = categoryMap.get(currentCategoryName);
    if (!category) {
      category = {
        name: currentCategoryName,
        projects: [],
        projectMap: new Map(),
      };
      categoryMap.set(currentCategoryName, category);
      categories.push(category);
    }

    let project = category.projectMap.get(currentProjectName);
    if (!project) {
      project = {
        name: currentProjectName,
        items: [],
      };
      category.projectMap.set(currentProjectName, project);
      category.projects.push(project);
    }

    project.items.push({
      itemCode: occurrence === 1 ? itemCode : `${itemCode}__R${occurrence}`,
      displayCode: itemCode,
      name: itemName,
      specification: specification ?? '',
      unitPrice: price,
    });
  }

  const duplicateCodes = Array.from(codeEntries.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([code, entries]) => ({
      code,
      count: entries.length,
      entries,
    }));

  return {
    sheetName,
    duplicateCodes,
    categories: categories.map((category) => ({
      name: category.name,
      projects: category.projects.map((project) => ({
        name: project.name,
        items: project.items,
      })),
    })),
  };
}

function buildCatalogSummary(catalog) {
  const projectCount = catalog.categories.reduce((sum, category) => sum + category.projects.length, 0);
  const itemCount = catalog.categories.reduce(
    (sum, category) =>
      sum + category.projects.reduce((projectSum, project) => projectSum + project.items.length, 0),
    0,
  );

  return {
    sheetName: catalog.sheetName,
    categoryCount: catalog.categories.length,
    projectCount,
    itemCount,
    duplicateCodeGroupCount: catalog.duplicateCodes.length,
    duplicateEntryCount: catalog.duplicateCodes.reduce((sum, item) => sum + item.count - 1, 0),
    categories: catalog.categories.slice(0, 5).map((category) => ({
      name: category.name,
      projectCount: category.projects.length,
      itemCount: category.projects.reduce((sum, project) => sum + project.items.length, 0),
    })),
    duplicateSamples: catalog.duplicateCodes.slice(0, 8).map((item) => ({
      code: item.code,
      count: item.count,
      entries: item.entries.slice(0, 3),
    })),
  };
}

async function readServiceCatalogCounts(conn) {
  const tables = ['service_categories', 'service_projects', 'service_items'];
  const counts = {};

  for (const table of tables) {
    const rows = await conn.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    counts[table] = Number(rows[0].count);
  }

  return counts;
}

async function assertNoLinkedQuoteRequestItems(conn) {
  const rows = await conn.query(
    'SELECT COUNT(*) AS count FROM `quote_request_items` WHERE `service_item_id` IS NOT NULL',
  );

  if (Number(rows[0].count) > 0) {
    throw new Error('quote_request_items 已存在 service_item_id 关联，当前不能直接覆盖服务目录。');
  }
}

async function backupExistingCatalog(conn) {
  const backup = {};
  const tables = ['service_categories', 'service_projects', 'service_items'];

  for (const table of tables) {
    backup[table] = await conn.query(`SELECT * FROM \`${table}\` ORDER BY id ASC`);
  }

  const backupDir = path.join(__dirname, '..', '.cache');
  await fs.mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(backupDir, `service-catalog-backup-${timestamp}.json`);

  await fs.writeFile(
    filePath,
    JSON.stringify(backup, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2),
    'utf8',
  );

  return filePath;
}

async function replaceServiceCatalog(conn, catalog, workbookPath) {
  const now = nowDateTime();
  const sourceVersion = `xlsx:${path.basename(workbookPath)}`;

  await conn.query('DELETE FROM `service_items`');
  await conn.query('DELETE FROM `service_projects`');
  await conn.query('DELETE FROM `service_categories`');

  for (let categoryIndex = 0; categoryIndex < catalog.categories.length; categoryIndex += 1) {
    const category = catalog.categories[categoryIndex];
    const categoryResult = await conn.query(
      `INSERT INTO service_categories
      (name, slug, description, sort_order, status, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, NULL, ?, 'active', ?, ?, NULL, NULL, NULL)`,
      [
        category.name,
        `xlsx-category-${String(categoryIndex + 1).padStart(3, '0')}`,
        categoryIndex + 1,
        now,
        now,
      ],
    );

    const categoryId = Number(categoryResult.insertId);

    for (let projectIndex = 0; projectIndex < category.projects.length; projectIndex += 1) {
      const project = category.projects[projectIndex];
      const projectResult = await conn.query(
        `INSERT INTO service_projects
        (category_id, name, description, sort_order, status, created_at, updated_at, created_by, updated_by, deleted_at)
        VALUES (?, ?, NULL, ?, 'active', ?, ?, NULL, NULL, NULL)`,
        [categoryId, project.name, projectIndex + 1, now, now],
      );

      const projectId = Number(projectResult.insertId);

      for (const item of project.items) {
        await conn.query(
          `INSERT INTO service_items
          (category_id, project_id, item_code, name, specification, unit_price, price_note, status, source_version, created_at, updated_at, created_by, updated_by, deleted_at)
          VALUES (?, ?, ?, ?, ?, ?, NULL, 'active', ?, ?, ?, NULL, NULL, NULL)`,
          [
            categoryId,
            projectId,
            item.itemCode,
            item.name,
            item.specification || null,
            item.unitPrice.toFixed(2),
            sourceVersion,
            now,
            now,
          ],
        );
      }
    }
  }
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
}

function normalizePrice(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`遇到无法识别的价格值：${value}`);
  }

  return numeric;
}

function nowDateTime() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
