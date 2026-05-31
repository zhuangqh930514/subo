export interface CreateContactRequestDto {
  contactName: string;
  companyName?: string;
  contactChannel: string;
  subject?: string;
  message: string;
}
