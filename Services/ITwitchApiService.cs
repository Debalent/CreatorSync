using CreatorSync.Models;

namespace CreatorSync.Services;

/// <summary>
/// Interface for Twitch API operations.
/// </summary>
public interface ITwitchApiService
{
    /// <summary>
    /// Gets the current stream status for a channel.
    /// </summary>
    /// <param name="channelName">The channel name.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Stream information if live, null otherwise.</returns>
    Task<TwitchStream?> GetStreamStatusAsync(
        string? channelName = null, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets recent clips for a channel.
    /// </summary>
    /// <param name="channelName">The channel name.</param>
    /// <param name="maxResults">Maximum number of results.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A list of Twitch clips.</returns>
    Task<IReadOnlyList<TwitchClip>> GetRecentClipsAsync(
        string? channelName = null, 
        int maxResults = 10, 
        CancellationToken cancellationToken = default);
}
