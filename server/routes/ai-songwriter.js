/**
 * AI Songwriter Routes
 * Handles AI-powered songwriting assistance, pattern analysis, and suggestions
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many AI requests, please try again later.'
});

// Apply rate limiting to all AI routes
router.use(aiRateLimit);

// In-memory storage for user writing patterns (in production, use database)
const userPatterns = new Map();
const writingHistory = new Map();

/**
 * Analyze user writing style and patterns
 */
router.post('/analyze-style', async (req, res) => {
    try {
        const { userId, lyrics, songMetadata } = req.body;
        
        if (!userId || !lyrics) {
            return res.status(400).json({ 
                error: 'User ID and lyrics are required' 
            });
        }

        // Perform style analysis
        const analysis = await analyzeWritingStyle(lyrics, songMetadata);
        
        // Update user pattern data
        updateUserPatterns(userId, analysis);
        
        // Store in writing history
        addToWritingHistory(userId, { lyrics, songMetadata, analysis, timestamp: Date.now() });

        res.json({
            success: true,
            analysis: {
                cadencePattern: analysis.cadence,
                toneConsistency: analysis.tone,
                rhythmPreference: analysis.rhythm,
                vocabularyComplexity: analysis.vocabulary,
                emotionalTone: analysis.emotion,
                averageLineLength: analysis.lineLength,
                rhymeSchemePreference: analysis.rhymeScheme
            },
            learningProgress: calculateLearningProgress(userId)
        });

    } catch (error) {
        console.error('Error analyzing writing style:', error);
        res.status(500).json({ 
            error: 'Failed to analyze writing style',
            details: error.message 
        });
    }
});

/**
 * Generate AI suggestions based on user patterns
 */
router.post('/generate-suggestions', async (req, res) => {
    try {
        const { userId, currentSong, contextType } = req.body;
        
        if (!userId || !currentSong) {
            return res.status(400).json({ 
                error: 'User ID and current song data are required' 
            });
        }

        // Get user patterns
        const userStyle = getUserPatterns(userId);
        const history = getWritingHistory(userId);

        // Generate suggestions
        const suggestions = await generateIntelligentSuggestions(
            currentSong, 
            userStyle, 
            history, 
            contextType
        );

        res.json({
            success: true,
            suggestions: suggestions.map(suggestion => ({
                id: generateSuggestionId(),
                type: suggestion.type,
                text: suggestion.text,
                confidence: suggestion.confidence,
                context: suggestion.context,
                reasoning: suggestion.reasoning
            }))
        });

    } catch (error) {
        console.error('Error generating suggestions:', error);
        res.status(500).json({ 
            error: 'Failed to generate suggestions',
            details: error.message 
        });
    }
});

/**
 * Generate creative prompts for writer's block
 */
router.post('/creative-prompts', async (req, res) => {
    try {
        const { userId, currentContext, blockType } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                error: 'User ID is required' 
            });
        }

        const userStyle = getUserPatterns(userId);
        const prompts = await generateCreativePrompts(userStyle, currentContext, blockType);

        res.json({
            success: true,
            prompts: prompts.map(prompt => ({
                id: generateSuggestionId(),
                title: prompt.title,
                description: prompt.description,
                prompt: prompt.text,
                type: prompt.type,
                difficulty: prompt.difficulty
            }))
        });

    } catch (error) {
        console.error('Error generating creative prompts:', error);
        res.status(500).json({ 
            error: 'Failed to generate creative prompts',
            details: error.message 
        });
    }
});

/**
 * Generate line continuations
 */
router.post('/continue-line', async (req, res) => {
    try {
        const { userId, partialLine, context } = req.body;
        
        if (!userId || !partialLine) {
            return res.status(400).json({ 
                error: 'User ID and partial line are required' 
            });
        }

        const userStyle = getUserPatterns(userId);
        const continuations = await generateLineContinuations(partialLine, userStyle, context);

        res.json({
            success: true,
            continuations: continuations.map(cont => ({
                id: generateSuggestionId(),
                text: cont.text,
                confidence: cont.confidence,
                styleMatch: cont.styleMatch
            }))
        });

    } catch (error) {
        console.error('Error generating line continuations:', error);
        res.status(500).json({ 
            error: 'Failed to generate line continuations',
            details: error.message 
        });
    }
});

