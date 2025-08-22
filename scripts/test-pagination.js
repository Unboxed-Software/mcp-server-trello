#!/usr/bin/env node

/**
 * Manual test script for pagination functionality
 * Usage: node scripts/test-pagination.js <list-id>
 */

import dotenv from 'dotenv';
dotenv.config();

import { TrelloClient } from '../build/trello-client.js';
import { getListStats } from '../build/tools/get-list-stats.js';
import { getCardIdsByList } from '../build/tools/get-card-ids-by-list.js';
import { getCardsByListPaginated } from '../build/tools/get-cards-by-list-paginated.js';
import { getAllCardsByList } from '../build/tools/get-all-cards-by-list.js';
import { getCardsBatch } from '../build/tools/get-cards-batch.js';

async function testPagination() {
  // Check for required environment variables
  if (!process.env.TRELLO_API_KEY || !process.env.TRELLO_TOKEN) {
    console.error('Error: TRELLO_API_KEY and TRELLO_TOKEN environment variables are required');
    process.exit(1);
  }

  const testListId = process.argv[2];
  if (!testListId) {
    console.error('Error: Please provide a list ID as an argument');
    console.error('Usage: node scripts/test-pagination.js <list-id>');
    process.exit(1);
  }

  // Initialize Trello client
  const client = new TrelloClient({
    apiKey: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN,
    defaultBoardId: process.env.TRELLO_BOARD_ID
  });

  console.log('Testing pagination with list:', testListId);
  console.log('=' .repeat(60));

  try {
    // Test 1: Get list stats
    console.log('\n1. Getting list stats...');
    const stats = await getListStats(client, { listId: testListId });
    console.log(`   Total cards: ${stats.cardCount}`);
    if (stats.estimatedTokens) {
      console.log(`   Estimated tokens: ${stats.estimatedTokens}`);
    }
    if (stats.newestCard) {
      console.log(`   Newest card: "${stats.newestCard.name}" (${stats.newestCard.dateLastActivity})`);
    }
    if (stats.oldestCard) {
      console.log(`   Oldest card: "${stats.oldestCard.name}" (${stats.oldestCard.dateLastActivity})`);
    }

    // Test 2: Get all card IDs (lightweight)
    console.log('\n2. Fetching all card IDs (lightweight)...');
    const startIds = Date.now();
    const cardIds = await getCardIdsByList(client, { listId: testListId });
    const durationIds = Date.now() - startIds;
    console.log(`   Fetched ${cardIds.totalCount} card IDs in ${durationIds}ms`);
    if (cardIds.cardIds.length > 0) {
      console.log(`   First card: "${cardIds.cardIds[0].name}" (ID: ${cardIds.cardIds[0].id})`);
      console.log(`   Last card: "${cardIds.cardIds[cardIds.cardIds.length - 1].name}"`);
    }

    // Test 3: Paginated fetch
    console.log('\n3. Testing paginated fetch...');
    let allCards = [];
    let cursor = undefined;
    let pageCount = 0;

    do {
      pageCount++;
      const page = await getCardsByListPaginated(client, {
        listId: testListId,
        limit: 100,
        before: cursor,
        lightweight: true
      });

      allCards.push(...page.cards);
      cursor = page.nextCursor;

      console.log(`   Page ${pageCount}: ${page.cards.length} cards (total: ${allCards.length})`);

      if (pageCount > 50) {
        console.log('   Safety limit reached, stopping pagination test...');
        break;
      }
    } while (cursor);

    console.log(`\nTotal cards fetched via pagination: ${allCards.length}`);

    // Test 4: Get all cards automatically
    console.log('\n4. Testing automatic fetch of all cards...');
    const startAll = Date.now();
    const allCardsResult = await getAllCardsByList(client, {
      listId: testListId,
      maxCards: 100, // Limit for testing
      lightweight: true
    });
    const durationAll = Date.now() - startAll;
    console.log(`   Fetched ${allCardsResult.totalCards} cards in ${allCardsResult.fetchedInBatches} batches (${durationAll}ms)`);
    if (allCardsResult.truncated) {
      console.log('   Note: Results were truncated due to maxCards limit');
    }

    // Test 5: Batch fetch
    if (cardIds.cardIds.length > 0) {
      console.log('\n5. Testing batch fetch...');
      const batchIds = cardIds.cardIds.slice(0, Math.min(10, cardIds.cardIds.length)).map(c => c.id);
      console.log(`   Fetching ${batchIds.length} specific cards...`);
      
      const startBatch = Date.now();
      const batchCards = await getCardsBatch(client, { 
        cardIds: batchIds,
        fields: ['id', 'name', 'desc', 'dateLastActivity']
      });
      const durationBatch = Date.now() - startBatch;
      
      console.log(`   Fetched ${batchCards.cards.length} cards in ${durationBatch}ms`);
      if (batchCards.notFound.length > 0) {
        console.log(`   Not found: ${batchCards.notFound.length} cards`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary:');
    console.log(`  List contains ${stats.cardCount} cards`);
    console.log(`  All pagination tests completed successfully`);
    
    // Performance comparison
    if (stats.cardCount > 100) {
      console.log('\nPerformance Notes:');
      console.log('  - Fetching IDs only is fastest for discovery');
      console.log('  - Lightweight mode reduces token usage by ~70-80%');
      console.log('  - Batch fetching is efficient for specific cards');
    }

  } catch (error) {
    console.error('\nError during testing:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testPagination().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});