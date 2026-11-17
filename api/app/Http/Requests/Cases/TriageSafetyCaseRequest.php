<?php

namespace App\Http\Requests\Cases;

use Illuminate\Foundation\Http\FormRequest;

class TriageSafetyCaseRequest extends FormRequest
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
            'decision' => ['required', 'in:assess,reject,duplicate'],
            'severity' => ['required_if:decision,assess', 'nullable', 'integer', 'min:1'],
            'likelihood' => ['required_if:decision,assess', 'nullable', 'integer', 'min:1'],
            'category_id' => ['nullable', 'integer'],
            'assigned_pic_id' => ['nullable', 'integer'],
            'rejection_reason' => ['required_if:decision,reject,duplicate', 'nullable', 'string', 'min:3', 'max:2000'],
            'duplicate_of_case_id' => ['required_if:decision,duplicate', 'nullable', 'integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'decision.required' => 'Keputusan triase wajib dipilih.',
            'decision.in' => 'Keputusan triase harus assess, reject, atau duplicate.',
            'severity.required_if' => 'Nilai keparahan wajib diisi.',
            'likelihood.required_if' => 'Nilai kemungkinan terulang wajib diisi.',
            'rejection_reason.required_if' => 'Alasan wajib diisi saat menolak atau menandai duplikat.',
            'duplicate_of_case_id.required_if' => 'Kasus asli rujukan duplikat wajib dipilih.',
        ];
    }
}
