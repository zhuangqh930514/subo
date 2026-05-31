const mariadb = require('mariadb');

const LEGACY_DB = {
  host: process.env.LEGACY_DB_HOST ?? '8.138.232.4',
  port: Number(process.env.LEGACY_DB_PORT ?? 3306),
  user: process.env.LEGACY_DB_USER ?? 'zqh',
  password: process.env.LEGACY_DB_PASSWORD ?? '930514',
  database: process.env.LEGACY_DB_NAME ?? 'subo',
  ssl: { rejectUnauthorized: false },
  dateStrings: true,
  bigIntAsNumber: false,
};

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

const LEGACY_TABLES = [
  'admin_user',
  'category',
  'product',
  'question',
  'order',
  'invoice_header',
  'contract',
  'ruijing_link',
  'kasma_link',
];

const TARGET_TABLES = [
  'admin_users',
  'admin_roles',
  'admin_user_roles',
  'admin_action_logs',
  'service_categories',
  'service_projects',
  'service_items',
  'customers',
  'invoice_profiles',
  'quote_requests',
  'quote_request_items',
  'orders',
  'contracts',
  'supplier_platforms',
  'supplier_links',
  'procurement_lists',
  'procurement_list_items',
];

async function main() {
  const legacy = await mariadb.createConnection(LEGACY_DB);
  const target = await mariadb.createConnection(TARGET_DB);

  try {
    const result = {
      legacy: await loadCounts(legacy, LEGACY_TABLES),
      target: await loadCounts(target, TARGET_TABLES),
      findings: await loadFindings(target),
      recommendations: [],
    };

    if (result.findings.activeUsersWithoutRoles.count > 0) {
      result.recommendations.push('优先给无角色管理员补默认角色，避免去掉 bootstrap 后无法使用后台。');
    }

    if (result.findings.procurementListsWithoutItems.count > 0) {
      result.recommendations.push('补齐 procurement_list_items，否则旧代采清单只有单头没有明细。');
    }

    if (result.findings.quoteRequestsWithoutItems.count > 0) {
      result.recommendations.push('确认历史 quote_requests 是否需要补行项目，避免 CRM 线索只有单头。');
    }

    if (result.findings.placeholderSupplierLinks.count > 0) {
      result.recommendations.push('回查 legacy.invalid 占位采购链接，补成真实平台地址。');
    }

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await legacy.end();
    await target.end();
  }
}

async function loadCounts(conn, tables) {
  const result = {};

  for (const table of tables) {
    const rows = await conn.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    result[table] = Number(rows[0].count);
  }

  return result;
}

