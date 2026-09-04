#!/usr/bin/env python3
"""
Test script to process just a few chapters first
"""

import json
from catena_scraper import CatenaAureaScraper

def test_processing():
    scraper = CatenaAureaScraper()
    
    # Load existing URLs
    with open('chapter_urls.json', 'r') as f:
        all_urls = json.load(f)
    
    # Test with just the first 2 chapters of Matthew
    test_urls = {
        'matthew': all_urls['matthew'][:2]
    }
    
    print("Testing with first 2 chapters of Matthew...")
    scraper.process_all_chapters(test_urls)
    
    # Generate test graph
    graph_data = scraper.generate_obsidian_json()
    
    with open('test_graph.json', 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, indent=2, ensure_ascii=False)
    
    print(f"Test complete! Generated:")
    print(f"- {len(graph_data['nodes'])} nodes")
    print(f"- {len(graph_data['edges'])} edges")
    print(f"- Node types: {', '.join(graph_data['metadata']['node_types'])}")
    print(f"- Edge types: {', '.join(graph_data['metadata']['edge_types'])}")

if __name__ == "__main__":
    test_processing()