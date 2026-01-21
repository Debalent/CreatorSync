using CreatorSync.Models;

namespace CreatorSync.Services;

/// <summary>
/// Interface for YouTube API operations.
/// </summary>
public interface IYouTubeApiService
{
    /// <summary>
    /// Gets recent videos from a YouTube channel.
    /// </summary>
    /// <param name="channelId">The channel ID to fetch videos from.</param>
    /// <param name="maxResults">Maximum number of results to return.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A list of YouTube videos.</returns>
    Task<IReadOnlyList<YouTubeVideo>> GetRecentVideosAsync(
        string? channelId = null, 
        int maxResults = 10, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets detailed statistics for a specific video.
    /// </summary>
    /// <param name="videoId">The video ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Video statistics.</returns>
    Task<VideoStatistics?> GetVideoStatisticsAsync(
        string videoId, 
        CancellationToken cancellationToken = default);
}
