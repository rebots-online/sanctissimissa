import React, { useState, useEffect } from 'react';
import { loadOfficeText } from '../lib/office';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';

/**
 * Test page for the Office text loading functionality using shadcn/ui components
 */
const OfficeLibTest: React.FC = () => {
  const [officeText, setOfficeText] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const testOfficeTextLoading = async () => {
      try {
        setLoading(true);
        
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        
        // Try to load Vespers for today
        const result = await loadOfficeText(today, 'vespers');
        
        setOfficeText(result);
        setLoading(false);
      } catch (err) {
        console.error('Error testing Office text loading:', err);
        setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    testOfficeTextLoading();
  }, []);
  
  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Divine Office</h1>
      
      {loading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      )}
      
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
      
      {officeText && !loading && !error && (
        <>
          <Card className="mb-6">
            <CardHeader className="bg-amber-50 rounded-t-lg">
              <CardTitle>
                {officeText.titleEnglish || `${officeText.hour.charAt(0).toUpperCase() + officeText.hour.slice(1)}`}
              </CardTitle>
              <CardDescription className="italic">
                {officeText.titleLatin || officeText.hour}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Date:</h3>
                <p>{officeText.date || 'Not specified'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Hour:</h3>
                <p>{officeText.hour}</p>
              </div>
              {officeText.season && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Season:</h3>
                  <p>{officeText.season}</p>
                </div>
              )}
              {officeText.celebration && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Celebration:</h3>
                  <p>{officeText.celebration}</p>
                </div>
              )}
              {officeText.color && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Color:</h3>
                  <p>{officeText.color}</p>
                </div>
              )}
              {officeText.rank !== undefined && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Rank:</h3>
                  <p>{officeText.rank}</p>
                </div>
              )}
            </CardContent>
            {officeText.generated && (
              <CardFooter className="bg-amber-50 text-amber-700 font-medium text-sm">
                This office text was dynamically generated.
              </CardFooter>
            )}
          </Card>
          
          {/* Hymn Section */}
          {(officeText.hymnLatin || officeText.hymnEnglish) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">Hymn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {officeText.hymnLatin && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Latin</h4>
                    <p className="whitespace-pre-wrap">{officeText.hymnLatin}</p>
                  </div>
                )}
                {officeText.hymnLatin && officeText.hymnEnglish && (
                  <Separator />
                )}
                {officeText.hymnEnglish && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">English</h4>
                    <p className="whitespace-pre-wrap">{officeText.hymnEnglish}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Psalms Section */}
          {officeText.psalms && officeText.psalms.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">Psalms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {officeText.psalms.map((psalm: any, index: number) => (
                  <div key={index} className="space-y-4">
                    {index > 0 && <Separator />}
                    <h4 className="font-medium">Psalm {psalm.number}</h4>
                    {psalm.latin && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">Latin</h5>
                        <p className="whitespace-pre-wrap">{psalm.latin}</p>
                      </div>
                    )}
                    {psalm.latin && psalm.english && (
                      <Separator className="my-2" />
                    )}
                    {psalm.english && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">English</h5>
                        <p className="whitespace-pre-wrap">{psalm.english}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          {/* Chapter Section */}
          {(officeText.chapterLatin || officeText.chapterEnglish) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">
                  Chapter {officeText.chapterReference && `(${officeText.chapterReference})`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {officeText.chapterLatin && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Latin</h4>
                    <p className="whitespace-pre-wrap">{officeText.chapterLatin}</p>
                  </div>
                )}
                {officeText.chapterLatin && officeText.chapterEnglish && (
                  <Separator />
                )}
                {officeText.chapterEnglish && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">English</h4>
                    <p className="whitespace-pre-wrap">{officeText.chapterEnglish}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Readings Section */}
          {officeText.readings && officeText.readings.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">Readings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {officeText.readings.map((reading: any, index: number) => (
                  <div key={index} className="space-y-4">
                    {index > 0 && <Separator />}
                    <h4 className="font-medium">
                      Reading {reading.number} {reading.reference && `(${reading.reference})`}
                    </h4>
                    {reading.latin && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">Latin</h5>
                        <p className="whitespace-pre-wrap">{reading.latin}</p>
                      </div>
                    )}
                    {reading.latin && reading.english && (
                      <Separator className="my-2" />
                    )}
                    {reading.english && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">English</h5>
                        <p className="whitespace-pre-wrap">{reading.english}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          {/* Prayer Section */}
          {(officeText.prayerLatin || officeText.prayerEnglish) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">Prayer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {officeText.prayerLatin && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Latin</h4>
                    <p className="whitespace-pre-wrap">{officeText.prayerLatin}</p>
                  </div>
                )}
                {officeText.prayerLatin && officeText.prayerEnglish && (
                  <Separator />
                )}
                {officeText.prayerEnglish && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">English</h4>
                    <p className="whitespace-pre-wrap">{officeText.prayerEnglish}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Raw Data Section */}
          <Card className="mt-8 border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Raw Data</CardTitle>
              <CardDescription>Technical details for debugging</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-50 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(officeText, null, 2)}
              </pre>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Reload Data
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
};

export default OfficeLibTest;
