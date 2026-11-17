<?php

namespace App\Services;

use App\Enums\CaseStatus;
use App\Models\CaseStatusHistory;
use App\Models\SafetyCase;
use App\Models\User;

/**
 * Writes immutable audit trail records for safety case status transitions.
 */
class AuditLogService
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function record(
        SafetyCase $case,
        ?User $actor,
        ?CaseStatus $fromStatus,
        CaseStatus $toStatus,
        string $actionName,
        ?string $reason = null,
        array $metadata = [],
    ): CaseStatusHistory {
        return CaseStatusHistory::query()->create([
            'organization_id' => $case->organization_id,
            'safety_case_id' => $case->id,
            'changed_by' => $actor?->id,
            'from_status' => $fromStatus?->value,
            'to_status' => $toStatus->value,
            'action_name' => $actionName,
            'reason' => $reason,
            'metadata' => $metadata === [] ? null : $metadata,
            'created_at' => now(),
        ]);
    }
}
