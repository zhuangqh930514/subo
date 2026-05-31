import { companyProfile as baseCompanyProfile, serviceItems as baseServiceItems } from "~/data/mock";

export const companyProfile = {
  name: baseCompanyProfile.name,
  shortName: "溯博生物",
  address: "广州市白云区鹤龙一路 2 号自编 1 栋 C3973-8 房",
  phone: "18102724565",
  email: "suboswkj@gmail.com",
  taxNumber: "91440111MAEWR7R42G"
};

export const serviceCategories = [...new Set(baseServiceItems.map((item) => item.category))];

export const serviceItems = baseServiceItems.map((item) => ({
  ...item,
  specification: item.spec
}));
