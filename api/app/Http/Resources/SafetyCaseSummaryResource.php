<?php

namespace App\Http\Resources;

use App\Models\SafetyCase;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/** @mixin SafetyCase */
class SafetyCaseSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $excerpt = Str::limit($this->description, 140);
        $riskLabel = $this->risk_level?->label();

        return [
            'id' => $this->id,
            'case_number' => $this->case_number,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'risk_level' => $this->risk_level?->value,
            'risk_level_label' => $riskLabel,
            'risk_label' => $riskLabel,
            'risk_score' => $this->risk_score,
            'short_description' => $excerpt,
            'description_excerpt' => $excerpt,
            'is_machine_stopped' => $this->is_machine_stopped,
            'has_affected_people' => $this->has_affected_people,
            'case_type' => $this->whenLoaded('caseType', fn () => $this->caseType ? [
                'id' => $this->caseType->id,
                'code' => $this->caseType->code,
                'name' => $this->caseType->name,
            ] : null),
            'machine' => $this->whenLoaded('machine', fn () => $this->machine ? [
                'id' => $this->machine->id,
                'code' => $this->machine->code,
                'name' => $this->machine->name,
            ] : null),
            'reported_at' => $this->reported_at?->toIso8601String(),
        ];
    }
}
