<?php

namespace App\Http\Controllers\Api;

use App\Enums\ActionStatus;
use App\Enums\ActionType;
use App\Enums\CaseStatus;
use App\Enums\RiskLevel;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\CaseType;
use App\Models\Category;
use App\Models\Configuration;
use App\Models\RiskConfig;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferenceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $caseTypes = CaseType::query()
            ->forOrganization($orgId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name', 'is_incident', 'sort_order']);

        $categories = Category::query()
            ->forOrganization($orgId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name', 'sort_order']);

        $riskConfigs = RiskConfig::query()
            ->forOrganization($orgId)
            ->orderBy('min_score')
            ->get([
                'id',
                'level',
                'label',
                'min_score',
                'max_score',
                'first_response_hours',
                'temporary_action_hours',
                'permanent_action_hours',
                'requires_preventive_action',
                'color_hex',
            ]);

        $configurations = Configuration::query()
            ->forOrganization($orgId)
            ->pluck('value', 'key');

        return response()->json([
            'case_types' => $caseTypes,
            'categories' => $categories,
            'risk_configs' => $riskConfigs,
            'configurations' => $configurations,
            'roles' => array_map(fn (UserRole $r) => ['value' => $r->value, 'label' => $r->label()], UserRole::cases()),
            'case_statuses' => array_map(fn (CaseStatus $s) => ['value' => $s->value, 'label' => $s->label()], CaseStatus::cases()),
            'action_types' => array_map(fn (ActionType $t) => ['value' => $t->value, 'label' => $t->label()], ActionType::cases()),
            'action_statuses' => array_map(fn (ActionStatus $s) => ['value' => $s->value, 'label' => $s->label()], ActionStatus::cases()),
            'risk_levels' => array_map(fn (RiskLevel $l) => ['value' => $l->value, 'label' => $l->label()], RiskLevel::cases()),
        ]);
    }

    public function assignableUsers(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = User::query()
            ->forOrganization($orgId)
            ->where('is_active', true)
            ->orderBy('name');

        if ($request->filled('role')) {
            $query->where('role', (string) $request->query('role'));
        }

        $users = $query->get(['id', 'name', 'email', 'role', 'job_title', 'site_id'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role->value,
                'role_label' => $u->role->label(),
                'job_title' => $u->job_title,
                'site_id' => $u->site_id,
            ]);

        return response()->json(['data' => $users]);
    }
}
