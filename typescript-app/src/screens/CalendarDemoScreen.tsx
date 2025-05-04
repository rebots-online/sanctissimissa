import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Platform, 
  SafeAreaView 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { getLiturgicalDay } from '../services/calendar/enhanced/liturgicalDayService';
import { renderLiturgicalDay, OutputFormat, RenderingOptions } from '../services/rendering/liturgicalDayRenderer';
import { LiturgicalColor } from '../models/calendar';

/**
 * Calendar Demo Screen
 * 
 * This screen demonstrates the enhanced liturgical calendar functionality.
 * It allows users to select a date and view the liturgical day information
 * in various formats.
 */
const CalendarDemoScreen: React.FC = () => {
  // State for selected date
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  
  // State for rendering options
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(OutputFormat.TEXT);
  const [showCommemorations, setShowCommemorations] = useState<boolean>(true);
  const [includeDescription, setIncludeDescription] = useState<boolean>(true);
  const [includeParishInfo, setIncludeParishInfo] = useState<boolean>(false);
  
  // State for rendered output
  const [renderedOutput, setRenderedOutput] = useState<string>('');
  
  // Sample parish information
  const parishInfo = {
    name: 'St. Mary\'s Catholic Church',
    address: '123 Main St, Anytown, USA 12345',
    phone: '(555) 123-4567',
    email: 'info@stmarys.example.com',
    website: 'www.stmarys.example.com',
    pastor: 'Rev. John Smith'
  };
  
  // Generate the liturgical day information
  useEffect(() => {
    try {
      // Get the liturgical day
      const liturgicalDay = getLiturgicalDay(selectedDate);
      
      // Rendering options
      const options: RenderingOptions = {
        format: outputFormat,
        showCommemorations,
        includeDescription,
        parishInfo: includeParishInfo ? parishInfo : undefined
      };
      
      // Render the liturgical day
      const rendered = renderLiturgicalDay(liturgicalDay, options);
      setRenderedOutput(rendered);
    } catch (error) {
      console.error('Error generating liturgical day:', error);
      setRenderedOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [selectedDate, outputFormat, showCommemorations, includeDescription, includeParishInfo]);
  
  // Handle date change
  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };
  
  // Get color for the liturgical day
  const getLiturgicalDayColor = (): string => {
    try {
      const liturgicalDay = getLiturgicalDay(selectedDate);
      switch (liturgicalDay.color) {
        case LiturgicalColor.WHITE:
          return '#FFFFFF';
        case LiturgicalColor.RED:
          return '#FF0000';
        case LiturgicalColor.GREEN:
          return '#008000';
        case LiturgicalColor.PURPLE:
          return '#800080';
        case LiturgicalColor.ROSE:
          return '#FF007F';
        case LiturgicalColor.BLACK:
          return '#000000';
        case LiturgicalColor.GOLD:
          return '#FFD700';
        default:
          return '#000000';
      }
    } catch (error) {
      return '#000000';
    }
  };
  
  // Get liturgical day information
  const liturgicalDay = getLiturgicalDay(selectedDate);
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Liturgical Calendar Demo</Text>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Date Selection</Text>
          
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {selectedDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Output Format</Text>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={outputFormat}
              onValueChange={(itemValue) => setOutputFormat(itemValue as OutputFormat)}
              style={styles.picker}
            >
              <Picker.Item label="Text" value={OutputFormat.TEXT} />
              <Picker.Item label="HTML" value={OutputFormat.HTML} />
              <Picker.Item label="Markdown" value={OutputFormat.MARKDOWN} />
              <Picker.Item label="JSON" value={OutputFormat.JSON} />
            </Picker>
          </View>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Options</Text>
          
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Show Commemorations</Text>
            <Switch
              value={showCommemorations}
              onValueChange={setShowCommemorations}
            />
          </View>
          
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Include Descriptions</Text>
            <Switch
              value={includeDescription}
              onValueChange={setIncludeDescription}
            />
          </View>
          
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Include Parish Information</Text>
            <Switch
              value={includeParishInfo}
              onValueChange={setIncludeParishInfo}
            />
          </View>
        </View>
        
        <View style={styles.card}>
          <View style={[styles.colorIndicator, { backgroundColor: getLiturgicalDayColor() }]} />
          <Text style={styles.sectionTitle}>Liturgical Day Information</Text>
          
          {liturgicalDay ? (
            <View style={styles.infoContainer}>
              <Text style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date: </Text>
                <Text>{selectedDate.toLocaleDateString()}</Text>
              </Text>
              
              <Text style={styles.infoRow}>
                <Text style={styles.infoLabel}>Celebration: </Text>
                <Text>{liturgicalDay.celebration}</Text>
              </Text>
              
              <Text style={styles.infoRow}>
                <Text style={styles.infoLabel}>Season: </Text>
                <Text>{liturgicalDay.season.name}</Text>
              </Text>
              
              <Text style={styles.infoRow}>
                <Text style={styles.infoLabel}>Color: </Text>
                <Text>{liturgicalDay.color}</Text>
              </Text>
              
              <Text style={styles.infoRow}>
                <Text style={styles.infoLabel}>Rank: </Text>
                <Text>{liturgicalDay.rank}</Text>
              </Text>
              
              {liturgicalDay.commemorations.length > 0 && (
                <View style={styles.commemorationsContainer}>
                  <Text style={styles.infoLabel}>Commemorations:</Text>
                  {liturgicalDay.commemorations.map((commemoration, index) => (
                    <Text key={index} style={styles.commemorationItem}>
                      • {commemoration.name}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.errorText}>
              Error loading liturgical day information
            </Text>
          )}
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rendered Output</Text>
          
          <ScrollView style={styles.outputContainer}>
            <Text style={styles.outputText}>{renderedOutput}</Text>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  dateButton: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  picker: {
    height: 50,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionLabel: {
    fontSize: 16,
  },
  colorIndicator: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoRow: {
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: 'bold',
  },
  commemorationsContainer: {
    marginTop: 8,
  },
  commemorationItem: {
    marginLeft: 16,
    marginTop: 4,
  },
  errorText: {
    color: 'red',
    marginTop: 8,
  },
  outputContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 8,
    maxHeight: 200,
  },
  outputText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
});

export default CalendarDemoScreen;
