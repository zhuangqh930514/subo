export interface AdminPermissionGroup {
  key: string;
  label: string;
  permissions: Array<{
    key: string;
    label: string;
  }>;
}

export interface BuiltInAdminRoleDefinition {
  code: string;
  name: string;
  description: string;
  permissionKeys: string[];
}

export const ADMIN_PERMISSION_GROUPS: AdminPermissionGroup[] = [
  {
    key: 'workspace',
    label: '业务工作台',
    permissions: [
      { key: 'dashboard.view', label: '查看仪表盘' },
      { key: 'quotes.view', label: '查看询价管理' },
      { key: 'contracts.view', label: '查看合同档案' },
      { key: 'customers.view', label: '查看客户管理' },
      { key: 'invoice_profiles.view', label: '查看开票资料' },
      { key: 'orders.view', label: '查看订单管理' },
      { key: 'procurement.view', label: '查看采购清单' },
    ],
  },
  {
    key: 'content',
    label: '官网内容',
    permissions: [
      { key: 'site_profile.manage', label: '维护站点资料' },
      { key: 'service_catalog.manage', label: '维护服务目录' },
    ],
  },
  {
    key: 'iam',
    label: 'IAM 管理',
    permissions: [{ key: 'iam.users.manage', label: '管理管理员、角色与操作日志' }],
  },
];

const ALL_PERMISSION_KEYS = ADMIN_PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.key),
);

export const BUILT_IN_ADMIN_ROLES: BuiltInAdminRoleDefinition[] = [
  {
    code: 'super_admin',
    name: '超级管理员',
    description: '拥有全部后台模块与 IAM 管理权限。',
    permissionKeys: [...ALL_PERMISSION_KEYS],
  },
  {
    code: 'operations_admin',
    name: '运营管理员',
    description: '覆盖日常经营工作台与内容维护，并可协助管理后台账号。',
    permissionKeys: [
      'dashboard.view',
      'quotes.view',
      'contracts.view',
      'customers.view',
      'invoice_profiles.view',
      'orders.view',
      'procurement.view',
      'site_profile.manage',
      'service_catalog.manage',
      'iam.users.manage',
    ],
  },
  {
    code: 'business_manager',
    name: '商务经理',
    description: '以询价、客户、订单、合同和代采协同为主。',
    permissionKeys: [
      'dashboard.view',
      'quotes.view',
      'contracts.view',
      'customers.view',
      'invoice_profiles.view',
      'orders.view',
      'procurement.view',
    ],
  },
  {
    code: 'content_editor',
    name: '内容编辑',
    description: '负责官网资料与服务目录维护。',
    permissionKeys: [
      'dashboard.view',
      'site_profile.manage',
      'service_catalog.manage',
    ],
  },
];

export const BUILT_IN_ROLE_CODE_SET = new Set(
  BUILT_IN_ADMIN_ROLES.map((role) => role.code),
);

export function resolvePermissionLabel(key: string) {
  for (const group of ADMIN_PERMISSION_GROUPS) {
    const matched = group.permissions.find((permission) => permission.key === key);
    if (matched) {
      return matched.label;
    }
  }

  return key;
}

export function findBuiltInRoleDefinition(code: string) {
  return BUILT_IN_ADMIN_ROLES.find((role) => role.code === code);
}
