using System.Net;

namespace CreatorSync.Exceptions;

/// <summary>
/// Exception thrown when an API call fails.
/// </summary>
public class ApiException : Exception
{
    public HttpStatusCode? StatusCode { get; }
    public string? ResponseContent { get; }

    public ApiException(string message) : base(message)
    {
    }

    public ApiException(string message, Exception innerException) 
        : base(message, innerException)
    {
    }

    public ApiException(string message, HttpStatusCode statusCode, string? responseContent = null) 
        : base(message)
    {
        StatusCode = statusCode;
        ResponseContent = responseContent;
    }
}