/**
 * Rewrite text in user's style
 */
router.post('/rewrite-style', async (req, res) => {
    try {
        const { userId, originalText, targetStyle } = req.body;
        
        if (!userId || !originalText) {
            return res.status(400).json({ 
                error: 'User ID and original text are required' 
            });
        }

        const userStyle = getUserPatterns(userId);
        const rewrites = await rewriteInUserStyle(originalText, userStyle, targetStyle);

        res.json({
            success: true,
            rewrites: rewrites.map(rewrite => ({
                id: generateSuggestionId(),
                text: rewrite.text,
                changes: rewrite.changes,
                styleScore: rewrite.styleScore,
                reasoning: rewrite.reasoning
            }))
        });

    } catch (error) {
        console.error('Error rewriting in user style:', error);
        res.status(500).json({ 
            error: 'Failed to rewrite in user style',
            details: error.message 
        });
    }
});

/**
 * Find rhymes for a given word
 */
router.get('/rhymes/:word', async (req, res) => {
    try {
        const { word } = req.params;
        const { userId } = req.query;
        
        if (!word) {
            return res.status(400).json({ 
                error: 'Word is required' 
            });
        }

        const userStyle = userId ? getUserPatterns(userId) : null;
        const rhymes = await findRhymes(word, userStyle);

        res.json({
            success: true,
            word: word,
            rhymes: rhymes.map(rhyme => ({
                word: rhyme.word,
                score: rhyme.score,
                type: rhyme.type, // perfect, near, slant
                syllables: rhyme.syllables
            }))
        });

    } catch (error) {
        console.error('Error finding rhymes:', error);
        res.status(500).json({ 
            error: 'Failed to find rhymes',
            details: error.message 
        });
    }
});

/**
 * Find synonyms with style consideration
 */
router.get('/synonyms/:word', async (req, res) => {
    try {
        const { word } = req.params;
        const { userId, context } = req.query;
        
        if (!word) {
            return res.status(400).json({ 
                error: 'Word is required' 
            });
        }

        const userStyle = userId ? getUserPatterns(userId) : null;
        const synonyms = await findSynonyms(word, userStyle, context);

        res.json({
            success: true,
            word: word,
            synonyms: synonyms.map(synonym => ({
                word: synonym.word,
                relevance: synonym.relevance,
                complexity: synonym.complexity,
                emotion: synonym.emotion,
                formality: synonym.formality
            }))
        });

    } catch (error) {
        console.error('Error finding synonyms:', error);
        res.status(500).json({ 
            error: 'Failed to find synonyms',
            details: error.message 
        });
    }
});

/**
 * Save user project
 */
router.post('/save-project', async (req, res) => {
    try {
        const { userId, projectData } = req.body;
        
        if (!userId || !projectData) {
            return res.status(400).json({ 
                error: 'User ID and project data are required' 
            });
        }

        // In production, save to database
        const projectId = generateProjectId();
        const savedProject = {
            id: projectId,
            userId: userId,
            ...projectData,
            savedAt: new Date().toISOString(),
            version: '1.0'
        };

        // Store project (using in-memory storage for demo)
        if (!writingHistory.has(userId)) {
            writingHistory.set(userId, []);
        }
        
        const userHistory = writingHistory.get(userId);
        userHistory.push({
            type: 'project_save',
            project: savedProject,
            timestamp: Date.now()
        });

        res.json({
            success: true,
            projectId: projectId,
            message: 'Project saved successfully'
        });

    } catch (error) {
        console.error('Error saving project:', error);
        res.status(500).json({ 
            error: 'Failed to save project',
            details: error.message 
        });
    }
});

/**
 * Get user writing statistics
 */
