<?php

namespace Tests\Feature;

use App\Exceptions\AiUnavailableException;
use App\Services\Ai\NexusRouterClient;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class NexusRouterClientTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.nexusrouter.base_url', 'https://ai.test');
        config()->set('services.nexusrouter.virtual_key', 'test-virtual-key');
        config()->set('services.nexusrouter.model', 'test-model');
        config()->set('services.nexusrouter.timeout', 12);
    }

    public function test_request_uses_configured_endpoint_key_and_model(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://ai.test/v1/chat/completions' => Http::response([
                'model' => 'test-model',
                'choices' => [['message' => ['content' => '{"ok":true}']]],
            ]),
        ]);
        Log::spy();

        $content = app(NexusRouterClient::class)->complete('system instruction', 'user data', 'test_feature');

        $this->assertSame('{"ok":true}', $content);

        Http::assertSent(function (Request $request): bool {
            $body = $request->data();

            return $request->url() === 'https://ai.test/v1/chat/completions'
                && $request->hasHeader('Authorization', 'Bearer test-virtual-key')
                && $body['model'] === 'test-model'
                && $body['stream'] === false
                && $body['messages'][0]['role'] === 'system'
                && $body['messages'][1]['content'] === 'user data';
        });

        Log::shouldHaveReceived('info')
            ->once()
            ->withArgs(fn (string $message, array $context): bool => $message === 'ai.nexusrouter.request'
                && ! str_contains((string) json_encode($context), 'test-virtual-key'));
    }

    public function test_connection_failure_is_handled(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://ai.test/v1/chat/completions' => Http::failedConnection(),
        ]);

        try {
            app(NexusRouterClient::class)->complete('system', 'user', 'test_feature');
            $this->fail('AiUnavailableException harus dilempar.');
        } catch (AiUnavailableException $exception) {
            $this->assertSame('AI_UNAVAILABLE', $exception->errorCode);
        }

        Http::assertSentCount(2);
    }

    public function test_http_error_is_handled_without_retrying_authentication_failures(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://ai.test/v1/chat/completions' => Http::response(['message' => 'unauthorized'], 401),
        ]);

        try {
            app(NexusRouterClient::class)->complete('system', 'user', 'test_feature');
            $this->fail('AiUnavailableException harus dilempar.');
        } catch (AiUnavailableException) {
            Http::assertSentCount(1);
        }
    }

    public function test_empty_content_is_rejected(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://ai.test/v1/chat/completions' => Http::response([
                'choices' => [['message' => ['content' => '   ']]],
            ]),
        ]);

        $this->expectException(AiUnavailableException::class);
        $this->expectExceptionMessage('respons kosong');

        app(NexusRouterClient::class)->complete('system', 'user', 'test_feature');
    }

    public function test_missing_configuration_is_handled(): void
    {
        config()->set('services.nexusrouter.virtual_key', '');

        Http::preventStrayRequests();

        $this->expectException(AiUnavailableException::class);

        app(NexusRouterClient::class)->complete('system', 'user', 'test_feature');
    }

    public function test_normalizes_base_url_with_or_without_v1_suffix(): void
    {
        config()->set('services.nexusrouter.base_url', 'https://ai.test/v1');

        Http::preventStrayRequests();
        Http::fake([
            'https://ai.test/v1/chat/completions' => Http::response([
                'choices' => [['message' => ['content' => '{"ok":true}']]],
            ]),
        ]);

        $content = app(NexusRouterClient::class)->complete('sys', 'usr', 'feature');

        $this->assertSame('{"ok":true}', $content);
        Http::assertSent(fn (Request $req): bool => $req->url() === 'https://ai.test/v1/chat/completions');
    }
}
