const mariadb = require('mariadb');

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

const APPLY = process.env.APPLY === '1';
const ONLY_IDS = parseIdList(process.env.QUOTE_IDS);

async function main() {
  const conn = await mariadb.createConnection(TARGET_DB);

  try {
    const candidates = await loadCandidates(conn, ONLY_IDS);
    const summary = {
      database: TARGET_DB.database,
      dryRun: !APPLY,
      requestedQuoteIds: ONLY_IDS,
      candidateCount: candidates.length,
      candidates: candidates.map((row) => ({
        id: Number(row.id),
        quoteNo: row.quote_no,
        contactName: row.contact_name,
        remarkPreview: truncate(row.remark, 80),
      })),
      insertedCount: 0,
      nextSteps: [],
    };

    if (!APPLY) {
      summary.nextSteps = buildNextSteps(candidates);
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    if (candidates.length === 0) {
      summary.nextSteps = ['当前没有需要补占位条目的历史询价。'];
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const now = nowDateTime();
    await conn.beginTransaction();

    for (const row of candidates) {
      const itemName = '历史询价内容（迁移占位）';
      const specification = buildSpecification(row);
      await conn.query(
        `INSERT INTO quote_request_items
        (quote_request_id, service_item_id, item_name, item_code, specification, unit_price, quantity, subtotal, created_at, updated_at, created_by, updated_by)
        VALUES (?, NULL, ?, NULL, ?, 0, 1, 0, ?, ?, NULL, NULL)`,
        [Number(row.id), itemName, specification, now, now],
      );
    }

    await conn.commit();
    summary.insertedCount = candidates.length;
    summary.nextSteps = [
      '刷新后台询价池，历史询价将显示占位条目。',
      '如后续人工补真实条目，可删除这类占位行后再录入正式明细。',
    ];
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    if (APPLY) {
      await conn.rollback().catch(() => {});
    }
    throw error;
  } finally {
    await conn.end();
  }
}

async function loadCandidates(conn, ids) {
  const filters = ['qr.deleted_at IS NULL', 'qri.id IS NULL'];
  const params = [];

  if (ids.length > 0) {
    filters.push(`qr.id IN (${ids.map(() => '?').join(', ')})`);
    params.push(...ids);
  }

  return conn.query(
    `SELECT qr.id, qr.quote_no, qr.contact_name, qr.company_name, qr.remark
    FROM quote_requests qr
    LEFT JOIN quote_request_items qri ON qri.quote_request_id = qr.id
    WHERE ${filters.join(' AND ')}
    ORDER BY qr.id ASC`,
    params,
  );
}

function buildSpecification(row) {
  const lines = [
    row.company_name ? `客户：${row.company_name}` : null,
    row.remark ? String(row.remark).trim() : null,
    '注：该条目由旧系统迁移占位生成，原库无真实明细行。',
  ].filter(Boolean);

  return truncate(lines.join('\n\n'), 65535);
}

function buildNextSteps(candidates) {
  if (candidates.length === 0) {
    return ['当前没有需要补占位条目的历史询价。'];
  }

  return [
    '先核对候选询价是否确实来自旧迁移。',
    '确认后执行：APPLY=1 pnpm --dir apps/api legacy:backfill:quote-items',
    '若只补指定询价，可加 QUOTE_IDS=2,5 之类的过滤。',
  ];
}

function parseIdList(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return [];
  }

  return normalized
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function truncate(value, max) {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  return text.slice(0, max);
}

function nowDateTime() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
