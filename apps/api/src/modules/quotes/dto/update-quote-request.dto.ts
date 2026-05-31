export class UpdateQuoteRequestStatusDto {
  status?: 'pending' | 'processing' | 'converted' | 'closed';
}

export class AssignQuoteRequestOwnerDto {
  ownerUserId?: number | string | null;
}

export class CreateOrderFromQuoteDto {
  customerId?: number | string;
  orderType?: 'service' | 'procurement';
  projectName?: string;
  projectContent?: string;
  amount?: number | string;
  isPaid?: boolean;
  hasContract?: boolean;
  hasDeliveryNote?: boolean;
  orderDate?: string;
  remark?: string;
  invoiceProfileId?: number | string | null;
}
