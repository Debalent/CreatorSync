// Demo mode utility for CreatorSync Radio

const DEMO_MODE = process.env.CREATOR_SYNC_DEMO_MODE === 'true';

function isDemoMode() {
    return DEMO_MODE;
}

module.exports = {
    isDemoMode
};
