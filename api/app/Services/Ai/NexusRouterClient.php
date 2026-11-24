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
    /** Total HTTP attempts: one initial request plus one retry (safe within cPanel gateway timeouts). */
    private const RETRY_ATTEMPTS = 2;

    private const RETRY_DELAY_MS = 250;

    /**
     * @return string Raw text content of choices[0].message.content.
     */
    public function complete(string $systemPrompt, string $userPrompt, string $feature): string
    {
        $rawBaseUrl = rtrim((string) config('services.nexusrouter.base_url'), '/');
        $baseUrl = (string) (preg_replace('#/v1$#i', '', $rawBaseUrl) ?: $rawBaseUrl);
        if (str_contains($baseUrl, 'api.groq.com') && ! str_contains($baseUrl, '/openai')) {
            $baseUrl .= '/openai';
        }
        $virtualKey = (string) config('services.nexusrouter.virtual_key');
        $model = (string) config('services.nexusrouter.model', 'auto');
        $timeout = max(5, min(120, (int) config('services.nexusrouter.timeout', 20)));

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
                ->withHeaders([
                    'Authorization' => 'Bearer '.$virtualKey,
                    'x-virtual-key' => $virtualKey,
                ])
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
            $status = $exception->response ? $exception->response->status() : 500;
            $errPayload = $exception->response ? $exception->response->json() : null;
            $providerMessage = is_array($errPayload)
                ? ($errPayload['error']['message'] ?? ($errPayload['message'] ?? null))
                : null;

            $this->logResult($feature, 'http_'.$status, $startedAt, extra: ['provider_message' => $providerMessage]);

            $friendlyMessage = match ($status) {
                401 => 'Kunci virtual key AI (NEXUSROUTER_VIRTUAL_KEY) tidak valid atau ditolak oleh gateway.',
                429 => 'Batas kuota layanan AI tercapai (rate limit). Silakan coba lagi nanti.',
                404 => is_string($providerMessage) && trim($providerMessage) !== ''
                    ? "Endpoint/model AI tidak ditemukan (404): {$providerMessage}"
                    : 'Model AI atau endpoint layanan tidak ditemukan.',
                default => is_string($providerMessage) && trim($providerMessage) !== ''
                    ? "Layanan AI menolak permintaan: {$providerMessage}"
                    : "Layanan AI sedang mengalami gangguan (HTTP {$status}).",
            };

            throw new AiUnavailableException($friendlyMessage, previous: $exception);
        }

        if (! $response->successful()) {
            $status = $response->status();
            $errPayload = $response->json();
            $providerMessage = is_array($errPayload)
                ? ($errPayload['error']['message'] ?? ($errPayload['message'] ?? null))
                : null;

            $this->logResult($feature, 'http_'.$status, $startedAt, extra: ['provider_message' => $providerMessage]);

            $friendlyMessage = match ($status) {
                401 => 'Kunci virtual key AI (NEXUSROUTER_VIRTUAL_KEY) tidak valid atau ditolak oleh gateway.',
                429 => 'Batas kuota layanan AI tercapai (rate limit). Silakan coba lagi nanti.',
                404 => is_string($providerMessage) && trim($providerMessage) !== ''
                    ? "Endpoint/model AI tidak ditemukan (404): {$providerMessage}"
                    : 'Model AI atau endpoint layanan tidak ditemukan.',
                default => is_string($providerMessage) && trim($providerMessage) !== ''
                    ? "Layanan AI menolak permintaan: {$providerMessage}"
                    : "Layanan AI sedang mengalami gangguan (HTTP {$status}).",
            };

            throw new AiUnavailableException($friendlyMessage);
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

    /**
     * @param  array<string, mixed>  $extra
     */
    private function logResult(string $feature, string $status, float $startedAt, ?string $model = null, array $extra = []): void
    {
        $context = [
            'feature' => $feature,
            'status' => $status,
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ];

        if ($model !== null) {
            $context['model'] = $model;
        }

        if ($extra !== []) {
            $context = array_merge($context, $extra);
        }

        if ($status === 'success') {
            Log::info('ai.nexusrouter.request', $context);

            return;
        }

        Log::warning('ai.nexusrouter.request', $context);
    }
}
