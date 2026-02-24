using CreatorSync.Services;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CreatorSync.HealthChecks;

/// <summary>
/// Health check for YouTube API connectivity.
/// </summary>
public class YouTubeApiHealthCheck : IHealthCheck
{
    private readonly IYouTubeApiService _youTubeService;
    private readonly ILogger<YouTubeApiHealthCheck> _logger;

    public YouTubeApiHealthCheck(
        IYouTubeApiService youTubeService,
        ILogger<YouTubeApiHealthCheck> logger)
    {
        _youTubeService = youTubeService;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _youTubeService.GetRecentVideosAsync(maxResults: 1, cancellationToken: cancellationToken);
            return HealthCheckResult.Healthy("YouTube API is accessible");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "YouTube API health check failed");
            return HealthCheckResult.Unhealthy("YouTube API is not accessible", ex);
        }
    }
}
