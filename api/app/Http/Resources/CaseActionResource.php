<?php

namespace App\Http\Resources;

use App\Enums\ActionStatus;
use App\Models\CaseAction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CaseAction */
class CaseActionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isOverdue = $this->isOverdue();
        $user = $request->user();
        $parentLocked = $this->relationLoaded('safetyCase') && $this->safetyCase
            ? ($this->safetyCase->is_locked || $this->safetyCase->status->isTerminal())
            : false;

        return [
            'id' => $this->id,
            'safety_case_id' => $this->safety_case_id,
            'action_type' => $this->action_type->value,
            'action_type_label' => $this->action_type->label(),
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'is_overdue' => $isOverdue,
            'overdue_label' => $isOverdue ? 'Terlambat' : null,
            'due_at' => $this->due_at?->toIso8601String(),
            'completion_note' => $this->completion_note,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'can_complete' => $user !== null
                && $user->id === $this->pic_user_id
                && $this->status === ActionStatus::Open
                && ! $parentLocked,
            'pic' => $this->whenLoaded('pic', fn () => $this->pic ? [
                'id' => $this->pic->id,
                'name' => $this->pic->name,
                'email' => $this->pic->email,
                'role' => $this->pic->role->value,
                'role_label' => $this->pic->role->label(),
                'job_title' => $this->pic->job_title,
            ] : null),
            'creator' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'role' => $this->creator->role->value,
            ] : null),
            'completer' => $this->whenLoaded('completer', fn () => $this->completer ? [
                'id' => $this->completer->id,
                'name' => $this->completer->name,
            ] : null),
            'safety_case' => $this->whenLoaded('safetyCase', fn () => $this->safetyCase ? [
                'id' => $this->safetyCase->id,
                'case_number' => $this->safetyCase->case_number,
                'status' => $this->safetyCase->status->value,
                'status_label' => $this->safetyCase->status->label(),
                'risk_level' => $this->safetyCase->risk_level?->value,
                'risk_level_label' => $this->safetyCase->risk_level?->label(),
                'machine' => $this->safetyCase->relationLoaded('machine') && $this->safetyCase->machine ? [
                    'id' => $this->safetyCase->machine->id,
                    'code' => $this->safetyCase->machine->code,
                    'name' => $this->safetyCase->machine->name,
                ] : null,
            ] : null),
            'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
