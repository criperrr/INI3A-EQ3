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
  occurrence: PriceOccurrence;
  pointsEarned: number;
  currentPoints: number;
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
