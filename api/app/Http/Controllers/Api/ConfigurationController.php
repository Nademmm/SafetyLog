<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateRiskConfigRequest;
use App\Models\Configuration;
use App\Models\RiskConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfigurationController extends Controller
{
    public function updateRiskConfig(UpdateRiskConfigRequest $request, RiskConfig $riskConfig): JsonResponse
    {
        if ($riskConfig->organization_id !== $request->user()->organization_id) {
            abort(403, 'Anda tidak memiliki akses ke konfigurasi organisasi lain.');
        }

        $riskConfig->update($request->validated());

        return response()->json([
            'message' => 'Konfigurasi risiko berhasil diperbarui.',
            'data' => $riskConfig->fresh(),
        ]);
    }

    public function updateConfiguration(Request $request, string $key): JsonResponse
    {
        $validated = $request->validate([
            'value' => ['required'],
            'description' => ['nullable', 'string', 'max:255'],
        ], [
            'value.required' => 'Nilai konfigurasi wajib diisi.',
        ]);

        $config = Configuration::query()->updateOrCreate(
            [
                'organization_id' => $request->user()->organization_id,
                'key' => $key,
            ],
            [
                'value' => $validated['value'],
                'description' => $validated['description'] ?? null,
            ],
        );

        return response()->json([
            'message' => 'Konfigurasi berhasil disimpan.',
            'data' => $config,
        ]);
    }
}
