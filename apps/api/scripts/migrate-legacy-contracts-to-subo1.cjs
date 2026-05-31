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
    const [legacyContracts, targetOrders] = await Promise.all([
      legacy.query(
        'SELECT * FROM `contract` ORDER BY `id` ASC',
      ),
      target.query(
        'SELECT id, customer_id, project_name, project_content, deleted_at FROM `orders`',
      ),
    ]);

    const normalizedOrders = targetOrders.map(normalizeRow).map((item) => ({
      id: Number(item.id),
      customerId: item.customer_id ? Number(item.customer_id) : null,
      projectName: blankToNull(item.project_name),
      projectContent: blankToNull(item.project_content),
      deletedAt: blankToNull(item.deleted_at),
    }));

    const normalizedContracts = legacyContracts.map(normalizeRow).map((item) => {
      const linkedOrder = findLinkedOrderForLegacyContract(item, normalizedOrders);

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

    await target.beginTransaction();

    let created = 0;
    let updated = 0;

    for (const row of normalizedContracts) {
      const existing = await target.query(
        'SELECT id FROM `contracts` WHERE `legacy_contract_id` = ? LIMIT 1',
        [row.legacyContractId],
      );

      if (existing.length > 0) {
        updated += 1;
      } else {
        created += 1;
      }

      await target.query(
        `INSERT INTO contracts
        (id, order_id, customer_id, legacy_contract_id, contract_name, description, file_name, file_path, file_type, file_size, storage_provider, source, version_no, uploaded_by, created_at, updated_at, created_by, updated_by, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
        ON DUPLICATE KEY UPDATE
          order_id = VALUES(order_id),
          customer_id = VALUES(customer_id),
          contract_name = VALUES(contract_name),
          description = VALUES(description),
          file_name = VALUES(file_name),
          file_path = VALUES(file_path),
          file_type = VALUES(file_type),
          file_size = VALUES(file_size),
          storage_provider = VALUES(storage_provider),
          source = VALUES(source),
          version_no = VALUES(version_no),
          uploaded_by = VALUES(uploaded_by),
          updated_at = VALUES(updated_at),
          deleted_at = VALUES(deleted_at)`,
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

    await target.commit();

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          total: normalizedContracts.length,
          created,
          updated,
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

function normalizeRow(row) {
  const next = {};

  for (const [key, value] of Object.entries(row)) {
    next[key] = typeof value === 'bigint' ? value.toString() : value;
  }

  return next;
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

function legacyDeletedAt(deleted, updatedAt) {
  return Number(deleted) === 1 ? toDateTime(updatedAt) : null;
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
