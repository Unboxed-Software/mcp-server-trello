import { z } from 'zod';
import { TrelloClient } from '../trello-client.js';
import { PaginationHelper } from '../utils/pagination.js';
import { TrelloCard } from '../types.js';

export const getAllCardsByListInputSchema = z.object({
  listId: z.string().describe('The ID of the list'),
  boardId: z.string().optional().describe('The ID of the board'),
  maxCards: z
    .number()
    .min(1)
    .max(10000)
    .default(5000)
    .optional()
    .describe('Maximum cards to fetch (safety limit)'),
  lightweight: z.boolean().default(true).optional().describe('Fetch only essential fields'),
  progressCallback: z.boolean().default(false).optional().describe('Report progress during fetch'),
});

export const getAllCardsByListOutputSchema = z.object({
  cards: z.array(z.any()),
  totalCards: z.number(),
  fetchedInBatches: z.number(),
  truncated: z.boolean().describe('True if maxCards limit was reached'),
});

export type GetAllCardsByListInput = z.infer<typeof getAllCardsByListInputSchema>;
export type GetAllCardsByListOutput = z.infer<typeof getAllCardsByListOutputSchema>;

export async function getAllCardsByList(
  client: TrelloClient,
  input: GetAllCardsByListInput
): Promise<GetAllCardsByListOutput> {
  const { listId, maxCards = 5000, lightweight = true, progressCallback } = input;

  const paginationHelper = new PaginationHelper(client);

  // Define fields for lightweight mode to minimize token usage
  const lightweightFields = ['id', 'name', 'desc', 'pos', 'dateLastActivity', 'due', 'idList'];
  const fields = lightweight ? lightweightFields : undefined;

  try {
    const endpoint = `https://api.trello.com/1/lists/${listId}/cards`;
    const allCards: TrelloCard[] = [];
    let before: string | undefined;
    let hasMore = true;
    let batchCount = 0;
    const limit = 100; // Fetch 100 cards at a time

    while (hasMore && allCards.length < maxCards) {
      batchCount++;

      if (progressCallback) {
        // In a real implementation, you might emit an event or call a callback
        // For now, we'll just track internally
      }

      const response = await paginationHelper.fetchPage<TrelloCard>(endpoint, {
        limit,
        before,
        fields,
      });

      allCards.push(...response.items);

      // Check if we have more items to fetch
      hasMore = response.hasMore;
      before = response.nextCursor;

      // Check if we've hit the max limit
      if (allCards.length >= maxCards) {
        hasMore = false;
      }
    }

    return {
      cards: allCards.slice(0, maxCards), // Ensure we don't exceed maxCards
      totalCards: allCards.length,
      fetchedInBatches: batchCount,
      truncated: allCards.length >= maxCards && hasMore,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      } else if (error.message.includes('401')) {
        throw new Error('Invalid API credentials. Please check your Trello API key and token.');
      } else if (error.message.includes('404')) {
        throw new Error(`List ${listId} not found. Please verify the list ID.`);
      }
    }
    throw new Error(
      `Failed to fetch all cards: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
