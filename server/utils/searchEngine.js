// Search Engine
// Advanced search and filtering for beats

const { logger } = require('./logger');

class SearchEngine {
    constructor() {
        this.searchableFields = ['title', 'description', 'genre', 'tags', 'producer'];
    }

    /**
     * Search beats with advanced filters
     */
    searchBeats(beats, searchParams) {
        try {
            let results = [...beats];

            // Text search
            if (searchParams.query) {
                results = this.textSearch(results, searchParams.query);
            }

            // Genre filter
            if (searchParams.genre && searchParams.genre !== 'all') {
                results = results.filter(beat => 
                    beat.genre?.toLowerCase() === searchParams.genre.toLowerCase()
                );
            }

            // BPM range filter
            if (searchParams.bpmMin || searchParams.bpmMax) {
                results = this.filterByBPM(results, searchParams.bpmMin, searchParams.bpmMax);
            }

            // Price range filter
            if (searchParams.priceMin !== undefined || searchParams.priceMax !== undefined) {
                results = this.filterByPrice(results, searchParams.priceMin, searchParams.priceMax);
            }

            // Key filter
            if (searchParams.key) {
                results = results.filter(beat => 
                    beat.key?.toLowerCase() === searchParams.key.toLowerCase()
                );
            }

            // Mood filter
            if (searchParams.mood) {
                results = results.filter(beat => 
                    beat.mood?.toLowerCase() === searchParams.mood.toLowerCase() ||
                    beat.tags?.some(tag => tag.toLowerCase() === searchParams.mood.toLowerCase())
                );
            }

            // Duration filter
            if (searchParams.durationMin || searchParams.durationMax) {
                results = this.filterByDuration(results, searchParams.durationMin, searchParams.durationMax);
            }

            // License type filter
            if (searchParams.license) {
                results = results.filter(beat => 
                    beat.license?.toLowerCase() === searchParams.license.toLowerCase()
                );
            }

            // Producer filter
            if (searchParams.producer) {
                results = results.filter(beat => 
                    beat.uploadedBy === searchParams.producer ||
                    beat.producerName?.toLowerCase().includes(searchParams.producer.toLowerCase())
                );
            }

            // Tags filter
            if (searchParams.tags && Array.isArray(searchParams.tags)) {
                results = this.filterByTags(results, searchParams.tags);
            }

            // Featured filter
            if (searchParams.featured === true || searchParams.featured === 'true') {
                results = results.filter(beat => beat.featured === true);
            }

            // Free beats filter
            if (searchParams.free === true || searchParams.free === 'true') {
                results = results.filter(beat => beat.price === 0 || beat.free === true);
            }

            // Minimum quality score
            if (searchParams.minQuality) {
                results = results.filter(beat => 
                    (beat.qualityScore || 0) >= parseInt(searchParams.minQuality)
                );
            }

            // Sort results
            if (searchParams.sortBy) {
                results = this.sortResults(results, searchParams.sortBy, searchParams.sortOrder);
            }

            // Pagination
            const page = parseInt(searchParams.page) || 1;
            const limit = parseInt(searchParams.limit) || 20;
            const total = results.length;
            const totalPages = Math.ceil(total / limit);
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;

            return {
                beats: results.slice(startIndex, endIndex),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                filters: this.getAppliedFilters(searchParams)
            };
        } catch (error) {
            logger.error('Search error:', error);
            return {
                beats: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
                error: error.message
            };
        }
    }

    /**
     * Text search across multiple fields
     */
    textSearch(beats, query) {
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

        return beats.filter(beat => {
            const searchableText = [
                beat.title,
                beat.description,
                beat.genre,
                beat.producerName,
                ...(beat.tags || [])
            ].join(' ').toLowerCase();

            return searchTerms.every(term => searchableText.includes(term));
        });
    }

    /**
     * Filter by BPM range
     */
    filterByBPM(beats, min, max) {
        return beats.filter(beat => {
            const bpm = beat.bpm || 0;
            const minBpm = min ? parseInt(min) : 0;
            const maxBpm = max ? parseInt(max) : Infinity;
            return bpm >= minBpm && bpm <= maxBpm;
        });
    }

    /**
     * Filter by price range
     */
    filterByPrice(beats, min, max) {
        return beats.filter(beat => {
            const price = beat.price || 0;
            const minPrice = min !== undefined ? parseFloat(min) : 0;
            const maxPrice = max !== undefined ? parseFloat(max) : Infinity;
            return price >= minPrice && price <= maxPrice;
        });
    }

    /**
     * Filter by duration range (in seconds)
     */
    filterByDuration(beats, min, max) {
        return beats.filter(beat => {
            const duration = beat.duration || 0;
            const minDuration = min ? parseInt(min) : 0;
            const maxDuration = max ? parseInt(max) : Infinity;
            return duration >= minDuration && duration <= maxDuration;
        });
    }

