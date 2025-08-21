import { z } from 'zod';
import { TrelloClient } from '../trello-client.js';
import { PaginationHelper } from '../utils/pagination.js';
import { TrelloCard } from '../types.js';

export const getCardsByListPaginatedInputSchema = z.object({
  listId: z.string().describe('The ID of the list'),
  boardId: z.string().optional().describe('The ID of the board (uses default if not provided)'),
  limit: z.number().min(1).max(100).default(100).optional().describe('Cards per page'),
  before: z.string().optional().describe('Card ID or date for pagination cursor'),
  fields: z
    .array(z.string())
    .optional()
    .describe('Specific fields to return (reduces token usage)'),
  lightweight: z
    .boolean()
    .default(false)
    .optional()
    .describe('Return only essential fields (id, name, desc)'),
});

export const getCardsByListPaginatedOutputSchema = z.object({
  cards: z.array(z.any()), // Using z.any() for flexibility, can be refined to match TrelloCard schema
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
  totalFetched: z.number(),
  pagesFetched: z.number(),
});

export type GetCardsByListPaginatedInput = z.infer<typeof getCardsByListPaginatedInputSchema>;
export type GetCardsByListPaginatedOutput = z.infer<typeof getCardsByListPaginatedOutputSchema>;

export async function getCardsByListPaginated(
  client: TrelloClient,
  input: GetCardsByListPaginatedInput
): Promise<GetCardsByListPaginatedOutput> {
  const { listId, limit = 100, before, fields, lightweight } = input;

  const paginationHelper = new PaginationHelper(client);

  // Define fields for lightweight mode
  const lightweightFields = ['id', 'name', 'desc', 'pos', 'dateLastActivity'];
  const fieldsToFetch = lightweight ? lightweightFields : fields;

  try {
    const endpoint = `https://api.trello.com/1/lists/${listId}/cards`;
    const response = await paginationHelper.fetchPage<TrelloCard>(endpoint, {
      limit,
      before,
      fields: fieldsToFetch,
    });

    return {
      cards: response.items,
      hasMore: response.hasMore,
      nextCursor: response.nextCursor,
      totalFetched: response.items.length,
      pagesFetched: 1,
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
      `Failed to fetch cards: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
