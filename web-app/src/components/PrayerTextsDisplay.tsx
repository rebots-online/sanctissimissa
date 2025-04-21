import React, { useEffect, useState } from 'react';
import { getDatabase } from '../services/database/db';

interface PrayerText {
  id: string;
  title: string;
  content: string;
  language?: string;
}

const PrayerTextsDisplay: React.FC = () => {
  const [prayerTexts, setPrayerTexts] = useState<PrayerText[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrayerTexts = async () => {
      try {
        const db = await getDatabase();
        const rawTexts = await db.getAll('prayers');
        // Map database texts to component interface
        const texts = rawTexts.map(text => ({
          id: text.id,
          title: text.name || 'Prayer',
          content: text.latin || text.english || 'Content unavailable',
          language: text.latin && text.english ? 'Latin/English' : (text.latin ? 'Latin' : 'English')
        }));
        setPrayerTexts(texts);
        setLoading(false);
      } catch (err) {
        setError('Failed to load Prayer texts. Please try again later.');
        setLoading(false);
        console.error('Error fetching Prayer texts:', err);
      }
    };

    fetchPrayerTexts();
  }, []);

  if (loading) {
    return <div className="text-center p-4">Loading Prayer texts...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  if (prayerTexts.length === 0) {
    return <div className="text-center p-4">No Prayer texts available.</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Prayer Texts</h2>
      {prayerTexts.map((text) => (
        <div key={text.id} className="mb-6 bg-white shadow-md rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2">{text.title}</h3>
          <div className="text-base text-gray-700">{text.content}</div>
          {text.language && <p className="text-sm text-gray-500 mt-2">Language: {text.language}</p>}
        </div>
      ))}
    </div>
  );
};

export default PrayerTextsDisplay;
