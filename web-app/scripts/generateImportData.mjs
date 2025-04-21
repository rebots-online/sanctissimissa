#!/usr/bin/env node

/**
 * Generate Import Data Script
 * 
 * This script processes all liturgical texts from the reference directory
 * and generates JSON files that will be bundled with the application.
 * These files will be used to populate the IndexedDB database on first run.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const REFERENCE_PATH = path.resolve(__dirname, '../../reference/web/www');
const OUTPUT_PATH = path.resolve(__dirname, '../public/data');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_PATH)) {
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });
}

/**
 * Process Mass Propers
 */
async function processMassPropers() {
  console.log('Processing Mass Propers...');
  
  const massPropers = [];
  const basePath = path.join(REFERENCE_PATH, 'missa/English');
  
  // Process each category (Sancti, Tempora, Commune)
  const categories = ['Sancti', 'Tempora', 'Commune'];
  
  for (const category of categories) {
    const categoryPath = path.join(basePath, category);
    if (!fs.existsSync(categoryPath)) {
      console.log(`  Category ${category} not found, skipping`);
      continue;
    }
    
    console.log(`  Processing category: ${category}`);
    
    // Get all directories in this category
    const dayDirs = fs.readdirSync(categoryPath)
      .filter(file => fs.statSync(path.join(categoryPath, file)).isDirectory());
    
    for (const dayDir of dayDirs) {
      const dayPath = path.join(categoryPath, dayDir);
      
      // Skip if not a proper directory with at least an Introitus file
      if (!fs.existsSync(path.join(dayPath, 'Introitus.txt'))) {
        continue;
      }
      
      try {
        // Read all parts of the Mass proper
        const introitus = fs.existsSync(path.join(dayPath, 'Introitus.txt')) 
          ? fs.readFileSync(path.join(dayPath, 'Introitus.txt'), 'utf8') : '';
        const oratio = fs.existsSync(path.join(dayPath, 'Oratio.txt')) 
          ? fs.readFileSync(path.join(dayPath, 'Oratio.txt'), 'utf8') : '';
        const lectio = fs.existsSync(path.join(dayPath, 'Lectio.txt')) 
          ? fs.readFileSync(path.join(dayPath, 'Lectio.txt'), 'utf8') : '';
        const graduale = fs.existsSync(path.join(dayPath, 'Graduale.txt')) 
          ? fs.readFileSync(path.join(dayPath, 'Graduale.txt'), 'utf8') : '';
        const evangelium = fs.existsSync(path.join(dayPath, 'Evangelium.txt')) 
          ? fs.readFileSync(path.join(dayPath, 'Evangelium.txt'), 'utf8') : '';
        const offertorium = fs.existsSync(path.join(dayPath, 'Offertorium.txt')) 
          ? fs.readFileSync(path.join(dayPath, 'Offertorium.txt'), 'utf8') : '';
        const secreta = fs.existsSync(path.join(dayPath, 'Secreta.txt')) 
          ? fs.readFileSync(path.join(dayPath, 'Secreta.txt'), 'utf8') : '';
        const communio = fs.existsSync(path.join(dayPath, 'Communio.txt')) 
          ? fs.readFileSync(path.join(dayPath, 'Communio.txt'), 'utf8') : '';
        const postcommunio = fs.existsSync(path.join(dayPath, 'Postcommunio.txt')) 
          ? fs.readFileSync(path.join(dayPath, 'Postcommunio.txt'), 'utf8') : '';
        
        // Parse title from Introitus or use directory name
        const titleMatch = introitus.match(/^#(.+?)$/m);
        const title = titleMatch ? titleMatch[1].trim() : dayDir.replace(/-/g, ' ');
        
        // Create proper object
        const proper = {
          id: `proper_${category.toLowerCase()}_${dayDir.toLowerCase()}`,
          date: new Date().toISOString(),
          part: 'proper',
          category: category.toLowerCase(),
          day: dayDir,
          title: {
            latin: title,
            english: title
          },
          introit: parseSection(introitus),
          collect: parseSection(oratio),
          epistle: parseSection(lectio),
          gradual: parseSection(graduale),
          gospel: parseSection(evangelium),
          offertory: parseSection(offertorium),
          secret: parseSection(secreta),
          communion: parseSection(communio),
          postcommunion: parseSection(postcommunio)
        };
        
        // Add sequence if it exists
        if (fs.existsSync(path.join(dayPath, 'Sequentia.txt'))) {
          const sequentia = fs.readFileSync(path.join(dayPath, 'Sequentia.txt'), 'utf8');
          proper.sequence = parseSection(sequentia);
        }
        
        // Add to propers array
        massPropers.push(proper);
        
        // Log progress periodically
        if (massPropers.length % 50 === 0) {
          console.log(`  Processed ${massPropers.length} Mass propers so far...`);
        }
      } catch (error) {
        console.error(`  Error processing Mass proper for ${category}/${dayDir}:`, error);
      }
    }
  }
  
  // Add Easter Sunday proper if not already present
  const easterExists = massPropers.some(proper => 
    proper.day === '04-20' || proper.title.english.includes('Easter Sunday'));
  
  if (!easterExists) {
    massPropers.push({
      id: 'proper_tempora_easter_sunday',
      date: new Date().toISOString(),
      part: 'proper',
      category: 'tempora',
      day: 'Pasc0-0',
      title: {
        latin: 'Dominica Resurrectionis',
        english: 'Easter Sunday'
      },
      introit: {
        latin: 'Resurrexi, et adhuc tecum sum, allelúja: posuísti super me manum tuam, allelúja: mirábilis facta est sciéntia tua, allelúja, allelúja.',
        english: 'I arose, and am still with Thee, alleluia; Thou hast laid Thy hand upon me, alleluia; Thy knowledge is become wonderful, alleluia, alleluia.',
        reference: 'Ps 138:18; 138:5-6'
      },
      collect: {
        latin: 'Deus, qui hodiérna die per Unigénitum tuum æternitátis nobis áditum, devícta morte, reserásti: vota nostra, quæ præveniéndo aspíras, étiam adjuvándo proséquere.',
        english: 'O God, who, on this day, through Thine only-begotten Son, hast conquered death, and thrown open to us the gate of everlasting life, give effect by thine aid to our desires, which Thou dost anticipate and inspire'
      },
      epistle: {
        latin: 'Fratres: Expurgáte vetus ferméntum, ut sitis nova conspérsio, sicut estis ázymi. Etenim Pascha nostrum immolátus est Christus. Itaque epulémur: non in ferménto véteri, neque in ferménto malítiæ et nequítiæ: sed in ázymis sinceritátis et veritátis.',
        english: 'Brethren, purge out the old leaven, that you may be a new paste, as you are unleavened: for Christ our Pasch is sacrificed. Therefore let us feast, not with the old leaven, nor with the leaven of malice and wickedness, but with the unleavened bread of sincerity and truth.',
        reference: '1 Cor 5:7-8'
      },
      gradual: {
        latin: 'Allelúja, allelúja. Hæc dies, quam fecit Dóminus: exsultémus et lætémur in ea.',
        english: 'Alleluia, alleluia. This is the day which the Lord hath made: let us rejoice and be glad in it.'
      },
      gospel: {
        latin: 'In illo témpore: María Magdaléne et María Jacóbi et Salóme emérunt arómata, ut veniéntes úngerent Jesum. Et valde mane una sabbatórum, véniunt ad monuméntum, orto jam sole. Et dicébant ad ínvicem: Quis revólvet nobis lápidem ab óstio monuménti? Et respiciéntes vidérunt revolútum lápidem. Erat quippe magnus valde. Et introëúntes in monuméntum vidérunt júvenem sedéntem in dextris, coopértum stola cándida, et obstupuérunt. Qui dicit illis: Nolíte expavéscere: Jesum quǽritis Nazarénum, crucifíxum: surréxit, non est hic, ecce locus, ubi posuérunt eum. Sed ite, dícite discípulis ejus et Petro, quia præcédit vos in Galilǽam: ibi eum vidébitis, sicut dixit vobis.',
        english: 'At that time, Mary Magdalen, and Mary the mother of James, and Salome bought sweet spices, that coming they might anoint Jesus. And very early in the morning, the first day of the week, they came to the sepulchre, the sun being now risen. And they said one to another: Who shall roll us back the stone from the door of the sepulchre? And looking, they saw the stone rolled back. For it was very great. And entering into the sepulchre, they saw a young man sitting on the right side, clothed with a white robe, and they were astonished. Who saith to them, Be not affrighted; ye seek Jesus of Nazareth, who was crucified: He is risen, He is not here; behold the place where they laid Him. But go, tell His disciples, and Peter, that He goeth before you into Galilee; there you shall see Him, as He told you.',
        reference: 'Marc 16:1-7'
      },
      offertory: {
        latin: 'Terra trémuit, et quiévit, dum resúrgeret in judício Deus, allelúja.',
        english: 'The earth trembled and was still when God arose in judgment, alleluia.',
        reference: 'Ps. 75:9-10'
      },
      secret: {
        latin: 'Súscipe, quǽsumus, Dómine, preces pópuli tui cum oblatiónibus hostiárum: ut, Paschálibus initiáta mystériis, ad æternitátis nobis medélam, te operánte, profíciant.',
        english: 'We beseech Thee, O Lord, accept the prayers of Thy people together with the Sacrifice they offer, that what has been begun by the Paschal Mysteries, by Thy working may profit us unto eternal healing.'
      },
      communion: {
        latin: 'Pascha nostrum immolátus est Christus, allelúja: itaque epulémur in ázymis sinceritátis et veritátis, allelúja, allelúja, allelúja.',
        english: 'Christ our Pasch is immolated, alleluia: therefore let us feast with the unleavened bread of sincerity and truth, alleluia, alleluia, alleluia.',
        reference: '1 Cor 5:7-8'
      },
      postcommunion: {
        latin: 'Spíritum nobis, Dómine, tuæ caritátis infúnde: ut, quos sacraméntis paschálibus satiásti, tua fácias pietáte concordes.',
        english: 'Pour forth upon us, O Lord, the spirit of Thy love, that, by Thy loving kindness, Thou mayest make to be of one mind those whom Thou hast satisfied with the Paschal Sacraments.'
      }
    });
  }
  
  // Write to file
  fs.writeFileSync(
    path.join(OUTPUT_PATH, 'mass-propers.json'),
    JSON.stringify(massPropers, null, 2)
  );
  
  console.log(`Processed ${massPropers.length} Mass propers`);
  return massPropers;
}

/**
 * Process Mass Ordinary
 */
async function processMassOrdinary() {
  console.log('Processing Mass Ordinary...');
  
  const ordoPath = path.join(REFERENCE_PATH, 'missa/Ordo');
  
  try {
    // Read all parts of the Mass ordinary
    const kyrie = fs.existsSync(path.join(ordoPath, 'Kyrie.txt')) 
      ? fs.readFileSync(path.join(ordoPath, 'Kyrie.txt'), 'utf8') : '';
    const gloria = fs.existsSync(path.join(ordoPath, 'Gloria.txt')) 
      ? fs.readFileSync(path.join(ordoPath, 'Gloria.txt'), 'utf8') : '';
    const credo = fs.existsSync(path.join(ordoPath, 'Credo.txt')) 
      ? fs.readFileSync(path.join(ordoPath, 'Credo.txt'), 'utf8') : '';
    const sanctus = fs.existsSync(path.join(ordoPath, 'Sanctus.txt')) 
      ? fs.readFileSync(path.join(ordoPath, 'Sanctus.txt'), 'utf8') : '';
    const agnus = fs.existsSync(path.join(ordoPath, 'Agnus.txt')) 
      ? fs.readFileSync(path.join(ordoPath, 'Agnus.txt'), 'utf8') : '';
    const ite = fs.existsSync(path.join(ordoPath, 'Ite.txt')) 
      ? fs.readFileSync(path.join(ordoPath, 'Ite.txt'), 'utf8') : '';
    
    // Create ordinary object
    const ordinary = {
      id: 'ordinary_default',
      date: new Date().toISOString(),
      part: 'ordinary',
      kyrie: parseSection(kyrie),
      gloria: parseSection(gloria),
      credo: parseSection(credo),
      sanctus: parseSection(sanctus),
      agnus: parseSection(agnus),
      ite: parseSection(ite)
    };
    
    // Write to file
    fs.writeFileSync(
      path.join(OUTPUT_PATH, 'mass-ordinary.json'),
      JSON.stringify(ordinary, null, 2)
    );
    
    console.log('Processed Mass ordinary');
    return ordinary;
  } catch (error) {
    console.error('Error processing Mass ordinary:', error);
    return null;
  }
}

/**
 * Process Office Texts
 */
async function processOfficeTexts() {
  console.log('Processing Office Texts...');
  
  const officeTexts = [];
  const basePath = path.join(REFERENCE_PATH, 'horas/English');
  
  // Define canonical hours
  const canonicalHours = [
    'Matutinum',
    'Laudes',
    'Prima',
    'Tertia',
    'Sexta',
    'Nona',
    'Vespera',
    'Completorium'
  ];
  
  // Process each category (Sancti, Tempora, Commune)
  const categories = ['Sancti', 'Tempora', 'Commune'];
  
  for (const category of categories) {
    const categoryPath = path.join(basePath, category);
    if (!fs.existsSync(categoryPath)) {
      console.log(`  Category ${category} not found, skipping`);
      continue;
    }
    
    console.log(`  Processing category: ${category}`);
    
    // Get all directories in this category
    const dayDirs = fs.readdirSync(categoryPath)
      .filter(file => fs.statSync(path.join(categoryPath, file)).isDirectory());
    
    for (const dayDir of dayDirs) {
      const dayPath = path.join(categoryPath, dayDir);
      
      // Process each canonical hour
      for (const hour of canonicalHours) {
        const hourPath = path.join(dayPath, hour);
        
        // Skip if hour directory doesn't exist
        if (!fs.existsSync(hourPath)) {
          continue;
        }
        
        try {
          // Get all text files in the hour directory
          const files = fs.readdirSync(hourPath)
            .filter(file => file.endsWith('.txt'));
          
          if (files.length === 0) {
            continue;
          }
          
          // Create basic hour object
          const officeHour = {
            id: `${category.toLowerCase()}_${dayDir.toLowerCase()}_${hour.toLowerCase()}`,
            date: new Date().toISOString(),
            category: category.toLowerCase(),
            day: dayDir,
            hour: hour.toLowerCase(),
            title: {
              latin: hour,
              english: getEnglishHourName(hour)
            },
            psalms: [],
            readings: []
          };
          
          // Process each file
          for (const file of files) {
            const filePath = path.join(hourPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Determine the type of content based on filename
            if (file.startsWith('Hymnus')) {
              officeHour.hymn = parseSection(content);
            } else if (file.startsWith('Capitulum')) {
              officeHour.chapter = parseSection(content);
            } else if (file.startsWith('Psalmus')) {
              const psalmNumber = file.replace('Psalmus', '').replace('.txt', '');
              officeHour.psalms.push({
                number: psalmNumber,
                title: {
                  latin: `Psalmus ${psalmNumber}`,
                  english: `Psalm ${psalmNumber}`
                },
                text: parseSection(content)
              });
            } else if (file.startsWith('Lectio')) {
              const readingNumber = file.replace('Lectio', '').replace('.txt', '');
              officeHour.readings.push({
                number: readingNumber,
                text: parseSection(content)
              });
            } else if (file.startsWith('Oratio')) {
              officeHour.prayer = parseSection(content);
            } else if (file.startsWith('Ant')) {
              // Handle antiphons
              if (!officeHour.antiphons) {
                officeHour.antiphons = [];
              }
              const antiphonNumber = file.replace('Ant', '').replace('.txt', '');
              officeHour.antiphons.push({
                number: antiphonNumber,
                text: parseSection(content)
              });
            } else if (file.startsWith('Benedictio')) {
              // Handle benedictions
              if (!officeHour.benedictions) {
                officeHour.benedictions = [];
              }
              const benedictionNumber = file.replace('Benedictio', '').replace('.txt', '');
              officeHour.benedictions.push({
                number: benedictionNumber,
                text: parseSection(content)
              });
            } else if (file.startsWith('Responsory')) {
              // Handle responsories
              if (!officeHour.responsories) {
                officeHour.responsories = [];
              }
              const responsoryNumber = file.replace('Responsory', '').replace('.txt', '');
              officeHour.responsories.push({
                number: responsoryNumber,
                text: parseSection(content)
              });
            }
          }
          
          // Only add if we have content
          if (officeHour.psalms.length > 0 || officeHour.readings.length > 0) {
            officeTexts.push(officeHour);
            
            // Log progress periodically
            if (officeTexts.length % 50 === 0) {
              console.log(`  Processed ${officeTexts.length} Office hours so far...`);
            }
          }
        } catch (error) {
          console.error(`  Error processing ${hour} for ${category}/${dayDir}:`, error);
        }
      }
    }
  }
  
  // Add Easter Sunday hours if not already present
  const easterExists = officeTexts.some(hour => 
    (hour.day === '04-20' || hour.day === 'Pasc0-0') && hour.hour === 'matutinum');
  
  if (!easterExists) {
    // Add all canonical hours for Easter Sunday
    for (const hour of canonicalHours) {
      const hourLower = hour.toLowerCase();
      const hourEnglish = getEnglishHourName(hour);
      
      officeTexts.push({
        id: `tempora_pasc0-0_${hourLower}`,
        date: new Date().toISOString(),
        category: 'tempora',
        day: 'Pasc0-0',
        hour: hourLower,
        title: {
          latin: hour,
          english: hourEnglish
        },
        hymn: {
          latin: `Placeholder Latin hymn for Easter Sunday ${hourEnglish}`,
          english: `Placeholder English hymn for Easter Sunday ${hourEnglish}`
        },
        psalms: [
          {
            number: '1',
            title: {
              latin: 'Psalmus 1',
              english: 'Psalm 1'
            },
            text: {
              latin: 'Beatus vir, qui non abiit in consilio impiorum...',
              english: 'Blessed is the man who walks not in the counsel of the wicked...'
            }
          }
        ],
        readings: [
          {
            number: '1',
            text: {
              latin: `Placeholder Latin reading for Easter Sunday ${hourEnglish}`,
              english: `Placeholder English reading for Easter Sunday ${hourEnglish}`
            }
          }
        ],
        prayer: {
          latin: 'Deus, qui hodiérna die per Unigénitum tuum æternitátis nobis áditum, devícta morte, reserásti: vota nostra, quæ præveniéndo aspíras, étiam adjuvándo proséquere.',
          english: 'O God, who, on this day, through Thine only-begotten Son, hast conquered death, and thrown open to us the gate of everlasting life, give effect by thine aid to our desires, which Thou dost anticipate and inspire'
        }
      });
    }
  }
  
  // Write to file
  fs.writeFileSync(
    path.join(OUTPUT_PATH, 'office-texts.json'),
    JSON.stringify(officeTexts, null, 2)
  );
  
  console.log(`Processed ${officeTexts.length} Office hours`);
  return officeTexts;
}

/**
 * Process Liturgical Calendar
 */
async function processLiturgicalCalendar() {
  console.log('Processing Liturgical Calendar...');
  
  const tabulaePath = path.join(REFERENCE_PATH, 'Tabulae');
  const liturgicalDays = [];
  
  try {
    // Read Tabulae files
    const files = fs.readdirSync(tabulaePath)
      .filter(file => file.endsWith('.txt'));
    
    for (const file of files) {
      if (file.startsWith('Ordo') || file.includes('Table')) {
        const filePath = path.join(tabulaePath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        console.log(`  Processing calendar file: ${file}`);
        
        // Parse calendar entries
        const lines = content.split('\n');
        
        for (const line of lines) {
          // Skip comments and empty lines
          if (line.trim() === '' || line.startsWith('#')) {
            continue;
          }
          
          // Parse line (format varies, but typically contains date and celebration)
          const parts = line.split('=');
          
          if (parts.length >= 2) {
            const dateStr = parts[0].trim();
            const celebrationStr = parts[1].trim();
            
            // Try to parse date (format may vary)
            let date = '';
            let month = '';
            let day = '';
            
            // Extract month and day
            const dateMatch = dateStr.match(/(\d+)-(\d+)/);
            if (dateMatch) {
              month = dateMatch[1].padStart(2, '0');
              day = dateMatch[2].padStart(2, '0');
              date = `2025-${month}-${day}`;
            } else {
              continue;
            }
            
            // Extract celebration details
            const rankMatch = celebrationStr.match(/;;(\d+)/);
            const rank = rankMatch ? parseInt(rankMatch[1]) : 4;
            
            const colorMatch = celebrationStr.match(/;([^;]+);;/);
            const color = colorMatch ? colorMatch[1].toLowerCase() : 'green';
            
            // Extract class and additional information
            const classParts = celebrationStr.split(';');
            const className = classParts.length > 2 ? classParts[2].trim() : '';
            
            // Create liturgical day object
            const liturgicalDay = {
              date,
              celebration: celebrationStr.split(';')[0].trim(),
              rank,
              color,
              class: className,
              isHolyDay: rank <= 2,
              isFeastDay: rank <= 3,
              commemorations: []
            };
            
            // Determine season based on date
            const dateObj = new Date(date);
            const month_num = dateObj.getMonth() + 1; // 0-indexed
            const day_num = dateObj.getDate();
            
            // More precise season determination
            if (month_num === 12 && day_num >= 25) {
              liturgicalDay.season = 'Christmas';
            } else if (month_num === 12 && day_num >= 3) {
              liturgicalDay.season = 'Advent';
            } else if (month_num === 1 && day_num <= 13) {
              liturgicalDay.season = 'Christmas'; // Christmastide extends to Epiphany
            } else if (date === '2025-04-20') { // Easter Sunday 2025
              liturgicalDay.season = 'Easter';
            } else if (month_num === 4 && day_num >= 20 && day_num <= 30) {
              liturgicalDay.season = 'Easter';
            } else if (month_num === 5 && day_num <= 31) {
              liturgicalDay.season = 'Easter'; // Eastertide extends to Pentecost
            } else if (month_num === 2 && day_num >= 17 || month_num === 3) {
              liturgicalDay.season = 'Lent';
            } else if (month_num === 4 && day_num < 20) {
              liturgicalDay.season = 'Lent'; // Holy Week is part of Lent
            } else {
              liturgicalDay.season = 'Ordinary';
            }
            
            // Add day of week
            const dayOfWeek = dateObj.getDay();
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            liturgicalDay.day = daysOfWeek[dayOfWeek];
            
            // Calculate liturgical week
            // This is a simplified approach
            if (liturgicalDay.season === 'Ordinary') {
              // For Ordinary Time, we could calculate weeks after Epiphany or Pentecost
              const weeksSinceEpiphany = Math.floor((dateObj - new Date('2025-01-06')) / (7 * 24 * 60 * 60 * 1000)) + 1;
              liturgicalDay.week = weeksSinceEpiphany.toString();
            } else if (liturgicalDay.season === 'Advent') {
              // For Advent, calculate weeks before Christmas
              const weeksBeforeChristmas = 4 - Math.floor((new Date('2025-12-25') - dateObj) / (7 * 24 * 60 * 60 * 1000));
              liturgicalDay.week = weeksBeforeChristmas.toString();
            } else if (liturgicalDay.season === 'Lent') {
              // For Lent, calculate weeks after Ash Wednesday
              const weeksSinceAshWednesday = Math.floor((dateObj - new Date('2025-02-17')) / (7 * 24 * 60 * 60 * 1000)) + 1;
              liturgicalDay.week = weeksSinceAshWednesday.toString();
            } else if (liturgicalDay.season === 'Easter') {
              // For Easter, calculate weeks after Easter Sunday
              const weeksSinceEaster = Math.floor((dateObj - new Date('2025-04-20')) / (7 * 24 * 60 * 60 * 1000)) + 1;
              liturgicalDay.week = weeksSinceEaster.toString();
            } else if (liturgicalDay.season === 'Christmas') {
              // For Christmas, calculate weeks after Christmas
              const weeksSinceChristmas = Math.floor((dateObj - new Date('2025-12-25')) / (7 * 24 * 60 * 60 * 1000)) + 1;
              liturgicalDay.week = (weeksSinceChristmas > 0) ? weeksSinceChristmas.toString() : '1';
            } else {
              liturgicalDay.week = '1';
            }
            
            // Add to liturgical days array
            liturgicalDays.push(liturgicalDay);
            
            // Log progress periodically
            if (liturgicalDays.length % 50 === 0) {
              console.log(`  Processed ${liturgicalDays.length} liturgical days so far...`);
            }
          }
        }
      }
    }
    
    // Add major feast days if not already present
    const importantDays = [
      {
        date: '2025-04-20',
        season: 'Easter',
        celebration: 'Easter Sunday',
        rank: 1,
        color: 'white',
        class: 'I',
        isHolyDay: true,
        isFeastDay: true,
        week: '1',
        day: 'Sunday',
        commemorations: []
      },
      {
        date: '2025-12-25',
        season: 'Christmas',
        celebration: 'Nativity of the Lord',
        rank: 1,
        color: 'white',
        class: 'I',
        isHolyDay: true,
        isFeastDay: true,
        week: '1',
        day: 'Thursday',
        commemorations: []
      },
      {
        date: '2025-01-06',
        season: 'Christmas',
        celebration: 'Epiphany of the Lord',
        rank: 1,
        color: 'white',
        class: 'I',
        isHolyDay: true,
        isFeastDay: true,
        week: '1',
        day: 'Monday',
        commemorations: []
      },
      {
        date: '2025-02-17',
        season: 'Lent',
        celebration: 'Ash Wednesday',
        rank: 2,
        color: 'violet',
        class: 'II',
        isHolyDay: true,
        isFeastDay: false,
        week: '1',
        day: 'Monday',
        commemorations: []
      },
      {
        date: '2025-04-18',
        season: 'Lent',
        celebration: 'Good Friday',
        rank: 1,
        color: 'red',
        class: 'I',
        isHolyDay: true,
        isFeastDay: false,
        week: '7',
        day: 'Friday',
        commemorations: []
      },
      {
        date: '2025-06-08',
        season: 'Ordinary',
        celebration: 'Pentecost Sunday',
        rank: 1,
        color: 'red',
        class: 'I',
        isHolyDay: true,
        isFeastDay: true,
        week: '8',
        day: 'Sunday',
        commemorations: []
      }
    ];
    
    // Add important days if not already present
    for (const importantDay of importantDays) {
      const exists = liturgicalDays.some(day => 
        day.date === importantDay.date && day.celebration === importantDay.celebration);
      
      if (!exists) {
        liturgicalDays.push(importantDay);
      }
    }
    
    // Sort by date
    liturgicalDays.sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    
    // Write to file
    fs.writeFileSync(
      path.join(OUTPUT_PATH, 'liturgical-days.json'),
      JSON.stringify(liturgicalDays, null, 2)
    );
    
    console.log(`Processed ${liturgicalDays.length} liturgical days`);
    return liturgicalDays;
  } catch (error) {
    console.error('Error processing liturgical calendar:', error);
    return [];
  }
}

/**
 * Helper function to parse a section of text
 */
function parseSection(text) {
  // Remove comments
  text = text.replace(/#.*$/gm, '').trim();
  
  // Split into Latin and English parts
  const parts = text.split(/\[.*?\]/);
  
  let latin = '';
  let english = '';
  let reference = '';
  
  if (parts.length >= 2) {
    latin = parts[0].trim();
    english = parts[1].trim();
  } else {
    latin = text.trim();
    english = text.trim();
  }
  
  // Extract reference if present
  const refMatch = text.match(/\((.*?)\)/);
  if (refMatch) {
    reference = refMatch[1].trim();
  }
  
  return {
    latin,
    english,
    reference
  };
}

/**
 * Helper function to get English name for canonical hour
 */
function getEnglishHourName(latinName) {
  const hourMap = {
    'Matutinum': 'Matins',
    'Laudes': 'Lauds',
    'Prima': 'Prime',
    'Tertia': 'Terce',
    'Sexta': 'Sext',
    'Nona': 'None',
    'Vespera': 'Vespers',
    'Completorium': 'Compline'
  };
  
  return hourMap[latinName] || latinName;
}

/**
 * Main function
 */
async function main() {
  console.log('Starting data processing...');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
  }
  
  // Process all data
  await processLiturgicalCalendar();
  await processMassPropers();
  await processMassOrdinary();
  await processOfficeTexts();
  
  console.log('Data processing complete!');
  console.log(`JSON files have been created in ${OUTPUT_PATH}`);
}

// Run the main function
main().catch(console.error);
