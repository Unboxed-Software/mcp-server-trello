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
   * Note: Since Trello doesn't support true cursor pagination for cards in lists,
   * we fetch all cards and implement client-side pagination
   */
  async fetchPage<T extends { id: string; pos?: number }>(
    endpoint: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResponse<T>> {
    const limit = options.limit || 100;

    // For lists/cards endpoint, Trello doesn't support before/since parameters
    // So we need to fetch all and do client-side pagination
    const isListCardsEndpoint = endpoint.includes('/lists/') && endpoint.includes('/cards');
    
    if (isListCardsEndpoint && options.before) {
      // Fetch all cards for client-side pagination
      const params = new URLSearchParams({
        key: this.client.getApiKey(),
        token: this.client.getToken(),
        ...(options.fields && { fields: options.fields.join(',') }),
      });

      const response = await fetch(`${endpoint}?${params}`);

      if (!response.ok) {
        throw new Error(`Trello API error: ${response.status} ${response.statusText}`);
      }

      const allItems: T[] = await response.json();
      
      // Sort by position to ensure consistent ordering
      allItems.sort((a, b) => (a.pos || 0) - (b.pos || 0));
      
      // Find the index of the cursor card
      const cursorIndex = allItems.findIndex(item => item.id === options.before);
      
      if (cursorIndex === -1 || cursorIndex + 1 >= allItems.length) {
        // Cursor not found or at the end
        return {
          items: [],
          hasMore: false,
          nextCursor: undefined,
        };
      }
      
      // Get items after the cursor
      const startIndex = cursorIndex + 1;
      const items = allItems.slice(startIndex, startIndex + limit);
      
      return {
        items,
        hasMore: startIndex + limit < allItems.length,
        nextCursor: items.length === limit ? items[items.length - 1].id : undefined,
      };
    } else {
      // Standard fetch for first page or non-list endpoints
      const params = new URLSearchParams({
        key: this.client.getApiKey(),
        token: this.client.getToken(),
        ...(options.fields && { fields: options.fields.join(',') }),
      });

      const response = await fetch(`${endpoint}?${params}`);

      if (!response.ok) {
        throw new Error(`Trello API error: ${response.status} ${response.statusText}`);
      }

      const allItems: T[] = await response.json();
      
      // Sort by position if available
      if (allItems.length > 0 && 'pos' in allItems[0]) {
        allItems.sort((a, b) => (a.pos || 0) - (b.pos || 0));
      }
      
      // Return first page
      const items = allItems.slice(0, limit);

      return {
        items,
        hasMore: items.length < allItems.length,
        nextCursor: items.length === limit && items.length < allItems.length ? items[items.length - 1].id : undefined,
      };
    }
  }
}
