import React from 'react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  comingSoon?: boolean;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description, comingSoon = true }) => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <span className="mr-2">{title}</span>
        {comingSoon && <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Coming Soon</span>}
      </h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <p className="text-lg mb-4">{description}</p>
        
        {comingSoon && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p className="text-blue-700">
              This feature is currently under development. Please check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceholderPage;
