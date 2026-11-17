<?php

namespace App\Http\Resources;

use App\Models\CaseStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CaseStatusHistory */
class CaseStatusHistoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'from_status' => $this->from_status?->value,
            'from_status_label' => $this->from_status?->label(),
            'to_status' => $this->to_status->value,
            'to_status_label' => $this->to_status->label(),
            'action_name' => $this->action_name,
            'reason' => $this->reason,
            'metadata' => $this->metadata,
            'changed_by' => $this->whenLoaded('changedBy', fn () => $this->changedBy ? [
                'id' => $this->changedBy->id,
                'name' => $this->changedBy->name,
                'role' => $this->changedBy->role->value,
                'role_label' => $this->changedBy->role->label(),
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
