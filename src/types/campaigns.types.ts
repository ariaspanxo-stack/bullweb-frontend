/**
 * ============================================================================
 * CAMPAIGNS TYPES - Marketing Campaigns Management
 * ============================================================================
 */

export type CampaignType = 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP';

export type CampaignStatus = 
  | 'DRAFT' 
  | 'SCHEDULED' 
  | 'RUNNING' 
  | 'COMPLETED' 
  | 'PAUSED' 
  | 'CANCELLED';

export type DeliveryStatus = 
  | 'PENDING' 
  | 'SENT' 
  | 'DELIVERED' 
  | 'FAILED' 
  | 'OPENED' 
  | 'CLICKED' 
  | 'CONVERTED';

export type CustomerSegment = 
  | 'VIP' 
  | 'FREQUENT' 
  | 'REGULAR' 
  | 'NEW' 
  | 'INACTIVE' 
  | 'AT_RISK';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  targetSegment?: CustomerSegment;
  targetFilters?: any;
  subject?: string;
  message: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  totalRecipients: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  estimatedRevenue: number;
  actualRevenue: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // Relations
  users?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CampaignDelivery {
  id: string;
  campaignId: string;
  customerId: string;
  status: DeliveryStatus;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  convertedAt?: string;
  failureReason?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  // Relations
  campaign?: Campaign;
  customers?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateCampaignDTO {
  name: string;
  description?: string;
  type: CampaignType;
  targetSegment?: CustomerSegment;
  targetFilters?: any;
  subject?: string;
  message: string;
  scheduledAt?: Date | string;
}

export interface UpdateCampaignDTO {
  name?: string;
  description?: string;
  subject?: string;
  message?: string;
  scheduledAt?: Date | string;
  status?: CampaignStatus;
}

export interface CampaignsFilters {
  status?: CampaignStatus;
  type?: CampaignType;
  targetSegment?: CustomerSegment;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface CampaignsStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRecipients: number;
  totalDeliveries: number;
  averageOpenRate: number;
  averageClickRate: number;
  averageConversionRate: number;
  totalRevenue: number;
  topPerformingType?: CampaignType;
}

export interface CampaignPerformanceMetrics {
  totalRecipients: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingDeliveries: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  estimatedRevenue: number;
  actualRevenue: number;
  roi: number;
}