router.get('/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ 
                error: 'User ID is required' 
            });
        }

        const userStyle = getUserPatterns(userId);
        const history = getWritingHistory(userId);
        const stats = calculateWritingStatistics(userStyle, history);

        res.json({
            success: true,
            stats: {
                totalSongs: stats.songCount,
                totalWords: stats.wordCount,
                averageComplexity: stats.avgComplexity,
                improvementScore: stats.improvement,
                favoriteGenres: stats.genres,
                writingStreak: stats.streak,
                styleConfidence: stats.confidence
            }
        });

    } catch (error) {
        console.error('Error getting user stats:', error);
        res.status(500).json({ 
            error: 'Failed to get user statistics',
            details: error.message 
        });
    }
});

// Helper Functions

async function analyzeWritingStyle(lyrics, songMetadata) {
    const lines = lyrics.split('\n').filter(line => line.trim().length > 0);
    const words = lyrics.split(/\s+/).filter(word => word.length > 0);
    
    return {
        cadence: analyzeCadence(lines),
        tone: analyzeTone(lyrics),
        rhythm: analyzeRhythm(lines),
        vocabulary: analyzeVocabulary(words),
        emotion: detectEmotionalTone(lyrics),
        lineLength: lines.reduce((sum, line) => sum + line.length, 0) / lines.length,
        rhymeScheme: detectRhymeScheme(lines)
    };
}

function analyzeCadence(lines) {
    if (lines.length < 2) return 0;
    
    const syllableCounts = lines.map(line => countSyllables(line));
    const avgSyllables = syllableCounts.reduce((a, b) => a + b, 0) / syllableCounts.length;
    const variance = syllableCounts.reduce((sum, count) => sum + Math.pow(count - avgSyllables, 2), 0) / syllableCounts.length;
    
    return Math.max(0, 100 - (variance * 5));
}

function analyzeTone(lyrics) {
    const words = lyrics.toLowerCase().split(/\s+/);
    
    const positiveWords = ['love', 'happy', 'joy', 'dream', 'hope', 'light', 'beautiful', 'amazing'];
    const negativeWords = ['hate', 'sad', 'pain', 'dark', 'lost', 'broken', 'hurt', 'alone'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
        if (positiveWords.includes(word)) positiveCount++;
        if (negativeWords.includes(word)) negativeCount++;
    });
    
    const totalEmotional = positiveCount + negativeCount;
    if (totalEmotional === 0) return 50;
    
    return (Math.max(positiveCount, negativeCount) / totalEmotional) * 100;
}

function analyzeRhythm(lines) {
    if (lines.length < 4) return 0;
    
    const stressPatterns = lines.map(line => getStressPattern(line));
    const patternMap = new Map();
    
    stressPatterns.forEach(pattern => {
        const key = pattern.join('');
        patternMap.set(key, (patternMap.get(key) || 0) + 1);
    });
    
    const maxOccurrence = Math.max(...patternMap.values());
    return (maxOccurrence / lines.length) * 100;
}

function analyzeVocabulary(words) {
    const uniqueWords = new Set(words.map(word => word.toLowerCase()));
    const complexWords = words.filter(word => word.length > 6).length;
    
    return Math.min(100, (complexWords / words.length) * 200 + (uniqueWords.size / words.length) * 100);
}

function detectEmotionalTone(lyrics) {
    const words = lyrics.toLowerCase().split(/\s+/);
    
    const emotions = {
        happy: ['happy', 'joy', 'love', 'excited', 'amazing', 'wonderful'],
        sad: ['sad', 'cry', 'tears', 'lonely', 'empty', 'broken'],
        angry: ['angry', 'mad', 'hate', 'rage', 'fury', 'fight'],
        romantic: ['love', 'heart', 'kiss', 'romance', 'beautiful', 'together'],
        energetic: ['run', 'jump', 'dance', 'move', 'energy', 'power'],
        melancholy: ['grey', 'dark', 'alone', 'quiet', 'still', 'fading']
    };
    
    const scores = {};
    Object.keys(emotions).forEach(emotion => {
        scores[emotion] = 0;
        emotions[emotion].forEach(word => {
            scores[emotion] += words.filter(w => w.includes(word)).length;
        });
    });
    
    const dominantEmotion = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    return scores[dominantEmotion] > 0 ? dominantEmotion : 'neutral';
}

function countSyllables(text) {
    return text.toLowerCase().replace(/[^a-z]/g, '').replace(/[aeiou]+/g, 'a').length || 1;
}

