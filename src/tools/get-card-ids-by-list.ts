import { z } from 'zod';
import { TrelloClient } from '../trello-client.js';
import { PaginationHelper } from '../utils/pagination.js';

export const getCardIdsByListInputSchema = z.object({
  listId: z.string().describe('The ID of the list'),
  boardId: z.string().optional().describe('The ID of the board'),
});

export const getCardIdsByListOutputSchema = z.object({
  cardIds: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      pos: z.number().optional(),
    })
  ),
  totalCount: z.number(),
});

export type GetCardIdsByListInput = z.infer<typeof getCardIdsByListInputSchema>;
export type GetCardIdsByListOutput = z.infer<typeof getCardIdsByListOutputSchema>;

interface CardMinimal {
  id: string;
  name: string;
  pos?: number;
}

export async function getCardIdsByList(
  client: TrelloClient,
  input: GetCardIdsByListInput
): Promise<GetCardIdsByListOutput> {
  const { listId } = input;

  const paginationHelper = new PaginationHelper(client);

  // Fetch ONLY id, name, and pos fields to minimize tokens
  const fields = ['id', 'name', 'pos'];

  try {
    const endpoint = `https://api.trello.com/1/lists/${listId}/cards`;

    // Fetch all cards with minimal fields
    const allCards = await paginationHelper.fetchAllWithPagination<CardMinimal>(
      endpoint,
      {
        fields,
        limit: 100,
      },
      10000 // Allow fetching up to 10,000 cards for ID listing
    );

    // Sort by position if available
    const sortedCards = allCards.sort((a, b) => {
      if (a.pos === undefined || b.pos === undefined) return 0;
      return a.pos - b.pos;
    });

    return {
      cardIds: sortedCards.map(card => ({
        id: card.id,
        name: card.name,
        pos: card.pos,
      })),
      totalCount: sortedCards.length,
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
      `Failed to fetch card IDs: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
