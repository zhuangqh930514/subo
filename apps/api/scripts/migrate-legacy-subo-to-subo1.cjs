const fs = require('node:fs/promises');
const path = require('node:path');
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

async function main() {
  const legacy = await mariadb.createConnection(LEGACY_DB);
  const target = await mariadb.createConnection(TARGET_DB);

  try {
    await assertTargetIsEmpty(target);

    const legacyData = await readLegacyData(legacy);
    const backupPath = await writeBackup(legacyData);
    const normalized = normalizeLegacyData(legacyData);

    await target.beginTransaction();

    await insertAdminUsers(target, normalized.adminUsers);
    await insertBuiltInAdminRoles(target);
    await insertDefaultAdminUserRoles(target, normalized.adminUsers, 'super_admin');
    await insertServiceCatalog(target, normalized);
    await insertCustomers(target, normalized.customers);
    await insertInvoiceProfiles(target, normalized.invoiceProfiles);
    await insertQuoteRequests(target, normalized.quoteRequests);
    await insertOrders(target, normalized.orders);
    await insertContracts(target, normalized.contracts);
    await insertSupplierPlatforms(target);
    await insertSupplierLinks(target, normalized.supplierLinks);
    await insertProcurementLists(target, normalized.procurementLists);

    await target.commit();

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          backupPath,
          imported: {
            adminUsers: normalized.adminUsers.length,
            serviceCategories: normalized.serviceCategories.length,
            serviceProjects: normalized.serviceProjects.length,
            serviceItems: normalized.serviceItems.length,
            customers: normalized.customers.length,
            invoiceProfiles: normalized.invoiceProfiles.length,
            quoteRequests: normalized.quoteRequests.length,
            orders: normalized.orders.length,
            contracts: normalized.contracts.length,
            supplierLinks: normalized.supplierLinks.length,
            procurementLists: normalized.procurementLists.length,
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await target.rollback().catch(() => {});
    throw error;
  } finally {
    await legacy.end();
    await target.end();
  }
}

async function assertTargetIsEmpty(conn) {
  const tables = [
    'admin_users',
    'admin_roles',
    'admin_user_roles',
    'service_categories',
    'service_projects',
    'service_items',
    'customers',
    'invoice_profiles',
    'quote_requests',
    'orders',
    'contracts',
    'supplier_platforms',
    'supplier_links',
    'procurement_lists',
  ];

  for (const table of tables) {
    const rows = await conn.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    if (Number(rows[0].count) > 0) {
      throw new Error(`目标库 ${TARGET_DB.database} 的表 ${table} 已有数据，已停止迁移。`);
    }
  }
}

async function readLegacyData(conn) {
  const tables = [
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

  const result = {};

  for (const table of tables) {
    result[table] = await conn.query(`SELECT * FROM \`${table}\``);
  }

  return result;
}

async function writeBackup(data) {
  const backupDir = path.join(__dirname, '..', '.cache');
  await fs.mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(backupDir, `legacy-subo-backup-${timestamp}.json`);
  await fs.writeFile(
    filePath,
    JSON.stringify(data, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2),
    'utf8',
  );
  return filePath;
}

function normalizeLegacyData(data) {
  const categories = data.category.map(normalizeRow);
  const products = data.product.map(normalizeRow);
  const questions = data.question.map(normalizeRow);
  const orders = data.order.map(normalizeRow);
  const invoiceHeaders = data.invoice_header.map(normalizeRow);
  const contracts = data.contract.map(normalizeRow);
  const adminUsers = data.admin_user.map(normalizeRow);
  const ruijingLinks = data.ruijing_link.map(normalizeRow);
  const kasmaLinks = data.kasma_link.map(normalizeRow);

  const categoryById = new Map(categories.map((item) => [String(item.id), item]));
  const topCategories = categories.filter((item) => item.level === 1);
  const childCategories = categories.filter((item) => item.level === 2);

  const serviceCategories = topCategories.map((item) => ({
    id: Number(item.id),
    name: item.name,
    slug: `legacy-category-${item.id}`,
    description: blankToNull(item.description),
    sortOrder: Number(item.sort_order ?? 0),
    status: legacyStatus(item.status),
    createdAt: toDateTime(item.create_time),
    updatedAt: toDateTime(item.update_time),
    deletedAt: null,
  }));

  const directCategoryProductIds = new Set(
    products
      .filter((item) => {
        if (!item.category_id) {
          return false;
        }

        const category = categoryById.get(String(item.category_id));
        return category?.level === 1;
      })
      .map((item) => String(item.category_id)),
  );

  const serviceProjects = childCategories.map((item) => ({
    id: Number(item.id),
    categoryId: Number(item.parent_id || 0),
    name: item.name,
    description: blankToNull(item.description),
    sortOrder: Number(item.sort_order ?? 0),
    status: legacyStatus(item.status),
    createdAt: toDateTime(item.create_time),
    updatedAt: toDateTime(item.update_time),
    deletedAt: null,
  }));

  for (const categoryId of directCategoryProductIds) {
    serviceProjects.push({
      id: 800000 + Number(categoryId),
      categoryId: Number(categoryId),
      name: '默认项目',
      description: '旧系统一级分类下存在直接挂载产品，迁移时自动补齐默认项目。',
      sortOrder: 999,
      status: 'active',
      createdAt: nowDateTime(),
      updatedAt: nowDateTime(),
      deletedAt: null,
    });
  }

  const uncategorizedProducts = products.filter((item) => {
    if (!item.category_id) {
      return true;
    }

    return !categoryById.has(String(item.category_id));
  });

  if (uncategorizedProducts.length > 0) {
    serviceCategories.push({
      id: 900000,
      name: '旧系统未分类',
      slug: 'legacy-category-uncategorized',
      description: '旧系统中没有挂载到明确分类的产品导入到这里。',
      sortOrder: 999,
      status: 'inactive',
      createdAt: nowDateTime(),
      updatedAt: nowDateTime(),
      deletedAt: null,
    });
    serviceProjects.push({
      id: 900001,
      categoryId: 900000,
      name: '默认项目',
      description: '用于承接旧系统未分类产品。',
      sortOrder: 999,
      status: 'inactive',
      createdAt: nowDateTime(),
      updatedAt: nowDateTime(),
      deletedAt: null,
    });
  }

  const serviceItems = products.map((item) => {
    const mapping = resolveProductCategoryMapping(item, categoryById, directCategoryProductIds);
    const specification = [blankToNull(item.model), blankToNull(item.description)].filter(Boolean).join('\n');

    return {
      id: Number(item.id),
      categoryId: mapping.categoryId,
      projectId: mapping.projectId,
      itemCode: `LEGACY-PRODUCT-${item.id}`,
      name: truncate(item.name, 160),
      specification: specification || null,
      unitPrice: toMoney(item.price),
      priceNote:
        item.stock !== null && item.stock !== undefined
          ? truncate(`legacy_stock=${item.stock}`, 255)
          : null,
      status: legacyStatus(item.status),
      sourceVersion: 'legacy_subo.product',
      createdAt: toDateTime(item.create_time),
      updatedAt: toDateTime(item.update_time),
      deletedAt: legacyDeletedAt(item.deleted, item.update_time),
    };
  });

  const customerCollector = new Map();
  for (const header of invoiceHeaders) {
    collectCustomer(customerCollector, header.company_name, 'legacy_invoice_header', header.create_time, header.update_time);
  }
  for (const order of orders) {
    collectCustomer(customerCollector, order.customer_info, 'legacy_order', order.create_time, order.update_time);
  }

  let customerId = 1;
  const customerIdByName = new Map();
  const customers = Array.from(customerCollector.values()).map((item) => {
    const id = customerId++;
    customerIdByName.set(item.name, id);

    return {
      id,
      name: item.name,
      customerType: looksLikeCompany(item.name) ? 'company' : null,
      source: item.sources.size > 1 ? 'legacy_subo_merged' : Array.from(item.sources)[0],
      industry: null,
      address: null,
      remark: item.sources.size > 1 ? Array.from(item.sources).join(',') : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: null,
    };
  });

  const seenInvoiceDefault = new Set();
  const invoiceProfiles = invoiceHeaders.map((item) => {
    const name = item.company_name;
    const key = customerIdByName.get(name);
    const isDefault = !seenInvoiceDefault.has(key);
    seenInvoiceDefault.add(key);

    return {
      id: Number(item.id),
      customerId: key,
      companyName: truncate(item.company_name, 160),
      taxNumber: truncate(item.taxpayer_id, 64),
      address: blankToNull(item.address),
      phone: blankToNull(item.phone),
      bankName: blankToNull(item.bank_name),
      bankAccount: blankToNull(item.bank_account),
      isDefault,
      createdAt: toDateTime(item.create_time),
      updatedAt: toDateTime(item.update_time),
      deletedAt: legacyDeletedAt(item.deleted, item.update_time),
    };
  });

  const quoteRequests = questions.map((item) => ({
    id: Number(item.id),
    quoteNo: `LEGACY-Q-${String(item.id).padStart(6, '0')}`,
    customerId: null,
    contactName: truncate(item.name, 120),
    contactPhone: blankToNull(item.phone),
    contactEmail: blankToNull(item.email),
    companyName: null,
    businessType: 'mixed',
    source: 'contact_form',
    remark: blankToNull(item.content),
    estimatedTotalAmount: '0.00',
    status: 'pending',
    ownerUserId: null,
    createdAt: toDateTime(item.create_time),
    updatedAt: toDateTime(item.update_time),
    deletedAt: legacyDeletedAt(item.deleted, item.update_time),
  }));

  const normalizedOrders = orders.map((item) => ({
    id: Number(item.id),
    orderNo: `LEGACY-ORDER-${String(item.id).padStart(6, '0')}`,
    customerId: customerIdByName.get(item.customer_info),
    quoteRequestId: null,
    orderType: Number(item.is_ruijing) === 1 ? 'procurement' : 'service',
    projectName: truncate(item.project_name, 160),
    projectContent: blankToNull(item.project_content),
    amount: toMoney(item.amount),
    hasContract: boolNumber(item.has_contract),
    hasDeliveryNote: boolNumber(item.has_delivery_note),
    isPaid: boolNumber(item.is_paid),
    orderDate: item.order_date || null,
    invoiceProfileId: item.invoice_header_id ? Number(item.invoice_header_id) : null,
    ownerUserId: null,
    remark: blankToNull(`legacy_customer_info=${item.customer_info}`),
    createdAt: toDateTime(item.create_time),
    updatedAt: toDateTime(item.update_time),
    deletedAt: legacyDeletedAt(item.deleted, item.update_time),
  }));

  const normalizedContracts = contracts.map((item) => {
    const linkedOrder = findLinkedOrderForLegacyContract(
      item,
      normalizedOrders,
    );

    return {
      id: Number(item.id),
      orderId: linkedOrder?.id ?? null,
      customerId: linkedOrder?.customerId ?? null,
      legacyContractId: Number(item.id),
      contractName: truncate(item.contract_name, 160) ?? `旧合同-${item.id}`,
      description: blankToNull(item.contract_intro),
      fileName: truncate(item.file_name, 255) ?? `legacy-contract-${item.id}`,
      filePath: truncate(item.file_path, 500),
      fileType: truncate(item.file_type, 80),
      fileSize: toBigIntString(item.file_size),
      storageProvider: detectLegacyStorageProvider(item.file_path),
      source: 'legacy_contract',
      versionNo: 1,
      uploadedBy: null,
      createdAt: toDateTime(item.create_time),
      updatedAt: toDateTime(item.update_time),
      deletedAt: legacyDeletedAt(item.deleted, item.update_time),
    };
  });

  const supplierLinks = [
    ...ruijingLinks.map((item) => normalizeSupplierLink(item, 1, 100000)),
    ...kasmaLinks.map((item) => normalizeSupplierLink(item, 2, 200000)),
  ];

  const procurementLists = normalizedOrders
    .filter((item) => item.orderType === 'procurement')
    .map((item) => ({
      id: item.id,
      listNo: `PL-LEGACY-${String(item.id).padStart(6, '0')}`,
      platformId: item.projectName.includes('喀斯玛') ? 2 : 1,
      orderId: item.id,
      quoteRequestId: null,
      customerId: item.customerId,
      title: truncate(item.projectName, 160),
      remark: [item.projectContent, 'legacy_import_without_line_items'].filter(Boolean).join('\n'),
      status: item.deletedAt
        ? 'closed'
        : item.hasDeliveryNote
          ? 'exported'
          : 'generated',
      exportFileUrl: null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt,
    }));

  return {
    adminUsers: adminUsers.map((item) => ({
      id: Number(item.id),
      username: truncate(item.username, 64),
      passwordHash: truncate(item.password, 255),
      nickname: blankToNull(item.nickname),
      email: blankToNull(item.email),
      phone: blankToNull(item.phone),
      status: Number(item.status) === 1 ? 'active' : 'disabled',
      lastLoginAt: null,
      createdAt: toDateTime(item.create_time),
      updatedAt: toDateTime(item.update_time),
      deletedAt: null,
    })),
    serviceCategories,
    serviceProjects,
    serviceItems,
    customers,
    invoiceProfiles,
    quoteRequests,
    orders: normalizedOrders,
    contracts: normalizedContracts,
    supplierLinks,
    procurementLists,
  };
}

function resolveProductCategoryMapping(product, categoryById, directCategoryProductIds) {
  if (!product.category_id) {
    return { categoryId: 900000, projectId: 900001 };
  }

  const category = categoryById.get(String(product.category_id));
  if (!category) {
    return { categoryId: 900000, projectId: 900001 };
  }

  if (category.level === 1) {
    return {
      categoryId: Number(category.id),
      projectId: 800000 + Number(category.id),
    };
  }

  return {
    categoryId: Number(category.parent_id || 900000),
    projectId: Number(category.id),
  };
}

function normalizeSupplierLink(item, platformId, offset) {
  return {
    id: offset + Number(item.id),
    platformId,
    productName: truncate(item.product_name, 160),
    productCode: blankToNull(item.product_code),
    productType: blankToNull(item.product_type),
    saleUnit: blankToNull(item.sales_unit),
    specification: blankToNull(item.product_spec),
    unitPrice: toMoney(item.unit_price),
    purchaseUrl: blankToNull(item.order_link) || `https://legacy.invalid/${platformId}/${item.id}`,
    imageUrl: truncate(blankToNull(item.image), 500),
    status: legacyStatus(item.deleted ? 0 : 1),
    createdAt: toDateTime(item.create_time),
    updatedAt: toDateTime(item.update_time),
    deletedAt: legacyDeletedAt(item.deleted, item.update_time),
  };
}

function collectCustomer(map, name, source, createdAt, updatedAt) {
  const normalized = blankToNull(name);
  if (!normalized) {
    return;
  }

  const existing = map.get(normalized);
  if (!existing) {
    map.set(normalized, {
      name: normalized,
      sources: new Set([source]),
      createdAt: toDateTime(createdAt),
      updatedAt: toDateTime(updatedAt),
    });
    return;
  }

  existing.sources.add(source);
  existing.createdAt = minDateTime(existing.createdAt, toDateTime(createdAt));
  existing.updatedAt = maxDateTime(existing.updatedAt, toDateTime(updatedAt));
}

async function insertAdminUsers(conn, rows) {
  for (const row of rows) {
    await conn.query(
      `INSERT INTO admin_users
      (id, username, password_hash, nickname, email, phone, status, last_login_at, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)` ,
      [
        row.id,
        row.username,
        row.passwordHash,
        row.nickname,
        row.email,
        row.phone,
        row.status,
        row.lastLoginAt,
        row.createdAt,
        row.updatedAt,
        row.deletedAt,
      ],
    );
  }
}

async function insertBuiltInAdminRoles(conn) {
  const now = nowDateTime();
  const rows = [
    {
      code: 'super_admin',
      name: '超级管理员',
      description: '拥有全部后台模块与 IAM 管理权限。',
    },
    {
      code: 'operations_admin',
      name: '运营管理员',
      description: '覆盖日常经营工作台与内容维护，并可协助管理后台账号。',
    },
    {
      code: 'business_manager',
      name: '商务经理',
      description: '以询价、客户、订单、合同和代采协同为主。',
    },
    {
      code: 'content_editor',
      name: '内容编辑',
      description: '负责官网资料与服务目录维护。',
    },
  ];

  for (const row of rows) {
    await conn.query(
      `INSERT INTO admin_roles
      (code, name, description, status, is_built_in, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, 'active', 1, ?, ?, NULL, NULL, NULL)`,
      [row.code, row.name, row.description, now, now],
    );
  }
}

async function insertDefaultAdminUserRoles(conn, users, roleCode) {
  if (!users.length) {
    return;
  }

  const rows = await conn.query(
    'SELECT id FROM `admin_roles` WHERE `code` = ? LIMIT 1',
    [roleCode],
  );
  if (!rows.length) {
    throw new Error(`未找到内置角色 ${roleCode}，无法为旧管理员分配默认角色。`);
  }

  const roleId = Number(rows[0].id);
  const now = nowDateTime();

  for (const user of users) {
    await conn.query(
      `INSERT INTO admin_user_roles
      (user_id, role_id, assigned_by, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?)`,
      [user.id, roleId, now, now],
    );
  }
}

async function insertServiceCatalog(conn, normalized) {
  for (const row of normalized.serviceCategories) {
    await conn.query(
      `INSERT INTO service_categories
      (id, name, slug, description, sort_order, status, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        row.id,
        row.name,
        row.slug,
        row.description,
        row.sortOrder,
        row.status,
        row.createdAt,
        row.updatedAt,
        row.deletedAt,
      ],
    );
  }

  for (const row of normalized.serviceProjects) {
    await conn.query(
      `INSERT INTO service_projects
      (id, category_id, name, description, sort_order, status, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        row.id,
        row.categoryId,
        row.name,
        row.description,
        row.sortOrder,
        row.status,
        row.createdAt,
        row.updatedAt,
        row.deletedAt,
      ],
    );
  }

  for (const row of normalized.serviceItems) {
    await conn.query(
      `INSERT INTO service_items
      (id, category_id, project_id, item_code, name, specification, unit_price, price_note, status, source_version, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        row.id,
        row.categoryId,
        row.projectId,
        row.itemCode,
        row.name,
        row.specification,
        row.unitPrice,
        row.priceNote,
        row.status,
        row.sourceVersion,
        row.createdAt,
        row.updatedAt,
        row.deletedAt,
      ],
    );
  }
}

async function insertCustomers(conn, rows) {
  for (const row of rows) {
    await conn.query(
      `INSERT INTO customers
      (id, name, customer_type, source, industry, address, remark, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        row.id,
        row.name,
        row.customerType,
        row.source,
        row.industry,
        row.address,
        row.remark,
        row.createdAt,
        row.updatedAt,
        row.deletedAt,
      ],
    );
  }
}

async function insertInvoiceProfiles(conn, rows) {
  for (const row of rows) {
    await conn.query(
      `INSERT INTO invoice_profiles
      (id, customer_id, company_name, tax_number, address, phone, bank_name, bank_account, is_default, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        row.id,
        row.customerId,
        row.companyName,
        row.taxNumber,
        row.address,
        row.phone,
        row.bankName,
        row.bankAccount,
        row.isDefault ? 1 : 0,
        row.createdAt,
        row.updatedAt,
        row.deletedAt,
      ],
    );
  }
}

async function insertQuoteRequests(conn, rows) {
  for (const row of rows) {
    await conn.query(
      `INSERT INTO quote_requests
      (id, quote_no, customer_id, contact_name, contact_phone, contact_email, company_name, business_type, source, remark, estimated_total_amount, status, owner_user_id, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        row.id,
        row.quoteNo,
        row.customerId,
        row.contactName,
        row.contactPhone,
        row.contactEmail,
        row.companyName,
        row.businessType,
        row.source,
        row.remark,
        row.estimatedTotalAmount,
        row.status,
        row.ownerUserId,
        row.createdAt,
        row.updatedAt,
        row.deletedAt,
      ],
    );
  }
}

async function insertOrders(conn, rows) {
  for (const row of rows) {
    await conn.query(
      `INSERT INTO orders
      (id, order_no, customer_id, quote_request_id, order_type, project_name, project_content, amount, has_contract, has_delivery_note, is_paid, order_date, invoice_profile_id, owner_user_id, remark, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        row.id,
        row.orderNo,
        row.customerId,
        row.quoteRequestId,
        row.orderType,
        row.projectName,
        row.projectContent,
        row.amount,
        row.hasContract ? 1 : 0,
        row.hasDeliveryNote ? 1 : 0,
        row.isPaid ? 1 : 0,
        row.orderDate,
        row.invoiceProfileId,
        row.ownerUserId,
        row.remark,
        row.createdAt,
        row.updatedAt,
        row.deletedAt,
      ],
    );
  }
}

async function insertContracts(conn, rows) {
  for (const row of rows) {
    await conn.query(
      `INSERT INTO contracts
      (id, order_id, customer_id, legacy_contract_id, contract_name, description, file_name, file_path, file_type, file_size, storage_provider, source, version_no, uploaded_by, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        row.id,
        row.orderId,
        row.customerId,
        row.legacyContractId,
        row.contractName,
        row.description,
        row.fileName,
        row.filePath,
        row.fileType,
        row.fileSize,
        row.storageProvider,
        row.source,
        row.versionNo,
        row.uploadedBy,
        row.createdAt,
        row.updatedAt,
        row.deletedAt,
      ],
    );
  }
}

async function insertSupplierPlatforms(conn) {
  const now = nowDateTime();
  const rows = [
    { id: 1, code: 'rjmart', name: '锐竟' },
    { id: 2, code: 'casmart', name: '喀斯玛' },
    { id: 3, code: 'other', name: '其他' },
  ];

  for (const row of rows) {
    await conn.query(
      `INSERT INTO supplier_platforms
      (id, code, name, status, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, 'active', ?, ?, NULL, NULL, NULL)`,
      [row.id, row.code, row.name, now, now],
    );
  }
}

async function insertSupplierLinks(conn, rows) {
  for (const row of rows) {
    await conn.query(
      `INSERT INTO supplier_links
      (id, platform_id, product_name, product_code, product_type, sale_unit, specification, unit_price, purchase_url, image_url, status, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        row.id,
        row.platformId,
        row.productName,
        row.productCode,
        row.productType,
        row.saleUnit,
        row.specification,
        row.unitPrice,
        row.purchaseUrl,
        row.imageUrl,
        row.status,
        row.createdAt,
        row.updatedAt,
        row.deletedAt,
      ],
    );
  }
}

async function insertProcurementLists(conn, rows) {
  for (const row of rows) {
    await conn.query(
      `INSERT INTO procurement_lists
      (id, list_no, platform_id, order_id, quote_request_id, customer_id, title, remark, status, export_file_url, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        row.id,
        row.listNo,
        row.platformId,
        row.orderId,
        row.quoteRequestId,
        row.customerId,
        row.title,
        row.remark,
        row.status,
        row.exportFileUrl,
        row.createdAt,
        row.updatedAt,
        row.deletedAt,
      ],
    );
  }
}

function normalizeRow(row) {
  const next = {};
  for (const [key, value] of Object.entries(row)) {
    next[key] = typeof value === 'bigint' ? value.toString() : value;
  }
  return next;
}

function legacyStatus(status) {
  return Number(status) === 1 ? 'active' : 'inactive';
}

function legacyDeletedAt(deleted, updatedAt) {
  return Number(deleted) === 1 ? toDateTime(updatedAt) : null;
}

function toMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
}

function boolNumber(value) {
  return Number(value) === 1;
}

function toBigIntString(value) {
  const text = blankToNull(value);
  if (!text) {
    return '0';
  }

  try {
    const numeric = BigInt(text);
    return numeric >= 0n ? numeric.toString() : '0';
  } catch {
    return '0';
  }
}

function blankToNull(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function truncate(value, max) {
  const text = blankToNull(value);
  if (text === null) {
    return null;
  }
  return text.slice(0, max);
}

function toDateTime(value) {
  return value ? String(value).slice(0, 19).replace('T', ' ') : nowDateTime();
}

function nowDateTime() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function minDateTime(left, right) {
  return left <= right ? left : right;
}

function maxDateTime(left, right) {
  return left >= right ? left : right;
}

function looksLikeCompany(name) {
  return /公司|大学|医院|学院|中心|医药|实验室|研究所|课题组/.test(name);
}

function detectLegacyStorageProvider(filePath) {
  const normalized = blankToNull(filePath);

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('/www/wwwroot/')) {
    return 'legacy_linux_path';
  }

  if (/^[A-Za-z]:[\\/]/.test(normalized) || normalized.includes('E:/')) {
    return 'legacy_windows_path';
  }

  return 'legacy_path';
}

function findLinkedOrderForLegacyContract(contract, orders) {
  const contractName = blankToNull(contract.contract_name);
  if (!contractName) {
    return null;
  }

  const matches = orders.filter((item) => {
    if (item.deletedAt) {
      return false;
    }

    return item.projectName === contractName || item.projectContent === contractName;
  });

  return matches.length === 1 ? matches[0] : null;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
