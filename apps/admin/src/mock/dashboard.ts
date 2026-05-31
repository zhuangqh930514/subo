export type MetricTone = 'primary' | 'success' | 'warning' | 'danger'

export interface DashboardMetric {
  label: string
  value: string
  description: string
  trend: string
  tone: MetricTone
}

export interface OrderStructureItem {
  label: string
  percentage: number
  amount: string
  description: string
  tone: MetricTone
}

export interface LeadSourceRow {
  source: string
  count: number
  ratio: string
  description: string
}

export interface InquiryRow {
  customer: string
  businessType: '技术服务' | '代采' | '混合'
  status: '待跟进' | '清单匹配中' | '已转订单'
  owner: string
  amount: string
  updatedAt: string
}

export interface ProcurementReminder {
  title: string
  detail: string
  count: number
  action: string
  tone: MetricTone
}

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: '待跟进询价',
    value: '18',
    description: '技术服务 11 条，代采 7 条，线索池需要优先分配。',
    trend: '+4 较上周',
    tone: 'warning',
  },
  {
    label: '本月技术服务订单',
    value: '¥92,650',
    description: '主要来自报价中心与手工录入，重点项目正在转合同。',
    trend: '8 笔',
    tone: 'primary',
  },
  {
    label: '本月代采订单',
    value: '¥70,900',
    description: '其中 6 笔来自采购清单转单，平台统一后可继续放大。',
    trend: '6 笔',
    tone: 'success',
  },
  {
    label: '待处理合同 / 发票',
    value: '9',
    description: '合同 4 份，发票资料 5 项，还需要财务补齐。',
    trend: '今日 +2',
    tone: 'danger',
  },
  {
    label: '线索转单率',
    value: '32%',
    description: '近 30 天询价到订单的转化率，代采链路仍有提升空间。',
    trend: '+6%',
    tone: 'success',
  },
]

export const orderStructure: OrderStructureItem[] = [
  {
    label: '技术服务订单',
    percentage: 78,
    amount: '¥92,650',
    description: '动物实验、病理图像和多重免疫荧光是当前主力来源。',
    tone: 'primary',
  },
  {
    label: '代采订单',
    percentage: 52,
    amount: '¥70,900',
    description: '由采购清单转单 6 笔，锐竟与喀斯玛需求较集中。',
    tone: 'success',
  },
  {
    label: '待转正式订单',
    percentage: 34,
    amount: '9 笔',
    description: '销售仍在确认报价与供货窗口，适合首页提醒。',
    tone: 'warning',
  },
]

export const leadSources: LeadSourceRow[] = [
  {
    source: '报价中心',
    count: 12,
    ratio: '67%',
    description: '以技术服务目录询价为主，单次客单价较高。',
  },
  {
    source: '代采需求',
    count: 4,
    ratio: '22%',
    description: '来自官网独立入口，需要尽快转采购清单。',
  },
  {
    source: '官网留言',
    count: 2,
    ratio: '11%',
    description: '一般商务咨询与合作问询，适合运营先筛。',
  },
]

export const recentInquiries: InquiryRow[] = [
  {
    customer: '南方医科大学某课题组',
    businessType: '技术服务',
    status: '待跟进',
    owner: '商务 A',
    amount: '¥14,200',
    updatedAt: '15 分钟前',
  },
  {
    customer: '广东省人民医院',
    businessType: '代采',
    status: '清单匹配中',
    owner: '商务 B',
    amount: '¥9,600',
    updatedAt: '35 分钟前',
  },
  {
    customer: '中山大学附属第一医院',
    businessType: '技术服务',
    status: '已转订单',
    owner: '商务 A',
    amount: '¥26,000',
    updatedAt: '今天 09:20',
  },
  {
    customer: '华南农业大学动物医学学院',
    businessType: '代采',
    status: '待跟进',
    owner: '商务 C',
    amount: '¥7,850',
    updatedAt: '今天 08:45',
  },
]

export const procurementReminders: ProcurementReminder[] = [
  {
    title: '待生成采购清单',
    detail: '4 条代采询价尚未转采购清单，容易卡在销售跟进阶段。',
    count: 4,
    action: '先生成草稿',
    tone: 'warning',
  },
  {
    title: '锐竟平台待确认价格',
    detail: '2 个条目价格超过 7 天未更新，需要人工校准。',
    count: 2,
    action: '更新价格',
    tone: 'danger',
  },
  {
    title: '喀斯玛本周新链接',
    detail: '6 个链接建议补录到统一供应商池，减少重复整理。',
    count: 6,
    action: '补录链接',
    tone: 'success',
  },
]
