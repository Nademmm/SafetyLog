<?php

namespace Tests\Feature;

use App\Enums\ActionType;
use App\Enums\UserRole;
use App\Models\User;
use App\Services\CaseWorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class WebViewTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('web-login-ip|127.0.0.1');
    }

    public function test_dashboard_redirects_guest_to_login(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('Masuk ke SafetyLog');

        $this->get('/dashboard')
            ->assertRedirect('/login');
    }

    public function test_login_page_renders_app_layout(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertSee('Masuk ke SafetyLog')
            ->assertDontSee('—');
    }

    public function test_admin_pages_load_crud_as_modules_and_hide_qr(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->loginAsWebUser($fx['admin']);

        $this->get('/areas')
            ->assertOk()
            ->assertSee('type="module" src="'.asset('js/areas.js').'"', false);

        $this->get('/machines')
            ->assertOk()
            ->assertSee('type="module" src="'.asset('js/machines.js').'"', false)
            ->assertDontSee('Token QR')
            ->assertDontSee('Regen QR')
            ->assertSee('Dihasilkan otomatis');

        $this->get('/sites')
            ->assertOk()
            ->assertSee('Kelola Pabrik')
            ->assertSee('type="module" src="'.asset('js/sites.js').'"', false);

        $this->get('/users')
            ->assertOk()
            ->assertSee('Kelola Pengguna')
            ->assertSee('type="module" src="'.asset('js/admin-users.js').'"', false);

        $this->get('/configurations')
            ->assertOk()
            ->assertSee('Ambang Risiko')
            ->assertSee('type="module" src="'.asset('js/admin-configs.js').'"', false);
    }

    public function test_login_shows_notification_for_wrong_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'wrong@safetylog.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->from('/login')->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])->assertRedirect('/login');

        $this->get('/login')
            ->assertOk()
            ->assertSee('Email atau password salah.');
    }

    public function test_dashboard_accepts_user_stored_in_session_as_array(): void
    {
        $user = User::factory()->create([
            'email' => 'admin@safetylog.test',
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
            ->assertSee('action="'.route('web.logout').'"', false);
    }

    public function test_non_admin_dashboard_shows_real_role_actions_without_placeholders(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->loginAsWebUser($fx['reporter']);

        $this->get('/dashboard')
            ->assertOk()
            ->assertSee(route('web.cases.create'), false)
            ->assertSee(route('web.my-cases'), false)
            ->assertSee(route('web.my-actions'), false)
            ->assertDontSee('Segera hadir')
            ->assertDontSee(route('web.areas'), false);
    }

    public function test_logout_clears_session_and_redirects_to_login(): void
    {
        $user = User::factory()->create([
            'email' => 'logout@safetylog.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertRedirect('/dashboard');

        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->post('/logout')
            ->assertRedirect('/login');

        $this->assertNull(session('sl_token'));
        $this->assertNull(session('sl_user'));
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_all_four_roles_can_access_their_permitted_web_pages(): void
    {
        $fx = $this->createOrganizationFixture();
        $workflow = app(CaseWorkflowService::class);

        $case = $workflow->reportCase($fx['reporter'], [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Seal silinder pneumatik bocor angin di unit packing.',
            'is_machine_stopped' => false,
            'has_affected_people' => false,
        ])['case'];

        // 1. Reporter
        $this->loginAsWebUser($fx['reporter']);
        $this->get('/dashboard')->assertOk()->assertSee('Pelapor');
        $this->get('/cases/create')->assertOk()->assertSee('Lapor Kasus Baru');
        $this->get('/my-cases')->assertOk()->assertSee($case->case_number);
        $this->get('/my-actions')->assertOk();
        $this->get('/notifications')->assertOk();
        $this->get("/cases/{$case->id}")->assertOk()->assertSee($case->case_number);

        // 2. Supervisor
        $this->post('/logout');
        $this->loginAsWebUser($fx['supervisor']);
        $this->get('/dashboard')->assertOk()->assertSee('Antrean Triase Baru');
        $this->get('/cases')->assertOk()->assertSee($case->case_number);
        $this->get("/cases/{$case->id}")->assertOk()->assertSee('id="triageForm"', false);
        $this->get('/audit-logs')->assertOk()->assertSee($case->case_number);
        $this->get('/notifications')->assertOk();

        // Advance case to pending_verification with supervisor as PIC
        $workflow->triageCase($fx['supervisor'], $case->fresh(), [
            'decision' => 'assess',
            'severity' => 4,
            'likelihood' => 3,
            'category_id' => $fx['mechanicalCategory']->id,
            'assigned_pic_id' => $fx['supervisor']->id,
        ]);
        $action = $workflow->addAction($fx['supervisor'], $case->fresh(), [
            'action_type' => ActionType::Preventive->value,
            'title' => 'Ganti seal pneumatik dan pasang checklist mingguan',
            'pic_user_id' => $fx['supervisor']->id,
            'due_at' => now()->addDays(3)->toIso8601String(),
        ]);
        $workflow->completeAction($fx['supervisor'], $action, [
            'completion_note' => 'Seal diganti dan checklist dipasang di panel.',
        ]);

        // 3. HSE / Verifier (not PIC -> sees verify form)
        $this->post('/logout');
        $this->loginAsWebUser($fx['hse']);
        $this->get('/dashboard')->assertOk()->assertSee('Antrean Verifikasi');
        $this->get('/cases')->assertOk()->assertSee($case->case_number);
        $this->get("/cases/{$case->id}")
            ->assertOk()
            ->assertSee('id="verifyForm"', false);
        $this->get('/audit-logs')->assertOk();

        // 4. Admin
        $this->post('/logout');
        $this->loginAsWebUser($fx['admin']);
        $this->get('/dashboard')->assertOk()->assertSee('Kelola Pengguna');
        $this->get('/cases')->assertOk();
        $this->get('/audit-logs')->assertOk();
        $this->get('/sites')->assertOk();
        $this->get('/areas')->assertOk();
        $this->get('/machines')->assertOk();
        $this->get('/users')->assertOk();
        $this->get('/configurations')->assertOk();
    }

    public function test_unauthorized_roles_receive_http_403_on_restricted_pages(): void
    {
        $fx = $this->createOrganizationFixture();
        $otherReporter = User::factory()->withRole(UserRole::Reporter)->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
        ]);

        $otherCase = app(CaseWorkflowService::class)->reportCase($otherReporter, [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Laporan dari operator shift malam untuk pemeriksaan akses.',
        ])['case'];

        // Reporter rejected with 403 on supervisor/hse/admin pages and another reporter's case
        $this->loginAsWebUser($fx['reporter']);
        foreach (['/cases', '/audit-logs', '/sites', '/areas', '/machines', '/users', '/configurations'] as $restricted) {
            $this->get($restricted)
                ->assertForbidden()
                ->assertSee('Akses Ditolak');
        }
        $this->get("/cases/{$otherCase->id}")->assertForbidden();

        // Supervisor rejected with 403 on admin master/config pages
        $this->post('/logout');
        $this->loginAsWebUser($fx['supervisor']);
        foreach (['/sites', '/areas', '/machines', '/users', '/configurations'] as $adminOnly) {
            $this->get($adminOnly)
                ->assertForbidden()
                ->assertSee('Akses Ditolak');
        }

        // HSE rejected with 403 on admin master/config pages
        $this->post('/logout');
        $this->loginAsWebUser($fx['hse']);
        foreach (['/sites', '/areas', '/machines', '/users', '/configurations'] as $adminOnly) {
            $this->get($adminOnly)
                ->assertForbidden()
                ->assertSee('Akses Ditolak');
        }
    }

    public function test_reporter_assigned_as_pic_can_view_case_detail(): void
    {
        $fx = $this->createOrganizationFixture();
        $picReporter = User::factory()->withRole(UserRole::Reporter)->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
        ]);

        $workflow = app(CaseWorkflowService::class);
        $case = $workflow->reportCase($fx['reporter'], [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Getaran berlebih pada motor penggerak lini 1.',
        ])['case'];

        $workflow->triageCase($fx['supervisor'], $case, [
            'decision' => 'assess',
            'severity' => 3,
            'likelihood' => 3,
            'category_id' => $fx['mechanicalCategory']->id,
            'assigned_pic_id' => $picReporter->id,
        ]);

        $this->loginAsWebUser($picReporter);
        $this->get("/cases/{$case->id}")
            ->assertOk()
            ->assertSee($case->case_number);
    }

    public function test_cross_organization_case_access_returns_403(): void
    {
        $orgA = $this->createOrganizationFixture('ORGA', 'PAB1');
        $orgB = $this->createOrganizationFixture('ORGB', 'PAB2');

        $caseOrgB = app(CaseWorkflowService::class)->reportCase($orgB['reporter'], [
            'machine_id' => $orgB['machine']->id,
            'case_type_id' => $orgB['abnormalityType']->id,
            'description' => 'Kebocoran oli di mesin organisasi lain.',
        ])['case'];

        $this->loginAsWebUser($orgA['admin']);
        $this->get("/cases/{$caseOrgB->id}")->assertForbidden();
    }

    public function test_web_login_is_rate_limited_after_five_failed_attempts(): void
    {
        $fx = $this->createOrganizationFixture();
        $email = $fx['reporter']->email;

        for ($i = 0; $i < 5; $i++) {
            $this->from('/login')->post('/login', [
                'email' => $email,
                'password' => 'salah-terus',
            ])->assertRedirect('/login')
                ->assertSessionHasErrors('email');
        }

        $this->from('/login')->post('/login', [
            'email' => $email,
            'password' => 'salah-terus',
        ])->assertRedirect('/login')
            ->assertSessionHas('rate_limit');

        $this->get('/login')
            ->assertOk()
            ->assertSee('Terlalu banyak percobaan gagal.');
    }

    public function test_qr_guest_redirect_saves_return_url_and_returns_after_login(): void
    {
        $fx = $this->createOrganizationFixture();
        $qrPath = "/cases/create?qr={$fx['machine']->qr_token}";

        $this->get($qrPath)
            ->assertRedirect('/login');

        $this->post('/login', [
            'email' => $fx['reporter']->email,
            'password' => 'password',
        ])->assertRedirect($qrPath);

        $this->get($qrPath)
            ->assertOk()
            ->assertSee('Mesin terpilih dari QR:')
            ->assertSee($fx['machine']->code);
    }

    public function test_inactive_user_inactive_org_and_revoked_token_invalidate_web_session(): void
    {
        $fx = $this->createOrganizationFixture();
        $reporter = $fx['reporter'];

        $this->loginAsWebUser($reporter);
        $this->get('/dashboard')->assertOk();

        // Revoked Sanctum token logs user out on next web request
        $reporter->tokens()->delete();
        $this->get('/dashboard')->assertRedirect('/login');

        // Re-login then deactivate user
        $this->loginAsWebUser($reporter);
        $this->get('/dashboard')->assertOk();
        $reporter->update(['is_active' => false]);
        $this->get('/dashboard')->assertRedirect('/login');

        $this->from('/login')->post('/login', [
            'email' => $reporter->email,
            'password' => 'password',
        ])->assertRedirect('/login')
            ->assertSessionHasErrors('email');

        // Active user in inactive organization cannot keep session or login
        $this->loginAsWebUser($fx['supervisor']);
        $this->get('/dashboard')->assertOk();
        $fx['organization']->update(['is_active' => false]);
        $this->get('/dashboard')->assertRedirect('/login');

        $this->from('/login')->post('/login', [
            'email' => $fx['supervisor']->email,
            'password' => 'password',
        ])->assertRedirect('/login')
            ->assertSessionHasErrors('email');
    }

    private function loginAsWebUser(User $user, string $password = 'password'): void
    {
        $this->post('/login', [
            'email' => $user->email,
            'password' => $password,
        ])->assertRedirect('/dashboard');
    }
}
