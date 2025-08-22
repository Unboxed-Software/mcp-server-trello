#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { TrelloClient } from '../build/trello-client.js';
import { getListStats } from '../build/tools/get-list-stats.js';

async function findLargeList() {
  const client = new TrelloClient({
    apiKey: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN,
    defaultBoardId: process.env.TRELLO_BOARD_ID
  });

  try {
    const boardId = process.env.TRELLO_BOARD_ID;
    const lists = await client.getLists(boardId);
    console.log(`Analyzing lists on board ${boardId}...`);
    console.log('=' .repeat(60));
    
    let largestList = null;
    let maxCards = 0;
    
    for (const list of lists) {
      try {
        const stats = await getListStats(client, { listId: list.id });
        console.log(`  ${list.name}: ${stats.cardCount} cards`);
        
        if (stats.cardCount > maxCards) {
          maxCards = stats.cardCount;
          largestList = { ...list, cardCount: stats.cardCount };
        }
      } catch (e) {
        console.log(`  ${list.name}: Error getting stats`);
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    if (largestList) {
      console.log(`\nLargest list: "${largestList.name}"`);
      console.log(`List ID: ${largestList.id}`);
      console.log(`Card count: ${largestList.cardCount}`);
      console.log(`\nTo test pagination with this list, run:`);
      console.log(`node scripts/test-pagination.js ${largestList.id}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

findLargeList();