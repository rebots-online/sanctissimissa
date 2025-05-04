import React, { useState } from 'react';
import { CustomDateAdapter } from './CustomDateAdapter';

interface CustomDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  className?: string;
}

/**
 * Custom date picker component
 * 
 * This component provides a simple date picker that works with
 * the installed version of date-fns.
 */
const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState<string>(
    CustomDateAdapter.formatDate(value, 'yyyy-MM-dd')
  );
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const parsedDate = CustomDateAdapter.parseDate(newValue, 'yyyy-MM-dd');
    if (parsedDate) {
      onChange(parsedDate);
    }
  };
  
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="mb-1 text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type="date"
        value={inputValue}
        onChange={handleInputChange}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
};

export default CustomDatePicker;
