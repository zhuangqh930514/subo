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
const ROLE_CODE = blankToNull(process.env.ROLE_CODE);
const USER_IDS = parseIdList(process.env.USER_IDS);

const BUILT_IN_ROLES = [
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

async function main() {
  const conn = await mariadb.createConnection(TARGET_DB);

  try {
    const summary = {
      database: TARGET_DB.database,
      dryRun: !APPLY,
      requestedRoleCode: ROLE_CODE,
      requestedUserIds: USER_IDS,
      missingBuiltInRoles: [],
      candidateCount: 0,
      candidates: [],
      assignedCount: 0,
      appliedRoleCode: null,
      nextSteps: [],
    };

    if (APPLY) {
      await conn.beginTransaction();
      await ensureBuiltInRoles(conn);
    } else {
      summary.missingBuiltInRoles = await findMissingBuiltInRoles(conn);
    }

    const candidates = await loadActiveUsersWithoutRoles(conn, USER_IDS);
    summary.candidateCount = candidates.length;
    summary.candidates = candidates.map((row) => ({
      id: Number(row.id),
      username: row.username,
      nickname: row.nickname,
      status: row.status,
    }));

    if (!APPLY) {
      summary.nextSteps = buildNextSteps(candidates);
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    if (!ROLE_CODE) {
      throw new Error('APPLY=1 时请显式提供 ROLE_CODE，例如 super_admin 或 business_manager。');
    }

    const role = await loadRoleByCode(conn, ROLE_CODE);
    if (!role) {
      throw new Error(`未找到可分配角色 ${ROLE_CODE}。请先检查角色编码是否正确。`);
    }

    if (candidates.length > 0) {
      const now = nowDateTime();
      for (const user of candidates) {
        await conn.query(
          `INSERT INTO admin_user_roles
          (user_id, role_id, assigned_by, created_at, updated_at)
          VALUES (?, ?, NULL, ?, ?)`,
          [Number(user.id), Number(role.id), now, now],
        );
      }
    }

    await conn.commit();

    summary.assignedCount = candidates.length;
    summary.appliedRoleCode = role.code;
    summary.nextSteps = [
      '可用数据库账号重新登录后台验证导航与权限。',
      '若需要细分权限，再登录 IAM 页面按角色重新调整。',
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

async function ensureBuiltInRoles(conn) {
  const now = nowDateTime();

  for (const role of BUILT_IN_ROLES) {
    await conn.query(
      `INSERT INTO admin_roles
      (code, name, description, status, is_built_in, created_at, updated_at, created_by, updated_by, deleted_at)
      VALUES (?, ?, ?, 'active', 1, ?, ?, NULL, NULL, NULL)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        status = 'active',
        is_built_in = 1,
        updated_at = VALUES(updated_at),
        deleted_at = NULL`,
      [role.code, role.name, role.description, now, now],
    );
  }
}

async function findMissingBuiltInRoles(conn) {
  const rows = await conn.query(
    'SELECT code FROM admin_roles WHERE deleted_at IS NULL',
  );
  const existingCodes = new Set(rows.map((row) => row.code));

  return BUILT_IN_ROLES
    .map((role) => role.code)
    .filter((code) => !existingCodes.has(code));
}

async function loadActiveUsersWithoutRoles(conn, userIds) {
  const filters = [
    'u.deleted_at IS NULL',
    "u.status = 'active'",
    'ur.id IS NULL',
  ];
  const params = [];

  if (userIds.length > 0) {
    filters.push(`u.id IN (${userIds.map(() => '?').join(', ')})`);
    params.push(...userIds);
  }

  return conn.query(
    `SELECT u.id, u.username, COALESCE(NULLIF(TRIM(u.nickname), ''), u.username) AS nickname, u.status
    FROM admin_users u
    LEFT JOIN admin_user_roles ur ON ur.user_id = u.id
    WHERE ${filters.join(' AND ')}
    ORDER BY u.id ASC`,
    params,
  );
}

async function loadRoleByCode(conn, code) {
  const rows = await conn.query(
    `SELECT id, code
    FROM admin_roles
    WHERE code = ?
      AND deleted_at IS NULL
      AND status = 'active'
    LIMIT 1`,
    [code],
  );

  return rows[0] ?? null;
}

function buildNextSteps(candidates) {
  if (candidates.length === 0) {
    return ['当前没有需要补角色的有效管理员。'];
  }

  return [
    '保守补权：APPLY=1 ROLE_CODE=business_manager pnpm --dir apps/api iam:backfill:roles',
    '维持全量管理权限：APPLY=1 ROLE_CODE=super_admin pnpm --dir apps/api iam:backfill:roles',
    '若只想处理指定账号，可再加 USER_IDS=1,2 之类的过滤。',
  ];
}

function parseIdList(value) {
  const normalized = blankToNull(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function blankToNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function nowDateTime() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
