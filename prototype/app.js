const serviceItems = [
  {
    code: "GA1001",
    category: "动物实验",
    project: "动物饲养",
    name: "普通饲养（小鼠）",
    spec: "只/天",
    price: 3,
  },
  {
    code: "GA1093",
    category: "动物实验",
    project: "肿瘤药效组动物实验模型",
    name: "裸鼠皮下移植瘤",
    spec: "只",
    price: 1200,
  },
  {
    code: "GA1012",
    category: "动物实验",
    project: "非肿瘤药效组模型",
    name: "大鼠 CCl4 诱导肝纤维化模型",
    spec: "只",
    price: 1800,
  },
  {
    code: "BL2030",
    category: "蛋白",
    project: "蛋白表达分析",
    name: "Western Blot 半定量分析",
    spec: "样本",
    price: 260,
  },
  {
    code: "CX1008",
    category: "细胞",
    project: "细胞毒性",
    name: "CCK8 细胞活性检测",
    spec: "孔",
    price: 90,
  },
  {
    code: "FL3302",
    category: "分子病理（免疫荧光）",
    project: "多重免疫荧光",
    name: "多重 IF 染色（四标）",
    spec: "张",
    price: 900,
  },
  {
    code: "TX5501",
    category: "病理图像（切片扫描）",
    project: "切片数字化",
    name: "全片扫描 40x",
    spec: "张",
    price: 200,
  },
  {
    code: "LC2006",
    category: "理化",
    project: "血液生化",
    name: "ALT/AST 双指标检测",
    spec: "样本",
    price: 68,
  },
];

const procurementItems = [
  {
    id: "RJ-001",
    platform: "锐竟",
    name: "TSA Plus 荧光四标五色染色试剂盒",
    code: "TSA-SBWS",
    type: "试剂盒",
    unit: "盒",
    spec: "50T",
    price: 4000,
  },
  {
    id: "RJ-002",
    platform: "锐竟",
    name: "乳酸脱氢酶细胞毒性检测试剂盒",
    code: "RSTQMXBDXJCSJH",
    type: "试剂盒",
    unit: "盒",
    spec: "500 次",
    price: 800,
  },
  {
    id: "CS-001",
    platform: "喀斯玛",
    name: "胎牛血清（优级）",
    code: "A5256701",
    type: "血清",
    unit: "瓶",
    spec: "500mL/瓶",
    price: 3000,
  },
  {
    id: "CS-002",
    platform: "喀斯玛",
    name: "FS Universal SYBR Green Master",
    code: "4913914001",
    type: "PCR 试剂",
    unit: "瓶",
    spec: "5mL",
    price: 1100,
  },
  {
    id: "RJ-003",
    platform: "锐竟",
    name: "β-半乳糖苷酶染色试剂盒",
    code: "BRTGMRSSJH",
    type: "试剂盒",
    unit: "盒",
    spec: "100T",
    price: 1000,
  },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: value < 100 ? 0 : 0,
  }).format(value);
}

