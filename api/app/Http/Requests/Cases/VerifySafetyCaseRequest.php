<?php

namespace App\Http\Requests\Cases;

use Illuminate\Foundation\Http\FormRequest;

class VerifySafetyCaseRequest extends FormRequest
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
            'decision' => ['required', 'in:approve,reject'],
            'learning_summary' => ['required_if:decision,approve', 'nullable', 'string', 'min:5', 'max:5000'],
            'rejection_reason' => ['required_if:decision,reject', 'nullable', 'string', 'min:5', 'max:2000'],
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
            'decision.required' => 'Keputusan verifikasi wajib dipilih.',
            'decision.in' => 'Keputusan verifikasi harus approve atau reject.',
            'learning_summary.required_if' => 'Ringkasan pembelajaran wajib diisi saat menutup kasus.',
            'learning_summary.min' => 'Ringkasan pembelajaran minimal 5 karakter.',
            'rejection_reason.required_if' => 'Alasan penolakan verifikasi wajib diisi.',
            'rejection_reason.min' => 'Alasan penolakan minimal 5 karakter.',
        ];
    }
}
