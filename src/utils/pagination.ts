import { TrelloClient } from '../trello-client.js';

interface PaginationOptions {
  limit?: number;
  before?: string;
  since?: string;
  fields?: string[];
}

interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
}

export class PaginationHelper {
  constructor(private client: TrelloClient) {}

  /**
   * Fetches all items using cursor-based pagination
   * CRITICAL: This is the core logic that must work correctly
   */
  async fetchAllWithPagination<T extends { id: string }>(
    endpoint: string,
    options: PaginationOptions = {},
    maxItems: number = 5000
  ): Promise<T[]> {
    const limit = options.limit || 100;
    const allItems: T[] = [];
    let before = options.before;
    let hasMore = true;
    let batchCount = 0;

    while (hasMore && allItems.length < maxItems) {
      batchCount++;

      // Build query parameters
      const params = new URLSearchParams({
        key: this.client.getApiKey(),
        token: this.client.getToken(),
        limit: limit.toString(),
        ...(before && { before }),
        ...(options.fields && { fields: options.fields.join(',') }),
      });

      // Fetch batch
      const response = await fetch(`${endpoint}?${params}`);

      if (!response.ok) {
        throw new Error(`Trello API error: ${response.status} ${response.statusText}`);
      }

      const items: T[] = await response.json();

      // Add items to collection
      allItems.push(...items);

      // Check if there are more items
      if (items.length < limit) {
        // We got fewer items than requested, so we're done
        hasMore = false;
      } else if (allItems.length >= maxItems) {
        // Hit our safety limit
        hasMore = false;
      } else {
        // Set cursor for next batch using last item's ID
        before = items[items.length - 1].id;
      }

      // Rate limiting pause (100ms between requests)
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return allItems;
  }

  /**
   * Fetches a single page with pagination info
   */
  async fetchPage<T extends { id: string }>(
    endpoint: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResponse<T>> {
    const limit = options.limit || 100;

    const params = new URLSearchParams({
      key: this.client.getApiKey(),
      token: this.client.getToken(),
      limit: limit.toString(),
      ...(options.before && { before: options.before }),
      ...(options.since && { since: options.since }),
      ...(options.fields && { fields: options.fields.join(',') }),
    });

    const response = await fetch(`${endpoint}?${params}`);

    if (!response.ok) {
      throw new Error(`Trello API error: ${response.status} ${response.statusText}`);
    }

    const items: T[] = await response.json();

    return {
      items,
      hasMore: items.length === limit,
      nextCursor: items.length === limit ? items[items.length - 1].id : undefined,
    };
  }
}
