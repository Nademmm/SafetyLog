<?php

namespace App\Providers;

use App\Models\Attachment;
use App\Models\CaseAction;
use App\Models\Machine;
use App\Models\SafetyCase;
use App\Policies\AttachmentPolicy;
use App\Policies\CaseActionPolicy;
use App\Policies\MachinePolicy;
use App\Policies\SafetyCasePolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(SafetyCase::class, SafetyCasePolicy::class);
        Gate::policy(CaseAction::class, CaseActionPolicy::class);
        Gate::policy(Machine::class, MachinePolicy::class);
        Gate::policy(Attachment::class, AttachmentPolicy::class);

        RateLimiter::for('ai', fn (Request $request): Limit => Limit::perMinute(10)
            ->by('user:'.($request->user()?->id ?? $request->ip())));
    }
}
