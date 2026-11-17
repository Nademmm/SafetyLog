<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRiskConfigRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'label' => ['sometimes', 'required', 'string', 'max:64'],
            'min_score' => ['sometimes', 'required', 'integer', 'min:1'],
            'max_score' => ['sometimes', 'required', 'integer', 'gte:min_score'],
            'first_response_hours' => ['sometimes', 'required', 'integer', 'min:1'],
            'temporary_action_hours' => ['sometimes', 'required', 'integer', 'min:1'],
            'permanent_action_hours' => ['sometimes', 'required', 'integer', 'min:1'],
            'requires_preventive_action' => ['sometimes', 'boolean'],
            'color_hex' => ['nullable', 'string', 'max:16'],
        ];
    }
}
