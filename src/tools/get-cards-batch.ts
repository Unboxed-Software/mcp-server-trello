import { z } from 'zod';
import { TrelloClient } from '../trello-client.js';
import { TrelloCard } from '../types.js';

export const getCardsBatchInputSchema = z.object({
  cardIds: z.array(z.string()).min(1).max(100).describe('Array of card IDs to fetch'),
  fields: z.array(z.string()).optional().describe('Specific fields to return'),
});

export const getCardsBatchOutputSchema = z.object({
  cards: z.array(z.any()),
  notFound: z.array(z.string()).describe("IDs that weren't found"),
});

export type GetCardsBatchInput = z.infer<typeof getCardsBatchInputSchema>;
export type GetCardsBatchOutput = z.infer<typeof getCardsBatchOutputSchema>;

export async function getCardsBatch(
  client: TrelloClient,
  input: GetCardsBatchInput
): Promise<GetCardsBatchOutput> {
  const { cardIds, fields } = input;

  const cards: TrelloCard[] = [];
  const notFound: string[] = [];

  // Build query parameters
  const apiKey = client.getApiKey();
  const token = client.getToken();

  // Process cards in parallel with rate limiting consideration
  // We'll batch them in groups of 10 for parallel fetching
  const batchSize = 10;

  try {
    for (let i = 0; i < cardIds.length; i += batchSize) {
      const batch = cardIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async cardId => {
        try {
          const params = new URLSearchParams({
            key: apiKey,
            token: token,
            ...(fields && { fields: fields.join(',') }),
          });

          const response = await fetch(`https://api.trello.com/1/cards/${cardId}?${params}`);

          if (response.ok) {
            const card = await response.json();
            return { success: true, card, cardId };
          } else if (response.status === 404) {
            return { success: false, cardId };
          } else {
            throw new Error(`Failed to fetch card ${cardId}: ${response.status}`);
          }
        } catch (error) {
          // Network or other error for this specific card
          return { success: false, cardId };
        }
      });

      const results = await Promise.all(batchPromises);

      for (const result of results) {
        if (result.success) {
          cards.push(result.card);
        } else {
          notFound.push(result.cardId);
        }
      }

      // Rate limiting pause between batches (except for the last batch)
      if (i + batchSize < cardIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Preserve the order of cards as requested
    const cardMap = new Map(cards.map(card => [card.id, card]));
    const orderedCards = cardIds.filter(id => cardMap.has(id)).map(id => cardMap.get(id)!);

    return {
      cards: orderedCards,
      notFound,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      } else if (error.message.includes('401')) {
        throw new Error('Invalid API credentials. Please check your Trello API key and token.');
      }
    }
    throw new Error(
      `Failed to fetch cards in batch: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