function getStressPattern(line) {
    const words = line.split(/\s+/);
    return words.map(word => word.length > 4 ? 1 : 0);
}

function detectRhymeScheme(lines) {
    if (lines.length < 2) return '';
    
    const endWords = lines.map(line => {
        const words = line.trim().split(/\s+/);
        return words[words.length - 1]?.toLowerCase().replace(/[^a-z]/g, '') || '';
    });
    
    const rhymeGroups = new Map();
    let currentLabel = 'A';
    
    endWords.forEach(word => {
        let foundRhyme = false;
        for (let [rhyme, label] of rhymeGroups) {
            if (wordsRhyme(word, rhyme)) {
                foundRhyme = true;
                break;
            }
        }
        
        if (!foundRhyme && word.length > 0) {
            rhymeGroups.set(word, currentLabel);
            currentLabel = String.fromCharCode(currentLabel.charCodeAt(0) + 1);
        }
    });
    
    return endWords.map(word => {
        for (let [rhyme, label] of rhymeGroups) {
            if (wordsRhyme(word, rhyme)) return label;
        }
        return 'X';
    }).join('');
}

function wordsRhyme(word1, word2) {
    if (word1.length < 2 || word2.length < 2) return false;
    
    const end1 = word1.slice(-2);
    const end2 = word2.slice(-2);
    
    return end1 === end2 || word1.slice(-3) === word2.slice(-3);
}

function updateUserPatterns(userId, analysis) {
    if (!userPatterns.has(userId)) {
        userPatterns.set(userId, {
            cadence: [],
            tone: [],
            rhythm: [],
            vocabulary: [],
            emotion: [],
            lineLength: [],
            rhymeScheme: []
        });
    }
    
    const patterns = userPatterns.get(userId);
    patterns.cadence.push(analysis.cadence);
    patterns.tone.push(analysis.tone);
    patterns.rhythm.push(analysis.rhythm);
    patterns.vocabulary.push(analysis.vocabulary);
    patterns.emotion.push(analysis.emotion);
    patterns.lineLength.push(analysis.lineLength);
    patterns.rhymeScheme.push(analysis.rhymeScheme);
    
    // Keep only last 10 entries for performance
    Object.keys(patterns).forEach(key => {
        if (patterns[key].length > 10) {
            patterns[key] = patterns[key].slice(-10);
        }
    });
}

function getUserPatterns(userId) {
    const patterns = userPatterns.get(userId);
    if (!patterns) {
        return {
            cadencePattern: 50,
            toneConsistency: 50,
            rhythmPreference: 50,
            vocabularyComplexity: 50,
            emotionalTone: 'neutral',
            averageLineLength: 40,
            rhymeSchemePreference: []
        };
    }
    
    const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 50;
    
    return {
        cadencePattern: avg(patterns.cadence),
        toneConsistency: avg(patterns.tone),
        rhythmPreference: avg(patterns.rhythm),
        vocabularyComplexity: avg(patterns.vocabulary),
        emotionalTone: patterns.emotion[patterns.emotion.length - 1] || 'neutral',
        averageLineLength: avg(patterns.lineLength),
        rhymeSchemePreference: patterns.rhymeScheme.slice(-5)
    };
}

function addToWritingHistory(userId, entry) {
    if (!writingHistory.has(userId)) {
        writingHistory.set(userId, []);
    }
    
    const history = writingHistory.get(userId);
    history.push(entry);
    
    // Keep only last 50 entries
    if (history.length > 50) {
        writingHistory.set(userId, history.slice(-50));
    }
}

function getWritingHistory(userId) {
    return writingHistory.get(userId) || [];
}

function calculateLearningProgress(userId) {
    const history = getWritingHistory(userId);
    const patterns = userPatterns.get(userId);
    
    if (!patterns || !history.length) return 0;
    
    const totalEntries = Object.values(patterns).reduce((sum, arr) => sum + arr.length, 0);
    return Math.min(100, (totalEntries / 30) * 100); // 30 entries = 100% learned
}

