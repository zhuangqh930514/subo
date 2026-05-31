export type PublicQuoteBusinessType = 'service' | 'procurement';

export interface CreateQuoteRequestItemDto {
  serviceItemId?: number;
  itemCode?: string;
  itemName: string;
  specification?: string;
  unitPrice?: number;
  quantity: number;
  subtotal?: number;
}

export interface CreateQuoteRequestDto {
  businessType: PublicQuoteBusinessType;
  contactName: string;
  companyName?: string;
  contactChannel: string;
  remark?: string;
  items: CreateQuoteRequestItemDto[];
}
