export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function sendNotification(title, body, icon = '💊') {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon, badge: icon, tag: 'medicine-reminder' });
  }
}

export function scheduleReminder(medicine, timeSlot) {
  const now = new Date();
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);

  const diff = scheduledTime.getTime() - now.getTime();

  if (diff > 0) {
    setTimeout(() => {
      sendNotification(
        `💊 Time for ${medicine.name}`,
        `Take ${medicine.dosage} of ${medicine.name}. ${medicine.precautions || ''}`,
      );
    }, diff);

    // Also remind 5 minutes before
    if (diff > 5 * 60 * 1000) {
      setTimeout(() => {
        sendNotification(
          `⏰ Upcoming: ${medicine.name}`,
          `${medicine.name} (${medicine.dosage}) is due in 5 minutes`,
        );
      }, diff - 5 * 60 * 1000);
    }
  }
}

// Cache data to localStorage for offline access
export function cacheData(key, data) {
  try {
    localStorage.setItem(`mc_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
}

export function getCachedData(key, maxAgeMs = 30 * 60 * 1000) {
  try {
    const raw = localStorage.getItem(`mc_${key}`);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > maxAgeMs) return null;
    return data;
  } catch {
    return null;
  }
}
