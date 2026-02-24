using CreatorSync.Services;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CreatorSync.HealthChecks;

/// <summary>
/// Health check for Twitch API connectivity.
/// </summary>
public class TwitchApiHealthCheck : IHealthCheck
{
    private readonly ITwitchApiService _twitchService;
    private readonly ILogger<TwitchApiHealthCheck> _logger;

    public TwitchApiHealthCheck(
        ITwitchApiService twitchService,
        ILogger<TwitchApiHealthCheck> logger)
    {
        _twitchService = twitchService;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _twitchService.GetStreamStatusAsync(cancellationToken: cancellationToken);
            return HealthCheckResult.Healthy("Twitch API is accessible");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Twitch API health check failed");
            return HealthCheckResult.Unhealthy("Twitch API is not accessible", ex);
        }
    }
}
