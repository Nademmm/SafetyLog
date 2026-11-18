<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class WebViewTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_redirects_guest_to_login(): void
    {
        $this->get('/dashboard')
            ->assertRedirect('/login');
    }

    public function test_login_page_renders_app_layout(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertSee('Masuk ke SafetyLog');
    }

    public function test_admin_pages_load_crud_as_modules_and_hide_qr(): void
    {
        $user = User::factory()->create([
            'email' => 'admin-view@safetylog.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $this->get('/areas')
            ->assertOk()
            ->assertSee('type="module" src="' . asset('js/areas.js') . '"', false);

        $this->get('/machines')
            ->assertOk()
            ->assertSee('type="module" src="' . asset('js/machines.js') . '"', false)
            ->assertDontSee('Token QR')
            ->assertDontSee('Regen QR')
            ->assertSee('Dihasilkan otomatis');

        $this->get('/sites')
            ->assertOk()
            ->assertSee('Kelola Pabrik')
            ->assertSee('type="module" src="' . asset('js/sites.js') . '"', false);
    }

    public function test_login_shows_notification_for_wrong_credentials(): void
    {
        $this->post('/login', [
            'email' => 'unknown@safetylog.test',
            'password' => 'wrong-password',
        ])->assertRedirect();

        $this->get('/login')
            ->assertSee('Email atau password salah.');
    }

    public function test_dashboard_accepts_user_stored_in_session_as_array(): void
    {
        $user = User::factory()->create([
            'email' => 'dashboard@safetylog.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertRedirect('/dashboard');

        $this->get('/dashboard')
            ->assertOk()
            ->assertSee($user->name)
            ->assertSee('admin')
            ->assertSee('action="' . route('web.logout') . '"', false);
    }

    public function test_non_admin_dashboard_shows_coming_soon_placeholders(): void
    {
        $user = User::factory()->create([
            'email' => 'reporter@safetylog.test',
            'password' => Hash::make('password123'),
            'role' => 'reporter',
            'is_active' => true,
        ]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertRedirect('/dashboard');

        $this->get('/dashboard')
            ->assertOk()
            ->assertSee('Lapor Kasus Baru — Segera hadir')
            ->assertDontSee(route('web.areas'), false);
    }

    public function test_logout_clears_session_and_redirects_to_login(): void
    {
        $user = User::factory()->create([
            'email' => 'logout@safetylog.test',
            'password' => Hash::make('password123'),
            'role' => 'reporter',
            'is_active' => true,
        ]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertRedirect('/dashboard');

        $this->post('/logout')
            ->assertRedirect('/login');

        $this->assertNull(session('sl_token'));
        $this->assertNull(session('sl_user'));
    }
}
