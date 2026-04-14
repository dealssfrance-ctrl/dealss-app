export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Offer {
  id: string;
  storeName: string;
  discount: string;
  description: string;
  category: string;
  imageUrl: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  userName?: string;
}

export interface OfferSearchParams {
  query?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'discount' | 'storeName';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface TrafficData {
  id: string;
  date: string;
  visits: number;
  pageViews: number;
  uniqueUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface AuthToken {
  token: string;
  expiresIn: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: Omit<User, 'password'>;
  token?: string;
  expiresIn?: string;
}

export interface ResetToken {
  email: string;
  token: string;
  expiresAt: Date;
}

export interface DashboardStats {
  totalUsers: number;
  totalOffers: number;
  totalTraffic: number;
  growth: number;
}

// Chat types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  offerId: string;
  participants: string[]; // user IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  offerId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}
