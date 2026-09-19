import { apiRequest } from "./api";

export interface PriceOccurrence {
  id: number;
  userId: number;
  userName: string | null;
  marketId: number;
  marketName: string | null;
  productId: number;
  value: string;
  trustFlag: boolean;
  isSuspended: boolean;
  isResolved: boolean;
  upvoteCount: number;
  downvoteCount: number;
  isPromotion?: boolean;
  createdAt: string;
  userVote?: boolean | null;
}

export interface SubmitOccurrenceResult {
  occurrence?: PriceOccurrence;
  pointsEarned?: number;
  currentPoints?: number;
  isSuspended?: boolean;
  pendingApproval?: boolean;
  requiresConfirmation?: boolean;
  stats?: {
    avgPrice: number | null;
    currentPrice: number;
    ratio: number;
    zScore: number;
    trendDetected?: boolean;
  };
  message?: string;
}

export interface PendingOccurrenceItem {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  marketId: number;
  marketName: string | null;
  productId: number;
  productName: string | null;
  productIcon: string | null;
  productCategory: string | null;
  value: string;
  trustFlag: boolean;
  isSuspended: boolean;
  isResolved: boolean;
  createdAt: string;
  baselineAvgPrice: number | null;
  stddevPrice: number;
  diffPercent: number;
  hasTrendQuorum: boolean;
  quorumUsersCount: number;
}

export interface VoteResult {
  changed: boolean;
  isNewVote?: boolean;
  removed?: boolean;
  verdict: boolean | null;
  pointsEarned: number;
  currentPoints: number;
}

export async function submitPriceOccurrence(
  productId: number,
  marketId: number,
  value: string | number,
  icon?: string,
  createdAt?: string,
  isPromotion?: boolean,
  confirmOutlier?: boolean,
): Promise<SubmitOccurrenceResult> {
  return apiRequest<SubmitOccurrenceResult>("/ocurrency", {
    method: "POST",
    body: JSON.stringify({
      productId,
      marketId,
      value,
      icon,
      createdAt,
      isPromotion,
      confirmOutlier,
    }),
  });
}

export async function fetchProductOccurrences(
  productId: number,
  coords?: { latitude?: number; longitude?: number; radius?: number }
): Promise<PriceOccurrence[]> {
  try {
    let endpoint = `/ocurrency/product/${productId}`;
    if (coords?.latitude !== undefined && coords?.longitude !== undefined) {
      endpoint += `?latitude=${coords.latitude}&longitude=${coords.longitude}&radius=${coords.radius || 25000}`;
    }
    return await apiRequest<PriceOccurrence[]>(endpoint, {
      method: "GET",
    });
  } catch (error) {
    console.error("[OcurrencyService] Error fetching occurrences:", error);
    return [];
  }
}

export async function voteOccurrence(
  occurrenceId: number,
  verdict: boolean,
): Promise<VoteResult> {
  return apiRequest<VoteResult>(`/ocurrency/${occurrenceId}/vote`, {
    method: "POST",
    body: JSON.stringify({ verdict }),
  });
}

export async function updateOccurrence(
  occurrenceId: number,
  data: { value?: string | number; marketId?: number },
): Promise<PriceOccurrence> {
  return apiRequest<PriceOccurrence>(`/ocurrency/${occurrenceId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteOccurrence(
  occurrenceId: number,
): Promise<{ deleted: boolean; id: number }> {
  return apiRequest<{ deleted: boolean; id: number }>(`/ocurrency/${occurrenceId}`, {
    method: "DELETE",
  });
}

export async function fetchPendingOccurrences(): Promise<PendingOccurrenceItem[]> {
  return apiRequest<PendingOccurrenceItem[]>("/ocurrency/admin/pending", {
    method: "GET",
  });
}

export async function approveOccurrence(id: number): Promise<{ approved: boolean; occurrence: any }> {
  return apiRequest<{ approved: boolean; occurrence: any }>(`/ocurrency/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectOccurrence(id: number): Promise<{ rejected: boolean; occurrence: any }> {
  return apiRequest<{ rejected: boolean; occurrence: any }>(`/ocurrency/${id}/reject`, {
    method: "POST",
  });
}

