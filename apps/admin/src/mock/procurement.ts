export interface ProcurementItem {
  id: string
  platform: '锐竟' | '喀斯玛'
  name: string
  code: string
  type: string
  spec: string
  unit: string
  price: number
  linkedInquiry: string
  updatedAt: string
}

export interface ProcurementRecord {
  listNo: string
  platform: string
  relatedOrder: string
  status: string
}

export const platformOptions = ['全部', '锐竟', '喀斯玛'] as const

export const procurementItems: ProcurementItem[] = [
  {
    id: 'RJ-001',
    platform: '锐竟',
    name: 'TSA Plus 荧光四标五色染色试剂盒',
    code: 'TSA-SBWS',
    type: '试剂盒',
    spec: '50T',
    unit: '盒',
    price: 4000,
    linkedInquiry: '广东省人民医院代采需求',
    updatedAt: '今天 10:10',
  },
  {
    id: 'RJ-002',
    platform: '锐竟',
    name: '乳酸脱氢酶细胞毒性检测试剂盒',
    code: 'RSTQMXBDXJCSJH',
    type: '试剂盒',
    spec: '500 次',
    unit: '盒',
    price: 800,
    linkedInquiry: '华南农业大学动物医学学院',
    updatedAt: '今天 09:42',
  },
  {
    id: 'CS-001',
    platform: '喀斯玛',
    name: '胎牛血清（优级）',
    code: 'A5256701',
    type: '血清',
    spec: '500mL/瓶',
    unit: '瓶',
    price: 3000,
    linkedInquiry: '广东省人民医院代采需求',
    updatedAt: '今天 10:32',
  },
  {
    id: 'CS-002',
    platform: '喀斯玛',
    name: 'FS Universal SYBR Green Master',
    code: '4913914001',
    type: 'PCR 试剂',
    spec: '5mL',
    unit: '瓶',
    price: 1100,
    linkedInquiry: '南方医科大学代采需求',
    updatedAt: '昨天 18:15',
  },
  {
    id: 'RJ-003',
    platform: '锐竟',
    name: 'β-半乳糖苷酶染色试剂盒',
    code: 'BRTGMRSSJH',
    type: '试剂盒',
    spec: '100T',
    unit: '盒',
    price: 1000,
    linkedInquiry: '中山大学附属第一医院',
    updatedAt: '昨天 16:20',
  },
  {
    id: 'CS-003',
    platform: '喀斯玛',
    name: '重组人 IL-6 蛋白',
    code: 'PHC0063',
    type: '蛋白',
    spec: '100ug',
    unit: '支',
    price: 1680,
    linkedInquiry: '中山大学肿瘤防治中心',
    updatedAt: '昨天 15:05',
  },
]

export const defaultSelectedProcurementIds = ['RJ-001', 'CS-001']

export const procurementInquiryOptions = [
  '广东省人民医院代采需求',
  '南方医科大学代采需求',
  '华南农业大学动物医学学院',
  '中山大学肿瘤防治中心',
]

export const exportFormats = ['Excel', '内部预览']

export const procurementRecords: ProcurementRecord[] = [
  {
    listNo: 'PL-202605-018',
    platform: '锐竟',
    relatedOrder: 'SO-202605-010',
    status: '已导出',
  },
  {
    listNo: 'PL-202605-017',
    platform: '喀斯玛',
    relatedOrder: 'SO-202605-008',
    status: '待跟进',
  },
]

