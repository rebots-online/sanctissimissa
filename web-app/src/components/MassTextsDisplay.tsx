import React, { useEffect, useState } from 'react';
import { getDatabase } from '../services/database/db';

interface MassText {
  id: string;
  title: string;
  content: string;
  date?: string;
  language?: string;
}

const MassTextsDisplay: React.FC = () => {
  const [massTexts, setMassTexts] = useState<MassText[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMassTexts = async () => {
      try {
        const db = await getDatabase();
        const rawTexts = await db.getAll('mass_texts');
        // Map database texts to component interface
        const texts = rawTexts.map(text => ({
          id: text.id,
          title: text.part || 'Mass Text',
          content: text.latin || text.english || 'Content unavailable',
          date: text.date,
          language: text.latin && text.english ? 'Latin/English' : (text.latin ? 'Latin' : 'English')
        }));
        setMassTexts(texts);
        setLoading(false);
      } catch (err) {
        setError('Failed to load Mass texts. Please try again later.');
        setLoading(false);
        console.error('Error fetching Mass texts:', err);
      }
    };

    fetchMassTexts();
  }, []);

  if (loading) {
    return <div className="text-center p-4">Loading Mass texts...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  if (massTexts.length === 0) {
    return <div className="text-center p-4">No Mass texts available for this date.</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Mass Texts</h2>
      {massTexts.map((text) => (
        <div key={text.id} className="mb-6 bg-white shadow-md rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2">{text.title}</h3>
          <div className="text-base text-gray-700">{text.content}</div>
          {text.language && <p className="text-sm text-gray-500 mt-2">Language: {text.language}</p>}
        </div>
      ))}
    </div>
  );
};

export default MassTextsDisplay;
