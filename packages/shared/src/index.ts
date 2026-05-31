export type ServiceItem = {
  code: string;
  category: string;
  project: string;
  name: string;
  specification: string;
  price: number;
};

export type ProcurementItem = {
  id: string;
  platform: "锐竟" | "喀斯玛" | "其他";
  name: string;
  code: string;
  type: string;
  unit: string;
  specification: string;
  price: number;
};

export const companyProfile = {
  name: "广州溯博生物科技有限公司",
  shortName: "溯博生物",
  phone: "18102724565",
  email: "suboswkj@gmail.com",
  address: "广州市白云区鹤龙一路2号自编1栋C3973-8房",
  taxNumber: "91440111MAEWR7R42G",
  bankName: "中国工商银行（广州东山口支行）",
  bankAccount: "3602001009201358959",
} as const;

export const serviceCategories = [
  "动物实验",
  "细胞",
  "普通病理",
  "分子病理（免疫荧光）",
  "病理图像（切片扫描）",
  "蛋白",
  "理化",
] as const;

export const serviceItems: ServiceItem[] = [
  {
    code: "GA1001",
    category: "动物实验",
    project: "动物饲养",
    name: "普通饲养（小鼠）",
    specification: "只/天",
    price: 3,
  },
  {
    code: "GA1093",
    category: "动物实验",
    project: "肿瘤药效组动物实验模型",
    name: "裸鼠皮下移植瘤",
    specification: "只",
    price: 1200,
  },
  {
    code: "GA1012",
    category: "动物实验",
    project: "非肿瘤药效组模型",
    name: "大鼠CCl4诱导肝纤维化模型",
    specification: "只",
    price: 1800,
  },
  {
    code: "CX1008",
    category: "细胞",
    project: "细胞毒性",
    name: "CCK8细胞活性检测",
    specification: "孔",
    price: 90,
  },
  {
    code: "FL3302",
    category: "分子病理（免疫荧光）",
    project: "多重免疫荧光",
    name: "多重IF染色（四标）",
    specification: "张",
    price: 900,
  },
  {
    code: "TX5501",
    category: "病理图像（切片扫描）",
    project: "切片数字化",
    name: "全片扫描40x",
    specification: "张",
    price: 200,
  },
  {
    code: "BL2030",
    category: "蛋白",
    project: "蛋白表达分析",
    name: "Western Blot半定量分析",
    specification: "样本",
    price: 260,
  },
  {
    code: "LC2006",
    category: "理化",
    project: "血液生化",
    name: "ALT/AST双指标检测",
    specification: "样本",
    price: 68,
  },
];

export const procurementItems: ProcurementItem[] = [
  {
    id: "RJ-001",
    platform: "锐竟",
    name: "TSA Plus 荧光四标五色染色试剂盒",
    code: "TSA-SBWS",
    type: "试剂盒",
    unit: "盒",
    specification: "50T",
    price: 4000,
  },
  {
    id: "RJ-002",
    platform: "锐竟",
    name: "乳酸脱氢酶细胞毒性检测试剂盒",
    code: "RSTQMXBDXJCSJH",
    type: "试剂盒",
    unit: "盒",
    specification: "500次",
    price: 800,
  },
  {
    id: "CS-001",
    platform: "喀斯玛",
    name: "胎牛血清（优级）",
    code: "A5256701",
    type: "血清",
    unit: "瓶",
    specification: "500mL/瓶",
    price: 3000,
  },
  {
    id: "CS-002",
    platform: "喀斯玛",
    name: "FS Universal SYBR Green Master",
    code: "4913914001",
    type: "PCR试剂",
    unit: "瓶",
    specification: "5mL",
    price: 1100,
  },
];

export const dashboardMetrics = {
  pendingQuotes: 18,
  monthlyServiceRevenue: 92650,
  monthlyProcurementRevenue: 70900,
  pendingContractActions: 9,
} as const;
