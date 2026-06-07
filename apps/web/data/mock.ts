export interface NavItem {
  label: string;
  to: string;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface BusinessLine {
  eyebrow: string;
  title: string;
  summary: string;
  ctaLabel: string;
  ctaTo: string;
}

export interface ContentCard {
  title: string;
  summary: string;
}

export interface TimelineStep {
  index: string;
  title: string;
  summary: string;
}

export interface ContactItem {
  label: string;
  value: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ServiceItem {
  code: string;
  category: string;
  project: string;
  name: string;
  spec: string;
  price: number;
  turnaround: string;
}

export interface PriceBand {
  key: string;
  label: string;
  min: number;
  max: number;
}

export const companyProfile = {
  name: "广州溯博生物科技有限公司",
  subtitle: "技术服务 · 试剂耗材代采 · 商务协同",
  heroTitle: "科研服务、试剂代采、商务协同，同屏推进。",
  heroSummary:
    "面向高校、医院、科研团队与企业客户，提供技术服务报价、试剂耗材代采和商务对接支持。",
  intro:
    "聚焦科研场景下的技术服务、试剂耗材代采与项目协同，帮助客户更高效推进实验、采购与交付流程。",
  eyebrow: "广州溯博生物科技有限公司"
};

export const primaryNav: NavItem[] = [
  { label: "首页", to: "/" },
  { label: "技术服务", to: "/services" },
  { label: "报价中心", to: "/quote" },
  { label: "试剂耗材代采", to: "/procurement" },
  { label: "实习生招募", to: "/internship" },
  { label: "联系我们", to: "/contact" }
];

export const heroStats: HeroStat[] = [
  { value: "860+", label: "技术服务报价条目" },
  { value: "16", label: "服务分类" },
  { value: "2", label: "代采平台统一接入" },
  { value: "24h", label: "询价响应预期" }
];

export const businessLines: BusinessLine[] = [
  {
    eyebrow: "技术服务线",
    title: "进入报价中心",
    summary: "按服务分类、项目名称、规格和价格快速筛选，形成正式询价清单。",
    ctaLabel: "进入报价中心",
    ctaTo: "/quote"
  },
  {
    eyebrow: "采购协同线",
    title: "提交代采询价",
    summary: "按品牌、货号、规格和平台偏好提交需求，由商务继续确认清单。",
    ctaLabel: "提交代采询价",
    ctaTo: "/quote?mode=procurement"
  },
  {
    eyebrow: "正式协同线",
    title: "联系商务团队",
    summary: "承接报价、合同、开票、采购和交付沟通，适合复杂项目推进。",
    ctaLabel: "联系商务团队",
    ctaTo: "/contact"
  }
];

export const internshipCards: ContentCard[] = [
  {
    title: "科研服务助理实习生",
    summary: "协助整理技术服务目录、项目资料和客户需求，适合生命科学、生物技术、医学相关专业。"
  },
  {
    title: "试剂耗材代采实习生",
    summary: "协助核对品牌、货号、规格和采购平台信息，适合细致、愿意了解科研采购流程的同学。"
  },
  {
    title: "商务运营实习生",
    summary: "协助询价记录、客户沟通资料和交付跟进，适合希望接触科研服务商业化流程的同学。"
  }
];

export const serviceTags = [
  "动物实验",
  "病理检测",
  "分子病理",
  "蛋白与细胞",
  "理化检测"
];

export const serviceOverviewCards: ContentCard[] = [
  {
    title: "模型与动物实验",
    summary: "涵盖动物饲养、肿瘤药效模型、非肿瘤药效模型与实验支持。"
  },
  {
    title: "病理与成像",
    summary: "包括普通病理、硬组织病理、切片扫描、激光共聚焦扫描与显微成像。"
  },
  {
    title: "分子、蛋白与理化",
    summary: "覆盖免疫荧光、原位杂交、TUNEL、蛋白表达分析、细胞检测与理化指标检测。"
  }
];

export const procurementTimeline: TimelineStep[] = [
  {
    index: "1",
    title: "提交需求",
    summary: "按品牌、货号、规格与采购平台偏好提交代采需求。"
  },
  {
    index: "2",
    title: "平台匹配",
    summary: "结合锐竞采购平台与喀斯玛平台信息筛选合适来源，并确认交期与规格。"
  },
  {
    index: "3",
    title: "生成清单",
    summary: "支持整理采购明细、生成清单并导出，便于后续报价与确认。"
  },
  {
    index: "4",
    title: "商务确认",
    summary: "由商务团队继续处理报价、开票、发货与合同等后续事项。"
  }
];

export const procurementPlatforms: ContentCard[] = [
  {
    title: "锐竞采购平台",
    summary: "支持按锐竞采购平台下单路径整理商品信息、采购需求与后续报价。"
  },
  {
    title: "喀斯玛平台",
    summary: "支持结合喀斯玛平台下单信息整理询价来源、采购明细与商务资料。"
  },
  {
    title: "采购清单",
    summary: "支持整理采购明细、生成清单并导出，便于后续内部流转与确认。"
  },
  {
    title: "需求集中提交",
    summary: "技术服务、代采需求与商务咨询均可在线提交，减少重复沟通。"
  }
];

export const workflowSteps: ContentCard[] = [
  {
    title: "01. 浏览与筛选",
    summary: "先了解服务范围，再按分类、项目、价格与规格快速找到合适内容。"
  },
  {
    title: "02. 询价与代采提交",
    summary: "技术服务可按目录直接询价，代采需求可按品牌、货号和平台偏好提交。"
  },
  {
    title: "03. 商务确认与交付",
    summary: "提交后由商务团队继续确认方案、报价、采购与交付安排。"
  }
];

export const faqItems: FaqItem[] = [
  {
    question: "为什么报价中心不做客户登录？",
    answer: "当前阶段优先保证询价提交流程足够直接高效，客户无需注册即可提交需求并由商务团队跟进。"
  },
  {
    question: "代采为什么不直接做商城？",
    answer: "代采更像科研商务协同，很多需求依赖平台匹配、开票要求和采购清单，不适合零售式交互。"
  },
  {
    question: "报价中心里的价格就是最终成交价吗？",
    answer: "前台价格用于快速组合和预估，复杂项目仍由商务确认样本量、交付要求与排期。"
  }
];

export const contactItems: ContactItem[] = [
  { label: "企业名称", value: "广州溯博生物科技有限公司" },
  { label: "地址", value: "广州市白云区鹤龙一路 2 号自编 1 栋 C3973-8 房" },
  { label: "电话 / 手机", value: "18102724565" },
  { label: "邮箱", value: "suboswkj@gmail.com" }
];

export const priceBands: PriceBand[] = [
  { key: "all", label: "全部价格", min: 0, max: Number.POSITIVE_INFINITY },
  { key: "lt500", label: "¥500 以下", min: 0, max: 500 },
  { key: "mid", label: "¥500 - ¥1500", min: 500, max: 1500 },
  { key: "high", label: "¥1500 以上", min: 1500, max: Number.POSITIVE_INFINITY }
];

export const serviceItems: ServiceItem[] = [
  {
    code: "GA1001",
    category: "动物实验",
    project: "动物饲养",
    name: "普通饲养（小鼠）",
    spec: "只/天",
    price: 3,
    turnaround: "按实际饲养周期结算"
  },
  {
    code: "GA1093",
    category: "动物实验",
    project: "肿瘤药效组动物实验模型",
    name: "裸鼠皮下移植瘤",
    spec: "只",
    price: 1200,
    turnaround: "建模排期 5-7 个工作日"
  },
  {
    code: "GA1012",
    category: "动物实验",
    project: "非肿瘤药效组模型",
    name: "大鼠 CCl4 诱导肝纤维化模型",
    spec: "只",
    price: 1800,
    turnaround: "建模排期 7-10 个工作日"
  },
  {
    code: "BL2030",
    category: "蛋白",
    project: "蛋白表达分析",
    name: "Western Blot 半定量分析",
    spec: "样本",
    price: 260,
    turnaround: "结果交付 3-5 个工作日"
  },
  {
    code: "CX1008",
    category: "细胞",
    project: "细胞毒性",
    name: "CCK8 细胞活性检测",
    spec: "孔",
    price: 90,
    turnaround: "结果交付 2-3 个工作日"
  },
  {
    code: "FL3302",
    category: "分子病理",
    project: "多重免疫荧光",
    name: "多重 IF 染色（四标）",
    spec: "张",
    price: 900,
    turnaround: "结果交付 5-7 个工作日"
  },
  {
    code: "TX5501",
    category: "病理图像",
    project: "切片数字化",
    name: "全片扫描 40x",
    spec: "张",
    price: 200,
    turnaround: "结果交付 1-2 个工作日"
  },
  {
    code: "LC2006",
    category: "理化",
    project: "血液生化",
    name: "ALT/AST 双指标检测",
    spec: "样本",
    price: 68,
    turnaround: "结果交付 1-2 个工作日"
  }
];

export const procurementCategories: ContentCard[] = [
  {
    title: "常规试剂与试剂盒",
    summary: "适用于品牌明确、货号清晰、已有预算区间的采购需求。"
  },
  {
    title: "抗体、血清与细胞材料",
    summary: "适合高校、医院、科研机构需要按平台偏好和交期协同的场景。"
  },
  {
    title: "仪器配件与特殊询源",
    summary: "对来源稳定性、发票抬头和商务流程要求更高，适合单独由销售承接。"
  }
];

export const procurementSupportPoints: ContentCard[] = [
  {
    title: "高校 / 医院采购场景",
    summary: "支持按照课题组、科室、采购平台偏好整理需求，减少来回确认。"
  },
  {
    title: "供应商平台统一管理",
    summary: "可围绕供应商链接、采购清单与询价明细统一整理，提升采购效率。"
  },
  {
    title: "合同、发票与商务配合",
    summary: "提交需求后，合同、发票与商务资料将由专人继续对接。"
  }
];
