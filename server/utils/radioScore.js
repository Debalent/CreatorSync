// RadioScore calculation utility for CreatorSync Radio
// Recalculates track scores hourly based on engagement and fairness model

const LikeWeight = 1.2;
const CompletionWeight = 2.0;
const SaveWeight = 1.5;
const ShareWeight = 1.7;
const CollabClickWeight = 2.5;
const PurchaseIntentWeight = 2.0;
const SkipPenaltyWeight = 2.0;
const DecayFactor = 0.15;

function calculateRadioScore(track, listenerReputation = 1) {
    // Adjusted likes: weighted by listener reputation
    const totalLikesAdjusted = track.totalLikes * listenerReputation;
    const radioScore = (
        LikeWeight * totalLikesAdjusted +
        CompletionWeight * track.avgCompletionRate +
        SaveWeight * track.totalSaves +
        ShareWeight * track.totalShares +
        CollabClickWeight * track.collabClicks +
        PurchaseIntentWeight * track.marketplaceClicks
    ) - (
        SkipPenaltyWeight * track.totalSkips +
        DecayFactor * getTrackAgeInDays(track.uploadDate)
    );
    return radioScore;
}

function getTrackAgeInDays(uploadDate) {
    const now = new Date();
    const uploaded = new Date(uploadDate);
    return Math.floor((now - uploaded) / (1000 * 60 * 60 * 24));
}

module.exports = {
    calculateRadioScore,
    getTrackAgeInDays,
    LikeWeight,
    CompletionWeight,
    SaveWeight,
    ShareWeight,
    CollabClickWeight,
    PurchaseIntentWeight,
    SkipPenaltyWeight,
    DecayFactor
};