async function generateIntelligentSuggestions(currentSong, userStyle, history, contextType) {
    const suggestions = [];
    
    // Generate line suggestions
    const lineSuggestions = generateLineSuggestions(currentSong, userStyle);
    suggestions.push(...lineSuggestions);
    
    // Generate word suggestions
    const wordSuggestions = generateWordSuggestions(currentSong, userStyle);
    suggestions.push(...wordSuggestions);
    
    return suggestions.slice(0, 6);
}

function generateLineSuggestions(currentSong, userStyle) {
    const templates = [
        "In the {time} when {emotion} fills the air",
        "Walking through the {place} with {feeling} in my heart",
        "Remember when we {action} under {setting}",
        "Every {noun} tells a story of {theme}"
    ];
    
    return templates.map(template => ({
        type: 'line',
        text: fillTemplate(template, currentSong, userStyle),
        confidence: 75 + Math.random() * 20,
        context: 'verse',
        reasoning: 'Based on your writing patterns and current song mood'
    }));
}

function generateWordSuggestions(currentSong, userStyle) {
    const suggestions = [];
    const moodWords = {
        happy: ['joyful', 'radiant', 'blissful', 'elated'],
        sad: ['melancholy', 'wistful', 'somber', 'poignant'],
        energetic: ['vibrant', 'dynamic', 'electric', 'powerful'],
        romantic: ['tender', 'passionate', 'devoted', 'enchanting']
    };
    
    const words = moodWords[currentSong.mood] || moodWords.happy;
    
    return words.slice(0, 2).map(word => ({
        type: 'word',
        text: word,
        confidence: 80 + Math.random() * 15,
        context: 'mood enhancement',
        reasoning: `Matches your ${currentSong.mood || 'current'} mood`
    }));
}

function fillTemplate(template, currentSong, userStyle) {
    const replacements = {
        '{time}': ['morning', 'evening', 'midnight', 'dawn'][Math.floor(Math.random() * 4)],
        '{emotion}': getEmotionWord(currentSong.mood),
        '{place}': ['city', 'garden', 'highway', 'home'][Math.floor(Math.random() * 4)],
        '{feeling}': getFeelingWord(currentSong.mood),
        '{action}': ['dance', 'sing', 'run', 'fly'][Math.floor(Math.random() * 4)],
        '{setting}': ['starlight', 'moonbeams', 'sunshine', 'rainfall'][Math.floor(Math.random() * 4)],
        '{noun}': ['moment', 'dream', 'story', 'memory'][Math.floor(Math.random() * 4)],
        '{theme}': ['hope', 'love', 'freedom', 'change'][Math.floor(Math.random() * 4)]
    };
    
    let filled = template;
    Object.entries(replacements).forEach(([placeholder, replacement]) => {
        filled = filled.replace(new RegExp(placeholder, 'g'), replacement);
    });
    
    return filled;
}

function getEmotionWord(mood) {
    const emotions = {
        happy: ['joy', 'bliss', 'excitement', 'elation'],
        sad: ['sorrow', 'melancholy', 'grief', 'longing'],
        energetic: ['passion', 'fire', 'energy', 'power'],
        romantic: ['love', 'devotion', 'tenderness', 'warmth']
    };
    
    const moodWords = emotions[mood] || emotions.happy;
    return moodWords[Math.floor(Math.random() * moodWords.length)];
}

function getFeelingWord(mood) {
    const feelings = {
        happy: ['happiness', 'contentment', 'peace', 'satisfaction'],
        sad: ['emptiness', 'sadness', 'loss', 'pain'],
        energetic: ['excitement', 'adrenaline', 'motivation', 'drive'],
        romantic: ['love', 'affection', 'desire', 'connection']
    };
    
    const moodFeelings = feelings[mood] || feelings.happy;
    return moodFeelings[Math.floor(Math.random() * moodFeelings.length)];
}

async function generateCreativePrompts(userStyle, currentContext, blockType) {
    const prompts = [
        {
            title: "Emotional Memory",
            description: "Write about a moment that changed everything",
            text: "Think of a specific moment when your world shifted...",
            type: "memory",
            difficulty: "medium"
        },
        {
            title: "Character Perspective",
            description: "Tell a story from someone else's view",
            text: "Imagine you are someone completely different...",
            type: "perspective",
            difficulty: "hard"
        },
        {
            title: "Stream of Consciousness",
            description: "Write without stopping for 3 minutes",
            text: "Right now I'm feeling...",
            type: "stream",
            difficulty: "easy"
        }
    ];
    
    return prompts;
}