async function loadFindings(conn) {
  const [
    activeUsersWithoutRoles,
    activeUsersWithoutRolesRows,
    placeholderSupplierLinks,
    placeholderSupplierLinksRows,
    procurementListsWithoutItems,
    procurementListsWithoutItemsRows,
    quoteRequestsWithoutItems,
    quoteRequestsWithoutItemsRows,
    procurementOrdersWithoutLists,
    procurementOrdersWithoutListsRows,
  ] = await Promise.all([
    conn.query(`
      SELECT COUNT(*) AS count
      FROM admin_users u
      LEFT JOIN admin_user_roles ur ON ur.user_id = u.id
      WHERE u.deleted_at IS NULL
        AND ur.id IS NULL
    `),
    conn.query(`
      SELECT u.id, u.username, u.nickname, u.status
      FROM admin_users u
      LEFT JOIN admin_user_roles ur ON ur.user_id = u.id
      WHERE u.deleted_at IS NULL
        AND ur.id IS NULL
      ORDER BY u.id ASC
      LIMIT 20
    `),
    conn.query(`
      SELECT COUNT(*) AS count
      FROM supplier_links
      WHERE deleted_at IS NULL
        AND purchase_url LIKE 'https://legacy.invalid/%'
    `),
    conn.query(`
      SELECT id, platform_id, product_name, purchase_url
      FROM supplier_links
      WHERE deleted_at IS NULL
        AND purchase_url LIKE 'https://legacy.invalid/%'
      ORDER BY id ASC
      LIMIT 20
    `),
    conn.query(`
      SELECT COUNT(*) AS count
      FROM procurement_lists pl
      LEFT JOIN procurement_list_items pli ON pli.procurement_list_id = pl.id
      WHERE pl.deleted_at IS NULL
        AND pli.id IS NULL
    `),
    conn.query(`
      SELECT pl.id, pl.list_no, pl.platform_id, pl.order_id, pl.title, pl.status
      FROM procurement_lists pl
      LEFT JOIN procurement_list_items pli ON pli.procurement_list_id = pl.id
      WHERE pl.deleted_at IS NULL
        AND pli.id IS NULL
      ORDER BY pl.id ASC
      LIMIT 20
    `),
    conn.query(`
      SELECT COUNT(*) AS count
      FROM quote_requests qr
      LEFT JOIN quote_request_items qri ON qri.quote_request_id = qr.id
      WHERE qr.deleted_at IS NULL
        AND qri.id IS NULL
    `),
    conn.query(`
      SELECT qr.id, qr.quote_no, qr.contact_name, qr.company_name, qr.status
      FROM quote_requests qr
      LEFT JOIN quote_request_items qri ON qri.quote_request_id = qr.id
      WHERE qr.deleted_at IS NULL
        AND qri.id IS NULL
      ORDER BY qr.id ASC
      LIMIT 20
    `),
    conn.query(`
      SELECT COUNT(*) AS count
      FROM orders o
      LEFT JOIN procurement_lists pl ON pl.order_id = o.id AND pl.deleted_at IS NULL
      WHERE o.deleted_at IS NULL
        AND o.order_type = 'procurement'
        AND pl.id IS NULL
    `),
    conn.query(`
      SELECT o.id, o.order_no, o.project_name, o.amount
      FROM orders o
      LEFT JOIN procurement_lists pl ON pl.order_id = o.id AND pl.deleted_at IS NULL
      WHERE o.deleted_at IS NULL
        AND o.order_type = 'procurement'
        AND pl.id IS NULL
      ORDER BY o.id ASC
      LIMIT 20
    `),
  ]);

  return {
    activeUsersWithoutRoles: {
      count: Number(activeUsersWithoutRoles[0].count),
      label: '有效管理员无角色',
      samples: activeUsersWithoutRolesRows.map((row) => ({
        id: Number(row.id),
        username: row.username,
        nickname: row.nickname,
        status: row.status,
      })),
    },
    placeholderSupplierLinks: {
      count: Number(placeholderSupplierLinks[0].count),
      label: '占位采购链接',
      samples: placeholderSupplierLinksRows.map((row) => ({
        id: Number(row.id),
        platformId: Number(row.platform_id),
        productName: row.product_name,
        purchaseUrl: row.purchase_url,
      })),
    },
    procurementListsWithoutItems: {
      count: Number(procurementListsWithoutItems[0].count),
      label: '无明细采购清单',
      samples: procurementListsWithoutItemsRows.map((row) => ({
        id: Number(row.id),
        listNo: row.list_no,
        platformId: Number(row.platform_id),
        orderId: row.order_id === null ? null : Number(row.order_id),
        title: row.title,
        status: row.status,
      })),
    },
    quoteRequestsWithoutItems: {
      count: Number(quoteRequestsWithoutItems[0].count),
      label: '无明细询价',
      samples: quoteRequestsWithoutItemsRows.map((row) => ({
        id: Number(row.id),
        quoteNo: row.quote_no,
        contactName: row.contact_name,
        companyName: row.company_name,
        status: row.status,
      })),
    },
    procurementOrdersWithoutLists: {
      count: Number(procurementOrdersWithoutLists[0].count),
      label: '未挂采购清单的代采订单',
      samples: procurementOrdersWithoutListsRows.map((row) => ({
        id: Number(row.id),
        orderNo: row.order_no,
        projectName: row.project_name,
        amount: Number(row.amount ?? 0),
      })),
    },
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
