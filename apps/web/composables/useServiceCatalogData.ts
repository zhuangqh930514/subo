import { computed } from "vue";
import { serviceItems as fallbackServiceItems } from "~/data/mock";

export interface ServiceCatalogItem {
  id: string;
  code: string;
  category: string;
  project: string;
  name: string;
  specification: string;
  price: number;
  priceNote: string;
}

export interface ServiceCatalogProject {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  items: ServiceCatalogItem[];
}

export interface ServiceCatalogCategory {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  projects: ServiceCatalogProject[];
}

export interface ServiceCatalogResponse {
  demoMode: boolean;
  summary: {
    categoryCount: number;
    itemCount: number;
  };
  categories: ServiceCatalogCategory[];
  items: ServiceCatalogItem[];
}

const fallbackCatalog = buildFallbackCatalog();

export function useServiceCatalogData() {
  const runtimeConfig = useRuntimeConfig();
  const apiBase = import.meta.server
    ? runtimeConfig.apiInternalBase
    : runtimeConfig.public.apiBase;

  const { data, error, pending, refresh } = useAsyncData<ServiceCatalogResponse>(
    "service-catalog-public",
    () => $fetch(`${apiBase}/service-catalog/catalog`),
    {
      default: () => fallbackCatalog,
    },
  );

  const catalog = computed(() => data.value ?? fallbackCatalog);
  const isFallback = computed(() => Boolean(error.value) || catalog.value.demoMode);

  return {
    catalog,
    catalogError: error,
    catalogPending: pending,
    isFallback,
    refreshCatalog: refresh,
  };
}

export function formatCatalogSpecification(specification: string) {
  const normalized = specification.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "待补规格";
  }

  if (normalized.length <= 24) {
    return normalized;
  }

  const firstLine = normalized.split(/\n+/)[0]?.trim() ?? normalized;
  if (firstLine.length <= 24) {
    return firstLine;
  }

  const shortSegment = firstLine.split(/[，。,；;]/)[0]?.trim() ?? firstLine;
  if (shortSegment.length > 0 && shortSegment.length <= 24) {
    return shortSegment;
  }

  return "规格待商务确认";
}

function buildFallbackCatalog(): ServiceCatalogResponse {
  const categoriesMap = new Map<string, Map<string, ServiceCatalogItem[]>>();

  for (const item of fallbackServiceItems) {
    const projects = categoriesMap.get(item.category) ?? new Map<string, ServiceCatalogItem[]>();
    const items = projects.get(item.project) ?? [];

    items.push({
      id: item.code,
      code: item.code,
      category: item.category,
      project: item.project,
      name: item.name,
      specification: item.spec,
      price: item.price,
      priceNote: item.turnaround,
    });

    projects.set(item.project, items);
    categoriesMap.set(item.category, projects);
  }

  const categories = Array.from(categoriesMap.entries()).map(([categoryName, projects]) => {
    const projectList = Array.from(projects.entries()).map(([projectName, items]) => ({
      id: `${categoryName}-${projectName}`,
      name: projectName,
      description: "",
      itemCount: items.length,
      items,
    }));

    return {
      id: categoryName,
      name: categoryName,
      description: "",
      itemCount: projectList.reduce((sum, project) => sum + project.itemCount, 0),
      projects: projectList,
    };
  });

  return {
    demoMode: true,
    summary: {
      categoryCount: categories.length,
      itemCount: fallbackServiceItems.length,
    },
    categories,
    items: categories.flatMap((category) => category.projects.flatMap((project) => project.items)),
  };
}
