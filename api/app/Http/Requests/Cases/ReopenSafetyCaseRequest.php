<?php

namespace App\Http\Requests\Cases;

use Illuminate\Foundation\Http\FormRequest;

class ReopenSafetyCaseRequest extends FormRequest
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
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
            'reopen_action_ids' => ['nullable', 'array'],
            'reopen_action_ids.*' => ['integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Alasan pembukaan ulang kasus wajib diisi.',
            'reason.min' => 'Alasan pembukaan ulang minimal 5 karakter.',
        ];
    }
}