    /**
     * Filter by tags (beats must have at least one matching tag)
     */
    filterByTags(beats, tags) {
        const searchTags = tags.map(tag => tag.toLowerCase());
        return beats.filter(beat => {
            const beatTags = (beat.tags || []).map(tag => tag.toLowerCase());
            return searchTags.some(tag => beatTags.includes(tag));
        });
    }

    /**
     * Sort results
     */
    sortResults(beats, sortBy, sortOrder = 'desc') {
        const order = sortOrder === 'asc' ? 1 : -1;

        const sortFunctions = {
            'newest': (a, b) => order * (new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0)),
            'oldest': (a, b) => order * (new Date(a.uploadDate || 0) - new Date(b.uploadDate || 0)),
            'price-low': (a, b) => (a.price || 0) - (b.price || 0),
            'price-high': (a, b) => (b.price || 0) - (a.price || 0),
            'popular': (a, b) => order * ((b.plays || 0) - (a.plays || 0)),
            'trending': (a, b) => order * ((b.recentPlays || 0) - (a.recentPlays || 0)),
            'rating': (a, b) => order * ((b.rating || 0) - (a.rating || 0)),
            'bpm': (a, b) => order * ((b.bpm || 0) - (a.bpm || 0)),
            'duration': (a, b) => order * ((b.duration || 0) - (a.duration || 0)),
            'title': (a, b) => order * (a.title || '').localeCompare(b.title || ''),
            'relevance': (a, b) => order * ((b.relevanceScore || 0) - (a.relevanceScore || 0))
        };

        const sortFn = sortFunctions[sortBy] || sortFunctions['newest'];
        return [...beats].sort(sortFn);
    }

    /**
     * Get applied filters summary
     */
    getAppliedFilters(params) {
        const filters = [];

        if (params.query) filters.push({ type: 'search', value: params.query });
        if (params.genre && params.genre !== 'all') filters.push({ type: 'genre', value: params.genre });
        if (params.bpmMin || params.bpmMax) {
            filters.push({ 
                type: 'bpm', 
                value: `${params.bpmMin || 0} - ${params.bpmMax || '∞'}` 
            });
        }
        if (params.priceMin !== undefined || params.priceMax !== undefined) {
            filters.push({ 
                type: 'price', 
                value: `$${params.priceMin || 0} - $${params.priceMax || '∞'}` 
            });
        }
        if (params.key) filters.push({ type: 'key', value: params.key });
        if (params.mood) filters.push({ type: 'mood', value: params.mood });
        if (params.license) filters.push({ type: 'license', value: params.license });
        if (params.featured) filters.push({ type: 'featured', value: 'true' });
        if (params.free) filters.push({ type: 'free', value: 'true' });

        return filters;
    }

    /**
     * Get search suggestions based on query
     */
    getSearchSuggestions(beats, query, limit = 5) {
        if (!query || query.length < 2) return [];

        const suggestions = new Set();
        const queryLower = query.toLowerCase();

        beats.forEach(beat => {
            // Title suggestions
            if (beat.title?.toLowerCase().includes(queryLower)) {
                suggestions.add(beat.title);
            }

            // Genre suggestions
            if (beat.genre?.toLowerCase().includes(queryLower)) {
                suggestions.add(beat.genre);
            }

            // Tag suggestions
            beat.tags?.forEach(tag => {
                if (tag.toLowerCase().includes(queryLower)) {
                    suggestions.add(tag);
                }
            });

            // Producer suggestions
            if (beat.producerName?.toLowerCase().includes(queryLower)) {
                suggestions.add(beat.producerName);
            }
        });

        return Array.from(suggestions).slice(0, limit);
    }

    /**
     * Get filter options from available beats
     */
    getFilterOptions(beats) {
        const genres = new Set();
        const moods = new Set();
        const keys = new Set();
        const licenses = new Set();
        let minBpm = Infinity;
        let maxBpm = 0;
        let minPrice = Infinity;
        let maxPrice = 0;

        beats.forEach(beat => {
            if (beat.genre) genres.add(beat.genre);
            if (beat.mood) moods.add(beat.mood);
            if (beat.key) keys.add(beat.key);
            if (beat.license) licenses.add(beat.license);
            
            if (beat.bpm) {
                minBpm = Math.min(minBpm, beat.bpm);
                maxBpm = Math.max(maxBpm, beat.bpm);
            }
            
            if (beat.price !== undefined) {
                minPrice = Math.min(minPrice, beat.price);
                maxPrice = Math.max(maxPrice, beat.price);
            }
        });

        return {
            genres: Array.from(genres).sort(),
            moods: Array.from(moods).sort(),
            keys: Array.from(keys).sort(),
            licenses: Array.from(licenses).sort(),
            bpmRange: { min: minBpm === Infinity ? 0 : minBpm, max: maxBpm },
            priceRange: { min: minPrice === Infinity ? 0 : minPrice, max: maxPrice }
        };
    }
}

// Export singleton instance
module.exports = new SearchEngine();

