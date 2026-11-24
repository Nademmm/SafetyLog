<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class SystemSetupTest extends TestCase
{
    public function test_setup_endpoint_rejects_unauthorized_access(): void
    {
        config(['app.setup_key' => 'secret123']);
        putenv('APP_SETUP_KEY=secret123');

        $response = $this->getJson('/api/system/setup');
        $response->assertStatus(403);

        $responseInvalid = $this->getJson('/api/system/setup?key=wrongkey');
        $responseInvalid->assertStatus(403);
    }

    public function test_setup_endpoint_executes_with_valid_key(): void
    {
        putenv('APP_SETUP_KEY=secret123');
        Artisan::shouldReceive('call')
            ->with('migrate', ['--force' => true])
            ->once();
        Artisan::shouldReceive('call')
            ->with('storage:link')
            ->once();
        Artisan::shouldReceive('output')
            ->andReturn('Command output');

        $response = $this->getJson('/api/system/setup?key=secret123');
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);
    }
}
