import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Prayer {
  id: string;
  title: {
    latin: string;
    english: string;
  };
  category: string;
  content: {
    latin: string;
    english: string;
  };
  notes?: string;
  tags: string[];
}

interface PrayerSettings {
  language: 'latin' | 'english';
  showTranslations: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

const PrayersPage: React.FC = () => {
  const { category, id } = useParams<{ category: string; id: string }>();
  const navigate = useNavigate();
  
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(category || 'all');
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [settings, setSettings] = useState<PrayerSettings>({
    language: 'latin',
    showTranslations: true,
    fontSize: 'medium'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sample prayer data using useMemo to avoid recreating on every render
  const samplePrayers = useMemo<Prayer[]>(() => [
    {
      id: 'pater-noster',
      title: {
        latin: 'Pater Noster',
        english: 'Our Father'
      },
      category: 'basic',
      content: {
        latin: 'Pater noster, qui es in caelis,\nsanctificetur nomen tuum.\nAdveniat regnum tuum.\nFiat voluntas tua, sicut in caelo et in terra.\nPanem nostrum quotidianum da nobis hodie,\net dimitte nobis debita nostra,\nsicut et nos dimittimus debitoribus nostris.\nEt ne nos inducas in tentationem,\nsed libera nos a malo.\nAmen.',
        english: 'Our Father, who art in heaven,\nhallowed be thy name.\nThy kingdom come.\nThy will be done, on earth as it is in heaven.\nGive us this day our daily bread,\nand forgive us our trespasses,\nas we forgive those who trespass against us.\nAnd lead us not into temptation,\nbut deliver us from evil.\nAmen.'
      },
      tags: ['basic', 'daily', 'mass']
    },
    {
      id: 'ave-maria',
      title: {
        latin: 'Ave Maria',
        english: 'Hail Mary'
      },
      category: 'basic',
      content: {
        latin: 'Ave Maria, gratia plena, Dominus tecum.\nBenedicta tu in mulieribus,\net benedictus fructus ventris tui, Iesus.\nSancta Maria, Mater Dei,\nora pro nobis peccatoribus,\nnunc et in hora mortis nostrae.\nAmen.',
        english: 'Hail Mary, full of grace, the Lord is with thee.\nBlessed art thou amongst women,\nand blessed is the fruit of thy womb, Jesus.\nHoly Mary, Mother of God,\npray for us sinners,\nnow and at the hour of our death.\nAmen.'
      },
      tags: ['basic', 'daily', 'rosary']
    },
    {
      id: 'gloria-patri',
      title: {
        latin: 'Gloria Patri',
        english: 'Glory Be'
      },
      category: 'basic',
      content: {
        latin: 'Gloria Patri, et Filio, et Spiritui Sancto.\nSicut erat in principio, et nunc, et semper,\net in saecula saeculorum.\nAmen.',
        english: 'Glory be to the Father, and to the Son, and to the Holy Spirit.\nAs it was in the beginning, is now, and ever shall be,\nworld without end.\nAmen.'
      },
      tags: ['basic', 'daily', 'rosary']
    },
    {
      id: 'salve-regina',
      title: {
        latin: 'Salve Regina',
        english: 'Hail Holy Queen'
      },
      category: 'marian',
      content: {
        latin: 'Salve, Regina, mater misericordiae;\nvita, dulcedo et spes nostra, salve.\nAd te clamamus exsules filii Hevae.\nAd te suspiramus gementes et flentes\nin hac lacrimarum valle.\nEia ergo, advocata nostra,\nillos tuos misericordes oculos ad nos converte.\nEt Iesum, benedictum fructum ventris tui,\nnobis post hoc exsilium ostende.\nO clemens, o pia, o dulcis Virgo Maria.',
        english: 'Hail, Holy Queen, Mother of Mercy,\nour life, our sweetness and our hope.\nTo thee do we cry, poor banished children of Eve;\nto thee do we send up our sighs,\nmourning and weeping in this valley of tears.\nTurn then, most gracious advocate,\nthine eyes of mercy toward us;\nand after this our exile,\nshow unto us the blessed fruit of thy womb, Jesus.\nO clement, O loving, O sweet Virgin Mary.'
      },
      tags: ['marian', 'rosary']
    },
    {
      id: 'memorare',
      title: {
        latin: 'Memorare',
        english: 'Memorare'
      },
      category: 'marian',
      content: {
        latin: 'Memorare, O piissima Virgo Maria,\nnon esse auditum a saeculo,\nquemquam ad tua currentem praesidia,\ntua implorantem auxilia,\ntua petentem suffragia,\nesse derelictum.\nEgo tali animatus confidentia,\nad te, Virgo Virginum, Mater, curro,\nad te venio, coram te gemens peccator assisto.\nNoli, Mater Verbi, verba mea despicere;\nsed audi propitia et exaudi.\nAmen.',
        english: 'Remember, O most gracious Virgin Mary,\nthat never was it known\nthat anyone who fled to thy protection,\nimplored thy help,\nor sought thy intercession\nwas left unaided.\nInspired by this confidence,\nI fly unto thee, O Virgin of virgins, my mother;\nto thee do I come, before thee I stand, sinful and sorrowful.\nO Mother of the Word Incarnate, despise not my petitions,\nbut in thy mercy hear and answer me.\nAmen.'
      },
      tags: ['marian', 'devotional']
    },
    {
      id: 'angelus',
      title: {
        latin: 'Angelus Domini',
        english: 'The Angelus'
      },
      category: 'devotional',
      content: {
        latin: 'V. Angelus Domini nuntiavit Mariae.\nR. Et concepit de Spiritu Sancto.\n\nAve Maria...\n\nV. Ecce ancilla Domini.\nR. Fiat mihi secundum verbum tuum.\n\nAve Maria...\n\nV. Et Verbum caro factum est.\nR. Et habitavit in nobis.\n\nAve Maria...\n\nV. Ora pro nobis, sancta Dei Genitrix.\nR. Ut digni efficiamur promissionibus Christi.\n\nOremus. Gratiam tuam, quaesumus, Domine, mentibus nostris infunde; ut qui, Angelo nuntiante, Christi Filii tui incarnationem cognovimus, per passionem eius et crucem, ad resurrectionis gloriam perducamur. Per eundem Christum Dominum nostrum. Amen.',
        english: 'V. The Angel of the Lord declared unto Mary.\nR. And she conceived of the Holy Spirit.\n\nHail Mary...\n\nV. Behold the handmaid of the Lord.\nR. Be it done unto me according to thy word.\n\nHail Mary...\n\nV. And the Word was made Flesh.\nR. And dwelt among us.\n\nHail Mary...\n\nV. Pray for us, O holy Mother of God.\nR. That we may be made worthy of the promises of Christ.\n\nLet us pray. Pour forth, we beseech Thee, O Lord, Thy grace into our hearts, that we to whom the Incarnation of Christ Thy Son was made known by the message of an angel, may by His Passion and Cross be brought to the glory of His Resurrection. Through the same Christ Our Lord. Amen.'
      },
      tags: ['devotional', 'daily']
    },
    {
      id: 'sub-tuum',
      title: {
        latin: 'Sub Tuum Praesidium',
        english: 'Under Your Protection'
      },
      category: 'marian',
      content: {
        latin: 'Sub tuum praesidium confugimus,\nSancta Dei Genitrix.\nNostras deprecationes ne despicias in necessitatibus nostris,\nsed a periculis cunctis libera nos semper,\nVirgo gloriosa et benedicta.',
        english: 'We fly to thy protection,\nO Holy Mother of God;\nDespise not our petitions in our necessities,\nbut deliver us always from all dangers,\nO Glorious and Blessed Virgin.'
      },
      tags: ['marian', 'ancient']
    }
  ], []); // Empty dependency array means this will only be created once

  useEffect(() => {
    const fetchPrayers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real implementation, we would fetch from a database
        // For now, we'll use our sample data
        setPrayers(samplePrayers);
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(samplePrayers.map(prayer => prayer.category)));
        setCategories(uniqueCategories);
        
        // If an ID was provided in the URL, select that prayer
        if (id) {
          const prayer = samplePrayers.find(p => p.id === id);
          if (prayer) {
            setSelectedPrayer(prayer);
            setSelectedCategory(prayer.category);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading prayers:', err);
        setError('Failed to load prayers. Please try again.');
        setLoading(false);
      }
    };
    
    fetchPrayers();
  }, [id, samplePrayers]); // Including samplePrayers in dependencies

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedPrayer(null);
    navigate(`/prayers/${category}`);
  };

  const handlePrayerSelect = (prayer: Prayer) => {
    setSelectedPrayer(prayer);
    navigate(`/prayers/${prayer.category}/${prayer.id}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const toggleLanguage = () => {
    setSettings(prev => ({
      ...prev,
      language: prev.language === 'latin' ? 'english' : 'latin'
    }));
  };

  const toggleTranslations = () => {
    setSettings(prev => ({
      ...prev,
      showTranslations: !prev.showTranslations
    }));
  };

  const changeFontSize = (size: PrayerSettings['fontSize']) => {
    setSettings(prev => ({
      ...prev,
      fontSize: size
    }));
  };

  // Filter prayers based on category and search term
  const filteredPrayers = prayers.filter(prayer => {
    const matchesCategory = selectedCategory === 'all' || prayer.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      prayer.title.latin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prayer.title.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prayer.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Font size classes
  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Traditional Catholic Prayers</h1>
      
      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search prayers..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={toggleLanguage}
              className={`px-3 py-1 rounded text-sm ${settings.language === 'latin' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              {settings.language === 'latin' ? 'Latin' : 'English'}
            </button>
            
            <button 
              onClick={toggleTranslations}
              className={`px-3 py-1 rounded text-sm ${settings.showTranslations ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              {settings.showTranslations ? 'Show Translations' : 'Hide Translations'}
            </button>
            
            <div className="flex items-center gap-1">
              <span className="text-sm">Size:</span>
              <button 
                onClick={() => changeFontSize('small')}
                className={`px-2 py-1 rounded text-xs ${settings.fontSize === 'small' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                A
              </button>
              <button 
                onClick={() => changeFontSize('medium')}
                className={`px-2 py-1 rounded text-sm ${settings.fontSize === 'medium' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                A
              </button>
              <button 
                onClick={() => changeFontSize('large')}
                className={`px-2 py-1 rounded text-base ${settings.fontSize === 'large' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                A
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Categories and prayer list */}
        <div className="md:w-1/3">
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h2 className="text-xl font-semibold mb-3">Categories</h2>
            <div className="space-y-2">
              <button
                onClick={() => handleCategorySelect('all')}
                className={`block w-full text-left px-3 py-2 rounded ${selectedCategory === 'all' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
              >
                All Prayers
              </button>
              
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className={`block w-full text-left px-3 py-2 rounded capitalize ${selectedCategory === category ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
                >
                  {category} Prayers
                </button>
              ))}
            </div>
          </div>
          
          {filteredPrayers.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-3">
                {selectedCategory === 'all' ? 'All Prayers' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Prayers`}
              </h2>
              <div className="space-y-2">
                {filteredPrayers.map(prayer => (
                  <button
                    key={prayer.id}
                    onClick={() => handlePrayerSelect(prayer)}
                    className={`block w-full text-left px-3 py-2 rounded ${selectedPrayer?.id === prayer.id ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-gray-100'}`}
                  >
                    <div className="font-medium">{prayer.title[settings.language]}</div>
                    {settings.showTranslations && settings.language === 'latin' && (
                      <div className="text-sm text-gray-600">{prayer.title.english}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-4 text-center text-gray-500">
              No prayers found matching your criteria.
            </div>
          )}
        </div>
        
        {/* Prayer content */}
        <div className="md:w-2/3">
          {selectedPrayer ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-2">
                {selectedPrayer.title[settings.language]}
                {settings.showTranslations && settings.language === 'latin' && (
                  <span className="text-lg font-normal text-gray-600 ml-2">
                    ({selectedPrayer.title.english})
                  </span>
                )}
              </h2>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedPrayer.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className={`${fontSizeClasses[settings.fontSize]} space-y-4 mt-6`}>
                {/* Primary language */}
                <div className="leading-relaxed">
                  {selectedPrayer.content[settings.language].split('\n').map((paragraph, idx) => (
                    <p key={`${selectedPrayer.id}-${settings.language}-${idx}`} className="mb-2">
                      {paragraph}
                    </p>
                  ))}
                </div>
                
                {/* Translation */}
                {settings.showTranslations && settings.language === 'latin' && (
                  <div className="text-gray-700 leading-relaxed border-l-4 border-gray-200 pl-4 mt-4">
                    {selectedPrayer.content.english.split('\n').map((paragraph, idx) => (
                      <p key={`${selectedPrayer.id}-english-${idx}`} className="mb-2">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}
                
                {/* Notes if any */}
                {selectedPrayer.notes && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Notes:</h3>
                    <p className="text-gray-700">{selectedPrayer.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-gray-500">
                <p className="mb-4">Select a prayer from the list to view its content.</p>
                <p>You can search for specific prayers or filter by category.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrayersPage;
