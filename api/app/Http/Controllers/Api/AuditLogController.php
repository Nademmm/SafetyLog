<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CaseStatusHistoryResource;
use App\Models\CaseStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = CaseStatusHistory::query()
            ->forOrganization($request->user()->organization_id)
            ->with([
                'changedBy:id,name,email,role',
                'safetyCase:id,case_number,status',
            ])
            ->latest('created_at')
            ->latest('id');

        if ($request->filled('safety_case_id')) {
            $query->where('safety_case_id', (int) $request->query('safety_case_id'));
        }

        if ($request->filled('changed_by')) {
            $query->where('changed_by', (int) $request->query('changed_by'));
        }

        if ($request->filled('action_name')) {
            $query->where('action_name', (string) $request->query('action_name'));
        }

        if ($request->filled('date_from') && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query('date_from'))) {
            $query->whereDate('created_at', '>=', (string) $request->query('date_from'));
        }

        if ($request->filled('date_to') && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query('date_to'))) {
            $query->whereDate('created_at', '<=', (string) $request->query('date_to'));
        }

        $perPage = min(100, max(1, (int) $request->integer('per_page', 25)));

        return CaseStatusHistoryResource::collection($query->paginate($perPage));
    }
}
