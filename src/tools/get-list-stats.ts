import { z } from 'zod';
import { TrelloClient } from '../trello-client.js';
import { PaginationHelper } from '../utils/pagination.js';

export const getListStatsInputSchema = z.object({
  listId: z.string().describe('The ID of the list'),
  boardId: z.string().optional().describe('The ID of the board'),
});

export const getListStatsOutputSchema = z.object({
  cardCount: z.number(),
  estimatedTokens: z.number().optional(),
  oldestCard: z
    .object({
      id: z.string(),
      name: z.string(),
      dateLastActivity: z.string(),
    })
    .optional(),
  newestCard: z
    .object({
      id: z.string(),
      name: z.string(),
      dateLastActivity: z.string(),
    })
    .optional(),
});

export type GetListStatsInput = z.infer<typeof getListStatsInputSchema>;
export type GetListStatsOutput = z.infer<typeof getListStatsOutputSchema>;

interface CardForStats {
  id: string;
  name: string;
  desc?: string;
  dateLastActivity: string;
}

export async function getListStats(
  client: TrelloClient,
  input: GetListStatsInput
): Promise<GetListStatsOutput> {
  const { listId } = input;

  const paginationHelper = new PaginationHelper(client);

  try {
    const endpoint = `https://api.trello.com/1/lists/${listId}/cards`;

    // First, get just the count by fetching minimal data
    const countFields = ['id'];
    const allCardIds = await paginationHelper.fetchAllWithPagination<{ id: string }>(
      endpoint,
      {
        fields: countFields,
        limit: 100,
      },
      10000 // Allow counting up to 10,000 cards
    );

    const cardCount = allCardIds.length;

    if (cardCount === 0) {
      return {
        cardCount: 0,
        estimatedTokens: 0,
      };
    }

    // Get first and last cards for bounds
    const detailFields = ['id', 'name', 'desc', 'dateLastActivity'];

    // Fetch first card (newest by default)
    const firstPageResponse = await paginationHelper.fetchPage<CardForStats>(endpoint, {
      limit: 1,
      fields: detailFields,
    });

    const newestCard = firstPageResponse.items[0];

    // For oldest card, we need to paginate to the end
    // This is inefficient but necessary with cursor-based pagination
    // Alternatively, we could fetch a sample and estimate
    let oldestCard: CardForStats | undefined;

    if (cardCount <= 100) {
      // If we have few cards, fetch them all to get the oldest
      const allCards = await paginationHelper.fetchAllWithPagination<CardForStats>(
        endpoint,
        {
          fields: detailFields,
          limit: 100,
        },
        100
      );
      oldestCard = allCards[allCards.length - 1];
    } else {
      // For large lists, fetch a sample from the middle to estimate
      // This is a compromise to avoid fetching thousands of cards
      const sampleSize = 10;
      const sampleResponse = await paginationHelper.fetchPage<CardForStats>(endpoint, {
        limit: sampleSize,
        fields: detailFields,
      });

      // Estimate token usage based on sample
      const sampleTokens = sampleResponse.items.reduce((total, card) => {
        // Rough estimation: 1 token per 4 characters
        const nameTokens = Math.ceil((card.name?.length || 0) / 4);
        const descTokens = Math.ceil((card.desc?.length || 0) / 4);
        return total + nameTokens + descTokens + 10; // +10 for metadata
      }, 0);

      const avgTokensPerCard = Math.ceil(sampleTokens / sampleSize);
      const estimatedTokens = avgTokensPerCard * cardCount;

      // For oldest card, we'll just indicate it exists but not fetch all
      // In a production system, you might want to implement reverse pagination
      oldestCard = undefined; // We don't have the actual oldest without full pagination

      return {
        cardCount,
        estimatedTokens,
        newestCard: newestCard
          ? {
              id: newestCard.id,
              name: newestCard.name,
              dateLastActivity: newestCard.dateLastActivity,
            }
          : undefined,
        oldestCard: undefined, // Cannot efficiently get oldest in large lists
      };
    }

    // Calculate estimated tokens for small lists
    const allCards = await paginationHelper.fetchPage<CardForStats>(endpoint, {
      limit: Math.min(cardCount, 100),
      fields: detailFields,
    });

    const totalTokens = allCards.items.reduce((total, card) => {
      const nameTokens = Math.ceil((card.name?.length || 0) / 4);
      const descTokens = Math.ceil((card.desc?.length || 0) / 4);
      return total + nameTokens + descTokens + 10;
    }, 0);

    const avgTokensPerCard = Math.ceil(totalTokens / allCards.items.length);
    const estimatedTokens = avgTokensPerCard * cardCount;

    return {
      cardCount,
      estimatedTokens,
      newestCard: newestCard
        ? {
            id: newestCard.id,
            name: newestCard.name,
            dateLastActivity: newestCard.dateLastActivity,
          }
        : undefined,
      oldestCard: oldestCard
        ? {
            id: oldestCard.id,
            name: oldestCard.name,
            dateLastActivity: oldestCard.dateLastActivity,
          }
        : undefined,
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
      `Failed to get list stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
