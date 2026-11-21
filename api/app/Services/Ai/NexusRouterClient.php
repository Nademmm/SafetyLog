<?php

namespace App\Services\Ai;

use App\Exceptions\AiUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Single, backend-to-backend gateway to NexusRouter's OpenAI-compatible API.
 * The virtual key is read from application config and is never logged or returned.
 */
class NexusRouterClient
{
    /** Total HTTP attempts: one initial request plus two retries. */
    private const RETRY_ATTEMPTS = 3;

    private const RETRY_DELAY_MS = 250;

    /**
     * @return string Raw text content of choices[0].message.content.
     */
    public function complete(string $systemPrompt, string $userPrompt, string $feature): string
    {
        $baseUrl = rtrim((string) config('services.nexusrouter.base_url'), '/');
        $virtualKey = (string) config('services.nexusrouter.virtual_key');
        $model = (string) config('services.nexusrouter.model', 'auto');
        $timeout = max(5, min(120, (int) config('services.nexusrouter.timeout', 30)));

        if ($baseUrl === '' || $virtualKey === '') {
            Log::warning('ai.nexusrouter.misconfigured', ['feature' => $feature]);

            throw new AiUnavailableException('Koneksi layanan AI belum dikonfigurasi.');
        }

        $startedAt = microtime(true);

        if (function_exists('set_time_limit')) {
            @set_time_limit(max(60, ($timeout * self::RETRY_ATTEMPTS) + 15));
        }

        try {
            $response = Http::baseUrl($baseUrl)
                ->acceptJson()
                ->withHeaders(['Authorization' => 'Bearer '.$virtualKey])
                ->connectTimeout(min(5, $timeout))
                ->timeout($timeout)
                ->retry(self::RETRY_ATTEMPTS, self::RETRY_DELAY_MS, function (Throwable $exception): bool {
                    return $exception instanceof ConnectionException
                        || ($exception instanceof RequestException
                            && ($exception->response->serverError() || $exception->response->status() === 429));
                })
                ->post('/v1/chat/completions', [
                    'model' => $model,
                    'stream' => false,
                    'temperature' => 0.2,
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                ]);
        } catch (ConnectionException $exception) {
            $this->logResult($feature, 'connection_failure', $startedAt);

            throw new AiUnavailableException(
                'Layanan AI sedang tidak dapat dihubungi.',
                previous: $exception,
            );
        } catch (RequestException $exception) {
            $this->logResult($feature, 'http_'.$exception->response->status(), $startedAt);

            throw new AiUnavailableException(
                'Layanan AI sedang mengalami gangguan.',
                previous: $exception,
            );
        }

        if (! $response->successful()) {
            $this->logResult($feature, 'http_'.$response->status(), $startedAt);

            throw new AiUnavailableException('Layanan AI sedang mengalami gangguan.');
        }

        $payload = $response->json();
        $content = is_array($payload)
            ? ($payload['choices'][0]['message']['content'] ?? null)
            : null;

        if (! is_string($content) || trim($content) === '') {
            $this->logResult($feature, 'empty_response', $startedAt);

            throw new AiUnavailableException('Layanan AI mengembalikan respons kosong.');
        }

        $this->logResult($feature, 'success', $startedAt, $this->resolveResponseModel($payload, $model));

        return $content;
    }

    /**
     * @param  array<string, mixed>|null  $payload
     */
    private function resolveResponseModel(?array $payload, string $configuredModel): string
    {
        $actual = is_array($payload) ? ($payload['model'] ?? null) : null;

        return is_string($actual) && $actual !== '' ? $actual : $configuredModel;
    }

    private function logResult(string $feature, string $status, float $startedAt, ?string $model = null): void
    {
        $context = [
            'feature' => $feature,
            'status' => $status,
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ];

        if ($model !== null) {
            $context['model'] = $model;
        }

        Log::info('ai.nexusrouter.request', $context);
    }
}
