#!/usr/bin/env node

/**
 * Markdown to WordPress Block Editor HTML Converter
 * 
 * This script converts markdown files to WordPress block editor HTML format.
 * Usage: node md-to-wp.js <input-markdown-file> <output-html-file>
 */

import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { JSDOM } from 'jsdom';

// Always use JSDOM since we've imported it
const useJsdom = true;

// Check command line arguments
if (process.argv.length < 4) {
  console.log('Usage: node md-to-wp.js <input-markdown-file> <output-html-file>');
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];

// Read the markdown file
try {
  const markdown = fs.readFileSync(inputFile, 'utf8');
  
  // Convert markdown to HTML
  const html = marked(markdown);
  
  // Transform HTML to WordPress block editor format
  const wpHtml = useJsdom 
    ? transformWithJsdom(html) 
    : transformWithRegex(html);
  
  // Write the result to the output file
  fs.writeFileSync(outputFile, wpHtml);
  
  console.log(`Successfully converted ${inputFile} to WordPress block editor format at ${outputFile}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

/**
 * Transform HTML to WordPress block editor format using JSDOM
 * This is the preferred method as it properly handles HTML parsing
 */
function transformWithJsdom(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const elements = document.body.children;
  
  let wpHtml = '';
  
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    wpHtml += convertElementToWpBlock(element);
  }
  
  return wpHtml;
}

/**
 * Convert an HTML element to a WordPress block
 */
function convertElementToWpBlock(element) {
  const tagName = element.tagName.toLowerCase();
  
  switch (tagName) {
    case 'p':
      return `<!-- wp:paragraph -->\n<p>${element.innerHTML}</p>\n<!-- /wp:paragraph -->\n\n`;
      
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      // Get original level and increase by 1 (make one level deeper)
      const originalLevel = parseInt(tagName.charAt(1));
      // Cap at h6 (don't try to create h7)
      const newLevel = Math.min(originalLevel + 1, 6);
      const newTag = `h${newLevel}`;
      
      return `<!-- wp:heading {"level":${newLevel}} -->\n<${newTag}>${element.innerHTML}</${newTag}>\n<!-- /wp:heading -->\n\n`;
      
    case 'ul':
      return `<!-- wp:list -->\n${element.outerHTML}\n<!-- /wp:list -->\n\n`;
      
    case 'ol':
      return `<!-- wp:list {"ordered":true} -->\n${element.outerHTML}\n<!-- /wp:list -->\n\n`;
      
    case 'pre':
      // Handle code blocks
      const code = element.querySelector('code');
      const language = code && code.className ? code.className.replace('language-', '') : '';
      const codeContent = code ? code.innerHTML : element.innerHTML;
      
      return `<!-- wp:code ${language ? `{"language":"${language}"}` : ''} -->\n<pre class="wp-block-code">${language ? `<code class="language-${language}">` : '<code>'}${codeContent}${language ? '</code>' : '</code>'}</pre>\n<!-- /wp:code -->\n\n`;
      
    case 'blockquote':
      return `<!-- wp:quote -->\n${element.outerHTML}\n<!-- /wp:quote -->\n\n`;
      
    case 'hr':
      return `<!-- wp:separator -->\n<hr class="wp-block-separator"/>\n<!-- /wp:separator -->\n\n`;
      
    case 'table':
      return `<!-- wp:table -->\n${element.outerHTML}\n<!-- /wp:table -->\n\n`;
      
    case 'figure':
      const img = element.querySelector('img');
      if (img) {
        const src = img.getAttribute('src');
        const alt = img.getAttribute('alt') || '';
        const caption = element.querySelector('figcaption');
        const captionText = caption ? caption.innerHTML : '';
        
        return `<!-- wp:image -->\n<figure class="wp-block-image"><img src="${src}" alt="${alt}"/>${captionText ? `<figcaption>${captionText}</figcaption>` : ''}</figure>\n<!-- /wp:image -->\n\n`;
      }
      return `<!-- wp:html -->\n${element.outerHTML}\n<!-- /wp:html -->\n\n`;
      
    default:
      // For any other elements, wrap them in a HTML block
      return `<!-- wp:html -->\n${element.outerHTML}\n<!-- /wp:html -->\n\n`;
  }
}

/**
 * Transform HTML to WordPress block editor format using regex
 * This is a fallback method if JSDOM is not available
 */
function transformWithRegex(html) {
  let wpHtml = '';
  
  // Split HTML by block-level elements
  const blocks = html.split(/<\/(p|h[1-6]|ul|ol|pre|blockquote|hr|table|figure)>\s*/).filter(Boolean);
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    
    // Skip empty blocks
    if (!block.trim()) continue;
    
    // Determine block type and convert to WordPress block
    if (block.match(/<p[^>]*>/)) {
      const content = block.replace(/<p[^>]*>/, '');
      wpHtml += `<!-- wp:paragraph -->\n<p>${content}</p>\n<!-- /wp:paragraph -->\n\n`;
    }
    else if (block.match(/<h([1-6])[^>]*>/)) {
      const originalLevel = parseInt(block.match(/<h([1-6])[^>]*>/)[1]);
      // Cap at h6 (don't try to create h7)
      const newLevel = Math.min(originalLevel + 1, 6);
      const content = block.replace(/<h[1-6][^>]*>/, '');
      wpHtml += `<!-- wp:heading {"level":${newLevel}} -->\n<h${newLevel}>${content}</h${newLevel}>\n<!-- /wp:heading -->\n\n`;
    }
    else if (block.match(/<ul[^>]*>/)) {
      const content = block + '</ul>';
      wpHtml += `<!-- wp:list -->\n${content}\n<!-- /wp:list -->\n\n`;
    }
    else if (block.match(/<ol[^>]*>/)) {
      const content = block + '</ol>';
      wpHtml += `<!-- wp:list {"ordered":true} -->\n${content}\n<!-- /wp:list -->\n\n`;
    }
    else if (block.match(/<pre[^>]*>/)) {
      const content = block + '</pre>';
      // Check if it's a code block with language
      const languageMatch = content.match(/class="language-([^"]+)"/);
      const language = languageMatch ? languageMatch[1] : '';
      
      wpHtml += `<!-- wp:code ${language ? `{"language":"${language}"}` : ''} -->\n${content}\n<!-- /wp:code -->\n\n`;
    }
    else if (block.match(/<blockquote[^>]*>/)) {
      const content = block + '</blockquote>';
      wpHtml += `<!-- wp:quote -->\n${content}\n<!-- /wp:quote -->\n\n`;
    }
    else if (block.match(/<hr[^>]*>/)) {
      wpHtml += `<!-- wp:separator -->\n<hr class="wp-block-separator"/>\n<!-- /wp:separator -->\n\n`;
    }
    else if (block.match(/<table[^>]*>/)) {
      const content = block + '</table>';
      wpHtml += `<!-- wp:table -->\n${content}\n<!-- /wp:table -->\n\n`;
    }
    else if (block.match(/<figure[^>]*>/)) {
      const content = block + '</figure>';
      wpHtml += `<!-- wp:image -->\n${content}\n<!-- /wp:image -->\n\n`;
    }
    else {
      // For any other elements, wrap them in a HTML block
      wpHtml += `<!-- wp:html -->\n${block}\n<!-- /wp:html -->\n\n`;
    }
  }
  
  return wpHtml;
}