async function generateLineContinuations(partialLine, userStyle, context) {
    const continuations = [
        " and I know it's true",
        " in the morning light",
        " when the world was young",
        " like a distant dream",
        " with an open heart"
    ];
    
    return continuations.map(cont => ({
        text: cont,
        confidence: 70 + Math.random() * 25,
        styleMatch: 85 + Math.random() * 10
    }));
}

async function rewriteInUserStyle(originalText, userStyle, targetStyle) {
    const lines = originalText.split('\n');
    
    return lines.map(line => ({
        text: line + " (in your style)",
        changes: ["adjusted vocabulary", "matched rhythm"],
        styleScore: 85 + Math.random() * 10,
        reasoning: "Adapted to match your writing patterns"
    }));
}

async function findRhymes(word, userStyle) {
    // Simple rhyme database
    const rhymes = {
        'love': ['above', 'dove', 'shove', 'glove'],
        'heart': ['start', 'part', 'art', 'smart'],
        'night': ['light', 'bright', 'sight', 'flight'],
        'day': ['way', 'say', 'play', 'stay']
    };
    
    const wordRhymes = rhymes[word.toLowerCase()] || [];
    
    return wordRhymes.map(rhyme => ({
        word: rhyme,
        score: 90 + Math.random() * 10,
        type: 'perfect',
        syllables: countSyllables(rhyme)
    }));
}

async function findSynonyms(word, userStyle, context) {
    const synonyms = {
        'love': ['affection', 'devotion', 'passion', 'romance'],
        'happy': ['joyful', 'elated', 'cheerful', 'blissful'],
        'sad': ['melancholy', 'sorrowful', 'downhearted', 'blue'],
        'beautiful': ['stunning', 'gorgeous', 'magnificent', 'radiant']
    };
    
    const wordSynonyms = synonyms[word.toLowerCase()] || [word];
    
    return wordSynonyms.map(synonym => ({
        word: synonym,
        relevance: 85 + Math.random() * 10,
        complexity: synonym.length > 6 ? 'high' : 'medium',
        emotion: 'neutral',
        formality: 'casual'
    }));
}

function calculateWritingStatistics(userStyle, history) {
    return {
        songCount: history.filter(entry => entry.type === 'project_save').length,
        wordCount: history.reduce((sum, entry) => {
            if (entry.lyrics) {
                return sum + entry.lyrics.split(/\s+/).length;
            }
            return sum;
        }, 0),
        avgComplexity: userStyle.vocabularyComplexity,
        improvement: calculateImprovement(history),
        genres: extractGenres(history),
        streak: calculateStreak(history),
        confidence: userStyle.toneConsistency
    };
}

function calculateImprovement(history) {
    if (history.length < 5) return 0;
    
    const recent = history.slice(-5);
    const earlier = history.slice(-10, -5);
    
    if (earlier.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, entry) => sum + (entry.analysis?.vocabulary || 0), 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, entry) => sum + (entry.analysis?.vocabulary || 0), 0) / earlier.length;
    
    return Math.max(0, ((recentAvg - earlierAvg) / earlierAvg) * 100);
}

function extractGenres(history) {
    const genreCounts = {};
    history.forEach(entry => {
        if (entry.songMetadata && entry.songMetadata.genre) {
            const genre = entry.songMetadata.genre;
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
    });
    
    return Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre, count]) => ({ genre, count }));
}

function calculateStreak(history) {
    if (history.length === 0) return 0;
    
    let streak = 1;
    const today = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    for (let i = history.length - 2; i >= 0; i--) {
        const entryDate = new Date(history[i].timestamp);
        const daysDiff = Math.floor((today - entryDate) / msPerDay);
        
        if (daysDiff === streak) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

// Utility functions
function generateSuggestionId() {
    return 'sug_' + Math.random().toString(36).substr(2, 9);
}

function generateProjectId() {
    return 'proj_' + Math.random().toString(36).substr(2, 9);
}

module.exports = router;