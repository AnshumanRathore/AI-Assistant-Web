import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingCart, TrendingDown, Star, ExternalLink, Image, Loader2 } from 'lucide-react';

export default function ShoppingAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const searchProduct = async (query) => {
    try {
      const searchQuery = `${query} price comparison buy online`;
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [
            {
              role: "user",
              content: `You are a shopping assistant. Search for "${query}" across e-commerce websites and find the best prices. 

Instructions:
1. Search for the product with price information
2. Look for multiple sellers/websites
3. Compare prices and ratings
4. Return results in this EXACT JSON format with no preamble or markdown:

{
  "summary": "Brief summary of findings",
  "products": [
    {
      "name": "Product name",
      "price": "Price with currency",
      "originalPrice": "Original price if on sale",
      "rating": "Rating out of 5",
      "reviews": "Number of reviews",
      "seller": "Website/seller name",
      "url": "Product URL",
      "imageSearch": "Specific search query for this product images",
      "highlights": ["Feature 1", "Feature 2"]
    }
  ],
  "recommendation": "Your recommendation for best value"
}`
            }
          ],
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search"
            }
          ]
        })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      
      let textContent = '';
      for (const block of data.content) {
        if (block.type === 'text') {
          textContent += block.text;
        }
      }

      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          summary: textContent.substring(0, 500),
          products: [],
          recommendation: "Please try refining your search query."
        };
      }

      const results = JSON.parse(jsonMatch[0]);
      
      if (results.products && results.products.length > 0) {
        for (let product of results.products) {
          if (product.imageSearch) {
            await searchProductImages(product);
          }
        }
      }
      
      return results;
    } catch (err) {
      console.error('Search error:', err);
      return {
        summary: "I encountered an error searching for products. Please try again with a different query.",
        products: [],
        recommendation: ""
      };
    }
  };

  const searchProductImages = async (product) => {
    try {
      const imageQuery = product.imageSearch || product.name;
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Search for images of "${imageQuery}" and return the first high-quality product image URL you find. Return ONLY the image URL, nothing else.`
            }
          ],
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search"
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const imgUrl = data.content.find(b => b.type === 'text')?.text.trim();
        if (imgUrl && imgUrl.startsWith('http')) {
          product.image = imgUrl;
        }
      }
    } catch (err) {
      console.error('Image search error:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    searchProduct(userMessage)
      .then(results => {
        setMessages(prev => [...prev, { role: 'assistant', content: results }]);
      })
      .catch(err => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: { 
            summary: "Sorry, I encountered an error. Please try again.",
            products: [],
            recommendation: ""
          }
        }]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const ProductCard = ({ product }) => (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
      <div className="flex gap-4">
        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Image className="w-8 h-8 text-gray-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1 truncate">{product.name}</h3>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-green-600">{product.price}</span>
            {product.originalPrice && (
              <span className="text-sm text-gray-500 line-through">{product.originalPrice}</span>
            )}
          </div>

          <div className="flex items-center gap-3 mb-2 text-sm">
            {product.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{product.rating}</span>
                {product.reviews && (
                  <span className="text-gray-500">({product.reviews})</span>
                )}
              </div>
            )}
            <span className="text-gray-600">• {product.seller}</span>
          </div>

          {product.highlights && product.highlights.length > 0 && (
            <ul className="text-sm text-gray-600 mb-2 space-y-1">
              {product.highlights.slice(0, 2).map((h, i) => (
                <li key={i} className="truncate">• {h}</li>
              ))}
            </ul>
          )}

          {product.url && (
            <a 
              href={product.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              View Product <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Shopping Assistant</h1>
            <p className="text-sm text-gray-600">Compare prices across the web instantly</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-white rounded-2xl p-8 shadow-sm max-w-2xl mx-auto">
                <TrendingDown className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Find the Best Deals Online
                </h2>
                <p className="text-gray-600 mb-6">
                  Search for any product and I'll compare prices, ratings, and features across multiple e-commerce sites
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-blue-50 rounded-lg p-3 text-left">
                    <Search className="w-5 h-5 text-blue-600 mb-1" />
                    <p className="font-medium text-gray-900">Smart Search</p>
                    <p className="text-gray-600">Real-time web search</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-left">
                    <TrendingDown className="w-5 h-5 text-green-600 mb-1" />
                    <p className="font-medium text-gray-900">Price Compare</p>
                    <p className="text-gray-600">Best deals found</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-left">
                    <Star className="w-5 h-5 text-purple-600 mb-1" />
                    <p className="font-medium text-gray-900">Rating Check</p>
                    <p className="text-gray-600">Quality verified</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-left">
                    <Image className="w-5 h-5 text-orange-600 mb-1" />
                    <p className="font-medium text-gray-900">Image Search</p>
                    <p className="text-gray-600">Visual results</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="bg-blue-600 text-white rounded-2xl px-5 py-3 max-w-md shadow-sm">
                  <p className="font-medium">{msg.content}</p>
                </div>
              ) : (
                <div className="w-full bg-white rounded-2xl p-6 shadow-sm">
                  {msg.content.summary && (
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <p className="text-gray-700 leading-relaxed">{msg.content.summary}</p>
                    </div>
                  )}

                  {msg.content.products && msg.content.products.length > 0 && (
                    <div className="space-y-3 mb-4">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Found {msg.content.products.length} Options
                      </h3>
                      {msg.content.products.map((product, i) => (
                        <ProductCard key={i} product={product} />
                      ))}
                    </div>
                  )}

                  {msg.content.recommendation && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex gap-2">
                        <TrendingDown className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-green-900 mb-1">Recommendation</p>
                          <p className="text-green-800 text-sm">{msg.content.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-gray-600">Searching across e-commerce sites...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
              placeholder="Search for any product... (e.g., 'iPhone 15 Pro', 'Sony headphones', 'gaming laptop')"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Powered by Claude AI • Searches live web data
          </p>
        </div>
      </div>
    </div>
  );
}
