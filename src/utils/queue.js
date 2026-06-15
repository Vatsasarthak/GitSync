// src/utils/queue.js

async function getQueue() {
  const data = await chrome.storage.local.get(['syncQueue']);
  return data.syncQueue || [];
}

async function addToQueue(submissionData) {
  const queue = await getQueue();
  
  // Prevent duplicate additions in the queue
  const isDuplicate = queue.some(item => 
    item.data.platform === submissionData.platform && 
    item.data.slug === submissionData.slug && 
    item.data.language === submissionData.language
  );
  
  if (isDuplicate) return;

  const newItem = {
    id: `${submissionData.platform}-${submissionData.slug}-${Date.now()}`,
    data: submissionData,
    timestamp: Date.now(),
    status: 'pending',
    attempts: 0
  };

  queue.push(newItem);
  await chrome.storage.local.set({ syncQueue: queue });
  
  // Set alarm for processing if not already set
  try {
    await chrome.alarms.create('process_queue_alarm', { delayInMinutes: 1, periodInMinutes: 5 });
  } catch (e) {
    // Ignore error in alarm creation if context invalid
  }
  
  return newItem;
}

async function removeFromQueue(itemId) {
  let queue = await getQueue();
  queue = queue.filter(item => item.id !== itemId);
  await chrome.storage.local.set({ syncQueue: queue });
  return queue;
}

async function updateQueueItem(itemId, updates) {
  let queue = await getQueue();
  queue = queue.map(item => {
    if (item.id === itemId) {
      return { ...item, ...updates };
    }
    return item;
  });
  await chrome.storage.local.set({ syncQueue: queue });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getQueue, addToQueue, removeFromQueue, updateQueueItem };
} else {
  self.getQueue = getQueue;
  self.addToQueue = addToQueue;
  self.removeFromQueue = removeFromQueue;
  self.updateQueueItem = updateQueueItem;
}
