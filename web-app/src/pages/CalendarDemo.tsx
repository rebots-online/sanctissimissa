import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Button,
  Box,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { getLiturgicalDay } from '../services/calendar/enhanced/liturgicalDayService';
import { renderLiturgicalDay, OutputFormat, RenderingOptions } from '../services/rendering/liturgicalDayRenderer';
import { LiturgicalColor, LiturgicalRank } from '../models/calendar';

/**
 * Calendar Demo Page
 *
 * This page demonstrates the enhanced liturgical calendar functionality.
 * It allows users to select a date and view the liturgical day information
 * in various formats.
 */
const CalendarDemo: React.FC = () => {
  // State for selected date
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // State for rendering options
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(OutputFormat.HTML);
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
      setRenderedOutput(`<div class="error">Error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`);
    }
  }, [selectedDate, outputFormat, showCommemorations, includeDescription, includeParishInfo]);

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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Liturgical Calendar Demo
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={(newDate) => newDate && setSelectedDate(newDate)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="format-select-label">Output Format</InputLabel>
              <Select
                labelId="format-select-label"
                id="format-select"
                value={outputFormat}
                label="Output Format"
                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
              >
                <MenuItem value={OutputFormat.HTML}>HTML</MenuItem>
                <MenuItem value={OutputFormat.TEXT}>Text</MenuItem>
                <MenuItem value={OutputFormat.MARKDOWN}>Markdown</MenuItem>
                <MenuItem value={OutputFormat.JSON}>JSON</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showCommemorations}
                  onChange={(e) => setShowCommemorations(e.target.checked)}
                />
              }
              label="Show Commemorations"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeDescription}
                  onChange={(e) => setIncludeDescription(e.target.checked)}
                />
              }
              label="Include Descriptions"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeParishInfo}
                  onChange={(e) => setIncludeParishInfo(e.target.checked)}
                />
              }
              label="Include Parish Information"
            />
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <Box sx={{ height: 20, bgcolor: getLiturgicalDayColor() }} />
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Liturgical Day Information
              </Typography>

              <Divider sx={{ my: 2 }} />

              {(() => {
                try {
                  const liturgicalDay = getLiturgicalDay(selectedDate);
                  return (
                    <>
                      <Typography variant="body1" gutterBottom>
                        <strong>Date:</strong> {format(liturgicalDay.displayDate || selectedDate, 'EEEE, MMMM d, yyyy')}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>Celebration:</strong> {liturgicalDay.celebration}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>Season:</strong> {liturgicalDay.season.name}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>Color:</strong> {liturgicalDay.color}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>Rank:</strong> {liturgicalDay.rank}
                      </Typography>

                      {liturgicalDay.commemorations.length > 0 && (
                        <>
                          <Typography variant="body1" gutterBottom>
                            <strong>Commemorations:</strong>
                          </Typography>
                          <ul>
                            {liturgicalDay.commemorations.map((commemoration, index) => (
                              <li key={index}>{commemoration.name}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </>
                  );
                } catch (error) {
                  return (
                    <Typography color="error">
                      Error loading liturgical day information
                    </Typography>
                  );
                }
              })()}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Rendered Output
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mt: 2 }}>
              {outputFormat === OutputFormat.HTML ? (
                <div dangerouslySetInnerHTML={{ __html: renderedOutput }} />
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {renderedOutput}
                </pre>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CalendarDemo;
