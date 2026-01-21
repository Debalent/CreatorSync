// Audio Processor
// Handles audio file validation, metadata extraction, and processing

const fs = require('fs').promises;
const path = require('path');
const { parseFile } = require('music-metadata');
const { logger } = require('./logger');

class AudioProcessor {
    constructor() {
        this.supportedFormats = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
    }

    /**
     * Validate audio file
     */
    async validateAudioFile(filePath) {
        try {
            // Check if file exists
            const stats = await fs.stat(filePath);

            // Check file size
            if (stats.size > this.maxFileSize) {
                return {
                    valid: false,
                    error: `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`
                };
            }

            // Check file extension
            const ext = path.extname(filePath).toLowerCase();
            if (!this.supportedFormats.includes(ext)) {
                return {
                    valid: false,
                    error: `Unsupported file format. Supported formats: ${this.supportedFormats.join(', ')}`
                };
            }

            // Try to parse metadata to verify it's a valid audio file
            try {
                await parseFile(filePath);
            } catch (error) {
                return {
                    valid: false,
                    error: 'Invalid or corrupted audio file'
                };
            }

            return {
                valid: true,
                size: stats.size,
                format: ext
            };
        } catch (error) {
            logger.error('Audio validation error:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Extract metadata from audio file
     */
    async extractMetadata(filePath) {
        try {
            const metadata = await parseFile(filePath);

            return {
                duration: metadata.format.duration || 0,
                bitrate: metadata.format.bitrate || 0,
                sampleRate: metadata.format.sampleRate || 0,
                channels: metadata.format.numberOfChannels || 0,
                codec: metadata.format.codec || 'unknown',
                container: metadata.format.container || 'unknown',
                title: metadata.common.title || '',
                artist: metadata.common.artist || '',
                album: metadata.common.album || '',
                year: metadata.common.year || null,
                genre: metadata.common.genre ? metadata.common.genre[0] : '',
                bpm: metadata.common.bpm || null,
                key: metadata.common.key || null,
                comment: metadata.common.comment ? metadata.common.comment[0] : ''
            };
        } catch (error) {
            logger.error('Metadata extraction error:', error);
            return {
                duration: 0,
                bitrate: 0,
                sampleRate: 0,
                channels: 0,
                codec: 'unknown',
                container: 'unknown'
            };
        }
    }

    /**
     * Detect BPM from audio file
     */
    async detectBPM(filePath) {
        try {
            const metadata = await parseFile(filePath);
            
            // Try to get BPM from metadata
            if (metadata.common.bpm) {
                return Math.round(metadata.common.bpm);
            }

            // If no BPM in metadata, return null
            // In production, you would use a BPM detection library here
            logger.warn('BPM not found in metadata for file:', filePath);
            return null;
        } catch (error) {
            logger.error('BPM detection error:', error);
            return null;
        }
    }

    /**
     * Detect musical key from audio file
     */
    async detectKey(filePath) {
        try {
            const metadata = await parseFile(filePath);
            
            // Try to get key from metadata
            if (metadata.common.key) {
                return metadata.common.key;
            }

            // If no key in metadata, return null
            // In production, you would use a key detection library here
            logger.warn('Key not found in metadata for file:', filePath);
            return null;
        } catch (error) {
            logger.error('Key detection error:', error);
            return null;
        }
    }

    /**
     * Generate waveform data for visualization
     */
    async generateWaveform(filePath, samples = 1000) {
        try {
            // This is a placeholder implementation
            // In production, you would use a library like audiowaveform or ffmpeg
            // to generate actual waveform data
            
            const metadata = await this.extractMetadata(filePath);
            const duration = metadata.duration;

            // Generate mock waveform data
            const waveform = [];
            for (let i = 0; i < samples; i++) {
                // Generate random amplitude between 0 and 1
                // In production, this would be actual audio amplitude data
                waveform.push(Math.random() * 0.8 + 0.2);
            }

            return {
                samples: waveform,
                duration,
                sampleRate: samples / duration
            };
        } catch (error) {
            logger.error('Waveform generation error:', error);
            return {
                samples: [],
                duration: 0,
                sampleRate: 0
            };
        }
    }

    /**
     * Get audio file info (validation + metadata)
     */
    async getAudioInfo(filePath) {
        try {
            const validation = await this.validateAudioFile(filePath);
            
            if (!validation.valid) {
                return {
                    valid: false,
                    error: validation.error
                };
            }

            const metadata = await this.extractMetadata(filePath);
            const bpm = await this.detectBPM(filePath);
            const key = await this.detectKey(filePath);

            return {
                valid: true,
                fileSize: validation.size,
                format: validation.format,
                metadata: {
                    ...metadata,
                    bpm: bpm || metadata.bpm,
                    key: key || metadata.key
                }
            };
        } catch (error) {
            logger.error('Get audio info error:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Format duration in seconds to MM:SS
     */
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Calculate audio quality score
     */
    calculateQualityScore(metadata) {
        let score = 0;

        // Bitrate score (max 40 points)
        if (metadata.bitrate >= 320000) score += 40;
        else if (metadata.bitrate >= 256000) score += 35;
        else if (metadata.bitrate >= 192000) score += 30;
        else if (metadata.bitrate >= 128000) score += 20;
        else score += 10;

        // Sample rate score (max 30 points)
        if (metadata.sampleRate >= 48000) score += 30;
        else if (metadata.sampleRate >= 44100) score += 25;
        else if (metadata.sampleRate >= 32000) score += 15;
        else score += 5;

        // Codec score (max 30 points)
        const losslessCodecs = ['flac', 'alac', 'wav', 'aiff'];
        if (losslessCodecs.includes(metadata.codec?.toLowerCase())) {
            score += 30;
        } else if (metadata.codec?.toLowerCase() === 'mp3') {
            score += 20;
        } else {
            score += 15;
        }

        return Math.min(score, 100);
    }

    /**
     * Suggest optimal export settings
     */
    suggestExportSettings(metadata) {
        const settings = {
            format: 'wav',
            bitrate: 320000,
            sampleRate: 48000,
            channels: 2
        };

        // If source is high quality, maintain it
        if (metadata.sampleRate >= 48000) {
            settings.sampleRate = metadata.sampleRate;
        }

        if (metadata.channels > 2) {
            settings.channels = metadata.channels;
        }

        return settings;
    }

    /**
     * Validate image file (for artwork)
     */
    async validateImageFile(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const maxImageSize = 10 * 1024 * 1024; // 10MB

            if (stats.size > maxImageSize) {
                return {
                    valid: false,
                    error: 'Image size exceeds 10MB'
                };
            }

            const ext = path.extname(filePath).toLowerCase();
            const supportedImageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

            if (!supportedImageFormats.includes(ext)) {
                return {
                    valid: false,
                    error: `Unsupported image format. Supported: ${supportedImageFormats.join(', ')}`
                };
            }

            return {
                valid: true,
                size: stats.size,
                format: ext
            };
        } catch (error) {
            logger.error('Image validation error:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Get file hash for duplicate detection
     */
    async getFileHash(filePath) {
        try {
            const crypto = require('crypto');
            const fileBuffer = await fs.readFile(filePath);
            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            return hashSum.digest('hex');
        } catch (error) {
            logger.error('File hash error:', error);
            return null;
        }
    }
}

// Export singleton instance
module.exports = new AudioProcessor();

