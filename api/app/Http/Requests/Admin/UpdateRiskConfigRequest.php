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
            'max_score' => ['sometimes', 'required', 'integer', 'min:1'],
            'first_response_hours' => ['sometimes', 'required', 'integer', 'min:1'],
            'temporary_action_hours' => ['sometimes', 'required', 'integer', 'min:1'],
            'permanent_action_hours' => ['sometimes', 'required', 'integer', 'min:1'],
            'requires_preventive_action' => ['sometimes', 'boolean'],
            'color_hex' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'color_hex.regex' => 'Format warna harus berupa kode hex valid (contoh: #F97316).',
        ];
    }
}
