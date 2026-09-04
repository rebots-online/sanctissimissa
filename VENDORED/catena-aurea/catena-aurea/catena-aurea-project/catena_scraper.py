#!/usr/bin/env python3
"""
Catena Aurea Scraper and Knowledge Graph Generator
Scrapes Thomas Aquinas' Catena Aurea from ecatholic2000.com,
converts to Markdown, and creates a knowledge graph for Obsidian.
"""

import requests
from bs4 import BeautifulSoup
import re
import json
import os
from urllib.parse import urljoin, urlparse
import time
import html2text
from typing import Dict, List, Set, Tuple

class CatenaAureaScraper:
    def __init__(self, base_url="https://www.ecatholic2000.com/catena/"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.html_converter = html2text.HTML2Text()
        self.html_converter.ignore_links = False
        self.html_converter.ignore_images = True
        
        # Knowledge graph data
        self.nodes = {}
        self.edges = []
        
    def get_chapter_urls(self) -> Dict[str, List[str]]:
        """Extract all chapter URLs from the main page."""
        print("Fetching main page...")
        response = self.session.get(self.base_url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        chapter_urls = {
            'matthew': [],
            'mark': [],
            'luke': [],
            'john': []
        }
        
        # Find all links that contain chapter references
        links = soup.find_all('a', href=True)
        
        for link in links:
            href = link.get('href')
            text = link.get_text().strip().upper()
            
            if href and ('CHAP' in text or 'CHAPTER' in text):
                full_url = urljoin(self.base_url, href)
                
                if 'MATTHEW' in text:
                    chapter_urls['matthew'].append(full_url)
                elif 'MARK' in text:
                    chapter_urls['mark'].append(full_url)
                elif 'LUKE' in text:
                    chapter_urls['luke'].append(full_url)
                elif 'JOHN' in text:
                    chapter_urls['john'].append(full_url)
        
        # Sort chapter URLs by chapter number
        for gospel in chapter_urls:
            chapter_urls[gospel].sort(key=lambda x: self._extract_chapter_number(x))
        
        return chapter_urls
    
    def _extract_chapter_number(self, url: str) -> int:
        """Extract chapter number from URL for sorting."""
        match = re.search(r'(\d+)', url.split('/')[-1])
        return int(match.group(1)) if match else 0
    
    def download_chapter(self, url: str) -> Tuple[str, str]:
        """Download and parse a single chapter page."""
        print(f"Downloading: {url}")
        
        try:
            response = self.session.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract the main content - this may need adjustment based on the actual HTML structure
            content_div = soup.find('div', {'id': 'content'}) or soup.find('main') or soup.body
            
            if content_div:
                # Convert to markdown
                html_content = str(content_div)
                markdown_content = self.html_converter.handle(html_content)
                
                # Clean up the markdown
                markdown_content = self._clean_markdown(markdown_content)
                
                return markdown_content, soup.get_text()
            else:
                return "", ""
                
        except Exception as e:
            print(f"Error downloading {url}: {e}")
            return "", ""
    
    def _clean_markdown(self, content: str) -> str:
        """Clean and format markdown content."""
        # Remove excessive whitespace
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = re.sub(r'[ \t]+', ' ', content)
        
        # Clean up common formatting issues
        content = content.replace('**  **', '')
        content = content.replace('_  _', '')
        
        return content.strip()
    
    def extract_entities_and_relationships(self, markdown_content: str, chapter_info: Dict) -> None:
        """Extract entities and relationships from chapter content."""
        gospel = chapter_info['gospel']
        chapter_num = chapter_info['chapter']
        
        # Create Gospel node
        gospel_id = f"gospel_{gospel}"
        if gospel_id not in self.nodes:
            self.nodes[gospel_id] = {
                'id': gospel_id,
                'type': 'Gospel',
                'name': gospel.title(),
                'properties': {}
            }
        
        # Create Chapter node
        chapter_id = f"chapter_{gospel}_{chapter_num}"
        if chapter_id not in self.nodes:
            self.nodes[chapter_id] = {
                'id': chapter_id,
                'type': 'Chapter',
                'name': f"{gospel.title()} Chapter {chapter_num}",
                'properties': {'gospel': gospel, 'chapter_number': chapter_num}
            }
            
            # Add edge: Gospel -> Chapter
            self.edges.append({
                'source': gospel_id,
                'target': chapter_id,
                'type': 'Chapters'
            })
        
        # Extract verses and patristic sources
        self._extract_verses_and_sources(markdown_content, chapter_id, gospel, chapter_num)
    
    def _extract_verses_and_sources(self, content: str, chapter_id: str, gospel: str, chapter_num: int):
        """Extract Gospel verses and patristic sources from content."""
        lines = content.split('\n')
        current_verse = None
        current_source = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Look for verse numbers (e.g., "1.", "2-3.", "4-5.")
            verse_match = re.match(r'^(\d+(?:-\d+)?)\.\s*(.+)', line)
            if verse_match:
                verse_range = verse_match.group(1)
                verse_text = verse_match.group(2)
                
                verse_id = f"verse_{gospel}_{chapter_num}_{verse_range}"
                if verse_id not in self.nodes:
                    self.nodes[verse_id] = {
                        'id': verse_id,
                        'type': 'Verse',
                        'name': f"{gospel.title()} {chapter_num}:{verse_range}",
                        'properties': {
                            'gospel': gospel,
                            'chapter': chapter_num,
                            'verse_range': verse_range,
                            'text': verse_text[:200] + '...' if len(verse_text) > 200 else verse_text
                        }
                    }
                    
                    # Add edge: Chapter -> Verse
                    self.edges.append({
                        'source': chapter_id,
                        'target': verse_id,
                        'type': 'Verses'
                    })
                
                current_verse = verse_id
            
            # Look for patristic source names (usually in caps or marked somehow)
            elif current_verse and self._is_patristic_source(line):
                source_name = self._extract_source_name(line)
                if source_name:
                    source_id = f"source_{source_name.replace(' ', '_').lower()}"
                    
                    if source_id not in self.nodes:
                        self.nodes[source_id] = {
                            'id': source_id,
                            'type': 'Patristic_Source',
                            'name': source_name,
                            'properties': {}
                        }
                    
                    current_source = source_id
                    
                    # Extract the narrative/commentary
                    narrative = self._extract_narrative(line, source_name)
                    if narrative:
                        narrative_id = f"narrative_{current_verse}_{source_id}"
                        
                        self.nodes[narrative_id] = {
                            'id': narrative_id,
                            'type': 'Patristic_Narrative',
                            'name': f"Commentary by {source_name}",
                            'properties': {
                                'source': source_name,
                                'text': narrative[:500] + '...' if len(narrative) > 500 else narrative
                            }
                        }
                        
                        # Add edges
                        self.edges.append({
                            'source': source_id,
                            'target': narrative_id,
                            'type': 'Who_Wrote'
                        })
                        
                        self.edges.append({
                            'source': current_verse,
                            'target': narrative_id,
                            'type': 'Commentary'
                        })
    
    def _is_patristic_source(self, line: str) -> bool:
        """Determine if a line contains a patristic source name."""
        # Common patristic source indicators
        indicators = [
            'AUGUSTINE', 'CHRYSOSTOM', 'JEROME', 'AMBROSE', 'ORIGEN',
            'GREGORY', 'THOMAS', 'AQUINAS', 'BERNARD', 'ANSELM',
            'BEDE', 'DAMASCENE', 'BASIL', 'CYRIL', 'ATHANASIUS'
        ]
        
        line_upper = line.upper()
        return any(indicator in line_upper for indicator in indicators)
    
    def _extract_source_name(self, line: str) -> str:
        """Extract the source name from a line."""
        # This is a simplified extraction - may need refinement based on actual content
        match = re.search(r'([A-Z][A-Za-z\s]+?)[:.]', line)
        if match:
            return match.group(1).strip()
        return ""
    
    def _extract_narrative(self, line: str, source_name: str) -> str:
        """Extract the narrative/commentary text."""
        # Remove the source name and return the rest
        pattern = re.escape(source_name) + r'[:.]?\s*'
        narrative = re.sub(pattern, '', line, flags=re.IGNORECASE)
        return narrative.strip()
    
    def process_all_chapters(self, chapter_urls: Dict[str, List[str]]) -> None:
        """Process all chapters, convert to markdown, and build knowledge graph."""
        os.makedirs('markdown_chapters', exist_ok=True)
        
        total_chapters = sum(len(urls) for urls in chapter_urls.values())
        current = 0
        
        for gospel, urls in chapter_urls.items():
            gospel_dir = os.path.join('markdown_chapters', gospel)
            os.makedirs(gospel_dir, exist_ok=True)
            
            for i, url in enumerate(urls, 1):
                current += 1
                print(f"Processing {current}/{total_chapters}: {gospel.title()} Chapter {i}")
                
                # Download and convert to markdown
                markdown_content, raw_text = self.download_chapter(url)
                
                if markdown_content:
                    # Save markdown file
                    filename = f"{gospel}_chapter_{i:02d}.md"
                    filepath = os.path.join(gospel_dir, filename)
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(f"# {gospel.title()} Chapter {i}\n\n")
                        f.write(markdown_content)
                    
                    # Extract entities and relationships
                    chapter_info = {
                        'gospel': gospel,
                        'chapter': i,
                        'url': url
                    }
                    self.extract_entities_and_relationships(raw_text, chapter_info)
                
                # Be respectful to the server
                time.sleep(1)
    
    def generate_obsidian_json(self) -> Dict:
        """Generate JSON structure compatible with Obsidian."""
        graph_data = {
            'nodes': list(self.nodes.values()),
            'edges': self.edges,
            'metadata': {
                'title': 'Catena Aurea Knowledge Graph',
                'description': 'Thomas Aquinas\' Catena Aurea - Gospel commentary with patristic sources',
                'total_nodes': len(self.nodes),
                'total_edges': len(self.edges),
                'node_types': list(set(node['type'] for node in self.nodes.values())),
                'edge_types': list(set(edge['type'] for edge in self.edges))
            }
        }
        return graph_data
    
    def _extract_verses_and_sources(self, content: str, chapter_id: str, gospel: str, chapter_num: int):
        """Extract Gospel verses and patristic sources from content."""
        # Split into lines and process
        lines = content.split('\n')
        current_verse = None
        
        # Look for verse markers in the format "Ver. 1." or just numbers with periods
        verse_pattern = re.compile(r'^(?:Ver\.\s*)?(\d+(?:-\d+)?)\.\s*(.+)', re.IGNORECASE)
        
        # Common patristic authors to look for
        patristic_authors = [
            'AUGUSTINE', 'CHRYSOSTOM', 'JEROME', 'AMBROSE', 'ORIGEN',
            'GREGORY', 'THOMAS', 'AQUINAS', 'BERNARD', 'ANSELM',
            'BEDE', 'DAMASCENE', 'BASIL', 'CYRIL', 'ATHANASIUS',
            'HILARY', 'RABANUS', 'REMIGIUS', 'GLOSS', 'LEO',
            'ISIDORE', 'PSEUDO-CHRYSOSTOM', 'PSEUDO-AUGUSTINE'
        ]
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for verse markers
            verse_match = verse_pattern.match(line)
            if verse_match:
                verse_range = verse_match.group(1)
                verse_text = verse_match.group(2)
                
                verse_id = f"verse_{gospel}_{chapter_num}_{verse_range}"
                if verse_id not in self.nodes:
                    self.nodes[verse_id] = {
                        'id': verse_id,
                        'type': 'Gospel_Verse',
                        'name': f"{gospel.title()} {chapter_num}:{verse_range}",
                        'properties': {
                            'gospel': gospel,
                            'chapter': chapter_num,
                            'verse_range': verse_range,
                            'text': verse_text[:300] + '...' if len(verse_text) > 300 else verse_text
                        }
                    }
                    
                    # Add edge: Chapter -> Verse
                    self.edges.append({
                        'source': chapter_id,
                        'target': verse_id,
                        'type': 'Verses'
                    })
                
                current_verse = verse_id
                continue
            
            # Look for patristic sources
            if current_verse:
                for author in patristic_authors:
                    if author in line.upper():
                        # Extract the author and commentary
                        author_match = re.search(rf'\b{re.escape(author)}\b\.?\s*(?:\([^)]+\)\.?)?\s*(.+)', line, re.IGNORECASE)
                        if author_match:
                            commentary = author_match.group(1).strip()
                            
                            # Create source node
                            source_id = f"source_{author.lower()}"
                            if source_id not in self.nodes:
                                self.nodes[source_id] = {
                                    'id': source_id,
                                    'type': 'Patristic_Source',
                                    'name': author.title(),
                                    'properties': {}
                                }
                            
                            # Create narrative node
                            narrative_id = f"narrative_{current_verse}_{source_id}_{len(self.nodes)}"
                            self.nodes[narrative_id] = {
                                'id': narrative_id,
                                'type': 'Patristic_Narrative',
                                'name': f"Commentary by {author.title()}",
                                'properties': {
                                    'source': author.title(),
                                    'verse_reference': current_verse,
                                    'text': commentary[:500] + '...' if len(commentary) > 500 else commentary
                                }
                            }
                            
                            # Add edges
                            self.edges.append({
                                'source': source_id,
                                'target': narrative_id,
                                'type': 'Who_Wrote'
                            })
                            
                            self.edges.append({
                                'source': current_verse,
                                'target': narrative_id,
                                'type': 'Commentary'
                            })
                        break

def main():
    scraper = CatenaAureaScraper()
    
    print("Starting Catena Aurea extraction...")
    
    # Step 1: Get all chapter URLs
    chapter_urls = scraper.get_chapter_urls()
    
    print(f"Found chapters:")
    for gospel, urls in chapter_urls.items():
        print(f"  {gospel.title()}: {len(urls)} chapters")
    
    # Save URLs for reference
    with open('chapter_urls.json', 'w') as f:
        json.dump(chapter_urls, f, indent=2)
    
    print("Chapter URLs saved to chapter_urls.json")
    
    # Step 2: Process all chapters
    print("\nProcessing all chapters...")
    scraper.process_all_chapters(chapter_urls)
    
    # Step 3: Generate Obsidian JSON
    print("\nGenerating knowledge graph...")
    graph_data = scraper.generate_obsidian_json()
    
    # Save the knowledge graph
    with open('catena_aurea_graph.json', 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nComplete! Generated:")
    print(f"- {len(graph_data['nodes'])} nodes")
    print(f"- {len(graph_data['edges'])} edges")
    print(f"- Node types: {', '.join(graph_data['metadata']['node_types'])}")
    print(f"- Edge types: {', '.join(graph_data['metadata']['edge_types'])}")
    print(f"\nFiles created:")
    print(f"- Markdown files in 'markdown_chapters/' directory")
    print(f"- Knowledge graph: 'catena_aurea_graph.json'")
    
    return graph_data

if __name__ == "__main__":
    main()