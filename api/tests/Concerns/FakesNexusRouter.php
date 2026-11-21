<?php

namespace Tests\Concerns;

use Illuminate\Support\Facades\Http;

trait FakesNexusRouter
{
    /**
     * @param  array<string, mixed>  $content
     */
    protected function fakeNexusRouter(array $content): void
    {
        config()->set('services.nexusrouter.base_url', 'https://ai.test');
        config()->set('services.nexusrouter.virtual_key', 'test-virtual-key');
        config()->set('services.nexusrouter.model', 'test-model');
        config()->set('services.nexusrouter.timeout', 12);

        Http::preventStrayRequests();
        Http::fake([
            'https://ai.test/v1/chat/completions' => Http::response([
                'model' => 'test-model',
                'choices' => [[
                    'message' => [
                        'content' => json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ],
                ]],
            ]),
        ]);
    }
}
