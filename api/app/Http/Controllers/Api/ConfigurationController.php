<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DomainRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateRiskConfigRequest;
use App\Models\Configuration;
use App\Models\RiskConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfigurationController extends Controller
{
    /**
     * @var list<string>
     */
    private const ALLOWED_KEYS = [
        'open_case_warning_days',
        'recurring_case_threshold',
        'recurring_window_days',
        'risk_matrix_max_scale',
        'emergency_reminder_text',
        'root_cause_categories',
    ];

    public function updateRiskConfig(UpdateRiskConfigRequest $request, RiskConfig $riskConfig): JsonResponse
    {
        if ($riskConfig->organization_id !== $request->user()->organization_id) {
            abort(403, 'Anda tidak memiliki akses ke konfigurasi organisasi lain.');
        }

        $validated = $request->validated();
        $effectiveMin = (int) ($validated['min_score'] ?? $riskConfig->min_score);
        $effectiveMax = (int) ($validated['max_score'] ?? $riskConfig->max_score);

        if ($effectiveMin > $effectiveMax) {
            throw new DomainRuleException(
                'Skor minimum tidak boleh lebih besar dari skor maksimum.',
                'INVALID_RISK_RANGE',
                422,
                ['min_score' => ['Skor minimum harus kurang dari atau sama dengan skor maksimum.']],
            );
        }

        $hasOverlap = RiskConfig::query()
            ->forOrganization($riskConfig->organization_id)
            ->whereKeyNot($riskConfig->id)
            ->where('min_score', '<=', $effectiveMax)
            ->where('max_score', '>=', $effectiveMin)
            ->exists();

        if ($hasOverlap) {
            throw new DomainRuleException(
                'Rentang skor risiko bertumpuk dengan level risiko lain.',
                'OVERLAPPING_RISK_RANGE',
                422,
                ['min_score' => ['Rentang skor tidak boleh bertumpuk dengan konfigurasi level lain.']],
            );
        }

        $riskConfig->update($validated);

        return response()->json([
            'message' => 'Konfigurasi risiko berhasil diperbarui.',
            'data' => $riskConfig->fresh(),
        ]);
    }

    public function updateConfiguration(Request $request, string $key): JsonResponse
    {
        if (! in_array($key, self::ALLOWED_KEYS, true)) {
            throw new DomainRuleException(
                'Kunci konfigurasi tidak dikenali.',
                'INVALID_CONFIGURATION_KEY',
                422,
                ['key' => ['Kunci konfigurasi tidak terdaftar dalam sistem.']],
            );
        }

        $valueRules = match ($key) {
            'open_case_warning_days', 'recurring_case_threshold', 'recurring_window_days' => ['required', 'integer', 'min:1', 'max:365'],
            'risk_matrix_max_scale' => ['required', 'integer', 'min:3', 'max:10'],
            'emergency_reminder_text' => ['required', 'string', 'min:5', 'max:500'],
            'root_cause_categories' => ['required', 'array', 'min:1', 'max:12'],
        };

        $rules = [
            'value' => $valueRules,
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];

        if ($key === 'root_cause_categories') {
            $rules['value.*'] = ['required', 'string', 'min:1', 'max:64'];
        }

        $validated = $request->validate($rules, [
            'value.required' => 'Nilai konfigurasi wajib diisi.',
        ]);

        $orgId = $request->user()->organization_id;
        $existing = Configuration::query()
            ->where('organization_id', $orgId)
            ->where('key', $key)
            ->first();

        $payload = ['value' => $validated['value']];
        if ($request->has('description')) {
            $payload['description'] = $validated['description'];
        } elseif ($existing) {
            $payload['description'] = $existing->description;
        }

        $config = Configuration::query()->updateOrCreate(
            ['organization_id' => $orgId, 'key' => $key],
            $payload,
        );

        return response()->json([
            'message' => 'Konfigurasi berhasil disimpan.',
            'data' => $config,
        ]);
    }
}
