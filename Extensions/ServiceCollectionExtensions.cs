using CreatorSync.Configuration;
using CreatorSync.Services;
using CreatorSync.Validators;
using FluentValidation;
using Microsoft.Extensions.Options;
using Polly;
using Polly.Extensions.Http;

namespace CreatorSync.Extensions;

/// <summary>
/// Extension methods for IServiceCollection.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds all application services to the DI container.
    /// </summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Add configuration with validation
        services.AddOptions<YouTubeSettings>()
            .Bind(configuration.GetSection(YouTubeSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<TwitchSettings>()
            .Bind(configuration.GetSection(TwitchSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // Add validators
        services.AddValidatorsFromAssemblyContaining<YouTubeSettingsValidator>();

        // Add singleton validators for configuration validation
        services.AddSingleton<IValidateOptions<YouTubeSettings>, ValidateOptionsWithValidator<YouTubeSettings>>();
        services.AddSingleton<IValidateOptions<TwitchSettings>, ValidateOptionsWithValidator<TwitchSettings>>();

        // Add HTTP clients with Polly resilience policies
        services.AddHttpClient<IYouTubeApiService, YouTubeApiService>()
            .AddPolicyHandler(GetRetryPolicy())
            .AddPolicyHandler(GetCircuitBreakerPolicy());

        services.AddHttpClient<ITwitchApiService, TwitchApiService>()
            .AddPolicyHandler(GetRetryPolicy())
            .AddPolicyHandler(GetCircuitBreakerPolicy());

        // Add health checks
        services.AddHealthChecks()
            .AddCheck<YouTubeApiHealthCheck>("youtube_api")
            .AddCheck<TwitchApiHealthCheck>("twitch_api");

        return services;
    }

    private static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
    {
        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
    }

    private static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
    {
        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30));
    }
}

/// <summary>
/// Validates options using FluentValidation.
/// </summary>
public class ValidateOptionsWithValidator<TOptions> : IValidateOptions<TOptions> where TOptions : class
{
    private readonly IValidator<TOptions> _validator;

    public ValidateOptionsWithValidator(IValidator<TOptions> validator)
    {
        _validator = validator;
    }

    public ValidateOptionsResult Validate(string? name, TOptions options)
    {
        var validationResult = _validator.Validate(options);
        
        if (validationResult.IsValid)
        {
            return ValidateOptionsResult.Success;
        }

        var errors = validationResult.Errors.Select(e => e.ErrorMessage);
        return ValidateOptionsResult.Fail(errors);
    }
}