function renderQuotePrototype() {
  const serviceList = document.querySelector("[data-service-list]");
  const selectedList = document.querySelector("[data-selected-list]");
  const selectedCount = document.querySelector("[data-selected-count]");
  const selectedTotal = document.querySelector("[data-selected-total]");
  const serviceModeButton = document.querySelector("[data-mode='service']");
  const procurementModeButton = document.querySelector("[data-mode='procurement']");
  const serviceSection = document.querySelector("[data-section='service']");
  const procurementSection = document.querySelector("[data-section='procurement']");
  const filterButtons = document.querySelectorAll("[data-filter]");

  if (!serviceList || !selectedList || !selectedCount || !selectedTotal) {
    return;
  }

  const selectedCodes = new Set(["GA1093", "TX5501"]);
  let activeFilter = "全部";

  function getVisibleItems() {
    if (activeFilter === "全部") {
      return serviceItems;
    }
    return serviceItems.filter((item) => item.category === activeFilter);
  }

  function renderSelected() {
    const selected = serviceItems.filter((item) => selectedCodes.has(item.code));
    const total = selected.reduce((sum, item) => sum + item.price, 0);
    selectedList.innerHTML = selected
      .map(
        (item) => `
          <div class="quote-line">
            <div>
              <strong>${item.name}</strong>
              <div class="admin-meta">${item.code} · ${item.spec}</div>
            </div>
            <div>
              <strong>${formatCurrency(item.price)}</strong>
            </div>
          </div>
        `
      )
      .join("");
    selectedCount.textContent = `${selected.length} 项`;
    selectedTotal.textContent = formatCurrency(total);
  }

  function renderServices() {
    const visibleItems = getVisibleItems();
    serviceList.innerHTML = visibleItems
      .map((item) => {
        const isSelected = selectedCodes.has(item.code);
        return `
          <article class="quote-item">
            <div>
              <div class="mini-tags">
                <span class="badge ${isSelected ? "badge-accent" : ""}">${item.category}</span>
                <span class="badge">${item.project}</span>
              </div>
              <h3>${item.name}</h3>
              <p class="quote-item-meta">${item.code} · ${item.spec}</p>
            </div>
            <div class="quote-actions">
              <strong>${formatCurrency(item.price)}</strong>
              <button class="button ${isSelected ? "button-secondary" : "button-primary"}" data-toggle-item="${item.code}">
                ${isSelected ? "已加入报价" : "加入报价"}
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    serviceList.querySelectorAll("[data-toggle-item]").forEach((button) => {
      button.addEventListener("click", () => {
        const code = button.getAttribute("data-toggle-item");
        if (!code) {
          return;
        }
        if (selectedCodes.has(code)) {
          selectedCodes.delete(code);
        } else {
          selectedCodes.add(code);
        }
        renderServices();
        renderSelected();
      });
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.getAttribute("data-filter") || "全部";
      filterButtons.forEach((target) => target.classList.remove("segment-active"));
      button.classList.add("segment-active");
      renderServices();
    });
  });

  if (serviceModeButton && procurementModeButton && serviceSection && procurementSection) {
    serviceModeButton.addEventListener("click", () => {
      serviceModeButton.classList.add("segment-active");
      procurementModeButton.classList.remove("segment-active");
      serviceSection.classList.remove("hidden");
      procurementSection.classList.add("hidden");
    });

    procurementModeButton.addEventListener("click", () => {
      procurementModeButton.classList.add("segment-active");
      serviceModeButton.classList.remove("segment-active");
      procurementSection.classList.remove("hidden");
      serviceSection.classList.add("hidden");
    });
  }

  renderServices();
  renderSelected();
}

function renderProcurementPrototype() {
  const tableBody = document.querySelector("[data-procurement-body]");
  const summaryCount = document.querySelector("[data-procurement-count]");
  const summaryTotal = document.querySelector("[data-procurement-total]");
  const summaryList = document.querySelector("[data-procurement-selected]");
  const platformButtons = document.querySelectorAll("[data-platform-filter]");

  if (!tableBody || !summaryCount || !summaryTotal || !summaryList) {
    return;
  }

  const selectedIds = new Set(["RJ-001", "CS-001"]);
  let activePlatform = "全部";

  function visibleItems() {
    if (activePlatform === "全部") {
      return procurementItems;
    }
    return procurementItems.filter((item) => item.platform === activePlatform);
  }

  function renderSummary() {
    const selected = procurementItems.filter((item) => selectedIds.has(item.id));
    const total = selected.reduce((sum, item) => sum + item.price, 0);
    summaryCount.textContent = `${selected.length} 项`;
    summaryTotal.textContent = formatCurrency(total);
    summaryList.innerHTML = selected
      .map(
        (item) => `
          <div class="mini-item">
            <div>
              <strong>${item.name}</strong>
              <div class="admin-meta">${item.platform} · ${item.spec}</div>
            </div>
            <strong>${formatCurrency(item.price)}</strong>
          </div>
        `
      )
      .join("");
  }

  function renderTable() {
    tableBody.innerHTML = visibleItems()
      .map((item) => {
        const checked = selectedIds.has(item.id) ? "checked" : "";
        return `
          <tr>
            <td class="checkbox-cell">
              <input class="row-check" type="checkbox" data-select-link="${item.id}" ${checked}>
            </td>
            <td>
              <strong>${item.name}</strong>
              <div class="admin-meta">${item.code}</div>
            </td>
            <td>${item.platform}</td>
            <td>${item.type}</td>
            <td>${item.spec}</td>
            <td>${formatCurrency(item.price)}</td>
            <td><span class="badge">保留生成清单</span></td>
          </tr>
        `;
      })
      .join("");

    tableBody.querySelectorAll("[data-select-link]").forEach((input) => {
      input.addEventListener("change", () => {
        const id = input.getAttribute("data-select-link");
        if (!id) {
          return;
        }
        if (input.checked) {
          selectedIds.add(id);
        } else {
          selectedIds.delete(id);
        }
        renderSummary();
      });
    });
  }

  platformButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activePlatform = button.getAttribute("data-platform-filter") || "全部";
      platformButtons.forEach((target) => target.classList.remove("segment-active"));
      button.classList.add("segment-active");
      renderTable();
    });
  });

  renderTable();
  renderSummary();
}

document.addEventListener("DOMContentLoaded", () => {
  renderQuotePrototype();
  renderProcurementPrototype();
});
