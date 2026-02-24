// Radio Model for CreatorSync Radio
// Database schema and methods for radio track management

const { v4: uuidv4 } = require('uuid');

class RadioTrack {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.trackId = data.trackId;
        this.userId = data.userId;
        this.genre = data.genre;
        this.uploadDate = data.uploadDate || new Date();
        this.eligibleForRadio = data.eligibleForRadio || false;
        this.radioSubmissionDate = data.radioSubmissionDate || null;
        this.radioScore = data.radioScore || 0;
        this.totalLikes = data.totalLikes || 0;
        this.totalSaves = data.totalSaves || 0;
        this.totalShares = data.totalShares || 0;
        this.totalSkips = data.totalSkips || 0;
        this.avgCompletionRate = data.avgCompletionRate || 0;
        this.totalRadioPlays = data.totalRadioPlays || 0;
        this.collabClicks = data.collabClicks || 0;
        this.marketplaceClicks = data.marketplaceClicks || 0;
    }
}

class RadioEvent {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.trackId = data.trackId;
        this.listenerId = data.listenerId;
        this.eventType = data.eventType; // play, skip, like, save, share, click
        this.timestamp = data.timestamp || new Date();
        this.sessionId = data.sessionId;
    }
}

class RadioSession {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.listenerId = data.listenerId;
        this.startTime = data.startTime || new Date();
        this.endTime = data.endTime || null;
        this.totalTracksPlayed = data.totalTracksPlayed || 0;
        this.avgSessionLength = data.avgSessionLength || 0;
    }
}

class GenrePool {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.genreName = data.genreName;
        this.weightedPoolScore = data.weightedPoolScore || 0;
        this.rotationIndex = data.rotationIndex || 0;
    }
}

class SubmissionHistory {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.userId = data.userId;
        this.trackId = data.trackId;
        this.weekNumber = data.weekNumber;
        this.submissionStatus = data.submissionStatus || 'pending';
    }
}

module.exports = {
    RadioTrack,
    RadioEvent,
    RadioSession,
    GenrePool,
    SubmissionHistory
};
